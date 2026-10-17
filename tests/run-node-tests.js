/* titan-antigravity \u2014 node unit tests. Run: node tests/run-node-tests.js */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ctx = { console: console, JSON: JSON, Math: Math, Date: Date, Array: Array, Object: Object, String: String, Number: Number, parseInt: parseInt };
ctx.window = ctx;
ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of ['../js/data.js', '../js/logic.js']) {
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

console.log('\nRESULT: ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
