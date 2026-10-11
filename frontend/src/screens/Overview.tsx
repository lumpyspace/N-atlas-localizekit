import { useStore } from "../store";
import { Badge, Button, Card, CardHeader, SampleTag, seconds } from "../ui";
import { ConnectionPanel } from "../components/Connection";
import type { Route } from "../App";

export default function Overview({ go }: { go: (r: Route) => void }) {
  const { current, sample, runs } = useStore();
  const lastRun = runs[runs.length - 1];

  return (
    <div className="space-y-6">
      <section className="pt-2">
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Test your AI assistant on Nigerian customers before you launch.
        </h1>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-slate-600">
          LocalizeKit is a developer tool for apps built on <strong>N-ATLAS</strong>, Nigeria's multilingual language model.
          Send real customer messages in English, Pidgin, Yoruba, Hausa or Igbo; see exactly what N-ATLAS was given and what it said;
          run a repeatable test suite; fix the configuration; and retest.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button onClick={() => go("playground")}>Start testing</Button>
          <Button variant="secondary" onClick={() => go("tests")}>Run the test suite</Button>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <ConnectionPanel />

        <Card>
          <CardHeader title="Sample project" right={<SampleTag />} />
          <div className="space-y-2 px-5 py-4 text-sm text-slate-600">
            <p className="font-semibold text-ink">{current?.business.name ?? "Loading…"}</p>
            <p>A customer-support assistant for a fictional Lagos clothing shop: delivery fees, opening hours, payments, returns, escalation.</p>
            {current && (
              <p className="text-slate-500">
                Configuration version {current.version} · {current.business.delivery.zones.length} delivery zones · {current.business.faqs.length} FAQs
              </p>
            )}
            <button onClick={() => go("config")} className="font-medium text-forge-700 underline underline-offset-2">Edit business facts &amp; policy</button>
          </div>
        </Card>

        <Card>
          <CardHeader title="Latest test run" />
          <div className="px-5 py-4 text-sm text-slate-600">
            {lastRun ? (
              <RunSummary run={lastRun} />
            ) : (
              <p>No test runs yet. The suite has {sample?.cases.length ?? "…"} cases covering facts, missing answers, two languages, ambiguity, escalation and prompt injection.</p>
            )}
            <button onClick={() => go("tests")} className="mt-2 font-medium text-forge-700 underline underline-offset-2">Open test suite</button>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="How it works" />
        <ol className="grid gap-4 px-5 py-4 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Configure", "Structured business facts and a response policy. These are the only facts the assistant may state."],
            ["Ask", "Each message goes from our server to N-ATLAS with the policy and the full fact sheet. No other model is used."],
            ["Check", "Automated heuristics flag missing facts, invented naira amounts, leaked instructions and obeyed injections. A person marks each reply correct or not."],
            ["Retest", "Change the facts or policy, rerun the same cases, and compare real before/after replies."],
          ].map(([t, d], i) => (
            <li key={t}>
              <span className="text-xs font-semibold text-forge-700">Step {i + 1}</span>
              <p className="font-semibold text-ink">{t}</p>
              <p className="mt-1">{d}</p>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}

export function RunSummary({ run }: { run: import("../store").Run }) {
  const results = Object.values(run.results);
  const count = (v: string) => results.filter((r) => r.verdict === v).length;
  const ok = results.filter((r) => r.ok);
  const avg = ok.length ? ok.reduce((s, r) => s + r.latencyMs, 0) / ok.length : 0;
  return (
    <div className="space-y-2">
      <p className="text-slate-500">{new Date(run.startedAt).toLocaleString()} · config v{run.configVersion}{run.stopped ? " · stopped early" : ""}</p>
      <div className="flex flex-wrap gap-1.5">
        <Badge tone="green">{count("passed-checks")} passed checks</Badge>
        <Badge tone="red">{count("failed-check")} failed a check</Badge>
        <Badge tone="amber">{count("needs-review")} need review</Badge>
        {count("request-failed") > 0 && <Badge tone="red">{count("request-failed")} request failed</Badge>}
      </div>
      {ok.length > 0 && <p className="text-slate-500">Average response time {seconds(avg)} over {ok.length} replies.</p>}
    </div>
  );
}
