/**
 * Builds the live sample shop for Vercel (Build Output API, deployed with
 * `vercel deploy --prebuilt`):
 *
 *   static/index.html             the fictional shop page, filled from business.json
 *   static/widget.js, shop.js     the exported chat widget + its open button
 *   functions/api/chat.func/      the exported starter server, unchanged, as a function
 *
 * The assistant code is copied verbatim from frontend/src/starter, i.e. exactly
 * what the LocalizeKit Export screen gives developers.
 */
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const starter = join(here, "..", "..", "frontend", "src", "starter");
const out = join(here, ".vercel", "output");
const fn = join(out, "functions", "api", "chat.func");
const TOOL_URL = "https://n-atlas-localizekit.vercel.app";

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, "static"), { recursive: true });
mkdirSync(fn, { recursive: true });

const business = JSON.parse(readFileSync(join(here, "business.json"), "utf8"));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const naira = (n) => `₦${Number(n).toLocaleString("en-US")}`;

const fill = {
  name: esc(business.name),
  toolUrl: TOOL_URL,
  freeDelivery: esc(business.delivery.freeDeliveryRule),
  deliveryNotes: esc(business.delivery.notes),
  deliveryRows: business.delivery.zones.map((z) => `<tr><td>${esc(z.zone)}</td><td>${naira(z.fee)}</td><td>${esc(z.time)}</td></tr>`).join(""),
  returnsItems: [
    `Returns within ${business.returns.windowDays} days of delivery.`,
    ...business.returns.conditions,
    business.returns.refunds,
    ...business.returns.exclusions,
  ].map((x) => `<li>${esc(x)}</li>`).join(""),
  hoursItems: Object.entries(business.hours).map(([d, h]) => `<li><strong>${esc(d)}</strong> — ${esc(h)}</li>`).join(""),
  location: esc(business.location),
  whatsapp: esc(business.contact.whatsapp),
  email: esc(business.contact.email),
  humanHours: esc(business.contact.humanHours),
};
const page = readFileSync(join(here, "shop.html"), "utf8").replace(/\{\{(\w+)\}\}/g, (m, k) => (k in fill ? fill[k] : m));
writeFileSync(join(out, "static", "index.html"), page);
copyFileSync(join(starter, "widget.js"), join(out, "static", "widget.js"));
copyFileSync(join(here, "shop.js"), join(out, "static", "shop.js"));

// The function: starter server + core, unchanged, plus this shop's facts and policy.
for (const f of ["server.mjs", "core.mjs"]) copyFileSync(join(starter, f), join(fn, f));
copyFileSync(join(here, "business.json"), join(fn, "business.json"));
copyFileSync(join(here, "policy.md"), join(fn, "policy.md"));
writeFileSync(join(fn, "package.json"), JSON.stringify({ type: "module" }));
writeFileSync(
  join(fn, "index.mjs"),
  `import { readFileSync } from "node:fs";
import { configFromEnv, createChatHandler } from "./server.mjs";
const read = (f) => readFileSync(new URL(f, import.meta.url), "utf8");
export default createChatHandler(configFromEnv(), { business: JSON.parse(read("./business.json")), policy: read("./policy.md") });
`,
);
writeFileSync(
  join(fn, ".vc-config.json"),
  JSON.stringify({ runtime: "nodejs22.x", handler: "index.mjs", launcherType: "Nodejs", maxDuration: 300, shouldAddHelpers: false }, null, 2),
);

const headers = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'",
};
writeFileSync(
  join(out, "config.json"),
  JSON.stringify({ version: 3, routes: [{ src: "/(.*)", headers, continue: true }, { handle: "filesystem" }] }, null, 2),
);
console.log("Sample shop built into .vercel/output");
