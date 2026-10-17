/* titan-antigravity \u2014 node unit tests. Run: node tests/run-node-tests.js */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ctx = { console: console, JSON: JSON, Math: Math, Date: Date, Array: Array, Object: Object, String: String, Number: Number, parseInt: parseInt, Promise: Promise, AbortController: AbortController, setTimeout: setTimeout, clearTimeout: clearTimeout, Error: Error, TypeError: TypeError };
ctx.window = ctx;
ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of ['../js/data.js', '../js/logic.js', '../js/llm.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, f), 'utf8'), ctx);
}
const D = ctx.TITAN_DATA;
const L = ctx.TITAN_LOGIC;

let passed = 0, failed = 0;
function check(name, cond, extra) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (extra ? ' :: ' + extra : '')); }
}
function mk(over) {
  const base = { title: 'Test mission', objective: 'Do the thing', stakes: '', constraints: [], mode: 'TASK', taskType: 'General task', riskFlags: [] };
  const res = L.createMission(Object.assign(base, over || {}));
  if (!res.ok) throw new Error('mk failed: ' + res.errors.join('; '));
  return res.mission;
}

/* --- data integrity --- */
check('34 roles', D.ROLES.length === 34, String(D.ROLES.length));
check('role ids unique', new Set(D.ROLES.map(r => r.id)).size === 34);
check('every role has duty + boundary', D.ROLES.every(r => r.duty && r.boundary && r.domain));
check('12 skill families', L.skillFamilies().length === 12, String(L.skillFamilies().length));
check('126 skills', D.SKILLS.length === 126, String(D.SKILLS.length));
check('every skill has owner role', D.SKILLS.every(s => D.ROLES.some(r => r.id === s.owner)));
check('14 loop stages', D.LOOP.length === 14);
check('loop starts UNDERSTAND ends LEARN', D.LOOP[0] === 'UNDERSTAND' && D.LOOP[13] === 'LEARN');
check('10 node states', D.NODE_STATES.length === 10);
check('5 claim categories', D.CLAIM_CATEGORIES.length === 5);
check('7 claim vocab entries', D.CLAIM_VOCAB.length === 7);
check('11 routing rows', D.ROUTING.length === 11);
check('8 modes', D.MODES.length === 8);

/* --- routing: every sec 16 row reachable --- */
const routingCases = [
  ['Fix the broken checkout page CSS layout', 'Styling defect', ['FRONTEND', 'INTERFACE']],
  ['Admin login keeps redirecting to sign-in', 'Authentication redirect failure', ['HUNTER', 'IDENTITY']],
  ['Build a new API endpoint for refunds', 'API feature', ['BACKEND', 'API']],
  ['Database outage, slow queries on orders', 'Database incident', ['OBSERVER', 'DATA', 'HUNTER']],
  ['The AI model output quality regressed badly', 'AI result regression', ['AI-ENGINEER', 'EVAL']],
  ['Add a payment integration for checkout', 'Payment integration', ['INTEGRATION']],
  ['Page is slow, latency is terrible', 'Performance defect', ['VELOCITY']],
  ['Run a security review for XSS and injection', 'Security review', ['SENTINEL']],
  ['Ship the production release next week', 'Production release', ['DEVOPS', 'RELEASE']],
  ['RAG retrieval returns bad citations', 'RAG quality problem', ['RETRIEVAL', 'EVAL']],
  ['Add a voice transcription feature', 'Voice feature', ['VOICE', 'INTEGRATION']]
];
routingCases.forEach(([title, type, roles]) => {
  const r = L.routeMission({ title, objective: title, taskType: type });
  check('routing: ' + type, r.matched && r.row === type && JSON.stringify(r.primary) === JSON.stringify(roles),
    JSON.stringify({ row: r.row, primary: r.primary }));
});
const fb = L.routeMission({ title: 'Zxq wobble fnord', objective: 'Blorpt the gizmo', taskType: 'Gizmo blorping' });
check('routing fallback = NEXUS+PLANNER', !fb.matched && fb.primary.includes('NEXUS') && fb.primary.includes('PLANNER'));

