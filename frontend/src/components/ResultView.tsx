import { useState } from "react";
import type { AskResult } from "../api";
import { IconCheck, IconCode, IconDoc, IconX } from "../icons";
import { type HumanVerdict, type Review, useStore } from "../store";
import { Badge, ErrorNote, seconds, VerdictBadge } from "../ui";

/** One N-ATLAS reply with everything a developer needs to judge it. */
export function ResultView({ result, reviewId }: { result: AskResult; reviewId: string }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <VerdictBadge verdict={result.verdict} />
        {result.ok && <Badge>N-ATLAS · {seconds(result.latencyMs)}</Badge>}
      </div>
      {result.ok ? <ReplyBubble result={result} /> : <ErrorNote>{result.error ?? "The request failed."}</ErrorNote>}
      <ChecksList result={result} />
      <HumanReview reviewId={reviewId} />
      <ContextPanels result={result} />
    </div>
  );
}

export function ReplyBubble({ result }: { result: AskResult }) {
  return (
    <div className="flex gap-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-forge-600 text-[11px] font-bold text-white" aria-hidden>N</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 text-xs text-slate-500">
          <span className="font-semibold text-slate-700">N-ATLAS</span>
          <span className="font-mono">{result.model}</span>
          <span>· {seconds(result.latencyMs)}</span>
        </div>
        <div className="mt-1 whitespace-pre-wrap rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-[15px] leading-relaxed text-slate-900 shadow-sm ring-1 ring-slate-200">
          {result.output}
        </div>
      </div>
    </div>
  );
}

export function ChecksList({ result }: { result: AskResult }) {
  if (!result.checks.length) return null;
  const passed = result.checks.filter((c) => c.pass).length;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Automated checks</h3>
        <span className="text-xs text-slate-500">{passed}/{result.checks.length} passed · heuristics, not proof</span>
      </div>
      <ul className="mt-2 divide-y divide-slate-100 rounded-lg ring-1 ring-slate-200">
        {result.checks.map((c) => (
          <li key={c.id} className="flex gap-2.5 px-3 py-2 text-sm">
            <span
              className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full ${c.pass ? "bg-forge-100 text-forge-700" : "bg-red-100 text-red-700"}`}
              aria-label={c.pass ? "passed" : "failed"}
            >
              {c.pass ? <IconCheck className="h-3 w-3" /> : <IconX className="h-3 w-3" />}
            </span>
            <span className="min-w-0">
              <span className="font-medium text-slate-800">{c.label}</span>
              <span className="block text-[13px] text-slate-500">{c.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ContextPanels({ result }: { result: AskResult }) {
  const [open, setOpen] = useState<"facts" | "prompt" | null>(null);
  const highlighted = new Set([...result.matchedFactIds, ...result.citedFactIds]);
  const tab = (id: "facts" | "prompt", label: string, Icon: typeof IconDoc) => (
    <button
      onClick={() => setOpen(open === id ? null : id)}
      aria-expanded={open === id}
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium ring-1 ring-inset ${
        open === id ? "bg-night-900 text-white ring-night-900" : "text-slate-600 ring-slate-200 hover:bg-slate-50"
      }`}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {tab("facts", `Facts supplied (${result.facts.length})`, IconDoc)}
        {tab("prompt", "System prompt", IconCode)}
      </div>
      {open === "facts" && (
        <div className="mt-2 rounded-lg ring-1 ring-slate-200">
          <p className="border-b border-slate-100 px-3 py-2 text-xs text-slate-500">
            The whole fact sheet is sent with every request. Highlighted: facts sharing keywords with the question
            {result.citedFactIds.length > 0 && " or cited by the reply"}. Keyword matching is weak for Yoruba, Hausa and Igbo.
          </p>
          <ul className="scroll-thin max-h-72 overflow-auto text-sm">
            {result.facts.length === 0 && <li className="px-3 py-2 text-slate-500">Not stored for this result.</li>}
            {result.facts.map((f) => (
              <li key={f.id} className={`flex gap-2 px-3 py-1.5 ${highlighted.has(f.id) ? "bg-amber-50" : ""}`}>
                <span className="w-9 shrink-0 font-mono text-xs leading-5 text-slate-400">{f.id}</span>
                <span className="text-slate-700">{f.text}</span>
                {result.citedFactIds.includes(f.id) && <Badge tone="blue" className="ml-auto self-start">cited</Badge>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {open === "prompt" && (
        <pre className="scroll-thin mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-night-900 p-3 font-mono text-[12px] leading-relaxed text-slate-200">
          {result.systemPrompt || "Not available for this saved result."}
        </pre>
      )}
    </div>
  );
}

const HUMAN: { v: HumanVerdict; label: string; on: string }[] = [
  { v: "correct", label: "Correct", on: "bg-forge-600 text-white ring-forge-600" },
  { v: "incorrect", label: "Incorrect", on: "bg-red-600 text-white ring-red-600" },
  { v: "unsure", label: "Unsure", on: "bg-amber-500 text-white ring-amber-500" },
];

export function HumanReview({ reviewId }: { reviewId: string }) {
  const { reviews, setReview } = useStore();
  const review = reviews[reviewId];
  const [note, setNote] = useState(review?.note ?? "");

  const set = (v: HumanVerdict) => setReview(reviewId, { verdict: v, note, at: new Date().toISOString() } satisfies Review);

  return (
    <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Your review</span>
        {HUMAN.map((h) => (
          <button
            key={h.v}
            onClick={() => set(h.v)}
            aria-pressed={review?.verdict === h.v}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ring-inset transition-colors ${
              review?.verdict === h.v ? h.on : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-100"
            }`}
          >
            {h.label}
          </button>
        ))}
        {review ? (
          <button onClick={() => setReview(reviewId, null)} className="text-xs text-slate-500 underline-offset-2 hover:underline">
            Clear
          </button>
        ) : (
          <span className="text-xs text-slate-400">Not reviewed</span>
        )}
      </div>
      <label className="mt-2 block">
        <span className="sr-only">Review notes</span>
        <input
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            // Save as you type once a verdict is chosen, so nothing is lost on navigation.
            if (review) setReview(reviewId, { ...review, note: e.target.value, at: new Date().toISOString() });
          }}
          maxLength={500}
          placeholder="Notes, e.g. wrong fee, replied in English instead of Yoruba"
          className="w-full rounded-md border-0 bg-white px-2.5 py-1.5 text-sm ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-forge-500"
        />
      </label>
    </div>
  );
}
