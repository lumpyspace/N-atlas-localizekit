/**
 * The business a LocalizeKit assistant answers for, and how its configuration
 * becomes a numbered fact sheet supplied to N-ATLAS.
 *
 * The sample (AsoStyle Boutique) is FICTIONAL. Every price, address and phone
 * number below is invented for testing and is labelled as such in the UI.
 */

export interface DeliveryZone {
  zone: string;
  fee: number; // naira
  time: string;
}

export interface Faq {
  q: string;
  a: string;
}

export interface BusinessConfig {
  name: string;
  description: string;
  hours: Record<string, string>; // day -> "9:00am – 6:00pm" | "Closed"
  location: string;
  delivery: {
    zones: DeliveryZone[];
    freeDeliveryRule: string;
    notes: string;
  };
  payments: string[];
  orderProcessing: string[];
  returns: {
    windowDays: number;
    conditions: string[];
    refunds: string;
    exclusions: string[];
  };
  contact: {
    whatsapp: string;
    email: string;
    humanHours: string;
  };
  escalation: string[];
  limits: string[];
  faqs: Faq[];
}

export const SAMPLE_BUSINESS: BusinessConfig = {
  name: "AsoStyle Boutique",
  description:
    "a fictional Lagos clothing retailer selling ready-to-wear and custom-tailored Nigerian fashion",
  hours: {
    Monday: "9:00am – 6:00pm",
    Tuesday: "9:00am – 6:00pm",
    Wednesday: "9:00am – 6:00pm",
    Thursday: "9:00am – 6:00pm",
    Friday: "9:00am – 6:00pm",
    Saturday: "10:00am – 4:00pm",
    Sunday: "Closed",
  },
  location: "Shop 4, Example Plaza, Lekki, Lagos (fictional address)",
  delivery: {
    zones: [
      { zone: "Lagos Mainland", fee: 3000, time: "1–2 business days" },
      { zone: "Lagos Island", fee: 3500, time: "1–2 business days" },
      { zone: "Abuja", fee: 5500, time: "3–5 business days" },
      { zone: "Port Harcourt", fee: 6000, time: "3–5 business days" },
      { zone: "Other Nigerian states", fee: 7000, time: "4–7 business days" },
    ],
    freeDeliveryRule: "Free delivery within Lagos for orders of ₦100,000 or more.",
    notes: "We do not deliver outside Nigeria.",
  },
  payments: [
    "Bank transfer",
    "Debit card through the website checkout",
    "Pay on delivery — Lagos only, for orders under ₦50,000",
  ],
  orderProcessing: [
    "Ready-to-wear orders confirmed before 12 noon are dispatched the same business day.",
    "Custom-tailored orders take 7–10 business days before dispatch.",
  ],
  returns: {
    windowDays: 7,
    conditions: [
      "Items must be unworn, unwashed and have their tags attached.",
      "Exchanges for a different size are allowed within the return window.",
      "The customer pays return delivery unless the item arrived damaged or wrong.",
    ],
    refunds:
      "Refunds go back to the original payment method within 5–7 business days after the returned item is received and inspected.",
    exclusions: ["Custom-tailored items cannot be returned or refunded."],
  },
  contact: {
    whatsapp: "0800 000 0000 (fictional number)",
    email: "support@asostyle.example",
    humanHours: "A human agent replies during opening hours, Monday to Saturday.",
  },
  escalation: [
    "Damaged, faulty or wrong items",
    "Payment deducted but no order confirmation",
    "Complaints or requests to speak to a person",
  ],
  limits: [
    "The assistant cannot check order status or tracking.",
    "The assistant cannot process, approve or confirm refunds.",
    "The assistant cannot see customer accounts or other customers' details.",
  ],
  faqs: [
    {
      q: "What sizes do you stock?",
      a: "Ready-to-wear comes in sizes S to XXL. Custom tailoring is available from your measurements.",
    },
    {
      q: "Do you take aso-ebi group orders?",
      a: "Yes. Group orders need a minimum of 6 pieces and get a 10% discount.",
    },
    {
      q: "How should I care for the fabrics?",
      a: "Hand wash cold or dry clean. Do not bleach.",
    },
  ],
};

