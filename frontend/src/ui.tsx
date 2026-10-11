import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { LangCode, LanguageOption, Verdict } from "./api";
import { IconAlert, IconCheck, IconX } from "./icons";

/** Small set of Tailwind primitives shared across screens (no component lib). */

type ButtonVariant = "primary" | "secondary" | "ghost" | "dark";

const BTN_VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-forge-600 text-white shadow-sm hover:bg-forge-700",
  secondary: "border border-slate-300 bg-white text-slate-700 shadow-sm hover:border-slate-400 hover:bg-slate-50",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-ink",
  dark: "bg-night-900 text-white shadow-sm hover:bg-night-800",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: "sm" | "md" | "lg" }) {
  const sz = size === "sm" ? "px-3 py-1.5 text-[13px]" : size === "lg" ? "px-5 py-2.5 text-[15px]" : "px-4 py-2 text-sm";
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-forge-500/50 focus-visible:ring-offset-1 ${BTN_VARIANT[variant]} ${sz} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-xl border border-slate-200/80 bg-white shadow-card ${className}`}>{children}</div>;
}

export function CardHeader({ title, sub, right, icon }: { title: ReactNode; sub?: ReactNode; right?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <div className="flex min-w-0 gap-3">
        {icon && <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600">{icon}</span>}
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
          {sub && <p className="mt-0.5 text-[13px] leading-relaxed text-slate-500">{sub}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

export type Tone = "slate" | "green" | "amber" | "red" | "blue";

const BADGE_TONE: Record<Tone, string> = {
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  green: "bg-forge-50 text-forge-700 ring-forge-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
};

export function Badge({ tone = "slate", className = "", children, title }: { tone?: Tone; className?: string; children: ReactNode; title?: string }) {
  return (
    <span title={title} className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ${BADGE_TONE[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return <span className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`} aria-hidden />;
}

export const VERDICT: Record<Verdict, { label: string; tone: Tone; hint: string; bar: string }> = {
  "request-failed": { label: "Request failed", tone: "red", hint: "N-ATLAS did not return a reply.", bar: "bg-red-500" },
  "failed-check": { label: "Failed a check", tone: "red", hint: "At least one automated heuristic check failed. Review the reply.", bar: "bg-red-500" },
  "passed-checks": { label: "Passed checks", tone: "green", hint: "All automated heuristic checks passed. This is not proof the answer is correct.", bar: "bg-forge-500" },
  "needs-review": { label: "Needs review", tone: "amber", hint: "No case-specific automated check applies. A person must judge this reply.", bar: "bg-amber-400" },
};

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const v = VERDICT[verdict];
  const Icon = verdict === "passed-checks" ? IconCheck : verdict === "needs-review" ? IconAlert : IconX;
  return (
    <Badge tone={v.tone} title={v.hint}>
      <Icon className="h-3 w-3" />
      {v.label}
    </Badge>
  );
}

export function SampleTag() {
  return <Badge tone="blue" title="Invented data for testing. Not a real business.">Fictional sample data</Badge>;
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="flex gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
      <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export function Empty({ title, children, icon }: { title: string; children?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-slate-50/50 px-4 py-10 text-center">
      {icon && <span className="mb-3 grid h-10 w-10 place-items-center rounded-full bg-white text-slate-400 shadow-sm ring-1 ring-slate-200">{icon}</span>}
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {children && <div className="mt-1 max-w-sm text-sm text-slate-500">{children}</div>}
    </div>
  );
}

export function Stat({ label, value, tone = "slate", hint }: { label: string; value: ReactNode; tone?: Tone; hint?: string }) {
  const color: Record<Tone, string> = {
    slate: "text-ink",
    green: "text-forge-700",
    amber: "text-amber-700",
    red: "text-red-700",
    blue: "text-blue-700",
  };
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-card" title={hint}>
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold tabular-nums tracking-tight ${color[tone]}`}>{value}</div>
    </div>
  );
}

export const LANG_SHORT: Record<LangCode, string> = { en: "EN", pid: "PCM", yo: "YO", ha: "HA", ig: "IG" };
export const LANG_LABEL: Record<LangCode, string> = { en: "English", pid: "Pidgin", yo: "Yoruba", ha: "Hausa", ig: "Igbo" };

/** Language / test-category picker as a segmented control. */
export function LangPills({
  languages,
  value,
  onChange,
  dark = false,
}: {
  languages: LanguageOption[];
  value: LangCode;
  onChange: (l: LangCode) => void;
  dark?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label="Language or test category" className="flex flex-wrap gap-1.5">
      {languages.map((l) => {
        const on = l.code === value;
        return (
          <button
            key={l.code}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(l.code)}
            title={l.officiallyListed ? l.name : `${l.name}: test category, not an officially listed N-ATLAS language`}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium ring-1 ring-inset transition-colors ${
              on
                ? dark
                  ? "bg-white text-ink ring-white"
                  : "bg-night-900 text-white ring-night-900"
                : dark
                  ? "text-slate-300 ring-white/15 hover:bg-white/5"
                  : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            <span className={`font-mono text-[10px] ${on ? (dark ? "text-forge-700" : "text-forge-400") : "text-slate-400"}`}>{LANG_SHORT[l.code]}</span>
            {LANG_LABEL[l.code]}
            {!l.officiallyListed && <span className={`text-[10px] ${on ? "opacity-70" : "text-amber-600"}`}>*</span>}
          </button>
        );
      })}
    </div>
  );
}

export function seconds(ms: number) {
  return ms >= 10_000 ? `${Math.round(ms / 1000)}s` : `${(ms / 1000).toFixed(1)}s`;
}
