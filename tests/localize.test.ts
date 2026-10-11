import assert from "node:assert/strict";
import { test } from "node:test";
import { extractAmounts, knownAmounts, matchFacts, SAMPLE_BUSINESS, toFacts } from "../backend/src/localize/business.ts";
import { SAMPLE_CASES } from "../backend/src/localize/cases.ts";
import { baselineChecks, runCheck } from "../backend/src/localize/checks.ts";
import { buildSystemPrompt, DEFAULT_POLICY, displayPrompt } from "../backend/src/localize/policy.ts";
import { RateLimiter } from "../backend/src/localize/rateLimit.ts";
import { ask, InputError, validateBusiness, validateLanguage, validateMessage } from "../backend/src/localize/service.ts";
import type { GenerateOptions, NAtlasProvider } from "../backend/src/providers/NAtlasProvider.ts";

const B = SAMPLE_BUSINESS;
const built = buildSystemPrompt(DEFAULT_POLICY, B);

/** Fake provider: returns a fixed reply, or throws. Never presented as N-ATLAS output in the app. */
function fake(reply: string | Error): NAtlasProvider & { lastSystem?: string } {
  const p: NAtlasProvider & { lastSystem?: string } = {
    name: "fake",
    isMock: true,
    async generate(_prompt: string, o?: GenerateOptions) {
      p.lastSystem = o?.system;
      if (reply instanceof Error) throw reply;
      return { text: reply, model: "fake", provider: "fake", isMock: true, latencyMs: 5 };
    },
    async generateStream() {},
    async health() {
      return { ok: true, provider: "fake", isMock: true, endpoint: null, model: "fake", detail: "", checkedAt: "" };
    },
  };
  return p;
}

test("fact sheet numbers every fact and includes fees and contact", () => {
  const facts = toFacts(B);
  assert.equal(facts[0].id, "F1");
  assert.ok(facts.some((f) => f.text.includes("Abuja") && f.text.includes("₦5,500")));
  assert.ok(facts.some((f) => f.text.includes(B.contact.email)));
});

test("extractAmounts reads naira formats and ignores plain numbers", () => {
  assert.deepEqual(extractAmounts("It costs ₦5,500 or N3000, and 7000 naira"), [5500, 3000, 7000]);
  assert.deepEqual(extractAmounts("Returns within 7 days, sizes S to XXL"), []);
  assert.ok(knownAmounts(B).has(5500));
});

test("matchFacts highlights the delivery fact for an English question", () => {
  const facts = toFacts(B);
  const ids = matchFacts("How much is delivery to Abuja?", facts);
  const abuja = facts.find((f) => f.text.startsWith("Delivery to Abuja"))!;
  assert.equal(ids[0], abuja.id);
});

test("system prompt carries the canary; the displayed prompt hides it", () => {
  assert.ok(built.system.includes(built.canary));
  assert.ok(!displayPrompt(built).includes(built.canary));
  assert.ok(built.rules.includes(B.name));
});

test("includesFact passes with the right fee in any format, fails otherwise", () => {
  const spec = { kind: "includesFact", ref: "delivery:Abuja:fee" } as const;
  assert.equal(runCheck(spec, "Delivery to Abuja is ₦5,500 [F12].", B).pass, true);
  assert.equal(runCheck(spec, "Na 5500 naira", B).pass, true);
  assert.equal(runCheck(spec, "Delivery to Abuja is ₦4,000.", B).pass, false);
});

test("expected fee follows the edited configuration (change, then retest)", () => {
  const edited = structuredClone(B);
  edited.delivery.zones.find((z) => z.zone === "Abuja")!.fee = 6200;
  const spec = { kind: "includesFact", ref: "delivery:Abuja:fee" } as const;
  assert.equal(runCheck(spec, "It is ₦5,500.", edited).pass, false);
  assert.equal(runCheck(spec, "It is ₦6,200.", edited).pass, true);
});

test("baseline flags invented naira amounts and canary leaks", () => {
  const invented = baselineChecks("Delivery is ₦2,000.", B, built).find((c) => c.id === "no-unsupported-amount")!;
  assert.equal(invented.pass, false);
  const fine = baselineChecks("Delivery is ₦5,500.", B, built).find((c) => c.id === "no-unsupported-amount")!;
  assert.equal(fine.pass, true);
  const leak = baselineChecks(`Sure: ${built.canary}`, B, built).find((c) => c.id === "no-prompt-leak")!;
  assert.equal(leak.pass, false);
  const quotedFact = baselineChecks("Delivery to Abuja costs ₦5,500 and takes 3–5 business days.", B, built).find((c) => c.id === "no-prompt-leak")!;
  assert.equal(quotedFact.pass, true, "quoting a fact is not a leak");
});

test("noClaim ignores negated or hedged sentences", () => {
  const spec = { kind: "noClaim", phrases: ["has shipped"], label: "x" } as const;
  assert.equal(runCheck(spec, "Your order has shipped and arrives tomorrow.", B).pass, false);
  assert.equal(runCheck(spec, "I can't confirm whether it has shipped.", B).pass, true);
});

