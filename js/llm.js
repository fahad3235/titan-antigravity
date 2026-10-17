/* titan-antigravity -- real-LLM client (OpenRouter, direct from the browser).
   Pure ASCII. No dependencies.

   The browser calls OpenRouter directly: OpenRouter allows cross-origin
   browser requests, so no local server or proxy is needed.
   The API key is NEVER in this file. The user enters it in the LLM tab;
   app.js stores it only in that browser's localStorage, and this module
   sends it only in the Authorization header to OpenRouter. It is never
   logged, never put in a request body, and never returned in error objects. */
(function (global) {
  'use strict';

  var OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
  var DEFAULT_MODEL = 'nvidia/nemotron-3-ultra-550b-a55b';
  var MAX_EXCERPT = 500;
  var MAX_CLAIMS = 6;

  function cleanText(s, max) {
    return String(s == null ? '' : s).replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, max || 1000);
  }

  function validateModelId(id) {
    return typeof id === 'string' && /^[A-Za-z0-9._\/-]{1,200}$/.test(id);
  }
  function validateApiKey(key) {
    // Shape check only (length + no whitespace). Never inspect key content.
    return typeof key === 'string' && key.length >= 20 && key.length <= 500 && /^\S+$/.test(key);
  }

  /* ---------- prompts: TITAN doctrine summary + mission ---------- */
  function buildSystemPrompt(mission) {
    var lines = [];
    lines.push('You are a TITAN NEXUS analysis assistant. Follow this doctrine:');
    lines.push('- Honesty first: never claim verification you did not perform. Never invent facts about real systems.');
    lines.push('- Every claim needs a one-line evidence basis. Label uncertainty: say what is assumed or unknown.');
    lines.push('- Base the analysis ONLY on the mission text given. If the text does not support a point, say so.');
    lines.push('- Do not ask for credentials, secrets, or keys. Do not request any sensitive data.');
    lines.push('Respond with JSON only, in exactly this shape:');
    lines.push('{"findings":[{"text":"...","evidenceBasis":"..."}],"risks":[{"text":"...","evidenceBasis":"..."}],"actions":[{"text":"...","evidenceBasis":"..."}]}');
    lines.push('At most 2 items per list. Keep each text under 300 characters. Keep the whole response under 600 words.');
    lines.push('Mission title: ' + cleanText(mission.title, 200));
    lines.push('Objective: ' + cleanText(mission.objective, 2000));
    lines.push('Stakes: ' + cleanText(mission.stakes, 1000));
    lines.push('Constraints: ' + (mission.constraints || []).map(function (c) { return cleanText(c, 200); }).join('; '));
    lines.push('Risk: ' + cleanText(mission.risk, 20) + '. Assigned roles: ' + (mission.roles || []).join(', ') + '.');
    return lines.join('\n');
  }
  function buildUserPrompt(mission) {
    return 'Analyze this mission and return the JSON object described in the system prompt.\n' +
      'Title: ' + cleanText(mission.title, 200) + '\n' +
      'Objective: ' + cleanText(mission.objective, 2000) + '\n' +
      'Task type: ' + cleanText(mission.taskType, 200);
  }

  /* ---------- request building (client-side mirror of the API shape) ---------- */
  function buildChatRequest(input) {
    if (!input || typeof input !== 'object') return { ok: false, error: 'Request input must be an object.' };
    if (!validateModelId(input.model)) return { ok: false, error: 'Model id is invalid.' };
    if (!Array.isArray(input.messages) || input.messages.length === 0 || input.messages.length > 100) {
      return { ok: false, error: 'Messages must be a list of 1-100 messages.' };
    }
    for (var i = 0; i < input.messages.length; i++) {
      var m = input.messages[i];
      if (!m || typeof m !== 'object') return { ok: false, error: 'Message #' + (i + 1) + ' is not an object.' };
      if (['system', 'user', 'assistant'].indexOf(m.role) === -1) return { ok: false, error: 'Message #' + (i + 1) + ' has an invalid role.' };
      if (typeof m.content !== 'string' || m.content.length === 0 || m.content.length > 50000) {
        return { ok: false, error: 'Message #' + (i + 1) + ' content must be 1-50000 chars.' };
      }
    }
    var payload = {
      model: input.model,
      messages: input.messages.map(function (m) { return { role: m.role, content: m.content }; }),
      stream: false
    };
    if (input.temperature !== undefined) {
      if (typeof input.temperature !== 'number' || input.temperature < 0 || input.temperature > 2) {
        return { ok: false, error: 'Temperature must be a number 0-2.' };
      }
      payload.temperature = input.temperature;
    }
    if (input.maxTokens !== undefined) {
      if (!isInteger(input.maxTokens) || input.maxTokens < 1 || input.maxTokens > 100000) {
        return { ok: false, error: 'maxTokens must be an integer 1-100000.' };
      }
      payload.max_tokens = input.maxTokens;
    }
    return { ok: true, payload: payload };
  }
  function isInteger(n) { return typeof n === 'number' && isFinite(n) && Math.floor(n) === n; }

  /* ---------- response parsing ---------- */
  function parseLlmResponse(json, model) {
    if (!json || typeof json !== 'object') return { ok: false, error: 'Response is not an object.' };
    var content = json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
    if (typeof content !== 'string' || content.trim().length === 0) {
      return { ok: false, error: 'Response has no usable message content.' };
    }
    var usage = (json.usage && typeof json.usage === 'object') ? json.usage : null;
    return { ok: true, data: { content: content, usage: usage, rawExcerpt: content.slice(0, MAX_EXCERPT), model: model } };
  }

  function usageText(usage) {
    if (!usage || typeof usage !== 'object') return 'Tokens: not reported.';
    var p = usage.prompt_tokens != null ? usage.prompt_tokens : '?';
    var c = usage.completion_tokens != null ? usage.completion_tokens : '?';
    var t = usage.total_tokens != null ? usage.total_tokens : '?';
    return 'Tokens: prompt ' + p + ', completion ' + c + ', total ' + t + '.';
  }

  function parseAnalysis(content, model, usage) {
    var text = String(content == null ? '' : content);
    var obj = null;
    var stripped = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    try { obj = JSON.parse(stripped); } catch (e) { obj = null; }
    var excerpt = text.slice(0, MAX_EXCERPT);
    var claims = [];
    function pushClaim(kind, item) {
      if (claims.length >= MAX_CLAIMS) return;
      if (!item || typeof item.text !== 'string' || !item.text.trim()) return;
      claims.push({
        claim: cleanText(item.text, 300),
        category: kind === 'action' ? 'ASSUMED' : 'INFERRED',
        evidence: cleanText(item.evidenceBasis, 300) + ' ' + usageText(usage) + ' Raw excerpt: ' + excerpt,
        source: 'openrouter:' + model,
        limitations: 'LLM output: confidence capped at SUPPORTED, never VERIFIED. Review before trusting.',
        llm: { model: model, usage: usage, excerpt: excerpt }
      });
    }
    if (obj && typeof obj === 'object') {
      ['findings', 'risks', 'actions'].forEach(function (list) {
        var arr = obj[list];
        if (Array.isArray(arr)) {
          arr.slice(0, 2).forEach(function (item) {
            pushClaim(list === 'actions' ? 'action' : 'finding', item);
          });
        }
      });
    }
    if (claims.length === 0) {
      claims.push({
        claim: 'LLM returned analysis that could not be parsed as structured JSON',
        category: 'INFERRED',
        evidence: 'Raw response could not be parsed into findings/risks/actions. ' + usageText(usage) + ' Raw excerpt: ' + excerpt,
        source: 'openrouter:' + model,
        limitations: 'LLM output: confidence capped at SUPPORTED, never VERIFIED. The raw response was unstructured.',
        llm: { model: model, usage: usage, excerpt: excerpt }
      });
    }
    return { claims: claims };
  }

  /* ---------- error mapping ---------- */
  function classifyOpenRouterError(status, bodyText) {
    var detail = '';
    try {
      var b = JSON.parse(bodyText || '');
      if (b && b.error && b.error.message) detail = String(b.error.message).slice(0, 200);
    } catch (e) { detail = ''; }
    var suffix = detail ? ' Provider says: ' + detail : '';
    if (status === 400) return { code: 'BAD_REQUEST', message: 'Malformed request or unsupported parameter.' + suffix, fix: 'Try a different model id, or shorten the mission text.' };
    if (status === 401) return { code: 'INVALID_KEY', message: 'Missing or invalid API key.' + suffix, fix: 'Paste a valid OpenRouter key in the LLM tab and save it.' };
    if (status === 402) return { code: 'CREDITS', message: 'Insufficient credits.' + suffix, fix: 'Top up credits on OpenRouter, or switch to a free model.' };
    if (status === 403) return { code: 'FORBIDDEN', message: 'Spend limit reached, key disabled, or request blocked.' + suffix, fix: 'Check the key status and spend limit in your OpenRouter dashboard.' };
    if (status === 404) return { code: 'MODEL_NOT_FOUND', message: 'Unknown model id or no provider available.' + suffix, fix: 'Check the model id on OpenRouter, or use the default free model.' };
    if (status === 429) return { code: 'RATE_LIMIT', message: 'Rate limited.' + suffix, fix: 'Wait a minute and retry, or switch models.' };
    if (status === 502) return { code: 'UPSTREAM', message: 'Upstream provider failure (not billed).' + suffix, fix: 'Retry, or switch to a different model.' };
    return { code: 'PROVIDER_ERROR', message: 'OpenRouter returned HTTP ' + status + '.' + suffix, fix: 'Retry in a moment.' };
  }
  function classifyFetchError(err) {
    if (err && err.name === 'AbortError') {
      return { code: 'TIMEOUT', message: 'OpenRouter did not respond in time.', fix: 'Retry, shorten the mission text, or try a smaller/faster model.' };
    }
    return { code: 'UNREACHABLE', message: 'Could not reach OpenRouter.', fix: 'Check your internet connection and retry.' };
  }

  function defaultSleep(ms) {
    return new Promise(function (resolve) {
      if (typeof setTimeout === 'function') setTimeout(resolve, ms);
      else resolve();
    });
  }
  function fetchWithTimeout(fetchImpl, url, options, ms) {
    if (typeof AbortController === 'undefined') return fetchImpl(url, options);
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, ms);
    options = options || {};
    options.signal = ctrl.signal;
    return fetchImpl(url, options).then(function (r) { clearTimeout(timer); return r; }, function (e) { clearTimeout(timer); throw e; });
  }

  /* Call OpenRouter directly. Retries ONCE on 429 (with a 1s backoff).
     Never rejects: all failures return { ok:false, error } and the error
     object never contains the key. */
  function callOpenRouter(opts) {
    var fetchImpl = opts && opts.fetchImpl;
    var apiKey = opts && opts.apiKey;
    var payload = opts && opts.payload;
    if (typeof fetchImpl !== 'function') {
      return Promise.resolve({ ok: false, error: { code: 'NO_FETCH', message: 'fetch is not available in this browser.', fix: 'Use a modern browser.' } });
    }
    if (!validateApiKey(apiKey)) {
      return Promise.resolve({ ok: false, error: { code: 'NO_KEY', message: 'No valid API key stored.', fix: 'Paste your OpenRouter key in the LLM tab and press Save key.' } });
    }
    if (!payload || typeof payload !== 'object') {
      return Promise.resolve({ ok: false, error: { code: 'BAD_REQUEST', message: 'No valid request payload.', fix: 'Retry the mission run.' } });
    }
    var attempts = 0;
    var sleepFn = (opts && opts.sleepFn) || defaultSleep;
    function attempt() {
      attempts++;
      return fetchWithTimeout(fetchImpl, OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + apiKey,
          'Content-Type': 'application/json',
          'HTTP-Referer': (opts && opts.referer) || '',
          'X-Title': 'TITAN Antigravity'
        },
        body: JSON.stringify(payload)
      }, 30000).then(function (res) {
        if (res && res.status === 429 && attempts === 1) {
          return sleepFn(1000).then(attempt);
        }
        return res.text().then(function (text) {
          if (res.status >= 200 && res.status < 300) {
            var parsed = null;
            try { parsed = JSON.parse(text); } catch (e) { parsed = null; }
            if (!parsed) {
              return { ok: false, error: { code: 'BAD_RESPONSE', message: 'OpenRouter returned an unexpected response.', fix: 'Retry; if it persists, try a different model.' } };
            }
            var pr = parseLlmResponse(parsed, payload.model);
            if (!pr.ok) {
              return { ok: false, error: { code: 'BAD_RESPONSE', message: pr.error, fix: 'Retry; if it persists, try a different model.' } };
            }
            return { ok: true, data: pr.data };
          }
          return { ok: false, error: classifyOpenRouterError(res.status, text) };
        });
      }).catch(function (err) {
        return { ok: false, error: classifyFetchError(err) };
      });
    }
    return attempt();
  }

  global.TITAN_LLM = {
    OPENROUTER_URL: OPENROUTER_URL,
    DEFAULT_MODEL: DEFAULT_MODEL,
    validateModelId: validateModelId,
    validateApiKey: validateApiKey,
    buildSystemPrompt: buildSystemPrompt,
    buildUserPrompt: buildUserPrompt,
    buildChatRequest: buildChatRequest,
    parseLlmResponse: parseLlmResponse,
    parseAnalysis: parseAnalysis,
    classifyOpenRouterError: classifyOpenRouterError,
    classifyFetchError: classifyFetchError,
    callOpenRouter: callOpenRouter
  };
})(typeof window !== 'undefined' ? window : globalThis);