export interface Fact {
  id: string; // F1, F2, ...
  topic: string;
  text: string;
}

const naira = (n: number) => `₦${n.toLocaleString("en-US")}`;

/** Flatten the configuration into short, numbered, citable facts. */
export function toFacts(b: BusinessConfig): Fact[] {
  const out: Omit<Fact, "id">[] = [];
  const add = (topic: string, text: string) => text.trim() && out.push({ topic, text: text.trim() });

  add("About", `${b.name} is ${b.description}.`);
  add("Location", `Location: ${b.location}.`);
  for (const [day, h] of Object.entries(b.hours)) add("Opening hours", `${day}: ${h}.`);
  for (const z of b.delivery.zones) {
    add("Delivery", `Delivery to ${z.zone} costs ${naira(z.fee)} and takes ${z.time}.`);
  }
  add("Delivery", b.delivery.freeDeliveryRule);
  add("Delivery", b.delivery.notes);
  for (const p of b.payments) add("Payment", `Accepted payment: ${p}.`);
  for (const p of b.orderProcessing) add("Order processing", p);
  add("Returns", `Returns are accepted within ${b.returns.windowDays} days of delivery.`);
  for (const c of b.returns.conditions) add("Returns", c);
  add("Refunds", b.returns.refunds);
  for (const e of b.returns.exclusions) add("Returns", e);
  add(
    "Contact",
    `Contact a human: WhatsApp ${b.contact.whatsapp}, email ${b.contact.email}. ${b.contact.humanHours}`,
  );
  add("Escalate to a human", `Send these to a human agent: ${b.escalation.join("; ")}.`);
  for (const l of b.limits) add("Assistant limits", l);
  for (const f of b.faqs) add("FAQ", `Q: ${f.q} A: ${f.a}`);

  return out.map((f, i) => ({ id: `F${i + 1}`, ...f }));
}

/** Every naira amount the configuration states — used to spot invented figures. */
export function knownAmounts(b: BusinessConfig): Set<number> {
  const amounts = new Set<number>();
  for (const f of toFacts(b)) for (const n of extractAmounts(f.text)) amounts.add(n);
  return amounts;
}

/**
 * Naira amounts mentioned in text: "₦5,500", "N5500", "5,500 naira", "5500NGN".
 * Plain numbers without a currency marker are ignored (they are usually days or sizes).
 */
export function extractAmounts(text: string): number[] {
  const found: number[] = [];
  const re =
    /(?:₦|\bN|\bNGN\s?)\s?(\d{1,3}(?:[,\s]\d{3})+|\d+)(?:\.\d+)?|(\d{1,3}(?:,\d{3})+|\d+)\s?(?:naira|NGN)\b/gi;
  for (const m of text.matchAll(re)) {
    const raw = (m[1] ?? m[2] ?? "").replace(/[,\s]/g, "");
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) found.push(n);
  }
  return found;
}

/**
 * Light keyword retrieval: which facts share words with the question.
 * The FULL fact sheet is always supplied to the model (it is small); this only
 * highlights the facts most likely to matter, for the developer's inspection.
 * Keyword overlap works poorly for Yoruba/Hausa/Igbo questions — the UI says so.
 */
export function matchFacts(question: string, facts: Fact[], limit = 5): string[] {
  const words = tokenize(question).filter((w) => !STOP.has(w));
  if (!words.length) return [];
  const scored = facts
    .map((f) => {
      const ft = new Set(tokenize(`${f.topic} ${f.text}`));
      const score = words.reduce((s, w) => s + (ft.has(w) ? 1 : 0), 0);
      return { id: f.id, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((x) => x.id);
}

function tokenize(s: string): string[] {
  return s
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "")
    .toLowerCase()
    .match(/[\p{L}\p{N}]+/gu)
    ?.map((w) => (w.length > 4 && w.endsWith("s") ? w.slice(0, -1) : w)) ?? [];
}

const STOP = new Set(
  "a an the is are am be to of in on for and or i you we it my your our do does can how what when where which who abeg una dey na me abi o".split(
    " ",
  ),
);
