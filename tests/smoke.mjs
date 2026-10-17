/* titan-antigravity \u2014 headless-Chrome smoke test via raw CDP.
   Run: node tests/smoke.mjs [desktop|mobile]
   Uses /opt/meta-chromium/chrome + Node global WebSocket. No deps. */
import { spawn, execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MODE = process.argv[2] || 'desktop';
const WIDTH = MODE === 'mobile' ? 390 : 1280;
const PORT = MODE === 'mobile' ? 9226 : 9225;
const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const URL = 'file://' + DIR + '/index.html';

let passed = 0, failed = 0;
function check(name, cond, extra) {
  if (cond) { passed++; console.log('PASS ' + name); }
  else { failed++; console.log('FAIL ' + name + (extra ? ' :: ' + extra : '')); }
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

class CDP {
  constructor(wsUrl) { this.ws = new WebSocket(wsUrl); this.id = 0; this.pending = new Map(); }
  async open() {
    await new Promise((res, rej) => { this.ws.onopen = res; this.ws.onerror = rej; });
    this.ws.onmessage = (m) => {
      const d = JSON.parse(m.data);
      if (d.id && this.pending.has(d.id)) {
        const { resolve, reject } = this.pending.get(d.id);
        this.pending.delete(d.id);
        d.error ? reject(new Error(JSON.stringify(d.error))) : resolve(d.result);
      } else if (d.method === 'Runtime.consoleAPICalled' && d.params && d.params.type === 'error') {
        this.consoleErrors.push(JSON.stringify(d.params.args));
      } else if (d.method === 'Runtime.exceptionThrown') {
        this.consoleErrors.push('exception: ' + JSON.stringify(d.params.exceptionDetails));
      }
    };
    this.consoleErrors = [];
  }
  send(method, params) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params: params || {} }));
    });
  }
  async evalExpr(expr) {
    const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error('eval exception: ' + JSON.stringify(r.exceptionDetails));
    return r.result.value;
  }
  close() { try { this.ws.close(); } catch (e) {} }
}

const userDir = '/tmp/titan-ag-chrome-' + MODE;
execSync('rm -rf ' + userDir);
const chrome = spawn('/opt/meta-chromium/chrome', [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--no-proxy-server',
  '--remote-debugging-port=' + PORT, '--user-data-dir=' + userDir, 'about:blank'
], { stdio: 'ignore' });
await sleep(1500);
const ver = await (await fetch('http://127.0.0.1:' + PORT + '/json/version')).json();
const cdp = new CDP(ver.webSocketDebuggerUrl);
await cdp.open();
await cdp.send('Target.createTarget', { url: 'about:blank' });
await sleep(500);
const targets = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json();
const page = targets.find(t => t.type === 'page' && t.url === 'about:blank') || targets.find(t => t.type === 'page');
const cdp2 = new CDP(page.webSocketDebuggerUrl);
await cdp2.open();
await cdp2.send('Page.enable');
await cdp2.send('Runtime.enable');
await cdp2.send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: 900, deviceScaleFactor: 1, mobile: MODE === 'mobile' });
await cdp2.send('Page.navigate', { url: URL });
await sleep(2500);

// 1. Shell: title, SIMULATION badge, tabs
const title = await cdp2.evalExpr('document.title');
check('title mentions TITAN ANTIGRAVITY', /TITAN ANTIGRAVITY/.test(title || ''), title);
check('SIMULATION badge visible', (await cdp2.evalExpr('document.querySelector(".sim-badge")?.textContent || ""')).includes('SIMULATION'));
check('7 nav tabs', await cdp2.evalExpr('document.querySelectorAll(".tab").length') === 7);

// 2. Dashboard: stats + pipeline
check('dashboard stat cards render', await cdp2.evalExpr('document.querySelectorAll(".stat-num").length') === 4);
check('CORE LAW pipeline shows 14 stages', await cdp2.evalExpr('document.querySelectorAll(".pipe").length') === 14);
check('demo missions listed', await cdp2.evalExpr('document.body.innerText.includes("Fix admin login redirect loop")'));

