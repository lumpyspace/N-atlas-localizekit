/**
 * N-ATLAS LocalizeKit backend — local server entry point.
 * The app itself is built in app.ts (shared with the Vercel function).
 */

import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { logger } from "./logger.js";

const config = loadConfig();
createApp(config).listen(config.port, () => {
  logger.info(`N-ATLAS LocalizeKit backend listening on http://localhost:${config.port}`);
});
