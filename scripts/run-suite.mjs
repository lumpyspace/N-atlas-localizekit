// Runs every sample case through a LocalizeKit API and writes the raw results.
// usage: node scripts/run-suite.mjs <baseUrl> <outFile> [policyFile]
import { readFileSync, writeFileSync } from "node:fs";

const [base = "http://localhost:8788", out = "suite-results.json", policyFile] = process.argv.slice(2);
const policy = policyFile ? readFileSync(policyFile, "utf8") : undefined;
const sample = await (await fetch(`${base}/api/sample`)).json();
const results = [];
for (const c of sample.cases) {
  const t = Date.now();
  const res = await fetch(`${base}/api/run-case`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ case: c, policy }),
  });
  const r = await res.json();
  results.push({ id: c.id, language: c.language, message: c.message, http: res.status, wallMs: Date.now() - t, ...r, facts: undefined, systemPrompt: undefined });
  const failed = (r.checks ?? []).filter((x) => !x.pass).map((x) => x.label);
  console.log(`${r.verdict?.padEnd(15)} ${String(r.latencyMs).padStart(6)}ms  ${c.id}${failed.length ? "  FAILED: " + failed.join("; ") : ""}`);
}
writeFileSync(out, JSON.stringify({ base, at: new Date().toISOString(), policy: policy ?? "(default)", results }, null, 2));
