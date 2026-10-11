import { useState } from "react";
import type { AskResult, Fact } from "../api";
import { type HumanVerdict, type Review, useStore } from "../store";
import { Badge, ErrorNote, seconds, VerdictBadge } from "../ui";

/** One N-ATLAS reply with everything a developer needs to judge it. */
export function ResultView({ result, facts, reviewId }: { result: AskResult; facts: Fact[]; reviewId: string }) {
  const [open, setOpen] = useState<"facts" | "prompt" | null>(null);
  const shownFacts = result.facts.length ? result.facts : facts;
  const highlighted = new Set([...result.matchedFactIds, ...result.citedFactIds]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <VerdictBadge verdict={result.verdict} />
        {result.ok && <Badge tone="slate">Returned by N-ATLAS · {result.model}</Badge>}
        <Badge tone="slate">{seconds(result.latencyMs)}</Badge>
      </div>

      {result.ok ? (
        <div className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] leading-relaxed text-slate-900">
          {result.output}
        </div>
      ) : (
        <ErrorNote>{result.error ?? "The request failed."}</ErrorNote>
      )}

      {result.checks.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Automated checks <span className="font-normal normal-case">— heuristics, not proof of correctness</span>
          </h3>
          <ul className="mt-2 space-y-1.5">
            {result.checks.map((c) => (
              <li key={c.id} className="flex gap-2 text-sm">
                <span className={`mt-0.5 shrink-0 font-bold ${c.pass ? "text-forge-600" : "text-red-600"}`} aria-label={c.pass ? "passed" : "failed"}>
                  {c.pass ? "✓" : "✗"}
                </span>
                <span>
                  <span className="font-medium text-slate-800">{c.label}</span>
                  <span className="text-slate-500"> — {c.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <HumanReview reviewId={reviewId} />

      <div className="flex flex-wrap gap-2">
        <Button2 active={open === "facts"} onClick={() => setOpen(open === "facts" ? null : "facts")}>
          Business facts supplied ({shownFacts.length})
        </Button2>
        <Button2 active={open === "prompt"} onClick={() => setOpen(open === "prompt" ? null : "prompt")}>
          Full system prompt
        </Button2>
      </div>

      {open === "facts" && (
        <div className="rounded-lg border border-slate-200">
          <p className="border-b border-slate-100 px-3 py-2 text-xs text-slate-500">
            The whole fact sheet is sent with every request. Highlighted: facts sharing keywords with the question
            {result.citedFactIds.length > 0 && " or cited by the reply"}. Keyword matching works poorly for Yoruba, Hausa and Igbo questions.
          </p>
          <ul className="max-h-72 overflow-auto text-sm">
            {shownFacts.map((f) => (
              <li key={f.id} className={`flex gap-2 px-3 py-1.5 ${highlighted.has(f.id) ? "bg-amber-50" : ""}`}>
                <span className="w-9 shrink-0 font-mono text-xs leading-5 text-slate-500">{f.id}</span>
                <span className="text-slate-700">{f.text}</span>
                {result.citedFactIds.includes(f.id) && <Badge tone="blue" className="ml-auto">cited</Badge>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {open === "prompt" && (
        <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-900 p-3 text-xs leading-relaxed text-slate-100">
          {result.systemPrompt || "Not available for this saved result."}
        </pre>
      )}
    </div>
  );
}

function Button2({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-expanded={active}
      className={`rounded-md border px-2.5 py-1 text-xs font-medium ${active ? "border-slate-400 bg-slate-100 text-slate-900" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
    >
      {children}
    </button>
  );
}

const HUMAN: { v: HumanVerdict; label: string; cls: string }[] = [
  { v: "correct", label: "Correct", cls: "border-forge-500 bg-forge-50 text-forge-700" },
  { v: "incorrect", label: "Incorrect", cls: "border-red-500 bg-red-50 text-red-700" },
  { v: "unsure", label: "Unsure", cls: "border-amber-500 bg-amber-50 text-amber-800" },
];

export function HumanReview({ reviewId }: { reviewId: string }) {
  const { reviews, setReview } = useStore();
  const review = reviews[reviewId];
  const [note, setNote] = useState(review?.note ?? "");

  const set = (v: HumanVerdict) => setReview(reviewId, { verdict: v, note, at: new Date().toISOString() } satisfies Review);

  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Human review</span>
        {HUMAN.map((h) => (
          <button
            key={h.v}
            onClick={() => set(h.v)}
            aria-pressed={review?.verdict === h.v}
            className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${review?.verdict === h.v ? h.cls : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
          >
            {h.label}
          </button>
        ))}
        {review && (
          <button onClick={() => setReview(reviewId, null)} className="text-xs text-slate-500 underline">
            clear
          </button>
        )}
        {!review && <span className="text-xs text-slate-500">Not reviewed yet</span>}
      </div>
      <label className="mt-2 block">
        <span className="sr-only">Review notes</span>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => review && note !== review.note && setReview(reviewId, { ...review, note, at: new Date().toISOString() })}
          maxLength={500}
          placeholder="Notes — e.g. wrong fee, reply in English instead of Yoruba"
          className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm placeholder:text-slate-400 focus:border-forge-500 focus:outline-none"
        />
      </label>
    </div>
  );
}