/* --- classification --- */
check('risk: no flags -> R1', L.classifyRisk([], 'TASK').level === 'R1');
check('risk: production -> R3', L.classifyRisk(['production'], 'TASK').level === 'R3');
check('risk: destructive -> R4', L.classifyRisk(['destructive'], 'TASK').level === 'R4');
check('risk: destructive+production -> R5', L.classifyRisk(['destructive', 'production'], 'TASK').level === 'R5');
check('risk: personal-data -> R2', L.classifyRisk(['personal-data'], 'TASK').level === 'R2');
check('risk: payments -> R3', L.classifyRisk(['payments'], 'TASK').level === 'R3');
check('risk: AUDIT caps at R2', L.classifyRisk(['production'], 'AUDIT').level === 'R2');
check('autonomy: TASK->A2', L.classifyAutonomy('TASK').level === 'A2');
check('autonomy: AUDIT->A1', L.classifyAutonomy('AUDIT').level === 'A1');
check('autonomy: PROGRAM->A3', L.classifyAutonomy('PROGRAM').level === 'A3');
check('autonomy: INCIDENT->A3', L.classifyAutonomy('INCIDENT').level === 'A3');

/* --- intake validation --- */
check('intake: empty title rejected', L.createMission({ title: '', objective: 'x', mode: 'TASK' }).ok === false);
check('intake: empty objective rejected', L.createMission({ title: 't', objective: '', mode: 'TASK' }).ok === false);
check('intake: bad mode rejected', L.createMission({ title: 't', objective: 'x', mode: 'NOPE' }).ok === false);
check('intake: unknown flag rejected', L.createMission({ title: 't', objective: 'x', mode: 'TASK', riskFlags: ['nope'] }).ok === false);
check('intake: title too long rejected', L.createMission({ title: 'x'.repeat(121), objective: 'x', mode: 'TASK' }).ok === false);

/* --- mission factory --- */
const m0 = mk({});
check('factory: contract has all sec 7 fields', ['objective', 'taskType', 'currentState', 'expectedState', 'scope', 'nonGoals', 'constraints', 'acceptance', 'risk', 'verification', 'unknown'].every(k => k in m0.contract));
check('factory: roles <= 5 and include NEXUS', m0.roles.length <= 5 && m0.roles.includes('NEXUS'));
check('factory: 1 intake claim', m0.claims.length === 1 && m0.claims[0].category === 'OBSERVED');
check('factory: 14 PENDING nodes', m0.nodes.length === 14 && m0.nodes.every(n => n.state === 'PENDING'));
check('factory: status DRAFT', m0.status === 'DRAFT');

/* --- claim gating (sec 8) --- */
const m1 = mk({});
check('claim: no evidence refused', L.addClaim(m1, { claim: 'X', category: 'OBSERVED', evidence: '' }).ok === false);
check('claim: bad category refused', L.addClaim(m1, { claim: 'X', category: 'MAYBE', evidence: 'e' }).ok === false);
check('claim: no text refused', L.addClaim(m1, { claim: '', category: 'OBSERVED', evidence: 'e' }).ok === false);
check('claim: valid accepted', L.addClaim(m1, { claim: 'X', category: 'INFERRED', evidence: 'e' }).ok === true && m1.claims.length === 2);
const mBad = mk({});
mBad.claims.push({ claim: 'No evidence', category: 'OBSERVED', evidence: '' });
check('ledger validator catches unevidenced claim', L.validateLedger(mBad).length === 1);
check('ledger validator passes clean mission', L.validateLedger(m1).length === 0);

/* --- node transitions (sec 17) --- */
const m2 = mk({});
check('transition PENDING->RUNNING ok', L.setNodeState(m2, 'UNDERSTAND', 'RUNNING').ok === true);
check('transition RUNNING->SUCCEEDED ok', L.setNodeState(m2, 'UNDERSTAND', 'SUCCEEDED').ok === true);
check('transition SUCCEEDED->RUNNING refused', L.setNodeState(m2, 'UNDERSTAND', 'RUNNING').ok === false);
check('transition PENDING->SUCCEEDED refused', L.setNodeState(m2, 'DISCOVER', 'SUCCEEDED').ok === false);
check('transition BLOCKED->RUNNING ok', (() => { const m = mk({}); L.setNodeState(m, 'UNDERSTAND', 'RUNNING'); L.setNodeState(m, 'UNDERSTAND', 'BLOCKED'); return L.setNodeState(m, 'UNDERSTAND', 'RUNNING').ok; })());
check('transition unknown stage refused', L.setNodeState(m2, 'NOPE', 'RUNNING').ok === false);

