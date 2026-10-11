import JSZip from "jszip";
import { useState } from "react";
import modalScript from "../../../inference/modal_natlas.py?raw";
import { IconCode, IconDownload, IconShield } from "../icons";
import coreSrc from "../starter/core.mjs?raw";
import envExample from "../starter/env.example?raw";
import indexHtml from "../starter/index.html?raw";
import serverSrc from "../starter/server.mjs?raw";
import widgetSrc from "../starter/widget.js?raw";
import { useStore } from "../store";
import { Badge, Button, Card, CardHeader, ErrorNote, Spinner } from "../ui";

export default function Export() {
  const { current, sample, runs, reviews } = useStore();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lastRun = runs[runs.length - 1];
  const name = current?.business.name ?? "assistant";
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "assistant";

  async function download() {
    if (!current || !sample) return;
    setBusy(true);
    try {
      const zip = new JSZip();
      const dir = zip.folder(`${slug}-assistant`)!;
      dir.file("server.mjs", serverSrc);
      dir.file("core.mjs", coreSrc);
      dir.file("widget.js", widgetSrc);
      dir.file("index.html", indexHtml);
      dir.file(".env.example", envExample);
      dir.file(".gitignore", ".env\nnode_modules/\n");
      dir.file(
        "package.json",
        JSON.stringify({ name: `${slug}-assistant`, private: true, type: "module", engines: { node: ">=18" }, scripts: { start: "node server.mjs" } }, null, 2) + "\n",
      );
      dir.file("business.json", JSON.stringify(current.business, null, 2) + "\n");
      dir.file("policy.md", current.policy);
      dir.file("test-cases.json", JSON.stringify(sample.cases, null, 2) + "\n");
      dir.file("inference/modal_natlas.py", modalScript);
      if (lastRun) dir.file("results-latest-run.json", JSON.stringify(resultsFile(lastRun, reviews), null, 2) + "\n");
      dir.file("README.md", readme(name, current.version, !!lastRun));

      const blob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${slug}-assistant.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      setError(null);
    } catch (e: any) {
      setError(`Could not build the ZIP: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  const files: [string, string][] = [
    ["server.mjs", "Zero-dependency Node server: calls your N-ATLAS, applies guardrails"],
    ["widget.js", "Chat bubble for your website (one script tag)"],
    ["business.json · policy.md", `Your tested configuration (v${current?.version ?? "?"})`],
    ["inference/modal_natlas.py", "Host your own N-ATLAS on a GPU"],
    ["test-cases.json", `${sample?.cases.length ?? "…"} test cases`],
    ["results-latest-run.json", lastRun ? "Replies and reviews from your latest run" : "Added after you run the suite"],
  ];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <div className="space-y-6">
        <Card>
          <CardHeader
            icon={<IconDownload className="h-4 w-4" />}
            title="Website starter kit"
            sub="Everything to run the assistant you tested on your own website, with your own N-ATLAS endpoint."
          />
          <div className="space-y-4 px-5 py-4">
            <ul className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2">
              {files.map(([f, d]) => (
                <li key={f} className="rounded-lg px-3 py-2 ring-1 ring-slate-200">
                  <span className="font-mono text-xs text-ink">{f}</span>
                  <p className="text-[13px] text-slate-500">{d}</p>
                </li>
              ))}
            </ul>
            {error && <ErrorNote>{error}</ErrorNote>}
            <Button size="lg" onClick={download} disabled={!current || busy}>
              {busy ? <Spinner /> : <IconDownload className="h-4 w-4" />} Download {slug}-assistant.zip
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader icon={<IconCode className="h-4 w-4" />} title="Three steps to go live" />
          <ol className="space-y-4 px-5 py-4 text-sm text-slate-600">
            <Step n={1} title="Host N-ATLAS">
              Deploy <code className="font-mono text-[13px] text-ink">inference/modal_natlas.py</code> to Modal with your Hugging Face token (the README has the commands). You get an
              endpoint and a private key.
            </Step>
            <Step n={2} title="Run the server">
              Copy <code className="font-mono text-[13px] text-ink">.env.example</code> to <code className="font-mono text-[13px] text-ink">.env</code>, add the endpoint and key, then{" "}
              <code className="font-mono text-[13px] text-ink">npm start</code>. Open http://localhost:3000 to try it. Deploy it to any host that runs Node.
            </Step>
            <Step n={3} title="Add the widget to your site">
              <pre className="mt-2 overflow-x-auto rounded-lg bg-night-900 p-3 font-mono text-[12px] text-slate-200">{`<script src="https://YOUR-SERVER/widget.js"\n        data-title="${name}" defer></script>`}</pre>
              Put your site's address in <code className="font-mono text-[13px] text-ink">ALLOWED_ORIGINS</code>.
            </Step>
          </ol>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader icon={<IconShield className="h-4 w-4" />} title="What the server adds" />
          <ul className="space-y-3 px-5 py-4 text-sm text-slate-600">
            <li><strong className="text-ink">Same prompt you tested.</strong> The facts and policy are sent exactly as in LocalizeKit, so test results carry over.</li>
            <li><strong className="text-ink">Output guardrails.</strong> Replies with a leaked hidden code or a ₦ amount that isn't in your facts are replaced with a hand-off to a person. Fact numbers like [F12] are removed.</li>
            <li><strong className="text-ink">Keys stay server-side.</strong> The widget only talks to your server, which only accepts websites on your allow-list.</li>
            <li><strong className="text-ink">Limits.</strong> 1,000-character messages, six turns of history, per-visitor rate limit.</li>
          </ul>
          <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
            Guardrails catch the specific failures LocalizeKit tests for. They do not stop every wrong answer: in our tests a prompt injection still produced a false "free delivery" promise. Keep testing changes here before you ship them.
          </div>
        </Card>
        <Card>
          <CardHeader title="Not included yet" />
          <div className="space-y-2 px-5 py-4 text-sm text-slate-600">
            <p><Badge>Roadmap</Badge> WhatsApp (Cloud API webhook), order lookups from your own systems, and a hosted option.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-night-900 text-xs font-bold text-white">{n}</span>
      <div className="min-w-0">
        <p className="font-semibold text-ink">{title}</p>
        <div className="mt-0.5">{children}</div>
      </div>
    </li>
  );
}

function resultsFile(run: import("../store").Run, reviews: Record<string, import("../store").Review>) {
  return {
    note: "Real recorded N-ATLAS replies. Automated checks are heuristics; humanReview is a person's judgement.",
    startedAt: run.startedAt,
    configVersion: run.configVersion,
    results: run.caseIds
      .map((id) => {
        const r = run.results[id];
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
          humanReview: reviews[`run:${run.id}:${id}`] ?? null,
          at: r.at,
        };
      })
      .filter(Boolean),
  };
}

function readme(name: string, version: number, hasResults: boolean) {
  return `# ${name}: N-ATLAS customer-support assistant

Exported from N-ATLAS LocalizeKit (configuration v${version}). This kit runs the assistant you tested on your own website, using your own N-ATLAS endpoint.

> If you exported the sample, AsoStyle Boutique and its details are **fictional**. Replace \`business.json\` with your real facts and test it in LocalizeKit before going live.

## What's here

| File | Purpose |
|---|---|
| \`server.mjs\`, \`core.mjs\` | Node server (no dependencies). \`POST /api/chat\`, serves the widget and a demo page |
| \`widget.js\` | Chat bubble for any website |
| \`business.json\`, \`policy.md\` | The facts the assistant may state and the rules it follows |
| \`inference/modal_natlas.py\` | Host N-ATLAS (\`NCAIR1/N-ATLaS\`) on a Modal GPU with vLLM |
| \`test-cases.json\` | The LocalizeKit test cases${hasResults ? "\n| `results-latest-run.json` | Real replies, check results and reviews from your latest LocalizeKit run |" : ""}

## 1. Host N-ATLAS

N-ATLaS is a gated model. Accept its licence at https://huggingface.co/NCAIR1/N-ATLaS with the Hugging Face account whose token you use. The licence limits commercial use and scale, so read it before launch.

\`\`\`bash
pip install modal
modal token new
modal secret create natlas-hf HF_TOKEN=<your Hugging Face token>
modal secret create localizekit-natlas NATLAS_API_KEY=<a long random key you choose>
modal deploy inference/modal_natlas.py
\`\`\`

Modal prints your endpoint URL. Your \`NATLAS_ENDPOINT\` is that URL plus \`/v1\`.

- The GPU (L4) is billed per second while running and sleeps after 10 idle minutes.
- The first request after a pause waits 2–3 minutes while it starts.
- Set a spending limit in Modal's billing settings.

## 2. Run the server

Requires Node.js 18 or newer. Nothing to install.

\`\`\`bash
cp .env.example .env     # then fill in NATLAS_ENDPOINT and NATLAS_API_KEY
npm start
\`\`\`

Open http://localhost:3000 and use the chat bubble.

## 3. Add it to your website

Deploy the server to any host that runs a Node process over HTTPS: a VPS, Render, Railway or Fly.io. Then add this to your pages:

\`\`\`html
<script src="https://YOUR-SERVER/widget.js" data-title="${name}" defer></script>
\`\`\`

Set \`ALLOWED_ORIGINS\` to your site's exact address(es), for example \`https://www.example.com\`. Other websites are refused.

Optional attributes:
- \`data-color="#0b7f46"\`
- \`data-greeting="…"\`
- \`data-endpoint="https://…"\`, if the script is hosted somewhere other than the server.

## API

\`POST /api/chat\` with \`{ "message": "...", "history": [{ "role": "user" | "assistant", "content": "..." }] }\`. It returns \`{ "reply": "...", "blocked": false }\`.

| Status | Meaning |
|---|---|
| 400 | Invalid input |
| 403 | Website not allowed |
| 429 | Rate limited |
| 502 | N-ATLAS unavailable |
| 503 | Not configured |

## Guardrails: what they do and don't do

**Before a reply reaches the customer, the server:**
- **blocks** replies that contain the hidden canary code or repeat a policy rule word for word (prompt leaks);
- **blocks** replies stating a naira amount that isn't in \`business.json\`;
- **removes** fact references such as \`[F12]\`.

Blocked replies are replaced with a hand-off to your contact details and logged.

**These checks catch specific, known failures. They do not make the assistant always right.** In LocalizeKit's tests, N-ATLAS sometimes:
- answered questions the facts don't cover;
- replied in a different language;
- followed a prompt injection, including a false "free delivery" promise.

Change \`business.json\` or \`policy.md\` in LocalizeKit, rerun the test suite, and export again.

## Not included

- WhatsApp.
- Order lookups from your systems.
- Storage of conversations. The server keeps no chat logs; add your own logging only if your privacy policy allows it.
`;
}
