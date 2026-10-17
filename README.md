# TITAN ANTIGRAVITY -- NEXUS Mission Control (simulation console)

TITAN NEXUS v8.1 as an Antigravity-style agentic mission-control console: a single-page,
offline web app that runs the TITAN framework as a working **deterministic multi-agent
simulation**.

## What it is

- **Mission intake** -> generates a Task Contract (Sec. 7 of the TITAN doc).
- **Nexus Execution Loop (Sec. 34)** -> a mission runs through the 14 deterministic stages
  (UNDERSTAND -> ... -> LEARN) with a live run log.
- **Minimum-sufficient routing (Sec. 16)** -> mission text is scored against the Sec. 16 routing table;
  the console recommends roles + skills and shows its reason.
- **Specialist roster (Sec. 14)** -> all 34 roles, searchable/filterable, assignable (max 5 per mission).
- **Skills library (Sec. 36)** -> the 12 skill families, browsable, attachable to missions.
- **Evidence ledger (Sec. 8)** -> every claim cites evidence (source step + limitations).
  Claims without evidence are refused at the gate.
- **Mission board** -> kanban by node state (Sec. 17).
- **Done-checklist (Sec. 32)** -> completion is gated by real code checks.
- **Optional real-LLM analysis (OpenRouter)** -> in LLM mode, a mission run also
  calls OpenRouter directly from the browser with a TITAN-doctrine prompt;
  the analysis becomes evidence-gated claims labeled `openrouter:<model>` with
  token usage + a raw-response excerpt, capped at SUPPORTED, never VERIFIED.
  Default mode is deterministic simulation; LLM mode is opt-in (LLM tab).

## What it is NOT -- read this before trusting any output

- **By default there are no real LLMs, no real agents, no network calls.**
  The "agents" are deterministic rule-based simulations (keyword scoring + fixed rules).
  This is labeled SIMULATION throughout the UI, per the honesty doctrine (Sec. 1, Sec. 2).
  Real-LLM analysis is opt-in only (LLM tab, see below) and is always labeled as such.
- **VERIFIED claims here mean only this:** the role-count guard, the ledger validator,
  and the storage write actually ran in code. They do NOT prove anything about the
  real world, a production system, or a real AI.
- **Not affiliated with Google Antigravity.** "Antigravity-style" describes the
  mission-control layout only.
- **Not a substitute for the TITAN document.** Role duties and skill purposes are
  short paraphrases; the document itself is the authority. The app does not
  reproduce long passages of it.

## Real LLM via OpenRouter (optional)

OpenRouter allows cross-origin browser requests, so the app calls it
**directly from the browser** -- no local server, no proxy, no backend.

How it works:

1. Open the **LLM tab**. Switch mode to **Real LLM via OpenRouter**.
2. Model: defaults to `nvidia/nemotron-3-ultra-550b-a55b` (free). Paste any
   OpenRouter model id to use a different model. Model availability changes;
   if a model stops working, OpenRouter returns an error and the console
   falls back to simulation.
3. API key: paste your own OpenRouter key into the password field and press
   **Save key**. The key is stored **only in that browser's localStorage**,
   under its own key. It is sent only to OpenRouter (in the `Authorization`
   header), never to any other site, never logged, never shown again (the
   field is never prefilled), and never included in JSON export/import.
   Use a key with a spend limit, never share it, and press **Clear key**
   when done on a shared machine. Get a key from your OpenRouter dashboard.
4. Run a mission. The deterministic loop always runs first. Then the
   reasoning-stage call goes out with a TITAN-doctrine system prompt
   (honesty rules + mission text, asking for structured JSON:
   findings / risks / actions, each with a one-line evidence basis).
5. The analysis becomes claims in the Evidence Ledger with source
   `openrouter:<model>`, token usage, and a truncated excerpt of the raw
   response. LLM claims pass through the **same** evidence gates as
   simulated claims and are capped at SUPPORTED -- never VERIFIED (Sec. 8).
   The code enforces this: a VERIFIED category on an LLM-sourced claim is
   downgraded to INFERRED at the gate.

Request headers: `Authorization: Bearer <key>`, `Content-Type: application/json`,
`HTTP-Referer` (this page's URL), `X-Title: TITAN Antigravity`.

On ANY failure -- no key stored, bad key (401), no credits (402), spend
limit / disabled key (403), unknown model (404), rate limit (429, retried
once after 1s), upstream failure (502), timeout, or unreachable -- the
console falls back to deterministic simulation and shows a banner naming
the cause + the fix. Simulated output is never presented as LLM output.

## How the simulation maps to the doc

| App behavior | TITAN NEXUS v8.1 section |
|---|---|
| Task Contract fields | Sec. 7 |
| Claim categories + evidence gate | Sec. 8 |
| Risk R0-R5 / Autonomy A0-A5 | Sec. 11 |
| 34-role roster + boundaries | Sec. 14 |
| Activation guard (max ~5 roles) | Sec. 15 + Sec. 33 (role theater) |
| Keyword routing + reason | Sec. 16 |
| Node states + transitions | Sec. 17 |
| Done-checklist + claim vocabulary | Sec. 32 |
| 14-stage Nexus Loop | Sec. 34 (CORE LAW Sec. 1) |
| 12 skill families | Sec. 36 (Sec. 7.1-Sec. 7.12) |
| R4/R5 authorization pause | Sec. 11 authorization law |

## Stack

Zero dependencies. Plain HTML + CSS + vanilla JS (ES2017-compatible style).
Data persists in `localStorage` (`titan-antigravity-v1` for missions,
a separate key for LLM settings, another for the API key). JSON export/import
included (exports missions only -- never the API key).
No build step, no server. In LLM mode the browser calls OpenRouter directly.

## Run

Open `index.html` in any modern browser, or serve the folder from any static host:

```bash
python3 -m http.server 8000
# open http://127.0.0.1:8000/
```

## Testing

```bash
node tests/run-node-tests.js   # unit tests on the logic engine + LLM client (incl. fake-fetch OpenRouter calls)
node tests/smoke.mjs           # headless-Chrome smoke (file:// + raw CDP)
```

See `TEST_RESULTS.md` for the recorded results.

## Limitations (honest)

- Routing is keyword scoring, not understanding. Adversarial or vague wording
  routes to the fallback planning set (NEXUS + PLANNER) -- that is by design.
- The authorization button is a simulated approval. In a real deployment it
  would need a real approval record, not a button.
- Run logs, claims, and lessons are generated by fixed rules from the intake
  text. They demonstrate the framework's shape, not real investigation.
- Data lives in one browser's `localStorage`. Export JSON to move it.
- Sample missions ship labeled DEMO. Reset restores them.
- **Live OpenRouter calls are untested in this repo** -- no real key was
  available, and none was used, asked for, or stored anywhere. The provider
  path is covered by unit tests with a fake fetch (headers, error mapping,
  429 retry, key-never-in-error). Try it with your own key; any failure
  falls back to simulation with a named cause.
- **LLM output can be wrong.** It is a model response, not verification.
  It is capped at SUPPORTED, never VERIFIED -- review before trusting.
- **Key storage tradeoff:** localStorage keeps the key in this browser only,
  but any script running on the page could read it. That is why the README
  insists on a spend-limited key, and why the key is never echoed, logged,
  or exported. On a shared machine, clear the key when done.
- Model availability on OpenRouter changes. A model that worked yesterday
  can 404 today; the console falls back to simulation and says so.

## Status

Simulation console + optional real-LLM analysis -- complete. No backend,
no deployment target beyond static hosting.
