import JSZip from "jszip";
import { useState } from "react";
import { useStore } from "../store";
import { Button, Card, CardHeader, ErrorNote } from "../ui";

export default function Export() {
  const { current, sample, runs, reviews } = useStore();
  const [error, setError] = useState<string | null>(null);
  const lastRun = runs[runs.length - 1];
  const origin = window.location.origin;

  async function download() {
    if (!current || !sample) return;
    try {
      const zip = new JSZip();
      const slug = current.business.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      zip.file("business.json", JSON.stringify(current.business, null, 2));
      zip.file("policy.md", current.policy);
      zip.file("test-cases.json", JSON.stringify(sample.cases, null, 2));
      if (lastRun) {
        const results = lastRun.caseIds.map((id) => {
          const r = lastRun.results[id];
          const review = reviews[`run:${lastRun.id}:${id}`];
          return r && {
            caseId: id,
            language: r.language,
            requestSucceeded: r.ok,
            reply: r.output,
            error: r.error,
            model: r.model,
            latencyMs: r.latencyMs,
            result: r.verdict,
            automatedChecks: r.checks,
            humanReview: review ?? null,
            at: r.at,
          };
        }).filter(Boolean);
        zip.file("results-latest-run.json", JSON.stringify({
          note: "Real recorded N-ATLAS replies. Automated checks are heuristics; humanReview is a person's judgement.",
          startedAt: lastRun.startedAt,
          configVersion: lastRun.configVersion,
          results,
        }, null, 2));
      }
      zip.file("ask.mjs", exampleClient(origin));
      zip.file("README.md", readme(current.business.name, origin, !!lastRun));
      const blob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${slug || "localizekit"}-kit.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      setError(null);
    } catch (e: any) {
      setError(`Could not build the ZIP: ${e.message}`);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Export your kit" sub="Take the configuration, tests and an integration example into your own project." />
        <div className="space-y-4 px-5 py-4 text-sm text-slate-600">
          <ul className="grid gap-2 sm:grid-cols-2">
            {[
              ["business.json", `Business facts (config v${current?.version ?? "?"})`],
              ["policy.md", "The response policy"],
              ["test-cases.json", `${sample?.cases.length ?? "…"} test cases with their checks`],
              ["results-latest-run.json", lastRun ? "Recorded replies and reviews from your latest run" : "Included after you run the suite"],
              ["ask.mjs", "Minimal Node.js example calling the LocalizeKit API"],
              ["README.md", "Setup and usage"],
            ].map(([f, d]) => (
              <li key={f} className="rounded-lg border border-slate-200 px-3 py-2">
                <span className="font-mono text-xs text-ink">{f}</span>
                <p className="text-slate-500">{d}</p>
              </li>
            ))}
          </ul>
          {error && <ErrorNote>{error}</ErrorNote>}
          <Button onClick={download} disabled={!current}>Download ZIP</Button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Call LocalizeKit from your app" sub="Your app sends the customer message; LocalizeKit adds the facts and policy, calls N-ATLAS server-side, and returns the reply with its checks." />
        <pre className="overflow-x-auto bg-slate-900 px-5 py-4 text-xs leading-relaxed text-slate-100">{exampleClient(origin)}</pre>
      </Card>
    </div>
  );
}

function exampleClient(origin: string) {
  return `// Node.js 18+:  node ask.mjs "How much is delivery to Abuja?" en
import { readFile } from "node:fs/promises";

const BASE = process.env.LOCALIZEKIT_URL ?? "${origin}";
const [message = "How much is delivery to Abuja?", language = "en"] = process.argv.slice(2);

const business = JSON.parse(await readFile(new URL("./business.json", import.meta.url), "utf8"));
const policy = await readFile(new URL("./policy.md", import.meta.url), "utf8");

const res = await fetch(\`\${BASE}/api/ask\`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ message, language, business, policy }),
});
const data = await res.json();
if (!res.ok) throw new Error(data.error);
if (!data.ok) throw new Error(data.error); // N-ATLAS did not answer

console.log(data.output);
for (const c of data.checks) console.log(c.pass ? "PASS" : "FAIL", c.label, "-", c.detail);
`;
}

function readme(name: string, origin: string, hasResults: boolean) {
  return `# ${name} — LocalizeKit kit

Exported from N-ATLAS LocalizeKit (${origin}).

## Files

- \`business.json\` — the business facts the assistant may state. The sample data is fictional.
- \`policy.md\` — the response rules sent to N-ATLAS.
- \`test-cases.json\` — test messages, their purpose, expected behaviour and automated checks.
${hasResults ? "- `results-latest-run.json` — real N-ATLAS replies from your latest run, with check results and human reviews.\n" : ""}- \`ask.mjs\` — a minimal client.

## Try it

\`\`\`bash
node ask.mjs "Abeg how much una dey charge to deliver go Abuja?" pid
\`\`\`

Languages: \`en\`, \`yo\`, \`ha\`, \`ig\` (listed by NCAIR for N-ATLAS) and \`pid\` (Nigerian Pidgin — a test category, not an officially listed language).

## API

\`POST /api/ask\` with JSON \`{ message, language, business?, policy? }\` (message ≤ 1000 characters).
Returns \`{ ok, output, error?, model, latencyMs, checks[], verdict, facts[], systemPrompt }\`.

- \`ok: false\` means N-ATLAS did not return a reply; \`error\` says why.
- \`checks\` are heuristics (keyword, number and substring tests). A pass is not proof the reply is correct — review replies before you rely on them.

Requests are rate limited. The N-ATLAS model behind the API is \`NCAIR1/N-ATLaS\`.
`;
}