/* --- role assignment guard (sec 15) --- */
const m3 = mk({});
check('assign 6 roles refused (role theater)', L.assignRoles(m3, ['NEXUS', 'PLANNER', 'QA', 'DOCS', 'UX', 'BACKEND']).ok === false);
check('assign 0 roles refused', L.assignRoles(m3, []).ok === false);
check('assign unknown role filtered', (() => { const r = L.assignRoles(m3, ['QA', 'NOPE']); return r.ok && m3.roles.length === 1 && m3.roles[0] === 'QA'; })());
check('assign updates skills', m3.skills.length > 0 && m3.skills.every(id => D.SKILLS.some(s => s.id === id)));
check('attach unknown skill refused', L.attachSkill(m3, 'sk-nope').ok === false);
check('attach skill works', (() => { const before = m3.skills.length; L.attachSkill(m3, 'sk-threat-model'); return m3.skills.includes('sk-threat-model') && m3.skills.length === before + 1; })());
check('attach duplicate skill is idempotent', (() => { const before = m3.skills.length; L.attachSkill(m3, 'sk-threat-model'); return m3.skills.length === before; })());

/* --- run: normal mission --- */
const m4 = mk({ title: 'Fix login redirect', objective: 'Fix login redirect', taskType: 'Authentication redirect failure' });
const run4 = L.runMission(m4);
check('run: ok, not blocked', run4.ok && !run4.blocked);
check('run: all nodes SUCCEEDED', m4.nodes.every(n => n.state === 'SUCCEEDED'));
check('run: status READY_FOR_DONE', m4.status === 'READY_FOR_DONE');
check('run: 15 claims (intake + 14 stages)', m4.claims.length === 15, String(m4.claims.length));
check('run: log has 14 stage entries', m4.log.length === 14, String(m4.log.length));
check('run: VERIFIED claims exist (real code checks)', m4.claims.some(c => c.category === 'VERIFIED'));
check('run: re-run refused', L.runMission(m4).ok === false);
const m4b = mk({ title: 'Fix login redirect', objective: 'Fix login redirect', taskType: 'Authentication redirect failure' });
L.runMission(m4b);
check('run: deterministic (same claim texts)', JSON.stringify(m4.claims.map(c => c.claim)) === JSON.stringify(m4b.claims.map(c => c.claim)));
check('done-check passes after run', L.doneCheck(m4).length === 0);
check('complete sets DONE', L.completeMission(m4).ok && m4.status === 'DONE');
check('run on DONE refused', L.runMission(m4).ok === false);

/* --- run: high-risk authorization gate (sec 11) --- */
const m5 = mk({ title: 'Drop prod table', objective: 'Drop the prod table', taskType: 'Database incident', riskFlags: ['destructive', 'production'] });
check('high-risk mission is R5', m5.risk === 'R5', m5.risk);
const run5 = L.runMission(m5);
check('run: R5 blocks at EXECUTE', run5.ok && run5.blocked && run5.blockedAt === 'EXECUTE' && m5.status === 'BLOCKED');
check('run: EXECUTE node BLOCKED', m5.nodes.find(n => n.stage === 'EXECUTE').state === 'BLOCKED');
check('run: later nodes still PENDING', m5.nodes.find(n => n.stage === 'VERIFY').state === 'PENDING');
check('run while BLOCKED refused (use authorize)', L.runMission(m5).ok === false);
check('authorize when not blocked refused', L.authorizeMission(mk({})).ok === false);
const auth5 = L.authorizeMission(m5);
check('authorize resumes + completes loop', auth5.ok && m5.status === 'READY_FOR_DONE' && m5.nodes.every(n => n.state === 'SUCCEEDED'));
check('authorize recorded assumption claim', m5.claims.some(c => c.category === 'ASSUMED' && /authorization/i.test(c.claim)));
check('done-check passes after authorized run', L.doneCheck(m5).length === 0);

