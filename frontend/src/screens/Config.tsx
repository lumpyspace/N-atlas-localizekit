import { useEffect, useState } from "react";
import type { BusinessConfig } from "../api";
import { useStore } from "../store";
import { Badge, Button, Card, CardHeader, ErrorNote, SampleTag } from "../ui";

const lines = (a: string[]) => a.join("\n");
const unlines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

const input = "w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm focus:border-forge-500 focus:outline-none";

export default function Config() {
  const { current, versions, saveConfig, resetConfig } = useStore();
  const [b, setB] = useState<BusinessConfig | null>(current?.business ?? null);
  const [policy, setPolicy] = useState(current?.policy ?? "");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (current) {
      setB(structuredClone(current.business));
      setPolicy(current.policy);
    }
  }, [current]);

  if (!b || !current) return null;
  const dirty = JSON.stringify(b) !== JSON.stringify(current.business) || policy !== current.policy;
  const up = (patch: Partial<BusinessConfig>) => setB({ ...b, ...patch });

  function save() {
    if (!b) return;
    if (!b.name.trim()) return setError("Business name is required.");
    if (b.delivery.zones.some((z) => !z.zone.trim() || !(z.fee >= 0))) return setError("Every delivery zone needs a name and a fee of 0 or more.");
    if (!policy.trim()) return setError("The response policy cannot be empty.");
    if (policy.length > 4000) return setError("The response policy is too long (max 4,000 characters).");
    setError(null);
    saveConfig(b, policy, note.trim());
    setNote("");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-6">
        <Card>
          <CardHeader
            title="Business facts"
            sub="The assistant may only state what is here. Each line becomes a numbered fact sent to N-ATLAS."
            right={<SampleTag />}
          />
          <div className="space-y-5 px-5 py-4">
            <Row label="Business name"><input className={input} value={b.name} onChange={(e) => up({ name: e.target.value })} /></Row>
            <Row label="Description"><input className={input} value={b.description} onChange={(e) => up({ description: e.target.value })} /></Row>
            <Row label="Location"><input className={input} value={b.location} onChange={(e) => up({ location: e.target.value })} /></Row>

            <Section title="Opening hours">
              <div className="grid gap-2 sm:grid-cols-2">
                {Object.entries(b.hours).map(([day, h]) => (
                  <label key={day} className="flex items-center gap-2 text-sm">
                    <span className="w-24 text-slate-600">{day}</span>
                    <input className={input} value={h} onChange={(e) => up({ hours: { ...b.hours, [day]: e.target.value } })} />
                  </label>
                ))}
              </div>
            </Section>

            <Section title="Delivery zones">
              <div className="space-y-2">
                {b.delivery.zones.map((z, i) => (
                  <div key={i} className="grid grid-cols-[1fr_110px] gap-2 sm:grid-cols-[1fr_120px_1fr_auto]">
                    <input aria-label="Zone" className={input} value={z.zone} onChange={(e) => setZone(i, { zone: e.target.value })} />
                    <label className="flex items-center gap-1 text-sm">₦
                      <input aria-label="Fee in naira" type="number" min={0} className={input} value={z.fee} onChange={(e) => setZone(i, { fee: Number(e.target.value) })} />
                    </label>
                    <input aria-label="Delivery time" className={input} value={z.time} onChange={(e) => setZone(i, { time: e.target.value })} />
                    <Button variant="ghost" size="sm" onClick={() => up({ delivery: { ...b.delivery, zones: b.delivery.zones.filter((_, j) => j !== i) } })}>Remove</Button>
                  </div>
                ))}
                <Button variant="secondary" size="sm" onClick={() => up({ delivery: { ...b.delivery, zones: [...b.delivery.zones, { zone: "", fee: 0, time: "" }] } })}>Add zone</Button>
              </div>
              <Row label="Free delivery rule"><input className={input} value={b.delivery.freeDeliveryRule} onChange={(e) => up({ delivery: { ...b.delivery, freeDeliveryRule: e.target.value } })} /></Row>
              <Row label="Delivery notes"><input className={input} value={b.delivery.notes} onChange={(e) => up({ delivery: { ...b.delivery, notes: e.target.value } })} /></Row>
            </Section>

            <Section title="Payments, orders and returns">
              <Lines label="Accepted payments (one per line)" value={b.payments} onChange={(v) => up({ payments: v })} />
              <Lines label="Order processing (one per line)" value={b.orderProcessing} onChange={(v) => up({ orderProcessing: v })} />
              <Row label="Return window (days)">
                <input type="number" min={0} className={`${input} max-w-[120px]`} value={b.returns.windowDays} onChange={(e) => up({ returns: { ...b.returns, windowDays: Number(e.target.value) } })} />
              </Row>
              <Lines label="Return conditions" value={b.returns.conditions} onChange={(v) => up({ returns: { ...b.returns, conditions: v } })} />
              <Row label="Refunds"><input className={input} value={b.returns.refunds} onChange={(e) => up({ returns: { ...b.returns, refunds: e.target.value } })} /></Row>
              <Lines label="Return exclusions" value={b.returns.exclusions} onChange={(v) => up({ returns: { ...b.returns, exclusions: v } })} />
            </Section>

            <Section title="Contact and escalation">
              <div className="grid gap-3 sm:grid-cols-2">
                <Row label="WhatsApp"><input className={input} value={b.contact.whatsapp} onChange={(e) => up({ contact: { ...b.contact, whatsapp: e.target.value } })} /></Row>
                <Row label="Email"><input className={input} value={b.contact.email} onChange={(e) => up({ contact: { ...b.contact, email: e.target.value } })} /></Row>
              </div>
              <Row label="When a human replies"><input className={input} value={b.contact.humanHours} onChange={(e) => up({ contact: { ...b.contact, humanHours: e.target.value } })} /></Row>
              <Lines label="Send to a human when…" value={b.escalation} onChange={(v) => up({ escalation: v })} />
              <Lines label="What the assistant cannot do" value={b.limits} onChange={(v) => up({ limits: v })} />
            </Section>

            <Section title="FAQs">
              {b.faqs.map((f, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
                  <input aria-label="Question" className={input} value={f.q} onChange={(e) => setFaq(i, { q: e.target.value })} />
                  <input aria-label="Answer" className={input} value={f.a} onChange={(e) => setFaq(i, { a: e.target.value })} />
                  <Button variant="ghost" size="sm" onClick={() => up({ faqs: b.faqs.filter((_, j) => j !== i) })}>Remove</Button>
                </div>
              ))}
              <Button variant="secondary" size="sm" onClick={() => up({ faqs: [...b.faqs, { q: "", a: "" }] })}>Add FAQ</Button>
            </Section>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Response policy"
            sub="The rules N-ATLAS is told to follow. {{business}} is replaced with the business name. Rules lower the risk of invented answers; they do not guarantee it."
          />
          <div className="px-5 py-4">
            <textarea
              aria-label="Response policy"
              value={policy}
              onChange={(e) => setPolicy(e.target.value)}
              rows={12}
              maxLength={4000}
              className={`${input} font-mono text-[13px] leading-relaxed`}
            />
            <p className="mt-1 text-xs text-slate-500">
              {policy.length}/4000. The fact sheet and a hidden canary code (used to detect leaks) are appended automatically.
            </p>
          </div>
        </Card>
      </div>

      <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <Card>
          <CardHeader title={`Version ${current.version}`} right={dirty ? <Badge tone="amber">Unsaved changes</Badge> : <Badge tone="green">Saved</Badge>} />
          <div className="space-y-3 px-5 py-4">
            <label className="block text-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">What changed?</span>
              <input className={`${input} mt-1`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} placeholder="e.g. Added rule against free-delivery promises" />
            </label>
            {error && <ErrorNote>{error}</ErrorNote>}
            <Button onClick={save} disabled={!dirty} className="w-full">Save as version {current.version + 1}</Button>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={!dirty} onClick={() => { setB(structuredClone(current.business)); setPolicy(current.policy); }}>Discard</Button>
              <Button variant="ghost" size="sm" onClick={resetConfig}>Reset to sample</Button>
            </div>
            <p className="text-xs text-slate-500">Saved versions apply to the next playground message or test run. Rerun the suite to compare.</p>
          </div>
        </Card>
        <Card>
          <CardHeader title="History" />
          <ul className="max-h-72 divide-y divide-slate-100 overflow-auto text-sm">
            {[...versions].reverse().map((v) => (
              <li key={v.version} className="px-5 py-2">
                <span className="font-medium text-ink">v{v.version}</span> <span className="text-slate-600">{v.note}</span>
                <div className="text-xs text-slate-400">{new Date(v.savedAt).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );

  function setZone(i: number, patch: Partial<BusinessConfig["delivery"]["zones"][number]>) {
    up({ delivery: { ...b!.delivery, zones: b!.delivery.zones.map((z, j) => (j === i ? { ...z, ...patch } : z)) } });
  }
  function setFaq(i: number, patch: Partial<BusinessConfig["faqs"][number]>) {
    up({ faqs: b!.faqs.map((f, j) => (j === i ? { ...f, ...patch } : f)) });
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3 border-t border-slate-100 pt-4">
      <legend className="pr-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</legend>
      {children}
    </fieldset>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function Lines({ label, value, onChange }: { label: string; value: string[]; onChange: (v: string[]) => void }) {
  const [text, setText] = useState(lines(value));
  useEffect(() => setText(lines(value)), [value.join("\n")]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Row label={label}>
      <textarea
        className={input}
        rows={Math.max(2, value.length)}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => onChange(unlines(text))}
      />
    </Row>
  );
}