// 3. Missions tab: create mission via UI
await cdp2.evalExpr(`document.querySelector('[data-view="missions"]').click()`);
await sleep(800);
await cdp2.evalExpr(`(() => {
  document.getElementById('fTitle').value = 'Smoke test mission';
  document.getElementById('fObjective').value = 'Verify the smoke test can create and run a mission end to end.';
  document.getElementById('fTaskType').value = 'API feature';
  document.querySelector('#intakeForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
})()`);
await sleep(800);
check('mission created via UI', await cdp2.evalExpr('document.body.innerText.includes("Smoke test mission")'));
check('routing reason shown', await cdp2.evalExpr('document.body.innerText.includes("Matched")'));

// 4. Run the loop on the new mission, then complete it
await cdp2.evalExpr(`(() => {
  const cards = [...document.querySelectorAll('.mission-row')];
  const card = cards.find(c => c.innerText.includes('Smoke test mission'));
  card?.querySelector('[data-action="select"]')?.click();
})()`);
await sleep(800);
const runRes = await cdp2.evalExpr(`(() => {
  const btns = [...document.querySelectorAll('[data-action="run"]')];
  if (!btns.length) return 'no-run-button';
  btns[0].click();
  return 'ran';
})()`);
await sleep(1000);
check('run button works', runRes === 'ran', runRes);
check('run produced evidence claims', await cdp2.evalExpr('document.body.innerText.includes("Evidence ledger") && document.body.innerText.includes("15 claims")'));
check('status READY_FOR_DONE after run', await cdp2.evalExpr('document.body.innerText.includes("READY_FOR_DONE")'));
await cdp2.evalExpr(`document.querySelector('[data-action="complete"]')?.click()`);
await sleep(800);
check('mission completes to DONE', await cdp2.evalExpr('document.body.innerText.includes("Mission marked DONE")'));

// 5. Role-theater guard: try assigning 6 roles via UI checkboxes
await cdp2.evalExpr(`(() => {
  const boxes = [...document.querySelectorAll('[data-role-check]')];
  boxes.slice(0, 6).forEach(b => { b.checked = true; });
  document.querySelector('[data-action="apply-roles"]')?.click();
})()`);
await sleep(800);
check('6-role assignment refused (role theater)', await cdp2.evalExpr('document.body.innerText.includes("Role theater guard")'));

// 6. Roster: 34 role cards
await cdp2.evalExpr(`document.querySelector('[data-view="roster"]').click()`);
await sleep(800);
check('roster shows 34 roles', await cdp2.evalExpr('document.querySelectorAll(".role-card").length') === 34, String(await cdp2.evalExpr('document.querySelectorAll(".role-card").length')));
await cdp2.evalExpr(`(() => { const s = document.getElementById('rosterSearch'); s.value = 'sentinel'; s.dispatchEvent(new Event('input', { bubbles: true })); })()`);
await sleep(600);
check('roster search filters', await cdp2.evalExpr('document.querySelectorAll(".role-card").length') === 1);