/* --- done-check failures --- */
const m6 = mk({});
check('done-check fails on DRAFT (loop not run)', L.doneCheck(m6).length > 0);
check('complete on DRAFT refused', L.completeMission(m6).ok === false);
const m7 = mk({});
L.runMission(m7);
m7.claims[0].evidence = '';
check('done-check fails with unevidenced claim', L.doneCheck(m7).length > 0);

/* --- export / import --- */
const m8 = mk({});
L.runMission(m8);
const exported = L.exportState([m8]);
check('export parses + round-trips', (() => { const r = L.importState(exported); return r.ok && r.missions.length === 1 && r.missions[0].title === m8.title; })());
check('import: invalid JSON refused', L.importState('{nope').ok === false);
check('import: wrong app refused', L.importState(JSON.stringify({ app: 'other', version: 1, missions: [] })).ok === false);
check('import: wrong version refused', L.importState(JSON.stringify({ app: 'titan-antigravity', version: 99, missions: [] })).ok === false);
check('import: bad mode refused', (() => { const bad = JSON.parse(exported); bad.missions[0].mode = 'NOPE'; return L.importState(JSON.stringify(bad)).ok === false; })());
check('import: unevidenced claim refused', (() => { const bad = JSON.parse(exported); bad.missions[0].claims[0].evidence = ''; return L.importState(JSON.stringify(bad)).ok === false; })());
check('import: wrong node count refused', (() => { const bad = JSON.parse(exported); bad.missions[0].nodes.pop(); return L.importState(JSON.stringify(bad)).ok === false; })());

/* --- search / filter --- */
check('searchRoles finds QA by name', L.searchRoles('qa', 'All').some(r => r.id === 'QA'));
check('searchRoles domain filter works', L.searchRoles('', 'Security').every(r => r.domain === 'Security') && L.searchRoles('', 'Security').length === 5);
check('searchRoles no-match empty', L.searchRoles('zzz-no-match', 'All').length === 0);
check('searchSkills finds threat modeling', L.searchSkills('threat', 'All').some(s => s.id === 'sk-threat-model'));
check('searchSkills family filter works', L.searchSkills('', '7.7 AI & agent').every(s => s.family === '7.7 AI & agent') && L.searchSkills('', '7.7 AI & agent').length === 15);
check('roleDomains lists 10 domains', L.roleDomains().length === 10, L.roleDomains().join(','));

/* --- seed missions --- */
const seeds = L.seedMissions();
check('seed: 2 demo missions', seeds.length === 2 && seeds.every(m => m.demo === true));
check('seed: first pre-run to READY_FOR_DONE', seeds[0].status === 'READY_FOR_DONE');
check('seed: second stays DRAFT', seeds[1].status === 'DRAFT');
check('seed: first has 15 claims', seeds[0].claims.length === 15);

/* --- real LLM via OpenRouter (js/llm.js) --- */
const LLM = ctx.TITAN_LLM;
check('llm: default model is nemotron free', LLM.DEFAULT_MODEL === 'nvidia/nemotron-3-ultra-550b-a55b', LLM.DEFAULT_MODEL);
check('llm: endpoint is OpenRouter', LLM.OPENROUTER_URL === 'https://openrouter.ai/api/v1/chat/completions');
check('llm: validateModelId accepts default', LLM.validateModelId('nvidia/nemotron-3-ultra-550b-a55b'));
check('llm: validateModelId accepts custom', LLM.validateModelId('openai/gpt-4o-mini'));
check('llm: validateModelId rejects empty', !LLM.validateModelId(''));
check('llm: validateModelId rejects spaces', !LLM.validateModelId('foo bar'));
check('llm: validateModelId rejects injection chars', !LLM.validateModelId('a"; DROP TABLE x'));
check('llm: validateApiKey accepts plausible key', LLM.validateApiKey('TESTKEY-FAKE-1234567890ABCDEF'));
check('llm: validateApiKey rejects empty', !LLM.validateApiKey(''));
check('llm: validateApiKey rejects whitespace', !LLM.validateApiKey('abc def'));
check('llm: validateApiKey rejects short', !LLM.validateApiKey('short'));

