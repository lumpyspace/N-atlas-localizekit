/**
 * Build for Vercel using the Build Output API (v3):
 *   .vercel/output/static            <- the Vite frontend
 *   .vercel/output/functions/api.func <- the Express backend, bundled to one file
 *   .vercel/output/config.json       <- routes: /api/* -> function, rest -> static
 *
 * Secrets are NOT bundled: the function reads NATLAS_* from Vercel's
 * environment variables at runtime.
 */
import { execSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, ".vercel", "output");
const fn = join(out, "functions", "api.func");

rmSync(out, { recursive: true, force: true });
mkdirSync(fn, { recursive: true });

execSync("npm run build", { cwd: join(root, "frontend"), stdio: "inherit" });
cpSync(join(root, "frontend", "dist"), join(out, "static"), { recursive: true });

const esbuild = createRequire(join(root, "backend", "package.json"))("esbuild");
await esbuild.build({
  entryPoints: [join(root, "backend", "src", "vercel.ts")],
  outfile: join(fn, "index.cjs"),
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  footer: { js: "module.exports = module.exports.default;" },
  logLevel: "info",
});

writeFileSync(
  join(fn, ".vc-config.json"),
  JSON.stringify({ runtime: "nodejs20.x", handler: "index.cjs", launcherType: "Nodejs", maxDuration: 300 }, null, 2),
);

const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'",
};

writeFileSync(
  join(out, "config.json"),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { src: "/(.*)", headers: securityHeaders, continue: true },
        { src: "/api/(.*)", dest: "/api" },
        { handle: "filesystem" },
        { src: "/(.*)", dest: "/index.html" },
      ],
    },
    null,
    2,
  ),
);

console.log("Vercel build output written to .vercel/output");
