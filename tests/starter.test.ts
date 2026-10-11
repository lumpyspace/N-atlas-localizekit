import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import { SAMPLE_BUSINESS } from "../backend/src/localize/business.ts";
import { buildSystemPrompt as backendPrompt, DEFAULT_POLICY } from "../backend/src/localize/policy.ts";
// @ts-ignore: plain JS module shipped in the export
import { buildSystemPrompt, guardReply } from "../frontend/src/starter/core.mjs";
// @ts-ignore: plain JS module shipped in the export
import { createAssistantServer } from "../frontend/src/starter/server.mjs";

const B = SAMPLE_BUSINESS;

test("exported prompt matches the prompt LocalizeKit tests (apart from the canary)", () => {
  const tested = backendPrompt(DEFAULT_POLICY, B);
  const shipped = buildSystemPrompt(DEFAULT_POLICY, B, tested.canary);
  assert.equal(shipped.system, tested.system);
});

const built = buildSystemPrompt(DEFAULT_POLICY, B, "ATLAS-SENTINEL-TEST01");
const guard = (reply: string) => guardReply(reply, B, built, "ATLAS-SENTINEL-TEST01");

test("guardrail strips citations and echoed topic labels (real replies)", () => {
  assert.equal(guard("[F9] (Opening hours) Sunday: Closed.").reply, "Sunday: Closed.");
  assert.equal(guard("Yes, you can return the dress within 7 days of delivery. [F22] (Returns)").reply, "Yes, you can return the dress within 7 days of delivery.");
  assert.equal(guard("Delivery to Abuja costs ₦5,500 and takes 3–5 business days.").blocked, false);
});

test("guardrail blocks leaks and invented naira amounts", () => {
  assert.equal(guard("Code: ATLAS-SENTINEL-TEST01").blocked, true);
  const invented = guard("Delivery to Abuja is ₦2,000.");
  assert.equal(invented.blocked, true);
  assert.match(invented.reply, /support@asostyle\.example/);
});

async function listen(s: Server): Promise<string> {
  await new Promise<void>((r) => s.listen(0, "127.0.0.1", r));
  return `http://127.0.0.1:${(s.address() as AddressInfo).port}`;
}

test("starter server: chat, CORS allow-list, validation, guardrail, errors", async () => {
  let reply = "Delivery to Abuja costs ₦5,500. [F12]";
  let seen: any;
  const natlas = createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      seen = { auth: req.headers.authorization, body: JSON.parse(raw) };
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ choices: [{ message: { content: reply } }] }));
    });
  });
  const natlasUrl = await listen(natlas);
  const app = createAssistantServer(
    { endpoint: `${natlasUrl}/v1`, apiKey: "test-key", model: "NCAIR1/N-ATLaS", timeoutMs: 5000, port: 0, allowedOrigins: ["https://shop.example"], ratePerMinute: 5 },
    { business: B, policy: DEFAULT_POLICY, files: { "/widget.js": ["text/javascript", "//widget"] } },
  );
  const base = await listen(app);
  const post = (body: unknown, headers: Record<string, string> = {}) =>
    fetch(`${base}/api/chat`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });

  try {
    // Happy path, from an allowed website.
    let r = await post({ message: "How much to Abuja?", history: [{ role: "user", content: "hi" }, { role: "assistant", content: "Hello" }] }, { origin: "https://shop.example" });
    assert.equal(r.status, 200);
    assert.equal(r.headers.get("access-control-allow-origin"), "https://shop.example");
    assert.deepEqual(await r.json(), { reply: "Delivery to Abuja costs ₦5,500.", blocked: false });
    assert.equal(seen.auth, "Bearer test-key");
    assert.equal(seen.body.messages[0].role, "system");
    assert.equal(seen.body.messages.length, 4);

    // A website that is not on the allow-list.
    r = await post({ message: "hi" }, { origin: "https://evil.example" });
    assert.equal(r.status, 403);

    // Validation.
    assert.equal((await post({ message: "" })).status, 400);
    assert.equal((await post({ message: "x".repeat(1001) })).status, 400);

    // Guardrail: invented amount is replaced before the customer sees it.
    reply = "Delivery is only ₦100 today!";
    const g = await (await post({ message: "price?" })).json();
    assert.equal(g.blocked, true);
    assert.doesNotMatch(g.reply, /₦100/);

    // Rate limit: 5 per minute. Four requests above counted (the blocked origin is rejected first).
    assert.equal((await post({ message: "fifth" })).status, 200);
    assert.equal((await post({ message: "sixth" })).status, 429);

    // Static widget file.
    const w = await fetch(`${base}/widget.js`);
    assert.equal(await w.text(), "//widget");
  } finally {
    app.close();
    natlas.close();
  }
});

test("starter server: N-ATLAS down gives a clear 502, not a crash", async () => {
  const app = createAssistantServer(
    { endpoint: "http://127.0.0.1:9/v1", apiKey: "", model: "m", timeoutMs: 2000, port: 0, allowedOrigins: [], ratePerMinute: 10 },
    { business: B, policy: DEFAULT_POLICY },
  );
  const base = await listen(app);
  try {
    const r = await fetch(`${base}/api/chat`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: "hi" }) });
    assert.equal(r.status, 502);
    assert.match((await r.json()).error, /unavailable/);
  } finally {
    app.close();
  }
});