const mLlm = mk({ title: 'LLM mission', objective: 'Test the LLM path' });
const sysPrompt = LLM.buildSystemPrompt(mLlm);
check('llm: system prompt mentions mission + evidence doctrine', sysPrompt.includes('LLM mission') && /evidence/i.test(sysPrompt) && /never claim verification/i.test(sysPrompt));
check('llm: system prompt never mentions keys', !/api[-_ ]?key/i.test(sysPrompt));
check('llm: system prompt asks for structured JSON', sysPrompt.includes('findings') && sysPrompt.includes('evidenceBasis'));
check('llm: user prompt carries mission', LLM.buildUserPrompt(mLlm).includes('Test the LLM path'));

const reqOk = LLM.buildChatRequest({ model: LLM.DEFAULT_MODEL, messages: [{ role: 'system', content: 's' }, { role: 'user', content: 'u' }], temperature: 0.2, maxTokens: 100, foo: 1 });
check('llm: buildChatRequest ok + strips extras', reqOk.ok && reqOk.payload.model === LLM.DEFAULT_MODEL && reqOk.payload.stream === false && !('foo' in reqOk.payload) && reqOk.payload.max_tokens === 100);
check('llm: buildChatRequest rejects bad model', !LLM.buildChatRequest({ model: 'bad model', messages: [{ role: 'user', content: 'x' }] }).ok);
check('llm: buildChatRequest rejects empty messages', !LLM.buildChatRequest({ model: LLM.DEFAULT_MODEL, messages: [] }).ok);
check('llm: buildChatRequest rejects bad role', !LLM.buildChatRequest({ model: LLM.DEFAULT_MODEL, messages: [{ role: 'evil', content: 'x' }] }).ok);
check('llm: buildChatRequest rejects bad temperature', !LLM.buildChatRequest({ model: LLM.DEFAULT_MODEL, messages: [{ role: 'user', content: 'x' }], temperature: 9 }).ok);

const goodResp = { choices: [{ message: { role: 'assistant', content: 'Hello analysis' } }], usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } };
const pr = LLM.parseLlmResponse(goodResp, LLM.DEFAULT_MODEL);
check('llm: parseLlmResponse ok + usage + excerpt', pr.ok && pr.data.content === 'Hello analysis' && pr.data.usage.total_tokens === 15 && pr.data.rawExcerpt === 'Hello analysis');
check('llm: parseLlmResponse rejects no choices', !LLM.parseLlmResponse({}, LLM.DEFAULT_MODEL).ok);
check('llm: parseLlmResponse rejects empty content', !LLM.parseLlmResponse({ choices: [{ message: { content: '  ' } }] }, LLM.DEFAULT_MODEL).ok);
check('llm: parseLlmResponse truncates excerpt to 500', (() => { const r = LLM.parseLlmResponse({ choices: [{ message: { content: 'x'.repeat(900) } }] }, LLM.DEFAULT_MODEL); return r.ok && r.data.rawExcerpt.length === 500; })());
check('llm: parseLlmResponse tolerates missing usage', LLM.parseLlmResponse({ choices: [{ message: { content: 'ok' } }] }, LLM.DEFAULT_MODEL).ok);

