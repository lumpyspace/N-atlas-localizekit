import { useState } from "react";
import type { LangCode } from "../api";
import type { Route } from "../App";
import { ConnectionPanel } from "../components/Connection";
import { IconArrowRight, IconBeaker, IconChat, IconCheck, IconRefresh, IconShield, IconStore } from "../icons";
import { type Run, useStore } from "../store";
import { Badge, Button, Card, CardHeader, LangPills, SampleTag, seconds } from "../ui";

export const SAMPLE_SHOP_URL = "https://asostyle-sample-shop.vercel.app";

const QUICK: { lang: LangCode; text: string }[] = [
  { lang: "pid", text: "I don send the money since, but e never enter. Wetin I go do?" },
  { lang: "en", text: "How much is delivery to Port Harcourt?" },
  { lang: "ha", text: "Nawa ne kuɗin kai kaya zuwa Abuja?" },
];

export default function Overview({ go }: { go: (r: Route) => void }) {
  const { current, sample, runs, setQueued } = useStore();
  const lastRun = runs[runs.length - 1];
  const [message, setMessage] = useState(QUICK[0].text);
  const [language, setLanguage] = useState<LangCode>(QUICK[0].lang);

  function tryIt(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setQueued({ message: message.trim(), language });
    go("playground");
  }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="overflow-hidden rounded-2xl bg-night-900 text-white shadow-pop">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 p-6 sm:p-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-forge-400">Developer tool for N-ATLAS</p>
            <h1 className="mt-3 text-3xl font-extrabold leading-[1.15] tracking-tight sm:text-4xl">
              Build for every Nigerian customer. <span className="text-forge-400">Test before you launch.</span>
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-slate-300">
              Send real customer messages in English, Pidgin, Yoruba, Hausa or Igbo to your N-ATLAS assistant. See what it was told and what it said,
              catch invented answers and prompt injection, then fix the configuration and retest.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button size="lg" onClick={() => go("tests")}>
                <IconBeaker className="h-4 w-4" /> Run the test suite
              </Button>
              <button
                onClick={() => go("playground")}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-[15px] font-semibold text-slate-200 ring-1 ring-inset ring-white/20 hover:bg-white/5"
              >
                Open playground <IconArrowRight className="h-4 w-4" />
              </button>
            </div>
            <a
              href={SAMPLE_SHOP_URL}
              target="_blank"
              rel="noopener"
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-forge-400 hover:text-forge-200"
            >
              See the exported assistant live on a sample shop website <IconArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>

          <form onSubmit={tryIt} className="rounded-xl bg-white/[0.06] p-4 ring-1 ring-white/10 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">Try it now</span>
              <span className="text-xs text-slate-400">to {current?.business.name ?? "the sample shop"}</span>
            </div>
            {sample && (
              <div className="mt-3">
                <LangPills dark languages={sample.languages} value={language} onChange={setLanguage} />
              </div>
            )}
            <label className="mt-3 block">
              <span className="sr-only">Customer message</span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                maxLength={1000}
                className="w-full resize-none rounded-lg border-0 bg-night-950/60 px-3 py-2.5 text-[15px] text-white ring-1 ring-inset ring-white/10 placeholder:text-slate-500 focus:outline-none focus:ring-forge-500"
              />
            </label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {QUICK.map((q) => (
                <button
                  type="button"
                  key={q.text}
                  onClick={() => { setMessage(q.text); setLanguage(q.lang); }}
                  className="max-w-full truncate rounded-md bg-white/5 px-2 py-1 text-left text-xs text-slate-300 hover:bg-white/10"
                >
                  {q.text}
                </button>
              ))}
            </div>
            <Button type="submit" className="mt-4 w-full" disabled={!message.trim()}>
              Send to N-ATLAS <IconArrowRight className="h-4 w-4" />
            </Button>
            <p className="mt-2 text-[11px] text-slate-500">* Pidgin is a test category, not an officially listed N-ATLAS language.</p>
          </form>
        </div>
      </section>

      {/* Status row */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-3">
        <ConnectionPanel />

        <Card>
          <CardHeader title="Sample project" right={<SampleTag />} />
          <div className="space-y-3 px-5 py-4 text-sm text-slate-600">
            <div>
              <p className="font-semibold text-ink">{current?.business.name ?? "Loading…"}</p>
              <p className="mt-0.5">Customer support for a Lagos clothing shop: delivery fees, hours, payments, returns and escalation.</p>
            </div>
            {current && (
              <div className="flex flex-wrap gap-1.5">
                <Badge>config v{current.version}</Badge>
                <Badge>{current.business.delivery.zones.length} delivery zones</Badge>
                <Badge>{current.business.faqs.length} FAQs</Badge>
              </div>
            )}
            <button onClick={() => go("config")} className="inline-flex items-center gap-1 font-medium text-forge-700 hover:text-forge-600">
              Edit facts &amp; policy <IconArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </Card>

        <Card>
          <CardHeader title="Latest test run" />
          <div className="space-y-3 px-5 py-4 text-sm text-slate-600">
            {lastRun ? (
              <RunSummary run={lastRun} />
            ) : (
              <p>No runs yet. {sample?.cases.length ?? 15} cases cover facts, missing answers, the same question in several languages, ambiguity, escalation and prompt injection.</p>
            )}
            <button onClick={() => go("tests")} className="inline-flex items-center gap-1 font-medium text-forge-700 hover:text-forge-600">
              Open test suite <IconArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </Card>
      </div>

      {/* How it works */}
      <section>
        <h2 className="text-lg font-bold tracking-tight text-ink">How it works</h2>
        <ol className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: IconStore, t: "Configure", d: "Structured business facts and a response policy: the only facts the assistant may state." },
            { icon: IconChat, t: "Ask", d: "Our server sends the message, policy and fact sheet to N-ATLAS. No other model is used." },
            { icon: IconShield, t: "Check", d: "Heuristics flag missing facts, invented ₦ amounts, wrong language, leaks and obeyed injections." },
            { icon: IconRefresh, t: "Retest", d: "Change facts or policy, rerun the same cases, and compare the recorded replies." },
          ].map((s, i) => (
            <li key={s.t} className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-card">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-forge-50 text-forge-700"><s.icon className="h-4 w-4" /></span>
                <span className="font-mono text-xs text-slate-400">0{i + 1}</span>
              </div>
              <p className="mt-3 font-semibold text-ink">{s.t}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Honesty */}
      <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-card">
        <h2 className="text-[15px] font-semibold text-ink">Honest by design</h2>
        <ul className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-x-6 gap-y-2 text-sm text-slate-600 sm:grid-cols-2">
          {[
            "Every reply is a live N-ATLAS reply. There is no demo mode or stand-in model.",
            "Automated checks are labelled heuristics. A pass is not proof of correctness.",
            "Human review is recorded separately from automated checks.",
            "No accuracy scores; comparisons show recorded replies only.",
          ].map((x) => (
            <li key={x} className="flex gap-2">
              <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-forge-600" />
              {x}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export function RunSummary({ run }: { run: Run }) {
  const results = Object.values(run.results);
  const count = (v: string) => results.filter((r) => r.verdict === v).length;
  const ok = results.filter((r) => r.ok);
  const avg = ok.length ? ok.reduce((s, r) => s + r.latencyMs, 0) / ok.length : 0;
  return (
    <div className="space-y-2">
      <p className="text-slate-500">
        {new Date(run.startedAt).toLocaleString()} · config v{run.configVersion}
        {run.stopped ? " · stopped early" : ""}
      </p>
      <div className="flex flex-wrap gap-1.5">
        <Badge tone="green">{count("passed-checks")} passed</Badge>
        <Badge tone="red">{count("failed-check")} failed a check</Badge>
        <Badge tone="amber">{count("needs-review")} need review</Badge>
        {count("request-failed") > 0 && <Badge tone="red">{count("request-failed")} request failed</Badge>}
      </div>
      {ok.length > 0 && <p className="text-slate-500">Average response {seconds(avg)} over {ok.length} replies.</p>}
    </div>
  );
}
