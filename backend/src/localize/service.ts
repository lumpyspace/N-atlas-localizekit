/**
 * Ask the assistant one question, or run one test case, through N-ATLAS.
 * Inputs from the browser are validated and size-limited here.
 */

import type { LangCode } from "../eval/lang.js";
import { LANG_NAMES } from "../eval/lang.js";
import type { NAtlasProvider } from "../providers/NAtlasProvider.js";
import { type BusinessConfig, type Fact, matchFacts } from "./business.js";
import type { CheckSpec, TestCase } from "./cases.js";
import { baselineChecks, type CheckResult, runCheck } from "./checks.js";
import { buildSystemPrompt, displayPrompt, MAX_POLICY_CHARS } from "./policy.js";

export const MAX_MESSAGE_CHARS = 1000;
export const MAX_BUSINESS_BYTES = 20_000;
export const MAX_REPLY_TOKENS = 320;

export interface LanguageOption {
  code: LangCode;
  name: string;
  /** Listed by NCAIR as an N-ATLAS language, vs a category we test without that claim. */
  officiallyListed: boolean;
}

export const LANGUAGES: LanguageOption[] = [
  { code: "en", name: "English (Nigerian)", officiallyListed: true },
  { code: "yo", name: "Yoruba", officiallyListed: true },
  { code: "ha", name: "Hausa", officiallyListed: true },
  { code: "ig", name: "Igbo", officiallyListed: true },
  { code: "pid", name: "Nigerian Pidgin", officiallyListed: false },
];

export class InputError extends Error {}

export type Verdict =
  | "request-failed"
  | "failed-check"
  | "passed-checks"
  | "needs-review";

export interface AskResult {
  ok: boolean;
  output: string;
  error?: string;
  model: string;
  latencyMs: number;
  language: LangCode;
  facts: Fact[];
  matchedFactIds: string[];
  citedFactIds: string[];
  systemPrompt: string;
  checks: CheckResult[];
  verdict: Verdict;
  at: string;
}

export function validateLanguage(v: unknown): LangCode {
  const found = LANGUAGES.find((l) => l.code === v);
  if (!found) throw new InputError(`Unsupported language "${String(v)}". Choose one of: ${LANGUAGES.map((l) => l.code).join(", ")}.`);
  return found.code;
}

export function validateMessage(v: unknown): string {
  if (typeof v !== "string" || !v.trim()) throw new InputError("Enter a customer message.");
  if (v.length > MAX_MESSAGE_CHARS) throw new InputError(`Message is too long (max ${MAX_MESSAGE_CHARS} characters).`);
  return v.trim();
}

export function validatePolicy(v: unknown, fallback: string): string {
  if (v === undefined || v === null || v === "") return fallback;
  if (typeof v !== "string") throw new InputError("Policy must be text.");
  if (v.length > MAX_POLICY_CHARS) throw new InputError(`Policy is too long (max ${MAX_POLICY_CHARS} characters).`);
  return v;
}

const isStr = (x: unknown): x is string => typeof x === "string";
const strArr = (x: unknown) => Array.isArray(x) && x.every(isStr);

export function validateBusiness(v: unknown, fallback: BusinessConfig): BusinessConfig {
  if (v === undefined || v === null) return fallback;
  if (JSON.stringify(v).length > MAX_BUSINESS_BYTES) throw new InputError("Business configuration is too large (max 20 KB).");
  const b = v as BusinessConfig;
  const ok =
    isStr(b.name) && isStr(b.description) && isStr(b.location) &&
    b.hours && typeof b.hours === "object" && Object.values(b.hours).every(isStr) &&
    b.delivery && Array.isArray(b.delivery.zones) &&
    b.delivery.zones.every((z) => isStr(z?.zone) && Number.isFinite(z?.fee) && isStr(z?.time)) &&
    isStr(b.delivery.freeDeliveryRule) && isStr(b.delivery.notes) &&
    strArr(b.payments) && strArr(b.orderProcessing) &&
    b.returns && Number.isFinite(b.returns.windowDays) && strArr(b.returns.conditions) &&
    isStr(b.returns.refunds) && strArr(b.returns.exclusions) &&
    b.contact && isStr(b.contact.whatsapp) && isStr(b.contact.email) && isStr(b.contact.humanHours) &&
    strArr(b.escalation) && strArr(b.limits) &&
    Array.isArray(b.faqs) && b.faqs.every((f) => isStr(f?.q) && isStr(f?.a));
  if (!ok) throw new InputError("Business configuration is missing fields or has the wrong shape.");
  return b;
}

