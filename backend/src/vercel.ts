/**
 * Vercel serverless entry: the same Express app as the local server.
 * Bundled by scripts/build-vercel.mjs into .vercel/output/functions/api.func.
 */
import { createApp } from "./app.js";

export default createApp();
