/* titan-antigravity \u2014 data tables paraphrased from TITAN NEXUS v8.1 (Merged Edition).
   Role names, duties, boundaries, routing rows, node states, claim categories,
   loop stages and skill names follow the doc. Long passages are NOT copied;
   duties are one-line paraphrases. Pure ASCII: use \u00A7 for section sign. */
(function (global) {
  'use strict';

  var SEC = '\u00A7';

  /* ---------------- \u00a714 \u2014 34 roles ---------------- */
  var ROLES = [
    { id: 'NEXUS', name: 'NEXUS', domain: 'Orchestration', duty: 'Owns objective, scope, coordination, integration, evidence and final delivery.', boundary: 'Never absent \u2014 coordination is the job.' },
    { id: 'PLANNER', name: 'PLANNER', domain: 'Orchestration', duty: 'Decomposition, milestones, dependency graph, critical path.', boundary: 'Not needed for single-step tasks.' },
    { id: 'RESEARCHER', name: 'RESEARCHER', domain: 'Research', duty: 'Authoritative research, version compatibility, source-backed findings.', boundary: 'Not needed when the answer is in the repo.' },
    { id: 'KNOWLEDGE', name: 'KNOWLEDGE', domain: 'Research', duty: 'Provenance, project memory, knowledge structure, freshness, retrieval.', boundary: 'Not needed for greenfield tasks with no history.' },
    { id: 'EVAL', name: 'EVAL', domain: 'Quality', duty: 'Acceptance measures, experiment design, evidence quality, evaluation rubrics.', boundary: 'Not needed for trivial changes with obvious checks.' },
    { id: 'UX', name: 'UX', domain: 'Product', duty: 'User journeys, information architecture, navigation, interaction flows.', boundary: 'Not needed for pure backend work.' },
    { id: 'INTERFACE', name: 'INTERFACE', domain: 'Product', duty: 'Visual hierarchy, typography, layout, responsive composition, design tokens.', boundary: 'Not needed for API-only work.' },
    { id: 'ACCESS', name: 'ACCESS', domain: 'Product', duty: 'Semantics, keyboard operation, focus, assistive technology, reduced motion.', boundary: 'Not needed when no user-facing surface changes.' },
    { id: 'CONTENT', name: 'CONTENT', domain: 'Product', duty: 'Interface copy, errors, onboarding, content consistency.', boundary: 'Not needed when no user-visible text changes.' },
    { id: 'LOCALE', name: 'LOCALE', domain: 'Product', duty: 'Internationalization, localization, RTL, currencies, time zones, formatting.', boundary: 'Not needed for single-locale internal tools.' },
    { id: 'FRONTEND', name: 'FRONTEND', domain: 'Engineering', duty: 'Web interfaces, routing, state, forms, client integrations, technical SEO.', boundary: 'Not needed for server-only changes.' },
    { id: 'MOBILE', name: 'MOBILE', domain: 'Engineering', duty: 'Mobile lifecycle, native behavior, permissions, offline and touch workflows.', boundary: 'Not needed for web-only delivery.' },
    { id: 'BACKEND', name: 'BACKEND', domain: 'Engineering', duty: 'Server business rules, validation, services, background jobs, scheduling.', boundary: 'Not needed for static or client-only changes.' },
    { id: 'API', name: 'API', domain: 'Engineering', duty: 'Request/response contracts, errors, pagination, versioning, webhooks.', boundary: 'Not needed when no contract surface changes.' },
    { id: 'DATA', name: 'DATA', domain: 'Data', duty: 'Data models, integrity constraints, transactions, access patterns, schema evolution.', boundary: 'Not needed for stateless logic.' },
    { id: 'IDENTITY', name: 'IDENTITY', domain: 'Security', duty: 'Authentication, authorization, sessions, OAuth/OIDC, ownership and tenant enforcement.', boundary: 'Not needed when no identity or permission boundary is touched.' },
    { id: 'INTEGRATION', name: 'INTEGRATION', domain: 'Engineering', duty: 'External adapters, payments, timeouts, retries, partial-failure behavior.', boundary: 'Not needed for fully self-contained systems.' },
    { id: 'AI-ENGINEER', name: 'AI-ENGINEER', domain: 'AI', duty: 'Model integration, structured outputs, validation, fallbacks, tool-using agents.', boundary: 'Not needed for deterministic systems.' },
    { id: 'RETRIEVAL', name: 'RETRIEVAL', domain: 'AI', duty: 'RAG indexing, ranking, access filtering at retrieval time, attribution, freshness.', boundary: 'Not needed when there is no retrieval layer.' },
    { id: 'VOICE', name: 'VOICE', domain: 'AI', duty: 'Speech recognition and synthesis, streaming, interruption, audio quality.', boundary: 'Not needed for text-only interfaces.' },
    { id: 'AI-SAFETY', name: 'AI-SAFETY', domain: 'Security', duty: 'Prompt injection, tool permissions, data leakage, agent abuse.', boundary: 'Not needed when no untrusted input reaches the model or its tools.' },
    { id: 'SENTINEL', name: 'SENTINEL', domain: 'Security', duty: 'Security coordination, risk triage, control requirements, threat modeling.', boundary: 'Not needed for R0\u2013R1 work with no trust boundary.' },
    { id: 'PRIVACY', name: 'PRIVACY', domain: 'Security', duty: 'Data minimization, consent, retention, deletion, sensitive data handling.', boundary: 'Not needed when no personal data is involved.' },
    { id: 'SECRETS', name: 'SECRETS', domain: 'Security', duty: 'Credential handling, scope, storage, rotation planning, exposure containment.', boundary: 'Not needed when no credentials are in scope.' },
    { id: 'SUPPLY-CHAIN', name: 'SUPPLY-CHAIN', domain: 'Platform', duty: 'Dependencies, lockfiles, provenance, advisories, licensing.', boundary: 'Not needed when no dependency changes.' },
    { id: 'HUNTER', name: 'HUNTER', domain: 'Quality', duty: 'Reproduction, competing hypotheses ranked by evidence, root cause at the broken contract.', boundary: 'Not needed when the cause is already established.' },
    { id: 'QA', name: 'QA', domain: 'Quality', duty: 'Acceptance, exploratory, negative-path, regression, critical journeys, compatibility.', boundary: 'Not needed for R0 explanation-only work.' },
    { id: 'VELOCITY', name: 'VELOCITY', domain: 'Platform', duty: 'Measured latency, rendering, memory, runtime performance; authorized load modeling.', boundary: 'Not needed when no performance question is asked or implied.' },
    { id: 'DEVOPS', name: 'DEVOPS', domain: 'Platform', duty: 'Builds, CI/CD, environment configuration, deployment, recovery, tooling.', boundary: 'Not needed for local-only verification.' },
    { id: 'CLOUD', name: 'CLOUD', domain: 'Platform', duty: 'Infrastructure, networking, scaling, managed services.', boundary: 'Not needed when no infrastructure changes.' },
    { id: 'OBSERVER', name: 'OBSERVER', domain: 'Platform', duty: 'Logs, metrics, traces, alerts, health checks, service objectives, incidents.', boundary: 'Not needed for short-lived throwaway work.' },
    { id: 'DOCS', name: 'DOCS', domain: 'Governance', duty: 'Documentation, API references, runbooks, decision records, onboarding.', boundary: 'Not needed when the change is self-evident.' },
    { id: 'REVIEWER', name: 'REVIEWER', domain: 'Quality', duty: 'Independent review: correctness, maintainability, regressions \u2014 with evidence.', boundary: 'Not needed for R0\u2013R1 trivial changes.' },
    { id: 'RELEASE', name: 'RELEASE', domain: 'Governance', duty: 'Release evidence, gate assessment, rollout and recovery plans, cost check.', boundary: 'Not needed when nothing is being released.' }
  ];

  /* ---------------- \u00a716 \u2014 minimum sufficient routing ---------------- */
  var ROUTING = [
    { task: 'Styling defect', keywords: ['styling', 'css', 'layout', 'pixel', 'color', 'font', 'spacing', 'design', 'ui'], primary: ['FRONTEND', 'INTERFACE'], extra: ['ACCESS', 'QA'] },
    { task: 'Authentication redirect failure', keywords: ['login', 'redirect', 'auth', 'session', 'sign-in', 'signin', 'sso', 'oauth', 'token'], primary: ['HUNTER', 'IDENTITY'], extra: ['INTEGRATION', 'DEVOPS', 'QA'] },
    { task: 'API feature', keywords: ['api', 'endpoint', 'webhook', 'rest', 'graphql', 'contract'], primary: ['BACKEND', 'API'], extra: ['DATA', 'IDENTITY', 'EVAL'] },
    { task: 'Database incident', keywords: ['database', 'db', 'query', 'migration', 'postgres', 'sql', 'slow query', 'outage'], primary: ['OBSERVER', 'DATA', 'HUNTER'], extra: ['SENTINEL', 'DEVOPS'] },
    { task: 'AI result regression', keywords: ['ai', 'model', 'prompt', 'llm', 'regression', 'hallucination', 'output quality'], primary: ['AI-ENGINEER', 'EVAL'], extra: ['RETRIEVAL', 'AI-SAFETY'] },
    { task: 'Payment integration', keywords: ['payment', 'billing', 'checkout', 'stripe', 'bkash', 'refund', 'charge', 'invoice'], primary: ['INTEGRATION'], extra: ['IDENTITY', 'API', 'QA'] },
    { task: 'Performance defect', keywords: ['slow', 'latency', 'performance', 'memory', 'load', 'speed', 'jank', 'bundle'], primary: ['VELOCITY'], extra: ['BACKEND', 'DATA', 'OBSERVER'] },
    { task: 'Security review', keywords: ['security', 'vulnerability', 'xss', 'injection', 'threat', 'audit', 'pentest', 'csp'], primary: ['SENTINEL'], extra: ['PRIVACY', 'SECRETS', 'SUPPLY-CHAIN'] },
    { task: 'Production release', keywords: ['release', 'deploy', 'production', 'rollout', 'launch', 'ship'], primary: ['DEVOPS', 'RELEASE'], extra: ['REVIEWER', 'OBSERVER'] },
    { task: 'RAG quality problem', keywords: ['rag', 'retrieval', 'embedding', 'search quality', 'citation', 'knowledge'], primary: ['RETRIEVAL', 'EVAL'], extra: ['AI-ENGINEER', 'PRIVACY'] },
    { task: 'Voice feature', keywords: ['voice', 'speech', 'audio', 'tts', 'stt', 'transcription', 'microphone'], primary: ['VOICE', 'INTEGRATION'], extra: ['LOCALE', 'AI-SAFETY'] }
  ];

  /* ---------------- \u00a734 / \u00a71 \u2014 Nexus Execution Loop stages ---------------- */
  var LOOP = ['UNDERSTAND', 'DISCOVER', 'RECONCILE', 'CLASSIFY', 'PLAN', 'ROUTE',
    'EXECUTE', 'INTEGRATE', 'VERIFY', 'REVIEW', 'RESOLVE', 'DELIVER', 'PRESERVE', 'LEARN'];

  /* ---------------- \u00a717 \u2014 node states ---------------- */
  var NODE_STATES = ['PENDING', 'READY', 'RUNNING', 'RETRY_WAIT', 'BLOCKED',
    'CANCEL_REQUESTED', 'UNKNOWN', 'SUCCEEDED', 'FAILED', 'CANCELLED'];

  /* ---------------- \u00a78 \u2014 claim categories ---------------- */
  var CLAIM_CATEGORIES = [
    { id: 'OBSERVED', meaning: 'Directly encountered in a source, tool result, or user-provided evidence.' },
    { id: 'VERIFIED', meaning: 'Checked against a relevant criterion under defined conditions.' },
    { id: 'INFERRED', meaning: 'Strongly supported by evidence but not directly established.' },
    { id: 'ASSUMED', meaning: 'Working premise that remains unconfirmed.' },
    { id: 'UNKNOWN', meaning: 'Evidence insufficient, inaccessible, contradictory, stale, or inconclusive.' }
  ];

  /* ---------------- \u00a732 \u2014 claim vocabulary ---------------- */
  var CLAIM_VOCAB = ['Implemented', 'Verified locally', 'Verified in staging', 'Deployed',
    'Verified in production', 'Partially complete', 'Blocked'];

  /* ---------------- \u00a711 \u2014 risk + autonomy ---------------- */
  var RISK_LEVELS = [
    { id: 'R0', label: 'R0 \u2014 Trivial', detail: 'Harmless explanation, isolated copy correction.' },
    { id: 'R1', label: 'R1 \u2014 Low', detail: 'Localized, readily reversible behavior change.' },
    { id: 'R2', label: 'R2 \u2014 Moderate', detail: 'Multi-component feature or public contract change.' },
    { id: 'R3', label: 'R3 \u2014 High', detail: 'Authorization, sensitive data, money-handling code, consequential AI tools.' },
    { id: 'R4', label: 'R4 \u2014 Critical', detail: 'Broad production impact, active compromise, serious integrity risk.' },
    { id: 'R5', label: 'R5 \u2014 Extreme', detail: 'Irreversible or catastrophic potential loss.' }
  ];
  var AUTONOMY_LEVELS = [
    { id: 'A0', label: 'A0 \u2014 Explain', detail: 'Answer, analyze, or explain without system changes.' },
    { id: 'A1', label: 'A1 \u2014 Assist', detail: 'Prepare options, drafts, diagnostics, guided steps.' },
    { id: 'A2', label: 'A2 \u2014 Implement', detail: 'Execute an authorized specified change.' },
    { id: 'A3', label: 'A3 \u2014 Autonomous implementation', detail: 'Choose routine details; carry a bounded objective through verification.' },
    { id: 'A4', label: 'A4 \u2014 Production preparation', detail: 'Prepare release candidate, evidence, rollout, recovery plan.' },
    { id: 'A5', label: 'A5 \u2014 Controlled production execution', detail: 'Explicitly authorized operation against a confirmed production target.' }
  ];
  var MODES = ['TASK', 'BOOTSTRAP', 'UPGRADE', 'AUDIT', 'PROMPT-EDIT', 'INCIDENT', 'RESEARCH', 'PROGRAM'];
  var RISK_FLAGS = [
    { id: 'production', label: 'Production target', level: 'R3' },
    { id: 'destructive', label: 'Destructive / irreversible', level: 'R4' },
    { id: 'payments', label: 'Money / payments', level: 'R3' },
    { id: 'secrets', label: 'Credentials / secrets', level: 'R3' },
    { id: 'personal-data', label: 'Personal / sensitive data', level: 'R2' },
    { id: 'external', label: 'External communication / publishing', level: 'R2' },
    { id: 'public-exposure', label: 'Public exposure', level: 'R3' }
  ];

  /* ---------------- \u00a736 \u2014 skills library (\u00a77.1\u2013\u00a77.12) ---------------- */
  /* purpose = short paraphrase. owner = \u00a714 role that owns the skill. */
  var SKILLS = [
    /* 7.1 Orchestration & reasoning */
    { id: 'sk-objective-decomp', family: '7.1 Orchestration & reasoning', name: 'Objective Decomposition', purpose: 'Turn a request into deliverables, constraints, non-goals, dependencies, acceptance tests.', owner: 'PLANNER' },
    { id: 'sk-acceptance-builder', family: '7.1 Orchestration & reasoning', name: 'Acceptance-Criteria Builder', purpose: 'Turn vague goals into observable pass/fail conditions without over-specifying.', owner: 'EVAL' },
    { id: 'sk-risk-class', family: '7.1 Orchestration & reasoning', name: 'Risk Classification', purpose: 'Assess impact, likelihood, uncertainty, exposure, reversibility, recovery.', owner: 'SENTINEL' },
    { id: 'sk-decision-matrix', family: '7.1 Orchestration & reasoning', name: 'Decision Matrix', purpose: 'Compare options using priorities, evidence, cost, operational burden.', owner: 'NEXUS' },
    { id: 'sk-dependency-graph', family: '7.1 Orchestration & reasoning', name: 'Dependency Graph Builder', purpose: 'Identify task ordering, blockers, parallelizable work, critical path.', owner: 'PLANNER' },
    { id: 'sk-assumption-register', family: '7.1 Orchestration & reasoning', name: 'Assumption Register', purpose: 'Record assumptions, confidence, validation method, consequences if false.', owner: 'EVAL' },
    { id: 'sk-evidence-ledger', family: '7.1 Orchestration & reasoning', name: 'Evidence Ledger', purpose: 'Link claims to source, revision, environment, procedure, limitations.', owner: 'EVAL' },
    { id: 'sk-conflict-resolver', family: '7.1 Orchestration & reasoning', name: 'Conflict Resolver', purpose: 'Identify conflicting requirements, preserve hierarchy, ask only consequential questions.', owner: 'NEXUS' },
    { id: 'sk-scope-guard', family: '7.1 Orchestration & reasoning', name: 'Scope Guard', purpose: 'Detect and prevent unapproved scope expansion.', owner: 'NEXUS' },
    { id: 'sk-handoff-composer', family: '7.1 Orchestration & reasoning', name: 'Handoff Composer', purpose: 'Compact state summary: goal, decisions, changed files, tests, risks, next action.', owner: 'NEXUS' },
    /* 7.2 Research & knowledge */
    { id: 'sk-primary-research', family: '7.2 Research & knowledge', name: 'Primary-Source Research', purpose: 'Prioritize official docs, specs, source repos, original studies.', owner: 'RESEARCHER' },
    { id: 'sk-freshness-check', family: '7.2 Research & knowledge', name: 'Source Freshness Check', purpose: 'Verify publication/update date and relevance to the time window.', owner: 'RESEARCHER' },
    { id: 'sk-claim-citation', family: '7.2 Research & knowledge', name: 'Claim-to-Citation Mapper', purpose: 'Connect material factual claims to reliable sources.', owner: 'RESEARCHER' },
    { id: 'sk-contradiction', family: '7.2 Research & knowledge', name: 'Contradiction Analysis', purpose: 'Compare sources, explain conflicts, avoid false reconciliation.', owner: 'RESEARCHER' },
    { id: 'sk-drift-detector', family: '7.2 Research & knowledge', name: 'Documentation Drift Detector', purpose: 'Compare docs against current code/configuration.', owner: 'DOCS' },
    { id: 'sk-semantic-search', family: '7.2 Research & knowledge', name: 'Repository Semantic Search', purpose: 'Find relevant files/symbols with scoped searches before broad scans.', owner: 'KNOWLEDGE' },
    { id: 'sk-knowledge-dedup', family: '7.2 Research & knowledge', name: 'Knowledge Deduplication', purpose: 'Merge overlapping notes while preserving provenance.', owner: 'KNOWLEDGE' },
    { id: 'sk-stale-state', family: '7.2 Research & knowledge', name: 'Stale-State Detector', purpose: 'Flag prior decisions or assumptions contradicted by current evidence.', owner: 'KNOWLEDGE' },
    { id: 'sk-tech-compare', family: '7.2 Research & knowledge', name: 'Technical Comparison', purpose: 'Compare products, frameworks, APIs, architectures against explicit criteria.', owner: 'RESEARCHER' },
    { id: 'sk-research-synth', family: '7.2 Research & knowledge', name: 'Research Synthesis', purpose: 'Concise conclusions, evidence, caveats, actionable recommendations.', owner: 'RESEARCHER' },
    /* 7.3 Product & UX */
    { id: 'sk-journey-map', family: '7.3 Product & UX', name: 'User Journey Mapping', purpose: 'Identify user goal, entry point, decisions, friction, success, recovery.', owner: 'UX' },
    { id: 'sk-info-arch', family: '7.3 Product & UX', name: 'Information Architecture', purpose: 'Organize navigation, labels, page hierarchy, discoverability.', owner: 'UX' },
    { id: 'sk-interaction-states', family: '7.3 Product & UX', name: 'Interaction-State Design', purpose: 'Specify idle, loading, success, empty, error, disabled, retry states.', owner: 'UX' },
    { id: 'sk-token-audit', family: '7.3 Product & UX', name: 'Design Token Audit', purpose: 'Detect inconsistent colors, spacing, typography, radii, elevation, breakpoints.', owner: 'INTERFACE' },
    { id: 'sk-responsive-review', family: '7.3 Product & UX', name: 'Responsive Layout Review', purpose: 'Check mobile, tablet, desktop, overflow, touch behavior.', owner: 'INTERFACE' },
    { id: 'sk-hierarchy-review', family: '7.3 Product & UX', name: 'Visual Hierarchy Review', purpose: 'Inspect emphasis, density, alignment, readability, scan path.', owner: 'INTERFACE' },
    { id: 'sk-component-contract', family: '7.3 Product & UX', name: 'Component Contract Design', purpose: 'Define props, variants, states, accessibility, composition rules.', owner: 'FRONTEND' },
    { id: 'sk-a11y-audit', family: '7.3 Product & UX', name: 'Accessibility Audit', purpose: 'Evaluate semantics, keyboard operation, focus, contrast, names, motion.', owner: 'ACCESS' },
    { id: 'sk-ux-content', family: '7.3 Product & UX', name: 'UX Content Audit', purpose: 'Make labels, errors, instructions, confirmations concise and unambiguous.', owner: 'CONTENT' },
    { id: 'sk-l10n-readiness', family: '7.3 Product & UX', name: 'Localization Readiness', purpose: 'Remove hard-coded locale assumptions; test longer strings, RTL, formatting.', owner: 'LOCALE' },
    { id: 'sk-heuristic-review', family: '7.3 Product & UX', name: 'Usability Heuristic Review', purpose: 'Identify unnecessary steps, confusing feedback, hidden state, weak recovery.', owner: 'UX' },
    { id: 'sk-visual-regression', family: '7.3 Product & UX', name: 'Visual Regression Planning', purpose: 'Select representative screenshots/states and define comparison criteria.', owner: 'QA' },
    /* 7.4 Frontend & mobile */
    { id: 'sk-comp-arch', family: '7.4 Frontend & mobile', name: 'Component Architecture Review', purpose: 'Identify cohesive boundaries, duplicate logic, state ownership.', owner: 'FRONTEND' },
    { id: 'sk-state-trace', family: '7.4 Frontend & mobile', name: 'State-Flow Tracing', purpose: 'Follow user action through state, request, response, cache, render.', owner: 'FRONTEND' },
    { id: 'sk-form-validation', family: '7.4 Frontend & mobile', name: 'Form Validation Design', purpose: 'Combine client feedback with authoritative server validation.', owner: 'FRONTEND' },
    { id: 'sk-async-state', family: '7.4 Frontend & mobile', name: 'Async-State Handling', purpose: 'Handle loading, cancellation, stale responses, retries, race conditions.', owner: 'FRONTEND' },
    { id: 'sk-fe-perf', family: '7.4 Frontend & mobile', name: 'Frontend Performance Profiling', purpose: 'Measure rendering, bundle size, layout shifts, network waterfalls.', owner: 'VELOCITY' },
    { id: 'sk-browser-compat', family: '7.4 Frontend & mobile', name: 'Browser Compatibility Check', purpose: 'Test declared browsers and use graceful feature fallbacks.', owner: 'QA' },
    { id: 'sk-mobile-lifecycle', family: '7.4 Frontend & mobile', name: 'Mobile Lifecycle Review', purpose: 'Validate background/foreground transitions, navigation, permissions, offline.', owner: 'MOBILE' },
    { id: 'sk-offline-ux', family: '7.4 Frontend & mobile', name: 'Offline/Retry UX', purpose: 'Explain unsynced state, conflicts, recovery without losing user input.', owner: 'MOBILE' },
    { id: 'sk-secure-storage', family: '7.4 Frontend & mobile', name: 'Secure Client Storage Review', purpose: 'Avoid storing secrets or sensitive data in unsafe client locations.', owner: 'SECRETS' },
    { id: 'sk-ui-api-test', family: '7.4 Frontend & mobile', name: 'UI-to-API Contract Test', purpose: 'Verify request shape, response handling, error mapping against the contract.', owner: 'API' },
    /* 7.5 Backend, API & integration */
    { id: 'sk-api-contract', family: '7.5 Backend, API & integration', name: 'API Contract Review', purpose: 'Check schemas, versioning, pagination, errors, auth, consumer compatibility.', owner: 'API' },
    { id: 'sk-input-boundary', family: '7.5 Backend, API & integration', name: 'Input Boundary Validation', purpose: 'Validate type, size, format, range, business semantics on the server.', owner: 'BACKEND' },
    { id: 'sk-auth-matrix', family: '7.5 Backend, API & integration', name: 'Authorization Matrix Builder', purpose: 'Test role, object, tenant, action combinations.', owner: 'IDENTITY' },
    { id: 'sk-idempotency', family: '7.5 Backend, API & integration', name: 'Idempotency Design', purpose: 'Prevent duplicate side effects for retried requests and jobs.', owner: 'BACKEND' },
    { id: 'sk-retry-backoff', family: '7.5 Backend, API & integration', name: 'Retry/Backoff Design', purpose: 'Bounded retries, jitter, timeouts, provider-aware error classes.', owner: 'INTEGRATION' },
    { id: 'sk-webhook-verify', family: '7.5 Backend, API & integration', name: 'Webhook Verification', purpose: 'Validate signatures, timestamps, replay protection, event idempotency.', owner: 'API' },
    { id: 'sk-ext-reconcile', family: '7.5 Backend, API & integration', name: 'External-State Reconciliation', purpose: 'Inspect actual provider state before retrying uncertain writes.', owner: 'INTEGRATION' },
    { id: 'sk-rate-limit', family: '7.5 Backend, API & integration', name: 'Rate-Limit Design', purpose: 'Apply user/tenant/resource-aware limits and safe retry hints.', owner: 'BACKEND' },
    { id: 'sk-contract-compat', family: '7.5 Backend, API & integration', name: 'Contract Compatibility Test', purpose: 'Test current and intended consumers before changing interfaces.', owner: 'API' },
    { id: 'sk-integration-failure', family: '7.5 Backend, API & integration', name: 'Integration Failure Simulation', purpose: 'Validate timeout, malformed response, rate limit, auth failure, outage behavior.', owner: 'INTEGRATION' },
    /* 7.6 Database & data */
    { id: 'sk-schema-model', family: '7.6 Database & data', name: 'Schema Modeling', purpose: 'Define entities, relationships, constraints, ownership, lifecycle.', owner: 'DATA' },
    { id: 'sk-query-plan', family: '7.6 Database & data', name: 'Query Plan Analysis', purpose: 'Inspect execution plans, selectivity, index use, query cost.', owner: 'DATA' },
    { id: 'sk-index-advisor', family: '7.6 Database & data', name: 'Index Advisor', purpose: 'Recommend indexes based on real query patterns and write overhead.', owner: 'DATA' },
    { id: 'sk-migration-preflight', family: '7.6 Database & data', name: 'Migration Preflight', purpose: 'Check dependencies, locks, data shape, duration, compatibility, recovery.', owner: 'DATA' },
    { id: 'sk-data-reconcile', family: '7.6 Database & data', name: 'Data Reconciliation', purpose: 'Compare counts, keys, checksums, aggregates, invariants before/after migration.', owner: 'DATA' },
    { id: 'sk-data-quality', family: '7.6 Database & data', name: 'Data Quality Profiling', purpose: 'Detect missing, duplicate, out-of-range, malformed, inconsistent values.', owner: 'DATA' },
    { id: 'sk-retention-design', family: '7.6 Database & data', name: 'Retention & Deletion Design', purpose: 'Trace copies, logs, indexes, caches, downstream replicas.', owner: 'PRIVACY' },
    { id: 'sk-tenant-isolation', family: '7.6 Database & data', name: 'Tenant Isolation Test', purpose: 'Attempt authorized and unauthorized cross-tenant reads/writes.', owner: 'IDENTITY' },
    { id: 'sk-backup-restore', family: '7.6 Database & data', name: 'Backup Restore Verification', purpose: 'Controlled restore test; never infer restore success from backup existence.', owner: 'DEVOPS' },
    { id: 'sk-realtime-trace', family: '7.6 Database & data', name: 'Realtime Event Trace', purpose: 'Follow database change through publication, policy, channel, event, client, UI.', owner: 'OBSERVER' },
    /* 7.7 AI & agent */
    { id: 'sk-prompt-contract', family: '7.7 AI & agent', name: 'Prompt Contract Design', purpose: 'Define role, task, context, output schema, boundaries, stop conditions.', owner: 'AI-ENGINEER' },
    { id: 'sk-structured-validation', family: '7.7 AI & agent', name: 'Structured Output Validation', purpose: 'Parse model output, validate schema, then validate business semantics.', owner: 'AI-ENGINEER' },
    { id: 'sk-injection-defense', family: '7.7 AI & agent', name: 'Prompt-Injection Defense Review', purpose: 'Separate trusted instructions from retrieved/user content; restrict tool effects.', owner: 'AI-SAFETY' },
    { id: 'sk-tooluse-policy', family: '7.7 AI & agent', name: 'Tool-Use Policy Design', purpose: 'Constrain tool list, arguments, resource scope, external side effects.', owner: 'AI-SAFETY' },
    { id: 'sk-agent-loop-guard', family: '7.7 AI & agent', name: 'Agent Loop Guard', purpose: 'Cap steps, retries, repeated actions, wall-clock time, total cost.', owner: 'AI-ENGINEER' },
    { id: 'sk-agent-handoff', family: '7.7 AI & agent', name: 'Agent Handoff Protocol', purpose: 'Exchange goal, state, evidence, authority, outputs, unresolved questions.', owner: 'NEXUS' },
    { id: 'sk-rag-eval', family: '7.7 AI & agent', name: 'RAG Retrieval Evaluation', purpose: 'Measure recall/relevance, source freshness, citation support, leakage.', owner: 'RETRIEVAL' },
    { id: 'sk-grounded-audit', family: '7.7 AI & agent', name: 'Grounded Answer Audit', purpose: 'Check whether each important answer claim is supported by retrieved evidence.', owner: 'EVAL' },
    { id: 'sk-model-regression', family: '7.7 AI & agent', name: 'Model Regression Evaluation', purpose: 'Compare a stable test set across model/prompt/config revisions.', owner: 'EVAL' },
    { id: 'sk-ai-failure-tax', family: '7.7 AI & agent', name: 'AI Failure Taxonomy', purpose: 'Classify retrieval, prompt, model, parsing, validation, tool, policy, UI failures.', owner: 'AI-ENGINEER' },
    { id: 'sk-multimodal-validation', family: '7.7 AI & agent', name: 'Multimodal Input Validation', purpose: 'Validate file types, size, duration, metadata, supported modalities.', owner: 'AI-ENGINEER' },
    { id: 'sk-voice-eval', family: '7.7 AI & agent', name: 'Voice Interaction Evaluation', purpose: 'Test transcription, interruption, latency, language, noise, recovery.', owner: 'VOICE' },
    { id: 'sk-human-review', family: '7.7 AI & agent', name: 'Human Review Routing', purpose: 'Escalate consequential, ambiguous, or low-confidence outcomes on explicit criteria.', owner: 'REVIEWER' },
    { id: 'sk-cost-latency-opt', family: '7.7 AI & agent', name: 'Model Cost/Latency Optimizer', purpose: 'Compare alternatives against a baseline without silently weakening acceptance.', owner: 'VELOCITY' },
    { id: 'sk-version-tracking', family: '7.7 AI & agent', name: 'Data/Model Version Tracking', purpose: 'Record dataset, model, prompt, evaluator, tool, runtime revisions.', owner: 'KNOWLEDGE' },
    /* 7.8 Security & privacy */
    { id: 'sk-threat-model', family: '7.8 Security & privacy', name: 'Threat Modeling', purpose: 'Enumerate assets, actors, trust boundaries, attack paths, mitigations, residual risk.', owner: 'SENTINEL' },
    { id: 'sk-secrets-audit', family: '7.8 Security & privacy', name: 'Secrets Exposure Audit', purpose: 'Find accidental credential exposure without printing secret values.', owner: 'SECRETS' },
    { id: 'sk-dep-risk', family: '7.8 Security & privacy', name: 'Dependency Risk Review', purpose: 'Assess known vulnerabilities, provenance, licenses, upgrade impact.', owner: 'SUPPLY-CHAIN' },
    { id: 'sk-injection-review', family: '7.8 Security & privacy', name: 'Injection Defense Review', purpose: 'Check SQL, command, template, HTML, prompt, query injection boundaries.', owner: 'SENTINEL' },
    { id: 'sk-session-lifecycle', family: '7.8 Security & privacy', name: 'Session Lifecycle Test', purpose: 'Test login, refresh, expiry, logout, revocation, multi-device behavior.', owner: 'IDENTITY' },
    { id: 'sk-object-auth', family: '7.8 Security & privacy', name: 'Object-Level Authorization Test', purpose: 'Verify each resource action against ownership and policy.', owner: 'IDENTITY' },
    { id: 'sk-privacy-flow', family: '7.8 Security & privacy', name: 'Privacy Data-Flow Map', purpose: 'Document collection, processing, storage, sharing, retention, deletion.', owner: 'PRIVACY' },
    { id: 'sk-sensitive-log', family: '7.8 Security & privacy', name: 'Sensitive-Log Audit', purpose: 'Identify tokens, personal data, confidential payloads in logs and traces.', owner: 'PRIVACY' },
    { id: 'sk-upload-security', family: '7.8 Security & privacy', name: 'File Upload Security Review', purpose: 'Validate MIME/content, size, path, storage isolation, scanning, download auth.', owner: 'SENTINEL' },
    { id: 'sk-ssrf-review', family: '7.8 Security & privacy', name: 'SSRF/Network Boundary Review', purpose: 'Restrict outbound access; prevent untrusted URLs reaching sensitive services.', owner: 'SENTINEL' },
    { id: 'sk-abuse-design', family: '7.8 Security & privacy', name: 'Abuse-Case Design', purpose: 'Test automation abuse, enumeration, spam, privilege escalation, exhaustion.', owner: 'SENTINEL' },
    { id: 'sk-security-regression', family: '7.8 Security & privacy', name: 'Security Regression Test', purpose: 'Convert confirmed findings into repeatable tests.', owner: 'QA' },
    /* 7.9 Testing & reliability */
    { id: 'sk-risk-test-select', family: '7.9 Testing & reliability', name: 'Risk-Based Test Selection', purpose: 'Prioritize tests according to impact and failure likelihood.', owner: 'QA' },
    { id: 'sk-min-repro', family: '7.9 Testing & reliability', name: 'Minimal Reproduction Builder', purpose: 'Reduce a failure to the smallest repeatable case.', owner: 'HUNTER' },
    { id: 'sk-flaky-diagnosis', family: '7.9 Testing & reliability', name: 'Flaky-Test Diagnosis', purpose: 'Identify timing, shared state, environment, nondeterminism.', owner: 'QA' },
    { id: 'sk-negative-path', family: '7.9 Testing & reliability', name: 'Negative-Path Coverage', purpose: 'Test malformed input, missing permissions, expiry, timeouts, duplicates, dependency failure.', owner: 'QA' },
    { id: 'sk-race-test', family: '7.9 Testing & reliability', name: 'Concurrency/Race Test', purpose: 'Examine interleavings, duplicate events, stale writes, lost acknowledgements.', owner: 'QA' },
    { id: 'sk-regression-select', family: '7.9 Testing & reliability', name: 'Regression Test Selection', purpose: 'Map changed components and contracts to affected tests.', owner: 'QA' },
    { id: 'sk-e2e-critical', family: '7.9 Testing & reliability', name: 'End-to-End Critical-Path Test', purpose: 'Validate a real user journey across relevant layers.', owner: 'QA' },
    { id: 'sk-a11y-automation', family: '7.9 Testing & reliability', name: 'Accessibility Automation Review', purpose: 'Combine automated checks with manual keyboard/screen-reader validation.', owner: 'ACCESS' },
    { id: 'sk-load-planning', family: '7.9 Testing & reliability', name: 'Load/Capacity Test Planning', purpose: 'Define workload, ramp, saturation signals, safe environment, abort criteria.', owner: 'VELOCITY' },
    { id: 'sk-failure-injection', family: '7.9 Testing & reliability', name: 'Failure Injection Planning', purpose: 'Simulate faults only with authorization and containment.', owner: 'OBSERVER' },
    { id: 'sk-release-smoke', family: '7.9 Testing & reliability', name: 'Release Smoke Test', purpose: 'Verify critical functionality after build/deploy.', owner: 'RELEASE' },
    { id: 'sk-test-evidence', family: '7.9 Testing & reliability', name: 'Test Evidence Reporter', purpose: 'Record command, environment, result, failures, limitations.', owner: 'QA' },
    /* 7.10 DevOps, platform & release */
    { id: 'sk-env-parity', family: '7.10 DevOps, platform & release', name: 'Environment Parity Audit', purpose: 'Compare local, preview, staging, production configuration safely.', owner: 'DEVOPS' },
    { id: 'sk-ci-review', family: '7.10 DevOps, platform & release', name: 'CI Pipeline Review', purpose: 'Inspect triggers, permissions, caches, secrets, artifacts, required checks.', owner: 'DEVOPS' },
    { id: 'sk-build-repro', family: '7.10 DevOps, platform & release', name: 'Build Reproducibility Check', purpose: 'Verify lockfiles, runtime versions, deterministic inputs, artifact provenance.', owner: 'DEVOPS' },
    { id: 'sk-deploy-readiness', family: '7.10 DevOps, platform & release', name: 'Deployment Readiness Check', purpose: 'Confirm target, artifact, config, migrations, health checks, rollback, authorization.', owner: 'RELEASE' },
    { id: 'sk-post-deploy', family: '7.10 DevOps, platform & release', name: 'Post-Deploy Verification', purpose: 'Confirm intended version, startup, critical flows, errors, latency, signals.', owner: 'OBSERVER' },
    { id: 'sk-observability-gap', family: '7.10 DevOps, platform & release', name: 'Observability Gap Analysis', purpose: 'Check logs, metrics, traces, dashboards, alerts, runbook ownership.', owner: 'OBSERVER' },
    { id: 'sk-slo-design', family: '7.10 DevOps, platform & release', name: 'SLO/Error-Budget Design', purpose: 'Define service indicators and thresholds from actual user impact.', owner: 'OBSERVER' },
    { id: 'sk-incident-timeline', family: '7.10 DevOps, platform & release', name: 'Incident Timeline Builder', purpose: 'Preserve timestamps, changes, observed symptoms, mitigation, verified recovery.', owner: 'OBSERVER' },
    { id: 'sk-rollback-review', family: '7.10 DevOps, platform & release', name: 'Rollback Compatibility Review', purpose: 'Check data/schema/config compatibility before reversing a release.', owner: 'RELEASE' },
    { id: 'sk-restore-drill', family: '7.10 DevOps, platform & release', name: 'Restore Drill Planner', purpose: 'Define safe restore test, expected RPO/RTO, integrity checks, evidence.', owner: 'DEVOPS' },
    { id: 'sk-infra-change', family: '7.10 DevOps, platform & release', name: 'Infrastructure Change Review', purpose: 'Assess blast radius, permissions, drift, cost, recovery.', owner: 'CLOUD' },
    { id: 'sk-release-notes', family: '7.10 DevOps, platform & release', name: 'Release Notes Generator', purpose: 'Describe user-visible changes and known limitations based on actual diff.', owner: 'DOCS' },
    /* 7.11 Documentation, governance & factory */
    { id: 'sk-diff-docs', family: '7.11 Documentation, governance & factory', name: 'Diff-Based Documentation Update', purpose: 'Update only docs affected by actual implementation changes.', owner: 'DOCS' },
    { id: 'sk-adr', family: '7.11 Documentation, governance & factory', name: 'Architecture Decision Record', purpose: 'Capture context, alternatives, decision, consequences, revisit triggers.', owner: 'DOCS' },
    { id: 'sk-capability-scanner', family: '7.11 Documentation, governance & factory', name: 'Capability Discovery Scanner', purpose: 'Inspect allowed sources safely and report scan scope/limitations.', owner: 'NEXUS' },
    { id: 'sk-registry-validator', family: '7.11 Documentation, governance & factory', name: 'Registry Schema Validator', purpose: 'Verify unique IDs, required fields, references, compatibility, provenance.', owner: 'NEXUS' },
    { id: 'sk-count-auditor', family: '7.11 Documentation, governance & factory', name: 'Capability Count Auditor', purpose: 'Count only validated records in a named snapshot and scope.', owner: 'EVAL' },
    { id: 'sk-host-mapper', family: '7.11 Documentation, governance & factory', name: 'Host Feature Mapper', purpose: 'Classify capabilities as native, project-local, adapter-based, manual, conceptual.', owner: 'NEXUS' },
    { id: 'sk-safe-import', family: '7.11 Documentation, governance & factory', name: 'Safe Import Review', purpose: 'Parse imported definitions without executing them; inspect authority implications.', owner: 'SENTINEL' },
    { id: 'sk-upgrade-diff', family: '7.11 Documentation, governance & factory', name: 'Upgrade Diff Planner', purpose: 'Compare versions, preserve customizations, identify breaking changes, plan rollback.', owner: 'PLANNER' },
    { id: 'sk-state-reconciler', family: '7.11 Documentation, governance & factory', name: 'Project State Reconciler', purpose: 'Compare notes with actual repository and test state before updating memory.', owner: 'KNOWLEDGE' },
    { id: 'sk-impact-assessment', family: '7.11 Documentation, governance & factory', name: 'Change Impact Assessment', purpose: 'Identify affected users, APIs, data, integrations, docs, operations.', owner: 'PLANNER' },
    { id: 'sk-completion-report', family: '7.11 Documentation, governance & factory', name: 'Completion Report Builder', purpose: 'Summarize deliverables, changed areas, checks, limitations, next steps.', owner: 'DOCS' },
    { id: 'sk-learning-review', family: '7.11 Documentation, governance & factory', name: 'Post-Task Learning Review', purpose: 'Capture evidence-backed lessons without changing permissions automatically.', owner: 'NEXUS' },
    /* 7.12 Domain-specific extension */
    { id: 'sk-domain-extension', family: '7.12 Domain-specific extension', name: 'Domain Extension Skill', purpose: 'Create specialized skills for payments, healthcare, education, fintech, gaming, mapping, robotics, regulated data \u2014 with standards, review, and safety rules.', owner: 'NEXUS' }
  ];

  global.TITAN_DATA = {
    SEC: SEC, ROLES: ROLES, ROUTING: ROUTING, LOOP: LOOP,
    NODE_STATES: NODE_STATES, CLAIM_CATEGORIES: CLAIM_CATEGORIES,
    CLAIM_VOCAB: CLAIM_VOCAB, RISK_LEVELS: RISK_LEVELS,
    AUTONOMY_LEVELS: AUTONOMY_LEVELS, MODES: MODES,
    RISK_FLAGS: RISK_FLAGS, SKILLS: SKILLS
  };
})(typeof window !== 'undefined' ? window : globalThis);