const analysisJson = JSON.stringify({ findings: [{ text: 'Finding one', evidenceBasis: 'Basis one' }], risks: [{ text: 'Risk one', evidenceBasis: 'Basis two' }], actions: [{ text: 'Do the thing', evidenceBasis: 'Basis three' }] });
const pa = LLM.parseAnalysis(analysisJson, LLM.DEFAULT_MODEL, goodResp.usage);
check('llm: parseAnalysis yields 3 claims', pa.claims.length === 3, String(pa.claims.length));
check('llm: parseAnalysis sources are openrouter:<model>', pa.claims.every(c => c.source === 'openrouter:' + LLM.DEFAULT_MODEL));
check('llm: parseAnalysis evidence carries usage + excerpt', pa.claims.every(c => c.evidence.includes('Tokens:') && c.evidence.includes('Raw excerpt:') && c.evidence.includes('total 15')));
check('llm: parseAnalysis categories are INFERRED/ASSUMED only', pa.claims.every(c => c.category === 'INFERRED' || c.category === 'ASSUMED'));
check('llm: parseAnalysis actions become ASSUMED', pa.claims.filter(c => c.claim === 'Do the thing')[0].category === 'ASSUMED');
check('llm: parseAnalysis claims carry llm metadata', pa.claims.every(c => c.llm && c.llm.model === LLM.DEFAULT_MODEL && typeof c.llm.excerpt === 'string'));
check('llm: parseAnalysis caps at 6 claims', (() => { const big = { findings: [], risks: [], actions: [] }; for (let i = 0; i < 5; i++) { big.findings.push({ text: 'F' + i, evidenceBasis: 'B' }); big.risks.push({ text: 'R' + i, evidenceBasis: 'B' }); big.actions.push({ text: 'A' + i, evidenceBasis: 'B' }); } return LLM.parseAnalysis(JSON.stringify(big), LLM.DEFAULT_MODEL, null).claims.length === 6; })());
check('llm: parseAnalysis handles fenced json', LLM.parseAnalysis('```json\n' + analysisJson + '\n```', LLM.DEFAULT_MODEL, null).claims.length === 3);
check('llm: parseAnalysis unstructured -> single fallback claim', (() => { const r = LLM.parseAnalysis('Just some prose, no JSON here.', LLM.DEFAULT_MODEL, null); return r.claims.length === 1 && r.claims[0].category === 'INFERRED'; })());

check('llm: 400 -> BAD_REQUEST', LLM.classifyOpenRouterError(400, '').code === 'BAD_REQUEST');
check('llm: 401 -> INVALID_KEY', LLM.classifyOpenRouterError(401, '').code === 'INVALID_KEY');
check('llm: 402 -> CREDITS', LLM.classifyOpenRouterError(402, '').code === 'CREDITS');
check('llm: 403 -> FORBIDDEN', LLM.classifyOpenRouterError(403, '').code === 'FORBIDDEN');
check('llm: 404 -> MODEL_NOT_FOUND', LLM.classifyOpenRouterError(404, '').code === 'MODEL_NOT_FOUND');
check('llm: 429 -> RATE_LIMIT', LLM.classifyOpenRouterError(429, '').code === 'RATE_LIMIT');
check('llm: 502 -> UPSTREAM', LLM.classifyOpenRouterError(502, '').code === 'UPSTREAM');
check('llm: 401 message carries fix', LLM.classifyOpenRouterError(401, '').fix.length > 0);
check('llm: fetch abort -> TIMEOUT', LLM.classifyFetchError({ name: 'AbortError' }).code === 'TIMEOUT');
check('llm: fetch type error -> UNREACHABLE', LLM.classifyFetchError({ name: 'TypeError', message: 'fetch failed' }).code === 'UNREACHABLE');

/* --- LLM claims through the evidence gates (logic.js) --- */
const mLlm2 = mk({});
check('llm claim: metadata preserved', (() => { const r = L.addClaim(mLlm2, { claim: 'LLM finding', category: 'INFERRED', evidence: 'Basis + tokens.', source: 'openrouter:test-model', llm: { model: 'test-model', usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 }, excerpt: 'raw' } }); return r.ok && mLlm2.claims[mLlm2.claims.length - 1].llm && mLlm2.claims[mLlm2.claims.length - 1].llm.model === 'test-model'; })());
check('llm claim: VERIFIED downgraded to INFERRED', (() => { const mm = mk({}); L.addClaim(mm, { claim: 'V claim', category: 'VERIFIED', evidence: 'e', source: 'openrouter:m', llm: { model: 'm', usage: null, excerpt: 'x' } }); const c = mm.claims[mm.claims.length - 1]; return c.category === 'INFERRED' && /Downgraded/.test(c.limitations); })());
check('llm claim: bad metadata refused', !L.addClaim(mk({}), { claim: 'X', category: 'INFERRED', evidence: 'e', llm: { nope: 1 } }).ok);
check('llm claim: non-llm VERIFIED still allowed', (() => { const mm = mk({}); const r = L.addClaim(mm, { claim: 'V', category: 'VERIFIED', evidence: 'code check' }); return r.ok && mm.claims[mm.claims.length - 1].category === 'VERIFIED'; })());

