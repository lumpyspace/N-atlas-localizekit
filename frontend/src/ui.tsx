import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { Verdict } from "./api";

/** Small set of Tailwind primitives shared across screens (no component lib). */

type ButtonVariant = "primary" | "secondary" | "ghost";

const BTN_VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-forge-600 text-white hover:bg-forge-700",
  secondary: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
  ghost: "text-slate-600 hover:bg-slate-100",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: "sm" | "md" }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-forge-500/50 ${BTN_VARIANT[variant]} ${size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2 text-sm"} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-xl border border-slate-200 bg-white shadow-card ${className}`}>{children}</div>;
}

export function CardHeader({ title, sub, right }: { title: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {sub && <p className="mt-0.5 text-sm text-slate-500">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export type Tone = "slate" | "green" | "amber" | "red" | "blue";

const BADGE_TONE: Record<Tone, string> = {
  slate: "bg-slate-100 text-slate-700 border-slate-200",
  green: "bg-forge-50 text-forge-700 border-forge-200",
  amber: "bg-amber-50 text-amber-800 border-amber-200",
  red: "bg-red-50 text-red-700 border-red-200",
  blue: "bg-blue-50 text-blue-700 border-blue-200",
};

export function Badge({ tone = "slate", className = "", children, title }: { tone?: Tone; className?: string; children: ReactNode; title?: string }) {
  return (
    <span title={title} className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${BADGE_TONE[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return <span className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`} aria-hidden />;
}

export const VERDICT: Record<Verdict, { label: string; tone: Tone; hint: string }> = {
  "request-failed": { label: "Request failed", tone: "red", hint: "N-ATLAS did not return a reply." },
  "failed-check": { label: "Failed a check", tone: "red", hint: "At least one automated heuristic check failed. Review the reply." },
  "passed-checks": { label: "Passed checks", tone: "green", hint: "All automated heuristic checks passed. This is not proof the answer is correct." },
  "needs-review": { label: "Needs human review", tone: "amber", hint: "No case-specific automated check applies. A person must judge this reply." },
};

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const v = VERDICT[verdict];
  return <Badge tone={v.tone} title={v.hint}>{v.label}</Badge>;
}

export function SampleTag() {
  return <Badge tone="blue" title="Invented data for testing. Not a real business.">Fictional sample data</Badge>;
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{children}</div>;
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center">
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {children && <div className="mt-1 text-sm text-slate-500">{children}</div>}
    </div>
  );
}

export function seconds(ms: number) {
  return ms >= 10_000 ? `${Math.round(ms / 1000)}s` : `${(ms / 1000).toFixed(1)}s`;
}
