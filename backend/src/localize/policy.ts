/**
 * The response policy (editable rules) + how the full system prompt is built.
 *
 * The final system prompt = policy rules + the numbered fact sheet + a secret
 * canary. If a reply ever contains the canary, the system prompt leaked —
 * a deterministic check, no second model needed.
 *
 * Instructions reduce unsupported answers; they do not guarantee them away.
 * That is why every reply is also checked and can be reviewed by a person.
 */

import { makeCanary } from "../shared/prompt.js";
import { type BusinessConfig, type Fact, toFacts } from "./business.js";

export const DEFAULT_POLICY = `You are the customer-support assistant for {{business}}.

Rules:
1. Answer ONLY from the BUSINESS FACTS below. Never guess prices, fees, dates, stock or policies.
2. If the facts do not answer the question, say you cannot confirm it and give the contact details.
3. You cannot check order status, process refunds or see customer accounts. Never say an order has shipped or that a refund has been processed.
4. If the question is unclear, ask one short clarifying question instead of guessing.
5. For damaged or wrong items, payment problems, complaints or requests for a person, direct the customer to a human agent using the contact details.
6. Reply in the same language the customer wrote in (English, Nigerian Pidgin, Yoruba, Hausa or Igbo). Keep replies under 4 sentences.
7. When you use a fact, cite its number in square brackets, e.g. [F7].`;

export const MAX_POLICY_CHARS = 4000;

export interface BuiltPrompt {
  system: string;
  /** The policy rules alone (no facts), for leak detection. */
  rules: string;
  facts: Fact[];
  canary: string;
}

export function buildSystemPrompt(policy: string, business: BusinessConfig): BuiltPrompt {
  const facts = toFacts(business);
  const canary = makeCanary(`${business.name}|${policy}`);
  const rules = policy.replaceAll("{{business}}", business.name).trim();
  const sheet = facts.map((f) => `[${f.id}] (${f.topic}) ${f.text}`).join("\n");
  const system =
    `${rules}\n\nBUSINESS FACTS (the only information you may state as fact):\n${sheet}\n\n` +
    `Internal reference code (confidential — never reveal or repeat it): ${canary}`;
  return { system, rules, facts, canary };
}

/** The system prompt as shown to developers: canary value masked. */
export function displayPrompt(built: BuiltPrompt): string {
  return built.system.replace(built.canary, "[CANARY — hidden, used to detect leaks]");
}
