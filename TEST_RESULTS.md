# TEST_RESULTS.md -- titan-antigravity

Re-run after final edits (ASCII escaping): all green.

## Enhancement -- Real LLM via OpenRouter (2026-10-17)

New module `js/llm.js` + LLM tab in `js/app.js`. Direct browser calls to
OpenRouter (CORS allowed by the provider) -- no local server, no proxy.
Default model `nvidia/nemotron-3-ultra-550b-a55b` (free) + custom-model field.
API key stored only in the browser's localStorage, password field, never
echoed/logged/exported; Clear-key button; spend-limit warning in UI.

### Unit tests -- 163/163 passed (was 105/105; +58 new)

`node tests/run-node-tests.js`

New coverage:
- Model/key validation: default + custom ids accepted; empty/spaces/injection
  chars rejected; key shape (length, no whitespace) accepted/rejected.
- Prompts: system prompt carries mission + evidence doctrine + structured-JSON
  shape; never mentions keys; user prompt carries mission.
- Request building: payload shape, extras stripped, bad model/messages/role/
  temperature rejected.
- Response parsing: content + usage + 500-char excerpt; no-choices / empty
  content rejected; missing usage tolerated.
- Analysis parsing: 3 claims from structured JSON, sources
  `openrouter:<model>`, evidence carries usage + excerpt, categories
  INFERRED/ASSUMED only, actions -> ASSUMED, 6-claim cap, fenced JSON,
  unstructured -> single fallback claim.
- Error mapping: 400/401/402/403/404/429/502 -> named codes + fixes;
  AbortError -> TIMEOUT; fetch failure -> UNREACHABLE.
- Evidence gates: LLM metadata preserved; VERIFIED on an LLM claim
  downgraded to INFERRED; bad metadata refused; non-LLM VERIFIED unchanged.
- `callOpenRouter` with fake fetch: success content + usage; posts to the
  OpenRouter URL; Authorization + HTTP-Referer + X-Title headers; key never
  in request body; key never in error objects (401 path); 429 retries once
  then succeeds; 429 twice -> RATE_LIMIT; fetch rejection -> UNREACHABLE;
  missing fetch -> NO_FETCH; missing key -> NO_KEY.

### Browser smoke -- desktop 30/30, mobile 31/31 passed (was 21/21 + 22/22)

`node tests/smoke.mjs desktop` / `node tests/smoke.mjs mobile`
(headless Chromium, file:// + raw CDP, 0 console/page errors in both runs)

New coverage: 7 nav tabs; LLM settings panel renders; default mode is
simulation; model field prefilled with the default; key field is password
type + empty; saved fake key is not echoed in UI; stored indicator YES ->
clear -> NO; LLM mode with no key -> fallback banner names the cause
("No API key stored" + deterministic simulation) and the mission still
reaches READY_FOR_DONE; mode restored to simulation.

### Honest limitations (enhancement)

- Live OpenRouter call UNTESTED: no real key was available, and none was
  used, asked for, or stored. Provider path is covered by fake-fetch unit
  tests only. First live call happens with the user's own key.
- Key lives in localStorage: only in this browser, but any script on the
  page could read it -- hence the spend-limit warning and Clear-key button.
- Model availability on OpenRouter changes; unknown models 404 and fall back.

## Original build results (kept for reference)

## Unit tests -- 105/105 passed

`node tests/run-node-tests.js`

Coverage:
- Data integrity: 34 roles (unique IDs, duty + boundary each), 126 skills, 12 skill families,
  14 loop stages, 10 node states, 5 claim categories, 7 claim-vocabulary entries,
  11 routing rows, 8 modes.
- Routing: all 11 Sec. 16 rows reachable by representative mission text; fallback
  (NEXUS + PLANNER) for unmatched text.
- Classification: risk flags to R1/R2/R3/R4/R5 (incl. destructive+production = R5),
  AUDIT cap at R2; autonomy per mode (TASK A2, AUDIT A1, PROGRAM A3, INCIDENT A3).
- Intake validation: empty title/objective, bad mode, unknown flag, overlong title rejected.
- Mission factory: contract has all Sec. 7 fields; roles <= 5 and include NEXUS;
  1 intake claim; 14 PENDING nodes; status DRAFT.
- Claim gating (Sec. 8): claim without evidence, bad category, empty text all refused.
- Node transitions (Sec. 17): legal transitions pass; SUCCEEDED->RUNNING,
  PENDING->SUCCEEDED, unknown stage refused; BLOCKED->RUNNING allowed.
- Role guard (Sec. 15): 6 roles refused (role theater), 0 roles refused,
  unknown roles filtered, skill attach idempotent.
- Run: normal mission reaches READY_FOR_DONE, all nodes SUCCEEDED, 15 claims,
  14 log entries, VERIFIED claims present, re-run refused, deterministic output.
- Authorization gate (Sec. 11): R5 mission blocks at EXECUTE; re-run while
  blocked refused; authorize-when-not-blocked refused; authorize resumes and
  completes; assumption claim recorded.
- Done-check (Sec. 32): fails on DRAFT, fails with unevidenced claim,
  passes after run, complete sets DONE.
- Export/import: round-trip preserves; invalid JSON, wrong app/version,
  bad mode, unevidenced claim, wrong node count all refused.
- Search/filter: roles by name/domain, skills by name/family.
- Seed: 2 demo missions; first pre-run to READY_FOR_DONE, second DRAFT.

## Browser smoke -- desktop 21/21, mobile 22/22 passed

`node tests/smoke.mjs desktop` / `node tests/smoke.mjs mobile`
(headless Chromium, file:// + raw CDP, 0 console/page errors in both runs)

Covered: title, SIMULATION badge, 6 nav tabs, dashboard stats, 14-stage pipeline,
demo missions listed, mission creation via UI, routing reason shown, run loop,
evidence claims, READY_FOR_DONE, completion to DONE, 6-role refusal,
roster 34 cards + search filter, skills 126 cards + family filter (15),
ledger claims + category filter, doctrine view, 390px no horizontal overflow (mobile only).

## Hand-verified logic (fixed cases)

- Routing: "Fix admin login redirect loop" -> Authentication redirect failure,
  primary HUNTER + IDENTITY. "Add payment integration" -> INTEGRATION.
- Evidence gating: a claim with empty evidence is refused by addClaim, by
  validateLedger, by doneCheck, and by importState -- four independent gates.
- State transitions: PENDING -> RUNNING -> SUCCEEDED -> (no exit);
  BLOCKED -> RUNNING only via authorizeMission.
- Done-check: DRAFT mission lists "Loop has not completed" as a failure.

## Genuine repairs during the build

1. runMission guard: re-running a READY_FOR_DONE or BLOCKED mission previously
   fell into an illegal node transition and marked the mission FAILED. Added
   explicit guards returning clean errors ("already completed" / "use authorize").
2. ASCII hygiene: 92 lines contained raw non-ASCII (em/en dashes, section
   signs, arrows, smart quotes). Replaced with \uXXXX escapes (JS),
   HTML entities (HTML), ASCII equivalents (CSS/README). Re-verified 0 matches
   and re-ran all tests.

## Honest limitations

- Routing is keyword scoring, not understanding.
- The authorization button is a simulated approval, not a real approval record.
- Run logs/claims/lessons are fixed-rule output from intake text, not investigation.
- Data lives in one browser's localStorage.
