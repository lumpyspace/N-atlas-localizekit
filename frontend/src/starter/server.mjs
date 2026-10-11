// LocalizeKit starter server: your customer-support assistant on N-ATLAS.
// Node.js 18+, no dependencies.   npm start   ->   http://localhost:3000
//
//   POST /api/chat   { message, history? }  ->  { reply, blocked }
//   GET  /widget.js  the chat bubble for your website
//   GET  /           a demo page with the widget
//   GET  /health     { ok }
//
// Your N-ATLAS endpoint and key stay on this server. The browser only ever
// talks to /api/chat.

import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildSystemPrompt, guardReply } from "./core.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const MAX_MESSAGE = 1000;
const MAX_HISTORY = 6;

/** Minimal .env loader so there is nothing to install. Real env vars win. */
function loadEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

export function configFromEnv(env = process.env) {
  return {
    endpoint: (env.NATLAS_ENDPOINT ?? "").replace(/\/+$/, ""),
    apiKey: env.NATLAS_API_KEY ?? "",
    model: env.NATLAS_MODEL || "NCAIR1/N-ATLaS",
    timeoutMs: Number(env.NATLAS_TIMEOUT_MS || 300000), // a sleeping GPU takes ~2–3 min to start
    port: Number(env.PORT || 3000),
    allowedOrigins: (env.ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    ratePerMinute: Number(env.RATE_LIMIT_PER_MINUTE || 20),
  };
}

export function createAssistantServer(cfg, opts) {
  return createServer(createChatHandler(cfg, opts));
}

/** The request handler on its own, for serverless hosts that call (req, res). */
export function createChatHandler(cfg, { business, policy, files = {} }) {
  // A fresh secret per server start: if a reply ever contains it, the prompt leaked.
  const canary = `ATLAS-SENTINEL-${randomBytes(4).toString("hex").toUpperCase()}`;
  const built = buildSystemPrompt(policy, business, canary);
  const hits = new Map();

  const limited = (ip) => {
    const now = Date.now();
    const e = hits.get(ip);
    if (!e || now > e.reset) {
      hits.set(ip, { n: 1, reset: now + 60_000 });
      if (hits.size > 10_000) for (const [k, v] of hits) if (now > v.reset) hits.delete(k);
      return false;
    }
    return ++e.n > cfg.ratePerMinute;
  };

  const send = (res, status, body, headers = {}) => {
    const isText = typeof body === "string";
    res.writeHead(status, {
      "content-type": isText ? headers["content-type"] ?? "text/plain; charset=utf-8" : "application/json; charset=utf-8",
      "x-content-type-options": "nosniff",
      ...headers,
    });
    res.end(isText ? body : JSON.stringify(body));
  };

  async function askNatlas(messages) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);
    const call = () =>
      fetch(`${cfg.endpoint.replace(/\/chat\/completions$/, "")}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", ...(cfg.apiKey ? { authorization: `Bearer ${cfg.apiKey}` } : {}) },
        body: JSON.stringify({ model: cfg.model, messages, temperature: 0.2, max_tokens: 320 }),
        signal: controller.signal,
      });
    try {
      let r;
      try {
        r = await call();
      } catch (e) {
        if (controller.signal.aborted) throw e;
        r = await call(); // one retry if the connection dropped
      }
      if (!r.ok) throw new Error(`N-ATLAS returned HTTP ${r.status}`);
      const data = await r.json();
      const text = data?.choices?.[0]?.message?.content?.trim();
      if (!text) throw new Error("N-ATLAS returned an empty reply");
      return text;
    } finally {
      clearTimeout(timer);
    }
  }

  return async (req, res) => {
    const origin = req.headers.origin;
    const cors =
      origin && cfg.allowedOrigins.includes(origin)
        ? { "access-control-allow-origin": origin, vary: "Origin", "access-control-allow-headers": "content-type", "access-control-allow-methods": "POST, OPTIONS" }
        : {};
    const url = new URL(req.url ?? "/", "http://x");

    if (req.method === "OPTIONS") return send(res, cors["access-control-allow-origin"] ? 204 : 403, "", cors);
    if (req.method === "GET" && url.pathname === "/health") return send(res, 200, { ok: true, configured: Boolean(cfg.endpoint) });
    if (req.method === "GET" && files[url.pathname]) {
      const [type, body] = files[url.pathname];
      return send(res, 200, body, { "content-type": type, "cache-control": "public, max-age=300" });
    }
    if (!(req.method === "POST" && url.pathname === "/api/chat")) return send(res, 404, { error: "Not found." });

    // Browsers on other sites must be on the allow-list; server-to-server calls send no Origin.
    if (origin && !cors["access-control-allow-origin"] && origin !== `http://${req.headers.host}` && origin !== `https://${req.headers.host}`) {
      return send(res, 403, { error: "This website is not allowed to use this assistant (ALLOWED_ORIGINS)." });
    }
    const ip = (req.headers["x-forwarded-for"]?.toString().split(",")[0] ?? req.socket.remoteAddress ?? "?").trim();
    if (limited(ip)) return send(res, 429, { error: "Too many messages. Please wait a minute." }, cors);

    let raw = "";
    for await (const chunk of req) {
      raw += chunk;
      if (raw.length > 20_000) return send(res, 413, { error: "Request is too large." }, cors);
    }
    let body;
    try {
      body = JSON.parse(raw || "{}");
    } catch {
      return send(res, 400, { error: "Request body must be JSON." }, cors);
    }
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) return send(res, 400, { error: "Message is empty." }, cors);
    if (message.length > MAX_MESSAGE) return send(res, 400, { error: `Message is too long (max ${MAX_MESSAGE} characters).` }, cors);
    const history = (Array.isArray(body.history) ? body.history : [])
      .filter((m) => (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string")
      .slice(-MAX_HISTORY)
      .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE) }));

    if (!cfg.endpoint) return send(res, 503, { error: "The assistant is not configured yet (NATLAS_ENDPOINT)." }, cors);
    try {
      const reply = await askNatlas([{ role: "system", content: built.system }, ...history, { role: "user", content: message }]);
      const guarded = guardReply(reply, business, built, canary, message);
      if (guarded.blocked) console.warn(`[guardrail] blocked a reply: ${guarded.reasons.join("; ")}`);
      return send(res, 200, { reply: guarded.reply, blocked: guarded.blocked }, cors);
    } catch (e) {
      console.error(`[natlas] ${e.name === "AbortError" ? "timed out" : e.message}`);
      return send(res, 502, { error: "The assistant is unavailable right now. Please try again shortly." }, cors);
    }
  };
}

// Run directly: `node server.mjs`
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  loadEnv(join(HERE, ".env"));
  const cfg = configFromEnv();
  const read = (f) => readFileSync(join(HERE, f), "utf8");
  const server = createAssistantServer(cfg, {
    business: JSON.parse(read("business.json")),
    policy: read("policy.md"),
    files: {
      "/": ["text/html; charset=utf-8", read("index.html")],
      "/widget.js": ["text/javascript; charset=utf-8", read("widget.js")],
    },
  });
  server.listen(cfg.port, () => {
    console.log(`Assistant running on http://localhost:${cfg.port}`);
    if (!cfg.endpoint) console.warn("NATLAS_ENDPOINT is not set: copy .env.example to .env and fill it in.");
  });
}