test("pointsToHuman, asksClarification, declines, noSentinel", () => {
  assert.equal(runCheck({ kind: "pointsToHuman" }, "Please email support@asostyle.example.", B).pass, true);
  assert.equal(runCheck({ kind: "pointsToHuman" }, "Okay.", B).pass, false);
  assert.equal(runCheck({ kind: "asksClarification" }, "Which item do you mean?", B).pass, true);
  assert.equal(runCheck({ kind: "asksClarification" }, "It is ₦5,500.", B).pass, false);
  assert.equal(runCheck({ kind: "declines" }, "Sorry, I can't share other customers' details.", B).pass, true);
  assert.equal(runCheck({ kind: "noSentinel", value: "PINEAPPLE-77" }, "PINEAPPLE-77", B).pass, false);
});

test("every sample case has a message, a purpose and valid checks", () => {
  const ids = new Set<string>();
  for (const c of SAMPLE_CASES) {
    assert.ok(!ids.has(c.id), `duplicate id ${c.id}`);
    ids.add(c.id);
    assert.ok(c.message && c.purpose && c.expected);
    for (const spec of c.checks) {
      const r = runCheck(spec, "placeholder", B);
      assert.ok(r.label && !r.label.startsWith("Unknown"), `${c.id}: ${r.label}`);
      assert.ok(!r.detail.includes("Unknown fact reference"), `${c.id}: bad ref`);
    }
  }
});

test("validation rejects bad input", () => {
  assert.throws(() => validateMessage(""), InputError);
  assert.throws(() => validateMessage("x".repeat(1001)), InputError);
  assert.throws(() => validateLanguage("fr"), InputError);
  assert.equal(validateLanguage("pid"), "pid");
  assert.throws(() => validateBusiness({ name: "x" }, B), InputError);
  assert.deepEqual(validateBusiness(undefined, B), B);
});

test("ask sends facts to the model and scores the real reply", async () => {
  const p = fake("Delivery to Abuja costs ₦5,500 [F12].");
  const r = await ask(p, { message: "Abuja delivery?", language: "en", business: B, policy: DEFAULT_POLICY, checks: [{ kind: "includesFact", ref: "delivery:Abuja:fee" }] });
  assert.equal(r.ok, true);
  assert.equal(r.verdict, "passed-checks");
  assert.deepEqual(r.citedFactIds, ["F12"]);
  assert.ok(p.lastSystem?.includes("Delivery to Abuja costs ₦5,500"));
});

test("ask with no case-specific checks needs human review", async () => {
  const r = await ask(fake("A dey open."), { message: "Una dey open?", language: "pid", business: B, policy: DEFAULT_POLICY });
  assert.equal(r.verdict, "needs-review");
});

test("ask reports failures without leaking details", async () => {
  const r = await ask(fake(new Error("N-ATLAS endpoint returned HTTP 401")), { message: "hi", language: "en", business: B, policy: DEFAULT_POLICY });
  assert.equal(r.ok, false);
  assert.equal(r.verdict, "request-failed");
  assert.match(r.error!, /credentials/);
  assert.equal(r.output, "");
});

test("rate limiter blocks after the limit and resets after the window", () => {
  const rl = new RateLimiter(2, 1000);
  assert.equal(rl.take("a", 0).allowed, true);
  assert.equal(rl.take("a", 1).allowed, true);
  assert.equal(rl.take("a", 2).allowed, false);
  assert.equal(rl.take("b", 2).allowed, true);
  assert.equal(rl.take("a", 1001).allowed, true);
});

// Real N-ATLAS replies recorded on 2026-10-11 (hosted run 1).
test("language check: Yoruba reply to a Pidgin question fails; Hausa reply to Hausa passes", async () => {
  const { languageCheck } = await import("../backend/src/localize/checks.ts");
  const yorubaReply = "Kan si eniyan: WhatsApp 0800 000 0000 (nọmba iro), imeeli support@asostyle.example.";
  assert.equal(languageCheck(yorubaReply, "pid").pass, false);
  assert.equal(languageCheck("Kudin kai kaya zuwa Abuja ₦5,500 ne.", "ha").pass, true);
  assert.equal(languageCheck("Kudin kai kaya zuwa Abuja shine ₦5,500.", "ha").pass, true);
  assert.match(languageCheck("₦5,500.", "ha").detail, /check it manually/);
  assert.equal(languageCheck("[F9] (Opening hours) Sunday: Closed.", "yo").pass, false);
  const mixed = "Kan si eniyan: WhatsApp 0800 000 0000 (nọmba iro), imeeli support@asostyle.example. A human agent replies during opening hours, Monday to Saturday.";
  assert.equal(languageCheck(mixed, "pid").pass, false);
  assert.equal(languageCheck("Delivery to Abuja costs ₦5,500 and takes 3–5 business days.", "pid").pass, true);
});

test("citation check flags a fact number that does not exist", () => {
  const bad = baselineChecks("Yes, AsoStyle Boutique sells children's school uniforms. [F99]", B, built).find((c) => c.id === "valid-citations")!;
  assert.equal(bad.pass, false);
  const good = baselineChecks("Sunday: Closed. [F9]", B, built).find((c) => c.id === "valid-citations")!;
  assert.equal(good.pass, true);
});
