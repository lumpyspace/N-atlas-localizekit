import { useState } from "react";
import { api, type LangCode } from "../api";
import { ResultView } from "../components/ResultView";
import { newId, reviewKey, useStore } from "../store";
import { Badge, Button, Card, CardHeader, Empty, ErrorNote, SampleTag, Spinner, VerdictBadge } from "../ui";

const EXAMPLES: { lang: LangCode; text: string }[] = [
  { lang: "en", text: "I transferred the money but my order still says unpaid. What should I do?" },
  { lang: "pid", text: "I don send the money since, but e never enter. Wetin I go do?" },
  { lang: "en", text: "How much is delivery to Port Harcourt and how long does it take?" },
  { lang: "pid", text: "Una dey open for Sunday?" },
];

export default function Playground() {
  const { sample, current, playground, addPlayground, clearPlayground } = useStore();
  const [message, setMessage] = useState("");
  const [language, setLanguage] = useState<LangCode>("en");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const limit = sample?.limits.messageChars ?? 1000;
  const entry = playground.find((e) => e.id === selected) ?? playground[playground.length - 1];
  const lang = sample?.languages.find((l) => l.code === language);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!current || !message.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.ask({ message, language, business: current.business, policy: current.policy });
      const id = newId();
      addPlayground({ id, message: message.trim(), language, configVersion: current.version, result });
      setSelected(id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="space-y-6">
        <Card>
          <CardHeader title="Customer message" sub="Type what a customer would send. It goes to N-ATLAS with the business facts and policy." />
          <form onSubmit={submit} className="space-y-4 px-5 py-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Business</span>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium text-ink">{current?.business.name ?? "Loading…"}</span>
                <SampleTag />
                {current && <Badge>config v{current.version}</Badge>}
              </div>
            </div>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Language / test category</span>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as LangCode)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-forge-500 focus:outline-none"
              >
                {sample?.languages.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}{l.officiallyListed ? "" : " — test category, not an officially listed N-ATLAS language"}
                  </option>
                ))}
              </select>
              {lang && !lang.officiallyListed && (
                <span className="mt-1 block text-xs text-amber-700">
                  NCAIR lists English, Yoruba, Hausa and Igbo for N-ATLAS. Pidgin is tested here to measure how well it copes, not because support is claimed.
                </span>
              )}
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Message</span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={limit}
                rows={4}
                placeholder="e.g. Abeg how much una dey charge to deliver go Abuja?"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-[15px] focus:border-forge-500 focus:outline-none"
              />
              <span className="block text-right text-xs text-slate-400">{message.length}/{limit}</span>
            </label>
            {error && <ErrorNote>{error}</ErrorNote>}
            <Button type="submit" disabled={busy || !message.trim() || !current} className="w-full sm:w-auto">
              {busy ? <><Spinner /> Waiting for N-ATLAS…</> : "Send to N-ATLAS"}
            </Button>
            {busy && <p className="text-xs text-slate-500">If the GPU was asleep this can take a few minutes the first time.</p>}
            <div>
              <span className="text-xs text-slate-500">Examples:</span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {EXAMPLES.map((x) => (
                  <button
                    type="button"
                    key={x.text}
                    onClick={() => { setMessage(x.text); setLanguage(x.lang); }}
                    className="rounded-md border border-slate-200 px-2 py-1 text-left text-xs text-slate-600 hover:bg-slate-50"
                  >
                    {x.text}
                  </button>
                ))}
              </div>
            </div>
          </form>
        </Card>

        <Card>
          <CardHeader
            title="History"
            sub="Saved in this browser."
            right={playground.length > 0 && <Button variant="ghost" size="sm" onClick={clearPlayground}>Clear</Button>}
          />
          {playground.length === 0 ? (
            <div className="p-5"><Empty title="No messages yet" /></div>
          ) : (
            <ul className="max-h-80 divide-y divide-slate-100 overflow-auto">
              {[...playground].reverse().map((e) => (
                <li key={e.id}>
                  <button
                    onClick={() => setSelected(e.id)}
                    className={`flex w-full items-center gap-2 px-5 py-2.5 text-left text-sm hover:bg-slate-50 ${entry?.id === e.id ? "bg-slate-50" : ""}`}
                  >
                    <Badge>{e.language}</Badge>
                    <span className="min-w-0 flex-1 truncate text-slate-700">{e.message}</span>
                    <VerdictBadge verdict={e.result.verdict} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="self-start">
        <CardHeader title="N-ATLAS reply" sub={entry ? `“${entry.message}”` : undefined} />
        <div className="px-5 py-4">
          {entry ? (
            <ResultView
              key={entry.id}
              result={entry.result}
              facts={[]}
              reviewId={reviewKey("playground", entry.id)}
            />
          ) : (
            <Empty title="Nothing sent yet">Send a message to see the real reply, the checks and the facts N-ATLAS was given.</Empty>
          )}
        </div>
      </Card>
    </div>
  );
}