const CHECK_KINDS = new Set(["includesFact", "includesAny", "noClaim", "defers", "pointsToHuman", "asksClarification", "declines", "noSentinel"]);

export function validateChecks(v: unknown): CheckSpec[] {
  if (v === undefined) return [];
  if (!Array.isArray(v) || v.length > 10 || !v.every((c) => c && CHECK_KINDS.has(c.kind))) {
    throw new InputError("Invalid checks.");
  }
  return v as CheckSpec[];
}

/** Turn transport errors into messages a developer can act on (never includes the key). */
function friendlyError(err: unknown): string {
  const m = err instanceof Error ? err.message : String(err);
  if (/HTTP 401|HTTP 403/.test(m)) return "N-ATLAS rejected the server's credentials (check NATLAS_API_KEY on the server).";
  if (/HTTP 404/.test(m)) return "The N-ATLAS endpoint was not found (check NATLAS_ENDPOINT and NATLAS_MODEL).";
  if (/HTTP 5\d\d/.test(m)) return "The N-ATLAS server returned an error. It may still be starting up — try again in a minute.";
  if (/Timed out/i.test(m)) return "N-ATLAS took too long to answer. A cold GPU start can take a few minutes — try again shortly.";
  if (/requires NATLAS_ENDPOINT/.test(m)) return "The server has no N-ATLAS endpoint configured (NATLAS_ENDPOINT).";
  if (/fetch failed|ECONNREFUSED|ENOTFOUND/i.test(m)) return "Could not reach the N-ATLAS server.";
  return "The N-ATLAS request failed.";
}

export async function ask(
  provider: NAtlasProvider,
  args: { message: string; language: LangCode; business: BusinessConfig; policy: string; checks?: CheckSpec[] },
): Promise<AskResult> {
  const built = buildSystemPrompt(args.policy, args.business);
  const base = {
    language: args.language,
    facts: built.facts,
    matchedFactIds: matchFacts(args.message, built.facts),
    systemPrompt: displayPrompt(built),
    at: new Date().toISOString(),
  };
  const started = Date.now();
  try {
    const r = await provider.generate(args.message, {
      system: built.system,
      temperature: 0.2,
      maxTokens: MAX_REPLY_TOKENS,
    });
    const output = r.text.trim();
    const checks = [
      ...(args.checks ?? []).map((c) => runCheck(c, output, args.business)),
      ...baselineChecks(output, args.business, built),
    ];
    const specific = (args.checks ?? []).length > 0;
    const verdict: Verdict = checks.some((c) => !c.pass)
      ? "failed-check"
      : specific
        ? "passed-checks"
        : "needs-review";
    const cited = [...new Set([...output.matchAll(/\[(F\d+)\]/g)].map((m) => m[1]))];
    return { ...base, ok: true, output, model: r.model, latencyMs: r.latencyMs, citedFactIds: cited, checks, verdict };
  } catch (err) {
    return {
      ...base,
      ok: false,
      output: "",
      error: friendlyError(err),
      model: "",
      latencyMs: Date.now() - started,
      citedFactIds: [],
      checks: [],
      verdict: "request-failed",
    };
  }
}

export type { TestCase };
export { LANG_NAMES };
