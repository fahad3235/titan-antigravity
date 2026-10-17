/* titan-antigravity \u2014 DOM controller. Pure ASCII. */
(function () {
  'use strict';
  var D = window.TITAN_DATA;
  var L = window.TITAN_LOGIC;
  var KEY = 'titan-antigravity-v1';

  var app = document.getElementById('app');
  var view = 'dashboard';
  var selectedId = null;
  var notice = null; // {type:'ok'|'error', text}
  var rosterQ = '', rosterDomain = 'All';
  var skillQ = '', skillFamily = 'All';
  var ledgerCat = 'All';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function riskCls(r) { return 'r' + (r || 'R1').replace('R', ''); }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      var res = L.importState(JSON.stringify({ app: 'titan-antigravity', version: 1, missions: parsed }));
      if (!res.ok) return null;
      return res.missions;
    } catch (e) { return null; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state.missions)); } catch (e) { /* storage full/blocked */ }
  }
  var state = { missions: load() || L.seedMissions() };
  if (!selectedId && state.missions.length) selectedId = state.missions[0].id;
  save();

  function selected() {
    return state.missions.find(function (m) { return m.id === selectedId; }) || state.missions[0] || null;
  }
  function setNotice(type, text) { notice = { type: type, text: text }; }
  function noticeHtml() {
    if (!notice) return '';
    return '<div class="alert ' + (notice.type === 'error' ? 'error' : 'ok') + '">' + esc(notice.text) + '</div>';
  }
  function roleById(id) { return D.ROLES.find(function (r) { return r.id === id; }); }
  function skillById(id) { return D.SKILLS.find(function (s) { return s.id === id; }); }

  /* ---------------- views ---------------- */
  function renderDashboard() {
    var ms = state.missions;
    var done = ms.filter(function (m) { return m.status === 'DONE'; }).length;
    var blocked = ms.filter(function (m) { return m.status === 'BLOCKED'; }).length;
    var claims = ms.reduce(function (n, m) { return n + m.claims.length; }, 0);
    var catCounts = {};
    ms.forEach(function (m) { m.claims.forEach(function (c) { catCounts[c.category] = (catCounts[c.category] || 0) + 1; }); });
    var cats = Object.keys(catCounts).map(function (k) { return k + ': ' + catCounts[k]; }).join(' &middot; ') || 'No claims yet.';
    var rows = ms.map(function (m) {
      return '<tr><td><b>' + esc(m.title) + '</b>' + (m.demo ? ' <span class="chip demo">DEMO</span>' : '') +
        '</td><td>' + esc(m.taskType) + '</td><td><span class="chip ' + riskCls(m.risk) + '">' + esc(m.risk) + '</span></td>' +
        '<td>' + esc(m.status) + '</td><td>' + m.claims.length + ' claims</td>' +
        '<td><button class="btn small ghost" data-action="select" data-id="' + m.id + '">Open</button></td></tr>';
    }).join('');
    return '<h1>Mission Control</h1><p class="lede">NEXUS coordinates. Deterministic simulations execute. ' +
      'Every claim must cite evidence. Nothing here is a real agent, a real LLM, or a production action.</p>' +
      '<div class="grid g4">' +
      '<div class="card"><div class="stat-num">' + ms.length + '</div><div class="stat-label">Missions</div></div>' +
      '<div class="card"><div class="stat-num">' + done + '</div><div class="stat-label">Done (' + D.SEC + '32)</div></div>' +
      '<div class="card"><div class="stat-num">' + blocked + '</div><div class="stat-label">Blocked (need authorization)</div></div>' +
      '<div class="card"><div class="stat-num">' + claims + '</div><div class="stat-label">Evidence-backed claims</div></div></div>' +
      '<div class="card"><h3>Claim mix (' + D.SEC + '8)</h3><p class="muted">' + cats + '</p>' +
      '<p class="small muted">VERIFIED claims in this console come only from real code checks: the role-count guard, ' +
      'the ledger validator, and the storage write. Everything else is OBSERVED, INFERRED, or ASSUMED \u2014 and labeled so.</p></div>' +
      '<div class="card"><h3>CORE LAW pipeline (' + D.SEC + '1)</h3><div class="pipeline">' +
      D.LOOP.map(function (s) { return '<span class="pipe">' + s + '</span>'; }).join('') +
      '</div><p class="small muted">Skip stages only when risk and scope justify it \u2014 never skip VERIFY.</p></div>' +
      '<h2>Recent missions</h2>' +
      (ms.length ? '<div class="card"><table><thead><tr><th>Mission</th><th>Task type</th><th>Risk</th><th>Status</th><th>Evidence</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>'
        : '<div class="empty">No missions yet. Open the Missions tab and create one.</div>');
  }

  function intakeForm() {
    var modeOpts = D.MODES.map(function (m) { return '<option>' + m + '</option>'; }).join('');
    var taskOpts = D.ROUTING.map(function (r) { return '<option value="' + esc(r.task) + '">'; }).join('');
    var flagBoxes = D.RISK_FLAGS.map(function (f) {
      return '<label class="flag"><input type="checkbox" name="riskFlags" value="' + f.id + '"> ' + esc(f.label) + ' (' + f.level + ')</label>';
    }).join('');
    return '<div class="card"><h3>New mission intake \u2014 Task Contract (' + D.SEC + '7)</h3>' +
      '<form id="intakeForm">' +
      '<label for="fTitle">Objective title</label><input id="fTitle" maxlength="120" placeholder="e.g. Fix checkout double-charge" required>' +
      '<label for="fObjective">Objective \u2014 the outcome actually needed</label><textarea id="fObjective" rows="3" maxlength="2000" placeholder="What outcome, for whom, by when?" required></textarea>' +
      '<label for="fStakes">Stakes (optional)</label><input id="fStakes" maxlength="1000" placeholder="What happens if this fails?">' +
      '<label for="fConstraints">Constraints \u2014 one per line (optional)</label><textarea id="fConstraints" rows="2" placeholder="Budget, deadline, permissions, environment\u2026"></textarea>' +
      '<label for="fMode">Mode (' + D.SEC + '6)</label><select id="fMode">' + modeOpts + '</select>' +
      '<label for="fTaskType">Task type (drives ' + D.SEC + '16 routing)</label><input id="fTaskType" list="taskTypes" placeholder="Pick or type a task type"><datalist id="taskTypes">' + taskOpts + '</datalist>' +
      '<label>Risk flags (' + D.SEC + '11)</label><div class="flags">' + flagBoxes + '</div>' +
      '<div class="toolbar"><button class="btn" type="submit">Create mission + contract</button></div>' +
      '</form></div>';
  }

  function missionCard(m) {
    var active = selectedId === m.id ? ' style="border-color:#38e1ff"' : '';
    return '<div class="card"' + active + '><div class="mission-row"><div><h3>' + esc(m.title) + '</h3>' +
      '<p class="muted small">' + esc(m.objective.slice(0, 140)) + '</p>' +
      '<div><span class="chip ' + riskCls(m.risk) + '">' + esc(m.risk) + '</span>' +
      '<span class="chip">' + esc(m.autonomy) + '</span>' +
      '<span class="chip">' + esc(m.mode) + '</span>' +
      (m.demo ? '<span class="chip demo">DEMO</span>' : '') +
      '<span class="chip ' + (m.status === 'DONE' ? 'done' : m.status === 'BLOCKED' ? 'blocked' : '') + '">' + esc(m.status) + '</span></div>' +
      '<p class="small dim">Roles: ' + m.roles.join(', ') + ' &middot; Claims: ' + m.claims.length + ' &middot; Log: ' + m.log.length + ' steps</p></div>' +
      '<div class="mission-actions">' +
      '<button class="btn small ghost" data-action="select" data-id="' + m.id + '">Open</button>' +
      '<button class="btn small danger-ghost" data-action="delete" data-id="' + m.id + '">Delete</button>' +
      '</div></div></div>';
  }

  function missionDetail(m) {
    if (!m) return '<div class="empty">Select a mission to inspect it.</div>';
    var ct = m.contract || {};
    var contractHtml = '<dl class="contract">' +
      ['objective', 'taskType', 'currentState', 'expectedState', 'scope', 'nonGoals', 'risk', 'verification', 'unknown'].map(function (k) {
        return '<dt>' + esc(k) + '</dt><dd>' + esc(ct[k] == null ? '' : ct[k]) + '</dd>';
      }).join('') +
      '<dt>constraints</dt><dd>' + (ct.constraints && ct.constraints.length ? esc(ct.constraints.join('; ')) : 'None recorded.') + '</dd>' +
      '<dt>acceptance</dt><dd><ul>' + (ct.acceptance || []).map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul></dd></dl>';
    var boardCols = [['PENDING'], ['READY'], ['RUNNING'], ['BLOCKED'], ['SUCCEEDED'], ['FAILED']];
    var board = boardCols.map(function (col) {
      var nodes = m.nodes.filter(function (n) { return col.indexOf(n.state) !== -1; });
      return '<div class="col"><h4>' + col[0] + ' (' + nodes.length + ')</h4>' +
        nodes.map(function (n) {
          return '<div class="node"><b>' + n.stage + '</b> <span class="st st-' + n.state + '">' + n.state + '</span>' +
            (n.note ? '<div class="dim">' + esc(n.note) + '</div>' : '') + '</div>';
        }).join('') + '</div>';
    }).join('');
    var other = m.nodes.filter(function (n) { return ['PENDING', 'READY', 'RUNNING', 'BLOCKED', 'SUCCEEDED', 'FAILED'].indexOf(n.state) === -1; });
    if (other.length) board += '<div class="col"><h4>Other (' + other.length + ')</h4>' + other.map(function (n) {
      return '<div class="node"><b>' + n.stage + '</b> <span class="st st-' + n.state + '">' + n.state + '</span></div>';
    }).join('') + '</div>';
    var logHtml = m.log.length ? m.log.map(function (e) {
      return '<div class="logline"><b>' + esc(e.stage) + '</b> #' + e.step + ' \u2014 ' + esc(e.text) + '</div>';
    }).join('') : '<p class="muted">No run log yet. Press \u201cRun Nexus Loop\u201d.</p>';
    var claimsHtml = m.claims.length ? '<table><thead><tr><th>Claim</th><th>Category</th><th>Evidence</th><th>Limitations</th></tr></thead><tbody>' +
      m.claims.map(function (c) {
        return '<tr><td>' + esc(c.claim) + '</td><td><span class="chip">' + esc(c.category) + '</span></td><td>' + esc(c.evidence) + '</td><td class="dim">' + esc(c.limitations) + '</td></tr>';
      }).join('') + '</tbody></table>' : '<p class="muted">No claims yet.</p>';
    var fails = L.doneCheck(m);
    var doneHtml = m.status === 'DONE'
      ? '<div class="alert ok">Done-checklist passed (' + D.SEC + '32). Mission is DONE.</div>'
      : '<div class="alert ' + (fails.length ? 'error' : 'ok') + '"><b>Done-checklist (' + D.SEC + '32):</b> ' +
        (fails.length ? fails.map(function (f) { return '<div>\u2014 ' + esc(f) + '</div>'; }).join('') : 'All gates pass. Press \u201cComplete mission\u201d.') + '</div>';
    var roleChecks = D.ROLES.map(function (r) {
      var on = m.roles.indexOf(r.id) !== -1;
      return '<label class="flag"><input type="checkbox" data-role-check="' + r.id + '"' + (on ? ' checked' : '') + '> ' + esc(r.id) + '</label>';
    }).join('');
    var skillChips = m.skills.map(function (id) {
      var s = skillById(id);
      return s ? '<span class="chip" title="' + esc(s.purpose) + '">' + esc(s.name) + '</span>' : '';
    }).join('');
    return '<div class="detail"><div>' +
      '<div class="card"><div class="mission-row"><div><h3>' + esc(m.title) + '</h3>' +
      '<p class="muted">' + esc(m.objective) + '</p>' +
      '<div><span class="chip ' + riskCls(m.risk) + '">' + esc(m.riskLabel || m.risk) + '</span>' +
      '<span class="chip">' + esc(m.autonomyLabel || m.autonomy) + '</span>' +
      (m.demo ? '<span class="chip demo">DEMO</span>' : '') +
      '<span class="chip">' + esc(m.status) + '</span></div>' +
      '<p class="small dim">Routing: ' + esc(m.routingReason || '') + '</p></div></div>' +
      '<div class="toolbar">' +
      '<button class="btn" data-action="run" data-id="' + m.id + '"' + (m.status === 'DONE' ? ' disabled' : '') + '>Run Nexus Loop</button>' +
      (m.status === 'BLOCKED' ? '<button class="btn" data-action="authorize" data-id="' + m.id + '">Record authorization + resume</button>' : '') +
      '<button class="btn ghost" data-action="complete" data-id="' + m.id + '">Complete mission</button>' +
      '</div></div>' +
      '<div class="card"><h3>Task Contract (' + D.SEC + '7)</h3>' + contractHtml + '</div>' +
      '<div class="card"><h3>Evidence ledger (' + D.SEC + '8) \u2014 ' + m.claims.length + ' claims</h3>' + claimsHtml + '</div>' +
      '</div><div>' +
      '<div class="card"><h3>Assigned roles \u2014 max 5 (' + D.SEC + '15)</h3><p class="small muted">A role without material contribution stays asleep. Assigning 6+ is refused as role theater (' + D.SEC + '33).</p>' +
      '<div class="flags">' + roleChecks + '</div>' +
      '<div class="toolbar"><button class="btn small" data-action="apply-roles" data-id="' + m.id + '">Apply roles</button></div>' +
      '<p class="small">Skills linked: ' + (skillChips || '<span class="muted">none</span>') + '</p></div>' +
      '<div class="card"><h3>Execution board \u2014 node states (' + D.SEC + '17)</h3><div class="board">' + board + '</div></div>' +
      '<div class="card"><h3>Run log</h3><div class="log">' + logHtml + '</div></div>' +
      doneHtml +
      '</div></div>';
  }

  function renderMissions() {
    var list = state.missions.map(missionCard).join('');
    var sel = selected();
    return '<h1>Missions</h1>' + noticeHtml() +
      '<div class="grid g2"><div>' + intakeForm() + '</div><div>' +
      '<h3 style="margin-top:0">Mission list (' + state.missions.length + ')</h3>' +
      (list || '<div class="empty">No missions yet \u2014 create one.</div>') + '</div></div>' +
      '<h2>Mission detail</h2>' + missionDetail(sel);
  }

  function renderRoster() {
    var domains = ['All'].concat(L.roleDomains());
    var opts = domains.map(function (d) { return '<option' + (d === rosterDomain ? ' selected' : '') + '>' + d + '</option>'; }).join('');
    var rows = L.searchRoles(rosterQ, rosterDomain).map(function (r) {
      return '<div class="card role-card"><div class="role-id">' + r.id + '</div><h3>' + esc(r.name) + '</h3>' +
        '<div class="role-domain">' + esc(r.domain) + '</div><p>' + esc(r.duty) + '</p>' +
        '<p class="small dim"><b>Not needed:</b> ' + esc(r.boundary) + '</p>' +
        '<button class="btn small ghost" data-action="assign-role" data-role="' + r.id + '">Assign to selected mission</button></div>';
    }).join('');
    return '<h1>Specialist roster \u2014 34 roles (' + D.SEC + '14)</h1>' +
      '<p class="lede">Responsibilities, not running agents. Select only useful perspectives \u2014 never the whole catalog. ' +
      'More than ~5 roles on one task is a smell, not a virtue.</p>' + noticeHtml() +
      '<div class="filters"><div><label>Search roles</label><input id="rosterSearch" value="' + esc(rosterQ) + '" placeholder="Search name, duty, domain\u2026"></div>' +
      '<div><label>Domain</label><select id="rosterDomain">' + opts + '</select></div></div>' +
      '<div class="grid g3">' + (rows || '<div class="empty">No roles match.</div>') + '</div>';
  }

  function renderSkills() {
    var fams = ['All'].concat(L.skillFamilies());
    var opts = fams.map(function (f) { return '<option' + (f === skillFamily ? ' selected' : '') + '>' + esc(f) + '</option>'; }).join('');
    var rows = L.searchSkills(skillQ, skillFamily).map(function (s) {
      return '<div class="card"><h3 style="margin:0">' + esc(s.name) + '</h3>' +
        '<p class="small muted">' + esc(s.family) + ' &middot; Owner: <b>' + esc(s.owner) + '</b></p>' +
        '<p>' + esc(s.purpose) + '</p>' +
        '<p class="small dim">Blueprint, not an installed capability (' + D.SEC + '36 adapter note).</p>' +
        '<button class="btn small ghost" data-action="attach-skill" data-skill="' + s.id + '">Attach to selected mission</button></div>';
    }).join('');
    document.getElementById('skillCount').textContent = D.SKILLS.length;
    return '<h1>Skills library \u2014 12 families (' + D.SEC + '36)</h1>' +
      '<p class="lede">Conceptual reusable capabilities until a real implementation is discovered, installed, and verified. ' +
      'Attach a skill to the selected mission to record it in the mission plan.</p>' + noticeHtml() +
      '<div class="filters"><div><label>Search skills</label><input id="skillSearch" value="' + esc(skillQ) + '" placeholder="Search name, purpose, owner\u2026"></div>' +
      '<div><label>Family</label><select id="skillFamily">' + opts + '</select></div></div>' +
      '<div class="grid g3">' + (rows || '<div class="empty">No skills match.</div>') + '</div>';
  }

  function renderLedger() {
    var cats = ['All'].concat(D.CLAIM_CATEGORIES.map(function (c) { return c.id; }));
    var opts = cats.map(function (c) { return '<option' + (c === ledgerCat ? ' selected' : '') + '>' + c + '</option>'; }).join('');
    var rows = [];
    state.missions.forEach(function (m) {
      m.claims.forEach(function (c) {
        if (ledgerCat !== 'All' && c.category !== ledgerCat) return;
        rows.push('<tr><td>' + esc(m.title) + '</td><td>' + esc(c.claim) + '</td><td><span class="chip">' + esc(c.category) + '</span></td><td>' + esc(c.evidence) + '</td><td>' + esc(c.source) + '</td><td class="dim">' + esc(c.limitations) + '</td></tr>');
      });
    });
    return '<h1>Evidence Ledger (' + D.SEC + '8)</h1>' +
      '<p class="lede">Every material claim belongs to one category \u2014 never convert between them. ' +
      'A claim without evidence is refused at the gate.</p>' +
      '<div class="filters"><div><label>Category</label><select id="ledgerCat">' + opts + '</select></div></div>' +
      '<div class="card"><table><thead><tr><th>Mission</th><th>Claim</th><th>Category</th><th>Evidence</th><th>Source</th><th>Limitations</th></tr></thead>' +
      '<tbody>' + (rows.join('') || '<tr><td colspan="6">No claims match.</td></tr>') + '</tbody></table></div>';
  }

  function renderDoctrine() {
    return '<h1>Doctrine \u2014 what this console enforces</h1>' +
      '<p class="lede">Paraphrased from TITAN NEXUS v8.1. The console simulates the framework; it does not install agents, skills, or authority.</p>' +
      '<div class="grid g2">' +
      '<div class="card"><h3>Honesty doctrine (' + D.SEC + '1, ' + D.SEC + '2)</h3><ul>' +
      '<li>Never inflate capability counts. Never fabricate execution. Never claim verification that did not occur.</li>' +
      '<li>A role is not automatically a running agent. A skill definition is not automatically an executable skill.</li>' +
      '<li>VERIFIED in this console means a real code check ran \u2014 the role guard, the ledger validator, the storage write.</li></ul></div>' +
      '<div class="card"><h3>Activation (' + D.SEC + '15)</h3><ul>' +
      '<li>Three host patterns: perspectives (in-context), delegated subagents, multi-agent framework.</li>' +
      '<li>Maximum ~5 roles per task. A role with no material contribution stays asleep.</li>' +
      '<li>Activating the whole catalog is a failure mode (' + D.SEC + '33).</li></ul></div>' +
      '<div class="card"><h3>Routing (' + D.SEC + '16)</h3><p>Minimum sufficient: pick the smallest role/skill set that meets the acceptance criteria. ' +
      'This console scores the mission text against the ' + D.SEC + '16 table and shows its reason.</p></div>' +
      '<div class="card"><h3>Authorization law (' + D.SEC + '11)</h3><ul>' +
      '<li>Tool access is NOT authorization. Silence is NOT authorization.</li>' +
      '<li>R4/R5 execution pauses at the EXECUTE stage until explicit authorization is recorded.</li>' +
      '<li>Risk changes verification depth; it never grants permission.</li></ul></div>' +
      '<div class="card"><h3>Claim categories (' + D.SEC + '8)</h3><ul>' +
      D.CLAIM_CATEGORIES.map(function (c) { return '<li><b>' + c.id + '</b> \u2014 ' + esc(c.meaning) + '</li>'; }).join('') + '</ul></div>' +
      '<div class="card"><h3>Definition of Done (' + D.SEC + '32)</h3><p>Complete means deliverables + mandatory acceptance criteria are satisfied and ' +
      'required verification is finished. Never silently reduce scope to make that true. ' +
      'Claim vocabulary: ' + D.CLAIM_VOCAB.join(' &middot; ') + '.</p>' +
      '<p class="small dim">This console is a simulation of the framework for planning and teaching. ' +
      'It is not affiliated with Google Antigravity; \u201cAntigravity-style\u201d describes the mission-control layout only.</p></div></div>';
  }

  function render() {
    document.querySelectorAll('.tab').forEach(function (t) { t.classList.toggle('active', t.dataset.view === view); });
    if (view === 'dashboard') app.innerHTML = renderDashboard();
    else if (view === 'missions') app.innerHTML = renderMissions();
    else if (view === 'roster') app.innerHTML = renderRoster();
    else if (view === 'skills') app.innerHTML = renderSkills();
    else if (view === 'ledger') app.innerHTML = renderLedger();
    else if (view === 'doctrine') app.innerHTML = renderDoctrine();
    notice = null;
  }

  /* ---------------- events ---------------- */
  document.getElementById('tabs').addEventListener('click', function (e) {
    var b = e.target.closest('[data-view]');
    if (b) { view = b.dataset.view; render(); }
  });
  document.getElementById('btnExport').addEventListener('click', function () {
    var blob = new Blob([L.exportState(state.missions)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'titan-antigravity-export.json';
    a.click();
    URL.revokeObjectURL(a.href);
    setNotice('ok', 'Export downloaded.');
    render();
  });
  document.getElementById('fileImport').addEventListener('change', function (e) {
    var f = e.target.files[0];
    if (!f) return;
    var rd = new FileReader();
    rd.onload = function () {
      var res = L.importState(String(rd.result));
      if (!res.ok) { setNotice('error', 'Import rejected: ' + res.error); render(); return; }
      if (!window.confirm('Replace all missions with the imported file (' + res.missions.length + ' mission(s))?')) return;
      state.missions = res.missions;
      selectedId = state.missions.length ? state.missions[0].id : null;
      save(); setNotice('ok', 'Imported ' + res.missions.length + ' mission(s).');
      render();
    };
    rd.readAsText(f);
    e.target.value = '';
  });
  document.getElementById('btnReset').addEventListener('click', function () {
    if (!window.confirm('Reset to the 2 demo missions? Your missions will be replaced.')) return;
    state.missions = L.seedMissions();
    selectedId = state.missions.length ? state.missions[0].id : null;
    save(); setNotice('ok', 'Reset to demo missions.');
    view = 'missions'; render();
  });

  app.addEventListener('submit', function (e) {
    if (e.target.id !== 'intakeForm') return;
    e.preventDefault();
    var flags = Array.prototype.slice.call(document.querySelectorAll('input[name="riskFlags"]:checked')).map(function (c) { return c.value; });
    var input = {
      title: document.getElementById('fTitle').value,
      objective: document.getElementById('fObjective').value,
      stakes: document.getElementById('fStakes').value,
      constraints: document.getElementById('fConstraints').value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean),
      mode: document.getElementById('fMode').value,
      taskType: document.getElementById('fTaskType').value,
      riskFlags: flags
    };
    var res = L.createMission(input);
    if (!res.ok) { setNotice('error', 'Mission rejected: ' + res.errors.join(' ')); render(); return; }
    state.missions.unshift(res.mission);
    selectedId = res.mission.id;
    save();
    setNotice('ok', 'Mission created. Contract generated; routing: ' + res.mission.routingReason);
    render();
  });

  app.addEventListener('click', function (e) {
    var b = e.target.closest('[data-action]');
    if (!b) return;
    var action = b.dataset.action;
    var m = state.missions.find(function (x) { return x.id === b.dataset.id; });
    if (action === 'select' && m) { selectedId = m.id; view = 'missions'; render(); return; }
    if (action === 'delete' && m) {
      if (!window.confirm('Delete mission "' + m.title + '"?')) return;
      state.missions = state.missions.filter(function (x) { return x.id !== m.id; });
      if (selectedId === m.id) selectedId = state.missions.length ? state.missions[0].id : null;
      save(); setNotice('ok', 'Mission deleted.'); render(); return;
    }
    if (action === 'run' && m) {
      var r = L.runMission(m);
      if (!r.ok) { setNotice('error', r.error); render(); return; }
      save();
      setNotice(r.blocked ? 'error' : 'ok', r.blocked
        ? 'Run paused at EXECUTE \u2014 explicit authorization required (' + m.risk + '). Press \u201cRecord authorization + resume\u201d.'
        : 'Nexus Loop complete. ' + m.claims.length + ' evidence-backed claim(s). Check the done-checklist.');
      render(); return;
    }
    if (action === 'authorize' && m) {
      var a = L.authorizeMission(m);
      if (!a.ok) { setNotice('error', a.error); render(); return; }
      save(); setNotice('ok', 'Authorization recorded (simulated). Loop resumed and completed.');
      render(); return;
    }
    if (action === 'complete' && m) {
      var c = L.completeMission(m);
      if (!c.ok) { setNotice('error', 'Done-checklist failed: ' + c.errors.join(' ')); render(); return; }
      save(); setNotice('ok', 'Mission marked DONE \u2014 done-checklist passed.');
      render(); return;
    }
    if (action === 'apply-roles' && m) {
      var chosen = Array.prototype.slice.call(document.querySelectorAll('[data-role-check]:checked')).map(function (c) { return c.dataset.roleCheck; });
      var ar = L.assignRoles(m, chosen);
      if (!ar.ok) { setNotice('error', ar.error); render(); return; }
      save(); setNotice('ok', 'Roles applied: ' + m.roles.join(', ') + '.');
      render(); return;
    }
    if (action === 'assign-role') {
      var sel = selected();
      if (!sel) { setNotice('error', 'Create or select a mission first.'); render(); return; }
      var next = sel.roles.slice();
      if (next.indexOf(b.dataset.role) === -1) next.push(b.dataset.role);
      var rr = L.assignRoles(sel, next);
      if (!rr.ok) { setNotice('error', rr.error); render(); return; }
      save(); setNotice('ok', 'Assigned ' + b.dataset.role + ' to "' + sel.title + '".');
      render(); return;
    }
    if (action === 'attach-skill') {
      var sel2 = selected();
      if (!sel2) { setNotice('error', 'Create or select a mission first.'); render(); return; }
      var sr = L.attachSkill(sel2, b.dataset.skill);
      if (!sr.ok) { setNotice('error', sr.error); render(); return; }
      save(); setNotice('ok', 'Skill attached to "' + sel2.title + '".');
      render(); return;
    }
  });

  app.addEventListener('input', function (e) {
    if (e.target.id === 'rosterSearch') { rosterQ = e.target.value; render(); }
    if (e.target.id === 'skillSearch') { skillQ = e.target.value; render(); }
  });
  app.addEventListener('change', function (e) {
    if (e.target.id === 'rosterDomain') { rosterDomain = e.target.value; render(); }
    if (e.target.id === 'skillFamily') { skillFamily = e.target.value; render(); }
    if (e.target.id === 'ledgerCat') { ledgerCat = e.target.value; render(); }
  });

  document.getElementById('skillCount').textContent = D.SKILLS.length;
  render();
})();