/* --- callOpenRouter with fake fetch (async) --- */
(async function () {
  const fakeKey = 'TESTKEY-FAKE-1234567890ABCDEF';
  const payload = LLM.buildChatRequest({ model: LLM.DEFAULT_MODEL, messages: [{ role: 'user', content: 'hi' }] }).payload;
  const seen = [];
  function fakeOk(url, opts) {
    seen.push({ url, opts });
    return Promise.resolve({ status: 200, text: () => Promise.resolve(JSON.stringify({ choices: [{ message: { content: 'ok analysis' } }], usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 } })) });
  }
  const okRes = await LLM.callOpenRouter({ apiKey: fakeKey, payload, fetchImpl: fakeOk, referer: 'https://example.test/app' });
  check('llm call: success returns content + usage', okRes.ok && okRes.data.content === 'ok analysis' && okRes.data.usage.total_tokens === 3);
  check('llm call: posts to OpenRouter URL', seen.length === 1 && seen[0].url === 'https://openrouter.ai/api/v1/chat/completions');
  check('llm call: Authorization + Referer + X-Title headers', seen[0].opts.headers['Authorization'] === 'Bearer ' + fakeKey && seen[0].opts.headers['HTTP-Referer'] === 'https://example.test/app' && seen[0].opts.headers['X-Title'] === 'TITAN Antigravity');
  check('llm call: key never in request body', !JSON.stringify(seen[0].opts.body).includes(fakeKey));
  check('llm call: key never in error objects (401 path)', await (async () => {
    const r = await LLM.callOpenRouter({ apiKey: fakeKey, payload, fetchImpl: () => Promise.resolve({ status: 401, text: () => Promise.resolve('{"error":{"message":"No auth credentials found"}}') }), referer: 'https://example.test/app' });
    return !r.ok && r.error.code === 'INVALID_KEY' && !JSON.stringify(r.error).includes(fakeKey);
  })());
  check('llm call: 429 retries once then succeeds', await (async () => {
    let n = 0;
    const r = await LLM.callOpenRouter({ apiKey: fakeKey, payload, fetchImpl: () => { n++; if (n === 1) return Promise.resolve({ status: 429, text: () => Promise.resolve('{}') }); return fakeOk('u', {}); }, referer: 'x', sleepFn: () => Promise.resolve() });
    return r.ok && n === 2;
  })());
  check('llm call: 429 twice -> RATE_LIMIT error', await (async () => {
    const r = await LLM.callOpenRouter({ apiKey: fakeKey, payload, fetchImpl: () => Promise.resolve({ status: 429, text: () => Promise.resolve('{}') }), referer: 'x', sleepFn: () => Promise.resolve() });
    return !r.ok && r.error.code === 'RATE_LIMIT';
  })());
  check('llm call: fetch rejection -> UNREACHABLE', await (async () => {
    const r = await LLM.callOpenRouter({ apiKey: fakeKey, payload, fetchImpl: () => Promise.reject({ name: 'TypeError', message: 'fetch failed' }), referer: 'x' });
    return !r.ok && r.error.code === 'UNREACHABLE';
  })());
  check('llm call: missing fetch -> NO_FETCH', await (async () => {
    const r = await LLM.callOpenRouter({ apiKey: fakeKey, payload, fetchImpl: null, referer: 'x' });
    return !r.ok && r.error.code === 'NO_FETCH';
  })());
  check('llm call: missing key -> NO_KEY', await (async () => {
    const r = await LLM.callOpenRouter({ apiKey: '', payload, fetchImpl: fakeOk, referer: 'x' });
    return !r.ok && r.error.code === 'NO_KEY';
  })());

  console.log('\nRESULT: ' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed ? 1 : 0);
})();
