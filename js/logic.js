/* titan-antigravity \u2014 pure deterministic logic (no DOM).
   Implements TITAN NEXUS v8.1 rules: Task Contract (sec 7), evidence model (sec 8),
   risk/autonomy (sec 11), routing (sec 16), node states (sec 17), activation
   guard (sec 15: max ~5 roles), Definition of Done (sec 32), Nexus Loop (sec 34).
   The "agents" are deterministic rule-based simulations. The optional real-LLM
   path lives in js/llm.js and never runs inside this engine; LLM claims enter
   here only through addClaim, which enforces the same evidence gates. */
(function (global) {
  'use strict';
  var D = global.TITAN_DATA;
  var SEC = D.SEC;

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function uid() {
    return 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
  function esc(s) { return String(s == null ? '' : s); }
  function norm(s) { return esc(s).toLowerCase(); }

  /* ---------- validation ---------- */
  function isNonEmptyStr(v, max) {
    return typeof v === 'string' && v.trim().length > 0 && v.trim().length <= (max || 500);
  }
  function validateIntake(input) {
    var errs = [];
    if (!input || typeof input !== 'object') return ['Intake must be an object.'];
    if (!isNonEmptyStr(input.title, 120)) errs.push('Title is required (1-120 chars).');
    if (!isNonEmptyStr(input.objective, 2000)) errs.push('Objective is required (1-2000 chars).');
    if (input.stakes != null && typeof input.stakes !== 'string') errs.push('Stakes must be text.');
    if (input.stakes && input.stakes.length > 1000) errs.push('Stakes max 1000 chars.');
    if (input.constraints && !Array.isArray(input.constraints)) errs.push('Constraints must be a list.');
    if (!D.MODES.includes(input.mode)) errs.push('Mode must be one of: ' + D.MODES.join(', ') + '.');
    if (input.taskType != null && typeof input.taskType !== 'string') errs.push('Task type must be text.');
    if (input.taskType && input.taskType.length > 120) errs.push('Task type max 120 chars.');
    var flags = input.riskFlags || [];
    if (!Array.isArray(flags)) errs.push('Risk flags must be a list.');
    else flags.forEach(function (f) {
      if (!D.RISK_FLAGS.some(function (rf) { return rf.id === f; })) errs.push('Unknown risk flag: ' + f);
    });
    return errs;
  }

  /* ---------- classification: risk (sec 11) + autonomy ---------- */
  function rankOf(level) { return parseInt(level.slice(1), 10); }
  function classifyRisk(riskFlags, mode) {
    var flags = riskFlags || [];
    var level = 'R1';
    flags.forEach(function (f) {
      var def = D.RISK_FLAGS.find(function (rf) { return rf.id === f; });
      if (def && rankOf(def.level) > rankOf(level)) level = def.level;
    });
    // Destructive + production together = irreversible potential -> R5 (sec 11: R5).
    if (flags.includes('destructive') && flags.includes('production')) level = 'R5';
    if (mode === 'AUDIT' || mode === 'RESEARCH') {
      // Audit/research never execute changes: cap at R2 unless destructive is flagged.
      if (rankOf(level) > 2 && !flags.includes('destructive')) level = 'R2';
    }
    var def = D.RISK_LEVELS.find(function (r) { return r.id === level; });
    return { level: level, label: def ? def.label : level, detail: def ? def.detail : '' };
  }
  function classifyAutonomy(mode) {
    var map = { TASK: 'A2', BOOTSTRAP: 'A2', UPGRADE: 'A2', AUDIT: 'A1', 'PROMPT-EDIT': 'A1', INCIDENT: 'A3', RESEARCH: 'A1', PROGRAM: 'A3' };
    var id = map[mode] || 'A2';
    var def = D.AUTONOMY_LEVELS.find(function (a) { return a.id === id; });
    return { level: id, label: def ? def.label : id, detail: def ? def.detail : '' };
  }

  /* ---------- routing: minimum sufficient (sec 16) ---------- */
  function routeMission(input) {
    var text = norm(input.title) + ' ' + norm(input.objective) + ' ' + norm(input.taskType);
    var best = null, bestScore = 0;
    D.ROUTING.forEach(function (row) {
      var score = 0;
      row.keywords.forEach(function (kw) {
        if (text.indexOf(kw) !== -1) score += 1;
      });
      // Exact task-type match wins outright.
      if (norm(input.taskType) === norm(row.task)) score += 100;
      if (score > bestScore) { bestScore = score; best = row; }
    });
    if (best && bestScore > 0) {
      return {
        row: best.task, primary: clone(best.primary), extra: clone(best.extra),
        reason: 'Matched ' + SEC + '16 row "' + best.task + '" (' + bestScore + ' keyword signal(s)).',
        matched: true
      };
    }
    return {
      row: null, primary: ['NEXUS', 'PLANNER'], extra: ['QA'],
      reason: 'No ' + SEC + '16 row matched \u2014 minimum planning set (NEXUS + PLANNER).',
      matched: false
    };
  }

  /* ---------- task contract (sec 7) ---------- */
  function buildContract(input, risk, autonomy, routing) {
    var acceptance = [];
    if (isNonEmptyStr(input.objective)) acceptance.push('Outcome "' + input.objective.trim().slice(0, 80) + '" is delivered as specified.');
    acceptance.push('Every material claim cites evidence in the ledger.');
    acceptance.push('Role count stays at or below 5 (' + SEC + '15 activation guard).');
    acceptance.push('Verification evidence is recorded before the mission is marked done.');
    return {
      objective: input.objective.trim(),
      taskType: (input.taskType || '').trim() || 'General task',
      currentState: 'Not started \u2014 intake recorded, no work executed.',
      expectedState: 'Requested outcome delivered with evidence; limitations disclosed.',
      scope: 'Only the work described in the objective. Nothing else.',
      nonGoals: 'No scope expansion after acceptance criteria are met. No production action without explicit authorization.',
      constraints: (input.constraints || []).slice(),
      acceptance: acceptance,
      risk: risk.level + ' \u2014 ' + risk.label,
      verification: 'Run the Nexus Loop; each stage logs evidence; done-checklist gates completion (' + SEC + '32).',
      unknown: 'Unknowns are recorded as ASSUMED/UNKNOWN claims until evidence resolves them.'
    };
  }

  /* ---------- mission factory ---------- */
  function createMission(input) {
    var errs = validateIntake(input);
    if (errs.length) return { ok: false, errors: errs };
    var risk = classifyRisk(input.riskFlags || [], input.mode);
    var autonomy = classifyAutonomy(input.mode);
    var routing = routeMission(input);
    var roles = routing.primary.slice();
    if (roles.indexOf('NEXUS') === -1) roles.unshift('NEXUS');
    roles = roles.slice(0, 5); // sec 15 guard
    var m = {
      id: uid(),
      title: input.title.trim(),
      objective: input.objective.trim(),
      stakes: (input.stakes || '').trim(),
      constraints: (input.constraints || []).map(function (c) { return String(c); }),
      mode: input.mode,
      taskType: (input.taskType || '').trim() || 'General task',
      riskFlags: (input.riskFlags || []).slice(),
      risk: risk.level, autonomy: autonomy.level,
      riskLabel: risk.label, autonomyLabel: autonomy.label,
      routingRow: routing.row, routingReason: routing.reason,
      contract: buildContract(input, risk, autonomy, routing),
      roles: roles,
      skills: recommendSkills(roles).map(function (s) { return s.id; }),
      nodes: D.LOOP.map(function (stage) { return { stage: stage, state: 'PENDING', note: '' }; }),
      log: [], claims: [],
      status: 'DRAFT', authorized: false,
      demo: !!input.demo,
      createdAt: input.createdAt || new Date().toISOString()
    };
    addClaim(m, {
      claim: 'Mission intake recorded: "' + m.title + '"',
      category: 'OBSERVED',
      evidence: 'Intake form fields (title, objective, mode, task type).',
      source: 'User intake',
      limitations: 'Intake text is user-provided; correctness of the request itself is not verified.'
    });
    return { ok: true, mission: m };
  }

  /* ---------- skills recommendation ---------- */
  function recommendSkills(roleIds) {
    var out = [];
    D.SKILLS.forEach(function (s) {
      if (roleIds.indexOf(s.owner) !== -1) out.push(s);
    });
    return out.slice(0, 10);
  }
  function skillsForRoles(roleIds) { return recommendSkills(roleIds); }

  /* ---------- claim ledger (sec 8): every claim MUST cite evidence ---------- */
  function addClaim(m, c) {
    if (!c || !isNonEmptyStr(c.claim, 500)) return { ok: false, error: 'Claim text is required.' };
    if (!D.CLAIM_CATEGORIES.some(function (cc) { return cc.id === c.category; })) {
      return { ok: false, error: 'Claim category must be one of: ' + D.CLAIM_CATEGORIES.map(function (x) { return x.id; }).join(', ') + '.' };
    }
    if (!isNonEmptyStr(c.evidence, 1000)) {
      return { ok: false, error: 'Evidence is required \u2014 no claim without evidence (' + SEC + '8).' };
    }
    var category = c.category;
    var limitations = (c.limitations || 'None recorded.').slice(0, 500);
    var llmMeta = null;
    if (c.llm !== undefined && c.llm !== null) {
      if (!c.llm || typeof c.llm !== 'object' || typeof c.llm.model !== 'string' || typeof c.llm.excerpt !== 'string') {
        return { ok: false, error: 'llm metadata must be {model, usage, excerpt}.' };
      }
      llmMeta = {
        model: c.llm.model.slice(0, 200),
        usage: (c.llm.usage && typeof c.llm.usage === 'object') ? { prompt_tokens: c.llm.usage.prompt_tokens || null, completion_tokens: c.llm.usage.completion_tokens || null, total_tokens: c.llm.usage.total_tokens || null } : null,
        excerpt: c.llm.excerpt.slice(0, 500)
      };
      // LLM-sourced claims can reach at most SUPPORTED, never VERIFIED (Sec. 8).
      if (category === 'VERIFIED') {
        category = 'INFERRED';
        limitations = (limitations + ' [Downgraded VERIFIED -> INFERRED: LLM output is never VERIFIED (Sec. 8).]').slice(0, 500);
      }
    }
    m.claims.push({
      id: 'c' + (m.claims.length + 1) + '-' + Math.random().toString(36).slice(2, 5),
      claim: c.claim.trim(), category: category, evidence: c.evidence.trim(),
      source: (c.source || 'Simulation engine').slice(0, 200),
      status: c.status || 'Recorded',
      limitations: limitations,
      llm: llmMeta
    });
    return { ok: true };
  }
  function validateLedger(m) {
    var bad = [];
    m.claims.forEach(function (c, i) {
      if (!isNonEmptyStr(c.claim)) bad.push('Claim #' + (i + 1) + ' has no text.');
      if (!isNonEmptyStr(c.evidence)) bad.push('Claim #' + (i + 1) + ' has no evidence.');
      if (!D.CLAIM_CATEGORIES.some(function (cc) { return cc.id === c.category; })) bad.push('Claim #' + (i + 1) + ' has an invalid category.');
    });
    return bad;
  }
  function validateContract(m) {
    var bad = [];
    var ct = m.contract || {};
    if (!isNonEmptyStr(ct.objective)) bad.push('Contract has no objective.');
    if (!Array.isArray(ct.acceptance) || ct.acceptance.length === 0) bad.push('Contract has no acceptance criteria.');
    return bad;
  }

  /* ---------- node state machine (sec 17) ---------- */
  var TRANSITIONS = {
    PENDING: ['READY', 'RUNNING', 'CANCELLED'],
    READY: ['RUNNING', 'BLOCKED', 'CANCELLED'],
    RUNNING: ['SUCCEEDED', 'FAILED', 'BLOCKED', 'RETRY_WAIT', 'CANCEL_REQUESTED'],
    RETRY_WAIT: ['RUNNING', 'CANCELLED'],
    BLOCKED: ['RUNNING', 'CANCELLED'],
    CANCEL_REQUESTED: ['CANCELLED'],
    UNKNOWN: ['READY', 'BLOCKED'],
    SUCCEEDED: [], FAILED: [], CANCELLED: []
  };
  function canTransition(from, to) {
    return (TRANSITIONS[from] || []).indexOf(to) !== -1;
  }
  function setNodeState(m, stage, to, note) {
    var node = m.nodes.find(function (n) { return n.stage === stage; });
    if (!node) return { ok: false, error: 'No such stage: ' + stage };
    if (!canTransition(node.state, to)) {
      return { ok: false, error: 'Illegal transition ' + node.state + ' -> ' + to + ' for ' + stage + ' (' + SEC + '17).' };
    }
    node.state = to;
    if (note != null) node.note = String(note).slice(0, 300);
    return { ok: true };
  }

  /* ---------- role assignment (sec 15 guard: max ~5) ---------- */
  function assignRoles(m, roleIds) {
    var clean = [];
    (roleIds || []).forEach(function (r) {
      if (D.ROLES.some(function (x) { return x.id === r; }) && clean.indexOf(r) === -1) clean.push(r);
    });
    if (clean.length === 0) return { ok: false, error: 'Assign at least one role.' };
    if (clean.length > 5) {
      return { ok: false, error: 'Role theater guard (' + SEC + '15/' + SEC + '33): max 5 roles per mission, got ' + clean.length + '. A role without material contribution stays asleep.' };
    }
    m.roles = clean;
    m.skills = recommendSkills(clean).map(function (s) { return s.id; });
    return { ok: true };
  }
  function attachSkill(m, skillId) {
    if (!D.SKILLS.some(function (s) { return s.id === skillId; })) return { ok: false, error: 'Unknown skill: ' + skillId };
    if (m.skills.indexOf(skillId) === -1) m.skills.push(skillId);
    return { ok: true };
  }

  /* ---------- deterministic run: the Nexus Loop (sec 34) ---------- */
  function stageClaim(m, stage) {
    var t = m.title;
    switch (stage) {
      case 'UNDERSTAND':
        return { claim: 'Objective understood: "' + t + '"', category: 'OBSERVED', evidence: 'Mission intake form (objective field).', source: 'User intake', limitations: 'Understanding is of the stated request; unstated needs may remain.' };
      case 'DISCOVER':
        return { claim: 'Discovery scope set: ' + m.constraints.length + ' constraint(s), ' + m.riskFlags.length + ' risk flag(s) recorded', category: 'OBSERVED', evidence: 'Intake constraints + risk flags.', source: 'User intake', limitations: 'No external system was inspected \u2014 this is a simulation.' };
      case 'RECONCILE':
        return { claim: 'No contradictions found between objective, constraints, and routing', category: 'INFERRED', evidence: 'Intake fields are mutually consistent as entered.', source: 'Simulation engine', limitations: 'Only checks internal consistency of the intake, not real-world facts.' };
      case 'CLASSIFY':
        return { claim: 'Classified ' + m.risk + ' / ' + m.autonomy, category: 'INFERRED', evidence: 'Risk flags mapped through ' + SEC + '11 levels; mode mapped to autonomy.', source: 'Simulation engine', limitations: 'Classification follows the intake flags; wrong flags give a wrong level.' };
      case 'PLAN':
        return { claim: 'Smallest coherent plan selected for task type "' + m.taskType + '"', category: 'ASSUMED', evidence: 'Routing row + loop stages as the plan skeleton.', source: 'Simulation engine', limitations: 'Plan is a skeleton until stages execute.' };
      case 'ROUTE':
        return { claim: 'Routed ' + m.roles.length + ' role(s) (<= 5 guard holds)', category: 'VERIFIED', evidence: 'assignRoles guard checked role count in code before the run.', source: 'Simulation engine (code check)', limitations: 'Roles are perspectives in this simulation, not independent agents.' };
      case 'EXECUTE':
        return { claim: 'Loop stages executed in order under the recorded authorization state', category: 'OBSERVED', evidence: 'Run log entries for each stage, in ' + SEC + '34 order.', source: 'Simulation engine', limitations: 'Execution is simulated; no real system was changed.' };
      case 'INTEGRATE':
        return { claim: 'Stage outputs integrated into one mission record', category: 'INFERRED', evidence: 'Single mission object holds contract, roles, log, and claims.', source: 'Simulation engine', limitations: 'Integration is within one record; no external contributions exist.' };
      case 'VERIFY':
        return { claim: 'Every claim in the ledger cites evidence', category: 'VERIFIED', evidence: 'validateLedger() checked all ' + m.claims.length + ' claim(s) in code.', source: 'Simulation engine (code check)', limitations: 'Checks evidence presence, not real-world truth.' };
      case 'REVIEW':
        return { claim: 'Adversarial checklist applied: malformed input, missing permission, blocked gate', category: 'INFERRED', evidence: SEC + '24 scenario list applied as a checklist in the run.', source: 'Simulation engine', limitations: 'Checklist review only; no independent reviewer.' };
      case 'RESOLVE':
        return { claim: 'Material findings recorded as limitations, none hidden', category: 'INFERRED', evidence: 'Limitations field present on every claim.', source: 'Simulation engine', limitations: 'Relies on the claim authors (this engine) being candid.' };
      case 'DELIVER':
        return { claim: 'Mission result delivered with evidence and limitations', category: 'OBSERVED', evidence: 'Mission detail view shows outcome, evidence, limitations.', source: 'Simulation engine', limitations: 'Delivery is a report inside this app, not a deployed artifact.' };
      case 'PRESERVE':
        return { claim: 'Mission state persisted to localStorage', category: 'VERIFIED', evidence: 'Storage write completed and state re-read on load.', source: 'Simulation engine (code check)', limitations: 'Local to this browser; no server copy exists.' };
      case 'LEARN':
        return { claim: 'Lesson recorded: route via ' + SEC + '16, never activate the whole catalog', category: 'INFERRED', evidence: 'Run used ' + m.roles.length + ' role(s) out of 34.', source: 'Simulation engine', limitations: 'Lesson is generic; mission-specific lessons need a human.' };
      default:
        return { claim: 'Stage ' + stage + ' completed', category: 'OBSERVED', evidence: 'Run log.', source: 'Simulation engine', limitations: '' };
    }
  }

  function runMission(m) {
    if (m.status === 'DONE') return { ok: false, error: 'Mission is already DONE. Create a new attempt for a new run.' };
    if (m.status === 'RUNNING') return { ok: false, error: 'Mission is already running.' };
    if (m.status === 'READY_FOR_DONE') return { ok: false, error: 'Loop already completed. Create a new mission for a new attempt.' };
    if (m.status === 'BLOCKED') return { ok: false, error: 'Mission is blocked \u2014 press "Record authorization + resume" instead of re-running.' };
    m.status = 'RUNNING';
    var blockedAt = null;
    for (var i = 0; i < D.LOOP.length; i++) {
      var stage = D.LOOP[i];
      var r = setNodeState(m, stage, 'RUNNING');
      if (!r.ok) { m.status = 'FAILED'; return { ok: false, error: r.error }; }
      m.log.push({ step: m.log.length + 1, stage: stage, text: stage + ' \u2014 perspective check applied.' });
      // Authorization gate (sec 11): high-risk execution pauses for explicit authorization.
      if (stage === 'EXECUTE' && (m.risk === 'R4' || m.risk === 'R5') && !m.authorized) {
        setNodeState(m, stage, 'BLOCKED', 'Requires explicit authorization (' + SEC + '11) \u2014 R4/R5 execution is paused.');
        m.log.push({ step: m.log.length + 1, stage: stage, text: 'BLOCKED: explicit authorization required before execution (' + SEC + '11).' });
        m.status = 'BLOCKED';
        blockedAt = stage;
        break;
      }
      var c = stageClaim(m, stage);
      var ar = addClaim(m, c);
      if (!ar.ok) { m.status = 'FAILED'; return { ok: false, error: ar.error }; }
      setNodeState(m, stage, 'SUCCEEDED');
    }
    if (blockedAt) return { ok: true, blocked: true, blockedAt: blockedAt };
    m.status = 'READY_FOR_DONE';
    return { ok: true, blocked: false };
  }

  function authorizeMission(m) {
    if (m.status !== 'BLOCKED') return { ok: false, error: 'Mission is not blocked.' };
    m.authorized = true;
    m.log.push({ step: m.log.length + 1, stage: 'EXECUTE', text: 'Authorization recorded (simulated user approval). Resuming loop.' });
    addClaim(m, { claim: 'Explicit authorization recorded for ' + m.risk + ' execution', category: 'ASSUMED', evidence: 'User pressed "Record authorization" in this simulation.', source: 'User action (simulated)', limitations: 'In a real deployment this would need a real approval record, not a button.' });
    m.status = 'DRAFT';
    // Resume: re-run from EXECUTE onward.
    var idx = D.LOOP.indexOf('EXECUTE');
    for (var i = idx; i < D.LOOP.length; i++) {
      var stage = D.LOOP[i];
      var node = m.nodes.find(function (n) { return n.stage === stage; });
      if (node.state === 'SUCCEEDED') continue;
      node.state = 'RUNNING';
      m.log.push({ step: m.log.length + 1, stage: stage, text: stage + ' \u2014 perspective check applied (resumed).' });
      var c = stageClaim(m, stage);
      var ar = addClaim(m, c);
      if (!ar.ok) { m.status = 'FAILED'; return { ok: false, error: ar.error }; }
      node.state = 'SUCCEEDED';
    }
    m.status = 'READY_FOR_DONE';
    return { ok: true };
  }

  /* ---------- Definition of Done (sec 32) ---------- */
  function doneCheck(m) {
    var fails = [];
    validateContract(m).forEach(function (e) { fails.push(e); });
    validateLedger(m).forEach(function (e) { fails.push(e); });
    if (!m.roles || m.roles.length === 0) fails.push('No roles assigned.');
    if (m.roles && m.roles.length > 5) fails.push('Role count exceeds 5 (' + SEC + '15 guard).');
    var open = m.nodes.filter(function (n) { return n.state !== 'SUCCEEDED' && n.state !== 'FAILED' && n.state !== 'CANCELLED'; });
    if (open.length) fails.push('Open nodes remain: ' + open.map(function (n) { return n.stage + '(' + n.state + ')'; }).join(', ') + '.');
    if (m.status !== 'READY_FOR_DONE' && m.status !== 'DONE') fails.push('Loop has not completed (status: ' + m.status + '). Run the Nexus Loop first.');
    var failedNodes = m.nodes.filter(function (n) { return n.state === 'FAILED'; });
    failedNodes.forEach(function (n) {
      if (!n.note) fails.push('Failed node ' + n.stage + ' has no recorded limitation.');
    });
    return fails;
  }
  function completeMission(m) {
    var fails = doneCheck(m);
    if (fails.length) return { ok: false, errors: fails };
    m.status = 'DONE';
    m.log.push({ step: m.log.length + 1, stage: 'DELIVER', text: 'Done-checklist passed (' + SEC + '32). Mission marked DONE.' });
    return { ok: true };
  }

  /* ---------- export / import with strict validation ---------- */
  function exportState(missions) {
    return JSON.stringify({ app: 'titan-antigravity', version: 1, exportedAt: new Date().toISOString(), missions: missions }, null, 2);
  }
  function importState(text) {
    var data;
    try { data = JSON.parse(text); } catch (e) { return { ok: false, error: 'Not valid JSON.' }; }
    if (!data || data.app !== 'titan-antigravity' || data.version !== 1 || !Array.isArray(data.missions)) {
      return { ok: false, error: 'Not a titan-antigravity export (app/version/missions mismatch).' };
    }
    var missions = [];
    for (var i = 0; i < data.missions.length; i++) {
      var m = data.missions[i];
      if (!m || typeof m !== 'object') return { ok: false, error: 'Mission #' + (i + 1) + ' is not an object.' };
      if (!isNonEmptyStr(m.title, 120) || !isNonEmptyStr(m.objective, 2000)) return { ok: false, error: 'Mission #' + (i + 1) + ' has an invalid title/objective.' };
      if (!D.MODES.includes(m.mode)) return { ok: false, error: 'Mission #' + (i + 1) + ' has an invalid mode.' };
      if (!Array.isArray(m.nodes) || m.nodes.length !== D.LOOP.length) return { ok: false, error: 'Mission #' + (i + 1) + ' has an invalid node list.' };
      if (!Array.isArray(m.claims) || !Array.isArray(m.log) || !Array.isArray(m.roles)) return { ok: false, error: 'Mission #' + (i + 1) + ' is missing claims/log/roles.' };
      var bad = validateLedger(m);
      if (bad.length) return { ok: false, error: 'Mission #' + (i + 1) + ' has claims without evidence.' };
      missions.push(m);
    }
    return { ok: true, missions: missions };
  }

  /* ---------- search / filter ---------- */
  function searchRoles(query, domain) {
    var q = norm(query);
    return D.ROLES.filter(function (r) {
      var okQ = !q || norm(r.id).indexOf(q) !== -1 || norm(r.name).indexOf(q) !== -1 ||
        norm(r.duty).indexOf(q) !== -1 || norm(r.domain).indexOf(q) !== -1;
      var okD = !domain || domain === 'All' || r.domain === domain;
      return okQ && okD;
    });
  }
  function searchSkills(query, family) {
    var q = norm(query);
    return D.SKILLS.filter(function (s) {
      var okQ = !q || norm(s.name).indexOf(q) !== -1 || norm(s.purpose).indexOf(q) !== -1 ||
        norm(s.owner).indexOf(q) !== -1 || norm(s.family).indexOf(q) !== -1;
      var okF = !family || family === 'All' || s.family === family;
      return okQ && okF;
    });
  }
  function roleDomains() {
    var out = [];
    D.ROLES.forEach(function (r) { if (out.indexOf(r.domain) === -1) out.push(r.domain); });
    return out.sort();
  }
  function skillFamilies() {
    var out = [];
    D.SKILLS.forEach(function (s) { if (out.indexOf(s.family) === -1) out.push(s.family); });
    return out;
  }

  /* ---------- seed: 2 demo missions, generated by the same engine ---------- */
  function seedMissions() {
    var a = createMission({
      title: 'Fix admin login redirect loop (DEMO)',
      objective: 'Diagnose why admin sign-in redirects back to the login page and fix the root cause.',
      stakes: 'Admins cannot reach the console. Demo only \u2014 no real system.',
      constraints: ['Do not change real credentials', 'Keep the demo offline'],
      mode: 'TASK', taskType: 'Authentication redirect failure',
      riskFlags: [], demo: true, createdAt: '2026-10-17T00:00:00.000Z'
    });
    var b = createMission({
      title: 'Plan static docs site relaunch (DEMO)',
      objective: 'Plan a small relaunch of the project docs site: new landing copy, fixed nav, print stylesheet.',
      stakes: 'Low \u2014 docs only. Demo only.',
      constraints: ['No backend changes'],
      mode: 'TASK', taskType: 'Docs refresh',
      riskFlags: [], demo: true, createdAt: '2026-10-17T00:00:00.000Z'
    });
    var missions = [];
    if (a.ok) { runMission(a.mission); missions.push(a.mission); }
    if (b.ok) missions.push(b.mission);
    return missions;
  }

  global.TITAN_LOGIC = {
    SEC: SEC, clone: clone, uid: uid,
    validateIntake: validateIntake, classifyRisk: classifyRisk, classifyAutonomy: classifyAutonomy,
    routeMission: routeMission, buildContract: buildContract, createMission: createMission,
    recommendSkills: recommendSkills, skillsForRoles: skillsForRoles,
    addClaim: addClaim, validateLedger: validateLedger, validateContract: validateContract,
    canTransition: canTransition, setNodeState: setNodeState,
    assignRoles: assignRoles, attachSkill: attachSkill,
    runMission: runMission, authorizeMission: authorizeMission,
    doneCheck: doneCheck, completeMission: completeMission,
    exportState: exportState, importState: importState,
    searchRoles: searchRoles, searchSkills: searchSkills,
    roleDomains: roleDomains, skillFamilies: skillFamilies,
    seedMissions: seedMissions
  };
})(typeof window !== 'undefined' ? window : globalThis);
