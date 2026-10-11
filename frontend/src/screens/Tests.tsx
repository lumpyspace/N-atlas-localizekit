import { Fragment, useMemo, useState } from "react";
import type { AskResult, TestCase } from "../api";
import { ResultView } from "../components/ResultView";
import { type Run, reviewKey, useStore } from "../store";
import { IconBeaker, IconPlay, IconStop } from "../icons";
import { Badge, Button, Card, CardHeader, Empty, ErrorNote, LANG_LABEL, seconds, Spinner, Stat, VERDICT, VerdictBadge } from "../ui";

export default function Tests() {
  const { sample, current, runs, running, runCases, stopRun, reviews } = useStore();
  const [viewId, setViewId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [compare, setCompare] = useState(false);

  const cases = sample?.cases ?? [];
  const view: Run | undefined = running ?? runs.find((r) => r.id === viewId) ?? runs[runs.length - 1];

  if (!sample) return <Empty title="Loading test cases…" />;

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="min-w-0">
            <p className="text-sm text-slate-600">
              <strong className="text-ink">{cases.length} cases</strong> sent to N-ATLAS with business configuration{" "}
              <strong className="text-ink">v{current?.version ?? "?"}</strong>, one at a time, at temperature 0 so reruns are comparable.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
              {running ? (
                <span className="flex items-center gap-2">
                  <Spinner className="text-forge-600" />
                  Running case {Math.min(Object.keys(running.results).length + 1, running.caseIds.length)} of {running.caseIds.length}…
                </span>
              ) : view ? (
                <>
                  <label className="flex items-center gap-2">
                    <span className="text-slate-500">Run</span>
                    <select
                      value={view.id}
                      onChange={(e) => setViewId(e.target.value)}
                      className="rounded-md border-0 bg-white py-1 pl-2 pr-8 text-sm ring-1 ring-inset ring-slate-300"
                    >
                      {[...runs].reverse().map((r) => (
                        <option key={r.id} value={r.id}>
                          {new Date(r.startedAt).toLocaleString()} — config v{r.configVersion}
                        </option>
                      ))}
                    </select>
                  </label>
                  {runs.length >= 2 && (
                    <Button variant="secondary" size="sm" onClick={() => setCompare(!compare)}>
                      {compare ? "Hide comparison" : "Compare two runs"}
                    </Button>
                  )}
                </>
              ) : (
                <span className="text-slate-500">No runs yet.</span>
              )}
            </div>
          </div>
          {running ? (
            <Button variant="secondary" onClick={stopRun}><IconStop className="h-4 w-4" /> Stop after this case</Button>
          ) : (
            <Button size="lg" onClick={() => runCases(cases)} disabled={!current}><IconPlay className="h-4 w-4" /> Run all {cases.length} cases</Button>
          )}
        </div>
        {running && (
          <div className="h-1 bg-slate-100">
            <div className="h-1 bg-forge-500 transition-all" style={{ width: `${(Object.keys(running.results).length / running.caseIds.length) * 100}%` }} />
          </div>
        )}
      </Card>

      {view && <RunStats run={view} total={cases.length} />}

      {compare && runs.length >= 2 && <Compare cases={cases} />}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-2.5 pl-5 pr-4 font-semibold">Test case</th>
                <th className="px-3 py-2.5 font-semibold">Language</th>
                <th className="px-3 py-2.5 font-semibold">Request</th>
                <th className="px-3 py-2.5 font-semibold">Time</th>
                <th className="px-3 py-2.5 font-semibold" title="Heuristic checks — not proof of correctness">Automated checks</th>
                <th className="px-3 py-2.5 font-semibold">Result</th>
                <th className="px-3 py-2.5 font-semibold">Human review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cases.map((c) => {
                const r = view?.results[c.id];
                const pending = running && !r && running.caseIds.includes(c.id);
                const rev = view && reviews[reviewKey(`run:${view.id}`, c.id)];
                const isOpen = expanded === c.id;
                return (
                  <Fragment key={c.id}>
                    <tr
                      className={`cursor-pointer hover:bg-slate-50 ${isOpen ? "bg-slate-50" : ""}`}
                      onClick={() => setExpanded(isOpen ? null : c.id)}
                    >
                      <td className="relative py-3 pl-5 pr-4">
                        <span className={`absolute inset-y-2 left-0 w-1 rounded-r ${r ? VERDICT[r.verdict].bar : "bg-slate-200"}`} aria-hidden />
                        <button className="text-left font-medium text-ink" aria-expanded={isOpen}>{c.title}</button>
                        <div className="text-xs text-slate-500">{c.category}</div>
                      </td>
                      <td className="px-3 py-3"><span className="font-mono text-[11px] text-slate-400">{c.language.toUpperCase()}</span> {LANG_LABEL[c.language]}</td>
                      <td className="px-3 py-3">
                        {r ? (r.ok ? <Badge tone="green">Returned</Badge> : <Badge tone="red">Failed</Badge>) : pending ? <Spinner className="text-slate-400" /> : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-3 py-3 tabular-nums">{r?.ok ? seconds(r.latencyMs) : "—"}</td>
                      <td className="px-3 py-3"><CheckCount r={r} /></td>
                      <td className="px-3 py-3">{r ? <VerdictBadge verdict={r.verdict} /> : <span className="text-slate-400">Not run</span>}</td>
                      <td className="px-3 py-3">
                        {rev ? (
                          <Badge tone={rev.verdict === "correct" ? "green" : rev.verdict === "incorrect" ? "red" : "amber"}>
                            {rev.verdict === "correct" ? "Correct" : rev.verdict === "incorrect" ? "Incorrect" : "Unsure"}
                          </Badge>
                        ) : (
                          <span className="text-slate-400">{r?.ok ? "Not reviewed" : "—"}</span>
                        )}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={7} className="border-t border-slate-100 bg-slate-50/60 px-5 pb-6 pt-4">
                          <CaseDetail c={c} r={r} run={view} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function CheckCount({ r }: { r?: AskResult }) {
  if (!r?.ok) return <span className="text-slate-400">—</span>;
  const passed = r.checks.filter((c) => c.pass).length;
  return (
    <span className={passed === r.checks.length ? "text-forge-700" : "text-red-700"}>
      {passed}/{r.checks.length} passed
    </span>
  );
}

function CaseDetail({ c, r, run }: { c: TestCase; r?: AskResult; run?: Run }) {
  const { runCases, running } = useStore();
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="space-y-3 text-sm">
        <Field label="Customer message">
          <p className="rounded-md bg-slate-100 px-3 py-2 text-slate-900">{c.message}</p>
          {c.translationNote && <p className="mt-1 text-xs text-amber-700">{c.translationNote}</p>}
        </Field>
        <Field label="Purpose">{c.purpose}</Field>
        <Field label="Expected behaviour">{c.expected}</Field>
        <Field label="Case-specific automated checks">
          {c.checks.length ? `${c.checks.length} for this case, plus the checks run on every reply (language, citations, ₦ amounts, leaks).` : "None for this case. Only the checks run on every reply apply (language, citations, ₦ amounts, leaks), so a person must judge it."}
        </Field>
        <Button variant="secondary" size="sm" disabled={!!running} onClick={() => runCases([c])}>Run this case only</Button>
      </div>
      <div>
        {r && run ? (
          <ResultView result={r} reviewId={reviewKey(`run:${run.id}`, c.id)} />
        ) : running ? (
          <Empty title="Waiting for this case…" />
        ) : (
          <Empty title="Not run in this run" icon={<IconBeaker className="h-5 w-5" />} />
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-0.5 text-slate-700">{children}</div>
    </div>
  );
}

/** Before/after view built only from recorded runs. */
function Compare({ cases }: { cases: TestCase[] }) {
  const { runs, versions } = useStore();
  const [beforeId, setBeforeId] = useState(runs[runs.length - 2].id);
  const [afterId, setAfterId] = useState(runs[runs.length - 1].id);
  const before = runs.find((r) => r.id === beforeId);
  const after = runs.find((r) => r.id === afterId);

  const rows = useMemo(
    () => cases.filter((c) => before?.results[c.id] || after?.results[c.id]),
    [cases, before, after],
  );
  const changed = (b?: AskResult, a?: AskResult) => b && a && b.verdict !== a.verdict;
  const noteFor = (v?: number) => versions.find((x) => x.version === v)?.note;

  const Picker = ({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) => (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-md border border-slate-300 bg-white px-2 py-1.5">
        {[...runs].reverse().map((r) => (
          <option key={r.id} value={r.id}>{new Date(r.startedAt).toLocaleString()} — config v{r.configVersion}</option>
        ))}
      </select>
    </label>
  );

  return (
    <Card>
      <CardHeader title="Compare runs" sub="Side-by-side recorded replies. A changed result is shown as it happened — it is not counted as an improvement unless a person reviews it." />
      <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
        <div>
          <Picker label="Before" value={beforeId} onChange={setBeforeId} />
          {before && <p className="mt-1 text-xs text-slate-500">Config v{before.configVersion}: {noteFor(before.configVersion)}</p>}
        </div>
        <div>
          <Picker label="After" value={afterId} onChange={setAfterId} />
          {after && <p className="mt-1 text-xs text-slate-500">Config v{after.configVersion}: {noteFor(after.configVersion)}</p>}
        </div>
      </div>
      {before?.id === after?.id && <div className="px-5 pb-4"><ErrorNote>Pick two different runs.</ErrorNote></div>}
      <ul className="divide-y divide-slate-100 border-t border-slate-100">
        {rows.map((c) => {
          const b = before?.results[c.id];
          const a = after?.results[c.id];
          return (
            <li key={c.id} className="px-5 py-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-ink">{c.title}</span>
                {changed(b, a) && <Badge tone="blue">Result changed</Badge>}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[b, a].map((r, i) => (
                  <div key={i} className="rounded-lg border border-slate-200 p-3 text-sm">
                    {r ? (
                      <>
                        <VerdictBadge verdict={r.verdict} />
                        <p className="mt-2 whitespace-pre-wrap text-slate-700">{r.ok ? r.output : r.error}</p>
                        {r.checks.filter((x) => !x.pass).map((x) => (
                          <p key={x.id} className="mt-1 text-xs text-red-700">✗ {x.label}</p>
                        ))}
                      </>
                    ) : (
                      <span className="text-slate-400">Not run</span>
                    )}
                  </div>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/** Counts from a recorded run. Nothing here is a score: just how many replies landed in each bucket. */
function RunStats({ run, total }: { run: Run; total: number }) {
  const { reviews } = useStore();
  const results = Object.values(run.results);
  const count = (v: string) => results.filter((r) => r.verdict === v).length;
  const ok = results.filter((r) => r.ok);
  const reviewed = run.caseIds.filter((id) => reviews[reviewKey(`run:${run.id}`, id)]).length;
  const avg = ok.length ? ok.reduce((s, r) => s + r.latencyMs, 0) / ok.length : 0;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <Stat label="Replies returned" value={`${ok.length}/${total}`} />
      <Stat label="Passed checks" value={count("passed-checks")} tone="green" hint="All heuristic checks passed. Not proof of correctness." />
      <Stat label="Failed a check" value={count("failed-check")} tone="red" />
      <Stat label="Need review" value={count("needs-review")} tone="amber" />
      <Stat label="Reviewed by you" value={`${reviewed}/${run.caseIds.length}`} tone="blue" />
      <Stat label="Avg response" value={ok.length ? seconds(avg) : "—"} />
    </div>
  );
}
