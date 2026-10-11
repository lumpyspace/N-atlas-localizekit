/**
 * Builds the LocalizeKit Express app. Used by the local server (index.ts) and
 * by the Vercel serverless function (api/index.ts), so both run the same code.
 *
 * The browser only ever talks to this server; the N-ATLAS endpoint and key
 * stay server-side.
 */

import express, { type Express } from "express";
import { type AppConfig, loadConfig } from "./config.js";
import { logger } from "./logger.js";
import { createProvider } from "./providers/index.js";
import type { NAtlasProvider } from "./providers/NAtlasProvider.js";
import { localizeRouter } from "./routes/localize.js";

/** Stands in when NATLAS_ENDPOINT is missing, so the app starts and says so. */
function unconfiguredProvider(model: string): NAtlasProvider {
  const fail = async (): Promise<never> => {
    throw new Error("HttpNAtlasProvider requires NATLAS_ENDPOINT.");
  };
  return {
    name: "unconfigured",
    isMock: false,
    generate: fail,
    generateStream: fail,
    health: async () => ({
      ok: false,
      provider: "unconfigured",
      isMock: false,
      endpoint: null,
      model,
      detail: "NATLAS_ENDPOINT is not set.",
      checkedAt: new Date().toISOString(),
    }),
  };
}

export function createApp(config: AppConfig = loadConfig()): Express {
  const provider = config.natlasEndpoint
    ? createProvider(config)
    : (logger.warn("NATLAS_ENDPOINT is not set — model calls will fail with a clear error."),
      unconfiguredProvider(config.natlasModel));

  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", true); // behind Vercel's proxy, req.ip is the client
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  app.use(express.json({ limit: "64kb" }));

  app.use("/api", localizeRouter(provider, config));

  app.use("/api", (_req, res) => res.status(404).json({ error: "Not found." }));
  // Malformed JSON and oversized bodies.
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = err?.type === "entity.too.large" ? 413 : err?.type === "entity.parse.failed" ? 400 : 500;
    res.status(status).json({
      error: status === 413 ? "Request is too large." : status === 400 ? "Request body must be valid JSON." : "Unexpected server error.",
    });
  });
  return app;
}
