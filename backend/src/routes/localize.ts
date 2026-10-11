/**
 * LocalizeKit API.
 *
 *   GET  /api/status        -> is an N-ATLAS endpoint configured? (no model call)
 *   POST /api/status/check  -> make one real N-ATLAS call and report the result
 *   GET  /api/sample        -> sample business, default policy, test cases, languages
 *   POST /api/ask           -> one customer message through N-ATLAS, with checks
 *   POST /api/run-case      -> one test case through N-ATLAS, with its checks
 *
 * Every model call is rate limited per client, because each one costs GPU time.
 */

import { type Request, type Response, Router } from "express";
import type { AppConfig } from "../config.js";
import type { NAtlasProvider } from "../providers/NAtlasProvider.js";
import { SAMPLE_BUSINESS } from "../localize/business.js";
import { SAMPLE_CASES } from "../localize/cases.js";
import { DEFAULT_POLICY } from "../localize/policy.js";
import {
  ask,
  InputError,
  LANGUAGES,
  MAX_MESSAGE_CHARS,
  validateBusiness,
  validateChecks,
  validateLanguage,
  validateMessage,
  validatePolicy,
} from "../localize/service.js";
import { RateLimiter } from "../localize/rateLimit.js";

export function localizeRouter(provider: NAtlasProvider, config: AppConfig): Router {
  const router = Router();
  const limiter = new RateLimiter(config.rateLimitPerWindow, config.rateLimitWindowMs);
  const configured = Boolean(config.natlasEndpoint);

  const limited = (req: Request, res: Response): boolean => {
    const r = limiter.take(req.ip ?? "unknown");
    if (r.allowed) return false;
    res.setHeader("Retry-After", Math.ceil(r.retryAfterMs / 1000));
    res.status(429).json({ error: `Too many N-ATLAS requests from this connection. Try again in ${Math.ceil(r.retryAfterMs / 1000)}s.` });
    return true;
  };

  const handle = (fn: (req: Request, res: Response) => Promise<void>) => async (req: Request, res: Response) => {
    try {
      await fn(req, res);
    } catch (err) {
      if (err instanceof InputError) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.status(500).json({ error: "Unexpected server error." });
    }
  };

  router.get("/status", (_req, res) => {
    res.json({
      configured,
      model: config.natlasModel,
      detail: configured
        ? "An N-ATLAS endpoint is configured on the server. Run a check to confirm it answers."
        : "No N-ATLAS endpoint is configured on the server (NATLAS_ENDPOINT is empty).",
    });
  });

  router.post("/status/check", handle(async (req, res) => {
    if (limited(req, res)) return;
    const result = await ask(provider, {
      message: "Reply with the single word: ready",
      language: "en",
      business: SAMPLE_BUSINESS,
      policy: "You are a connection test. Follow the user's instruction exactly.",
    });
    res.status(result.ok ? 200 : 503).json({
      ok: result.ok,
      model: result.model || config.natlasModel,
      latencyMs: result.latencyMs,
      reply: result.output.slice(0, 80),
      error: result.error,
      checkedAt: result.at,
    });
  }));

  router.get("/sample", (_req, res) => {
    res.json({
      business: SAMPLE_BUSINESS,
      policy: DEFAULT_POLICY,
      cases: SAMPLE_CASES,
      languages: LANGUAGES,
      limits: { messageChars: MAX_MESSAGE_CHARS },
    });
  });

  router.post("/ask", handle(async (req, res) => {
    const message = validateMessage(req.body?.message);
    const language = validateLanguage(req.body?.language);
    const business = validateBusiness(req.body?.business, SAMPLE_BUSINESS);
    const policy = validatePolicy(req.body?.policy, DEFAULT_POLICY);
    if (limited(req, res)) return;
    res.json(await ask(provider, { message, language, business, policy }));
  }));

  router.post("/run-case", handle(async (req, res) => {
    const c = req.body?.case;
    const message = validateMessage(c?.message);
    const language = validateLanguage(c?.language);
    const checks = validateChecks(c?.checks);
    const business = validateBusiness(req.body?.business, SAMPLE_BUSINESS);
    const policy = validatePolicy(req.body?.policy, DEFAULT_POLICY);
    if (limited(req, res)) return;
    res.json(await ask(provider, { message, language, business, policy, checks, temperature: 0 }));
  }));

  return router;
}