// 7. Skills: cards render + family filter
await cdp2.evalExpr(`document.querySelector('[data-view="skills"]').click()`);
await sleep(800);
const skillCount = await cdp2.evalExpr('document.querySelectorAll(".card h3").length');
check('skills render (126)', skillCount >= 120, String(skillCount));
await cdp2.evalExpr(`(() => { const s = document.getElementById('skillFamily'); s.value = '7.7 AI & agent'; s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
await sleep(600);
check('skills family filter = 15', await cdp2.evalExpr('document.querySelectorAll(".card h3").length') === 15, String(await cdp2.evalExpr('document.querySelectorAll(".card h3").length')));

// 8. Ledger: claims table
await cdp2.evalExpr(`document.querySelector('[data-view="ledger"]').click()`);
await sleep(800);
check('ledger shows claims', await cdp2.evalExpr('document.querySelectorAll("tbody tr").length') >= 15);
await cdp2.evalExpr(`(() => { const s = document.getElementById('ledgerCat'); s.value = 'VERIFIED'; s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
await sleep(600);
check('ledger category filter narrows', await cdp2.evalExpr('document.querySelectorAll("tbody tr").length') >= 1);

// 9. Doctrine view renders
await cdp2.evalExpr(`document.querySelector('[data-view="doctrine"]').click()`);
await sleep(600);
check('doctrine renders', await cdp2.evalExpr('document.body.innerText.includes("Honesty doctrine")'));

// 10. LLM tab: settings panel, default simulation, key field never echoes, no-key fallback
await cdp2.evalExpr(`document.querySelector('[data-view="llm"]').click()`);
await sleep(800);
check('LLM settings panel renders', await cdp2.evalExpr('document.body.innerText.includes("LLM settings")'));
check('LLM default mode is simulation', await cdp2.evalExpr('document.querySelector(\'input[name="llmMode"][value="sim"]\').checked === true'));
check('LLM model field prefilled with default', await cdp2.evalExpr('document.getElementById("llmModel").value === "nvidia/nemotron-3-ultra-550b-a55b"'));
check('LLM key field is password type + empty', await cdp2.evalExpr('(()=>{const k=document.getElementById("llmKeyInput"); return k && k.type === "password" && k.value === "";})()'));
await cdp2.evalExpr(`(() => { const k = document.getElementById('llmKeyInput'); k.value = 'TESTKEY-FAKE-1234567890ABCDEF'; document.querySelector('[data-action="llm-save-key"]').click(); })()`);
await sleep(600);
check('saved key is not echoed in UI', await cdp2.evalExpr('document.getElementById("llmKeyInput").value === "" && !document.body.innerText.includes("TESTKEY-FAKE-1234567890ABCDEF")'));
check('key stored indicator shows YES', await cdp2.evalExpr('document.body.innerText.includes("Key stored in this browser: YES")'));
await cdp2.evalExpr(`document.querySelector('[data-action="llm-clear-key"]').click()`);
await sleep(500);
check('key stored indicator shows NO after clear', await cdp2.evalExpr('document.body.innerText.includes("Key stored in this browser: NO")'));
await cdp2.evalExpr(`document.querySelector('input[name="llmMode"][value="llm"]').click()`);
await sleep(400);
await cdp2.evalExpr(`document.querySelector('[data-view="missions"]').click()`);
await sleep(800);
await cdp2.evalExpr(`(() => {
  document.getElementById('fTitle').value = 'LLM fallback mission';
  document.getElementById('fObjective').value = 'Verify fallback when no key is stored.';
  document.getElementById('fTaskType').value = 'General task';
  document.querySelector('#intakeForm').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
})()`);
await sleep(800);
await cdp2.evalExpr(`(() => {
  const cards = [...document.querySelectorAll('.mission-row')];
  const card = cards.find(c => c.innerText.includes('LLM fallback mission'));
  card?.querySelector('[data-action="select"]')?.click();
})()`);
await sleep(800);
await cdp2.evalExpr(`document.querySelector('[data-action="run"]')?.click()`);
await sleep(1000);
check('no-key fallback banner names the cause', await cdp2.evalExpr('document.body.innerText.includes("No API key stored") && document.body.innerText.includes("deterministic simulation")'));
check('fallback mission still completes deterministically', await cdp2.evalExpr('document.body.innerText.includes("READY_FOR_DONE")'));
await cdp2.evalExpr(`document.querySelector('[data-view="llm"]').click()`);
await sleep(600);
await cdp2.evalExpr(`document.querySelector('input[name="llmMode"][value="sim"]').click()`);
await sleep(400);
await cdp2.evalExpr(`document.querySelector('[data-view="dashboard"]').click()`);
await sleep(600);

// 11. Mobile overflow (only in mobile mode)
if (MODE === 'mobile') {
  const overflow = await cdp2.evalExpr('document.documentElement.scrollWidth');
  check('390px: no horizontal overflow', overflow <= 391, 'scrollWidth=' + overflow);
}

// 12. No console/page errors
check('0 console/page errors', cdp2.consoleErrors.length === 0, JSON.stringify(cdp2.consoleErrors).slice(0, 500));

console.log('RESULT ' + MODE + ': ' + passed + ' passed, ' + failed + ' failed');
cdp2.close(); cdp.close();
chrome.kill();
process.exit(failed ? 1 : 0);
