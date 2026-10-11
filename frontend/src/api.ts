/**
 * Client for the LocalizeKit backend. The browser never talks to N-ATLAS
 * directly — the backend holds the endpoint and key.
 */

export type LangCode = "en" | "pid" | "yo" | "ha" | "ig";

export interface LanguageOption {
  code: LangCode;
  name: string;
  officiallyListed: boolean;
}

export interface DeliveryZone { zone: string; fee: number; time: string }
export interface Faq { q: string; a: string }

export interface BusinessConfig {
  name: string;
  description: string;
  hours: Record<string, string>;
  location: string;
  delivery: { zones: DeliveryZone[]; freeDeliveryRule: string; notes: string };
  payments: string[];
  orderProcessing: string[];
  returns: { windowDays: number; conditions: string[]; refunds: string; exclusions: string[] };
  contact: { whatsapp: string; email: string; humanHours: string };
  escalation: string[];
  limits: string[];
  faqs: Faq[];
}

export type CheckSpec =
  | { kind: "includesFact"; ref: string }
  | { kind: "includesAny"; values: string[]; label: string }
  | { kind: "noClaim"; phrases: string[]; label: string }
  | { kind: "defers" }
  | { kind: "pointsToHuman" }
  | { kind: "asksClarification" }
  | { kind: "declines" }
  | { kind: "noSentinel"; value: string };

export interface TestCase {
  id: string;
  title: string;
  category: string;
  language: LangCode;
  message: string;
  purpose: string;
  expected: string;
  checks: CheckSpec[];
  translationNote?: string;
}

export interface Fact { id: string; topic: string; text: string }
export interface CheckResult { id: string; label: string; pass: boolean; detail: string }
export type Verdict = "request-failed" | "failed-check" | "passed-checks" | "needs-review";

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

export interface Sample {
  business: BusinessConfig;
  policy: string;
  cases: TestCase[];
  languages: LanguageOption[];
  limits: { messageChars: number };
}

export interface Status { configured: boolean; model: string; detail: string }
export interface ConnectionCheck {
  ok: boolean;
  model: string;
  latencyMs: number;
  reply: string;
  error?: string;
  checkedAt: string;
}

async function call<T>(path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, body === undefined
      ? {}
      : { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    throw new Error("Could not reach the LocalizeKit server. Check your connection and try again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok && !(res.status === 503 && path === "/status/check")) {
    throw new Error(data.error ?? `Request failed (HTTP ${res.status}).`);
  }
  return data as T;
}

export const api = {
  status: () => call<Status>("/status"),
  checkConnection: () => call<ConnectionCheck>("/status/check", {}),
  sample: () => call<Sample>("/sample"),
  ask: (b: { message: string; language: LangCode; business: BusinessConfig; policy: string }) =>
    call<AskResult>("/ask", b),
  runCase: (b: { case: TestCase; business: BusinessConfig; policy: string }) =>
    call<AskResult>("/run-case", b),
};
