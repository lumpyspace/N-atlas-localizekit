import { useEffect, useRef, useState } from "react";
import { api, type LangCode } from "../api";
import { ChecksList, ContextPanels, HumanReview, ReplyBubble } from "../components/ResultView";
import { IconArrowRight, IconChat, IconUser } from "../icons";
import { newId, type PlaygroundEntry, reviewKey, useStore } from "../store";
import { Badge, Button, Card, CardHeader, Empty, ErrorNote, LANG_LABEL, LangPills, SampleTag, Spinner, VerdictBadge } from "../ui";

const EXAMPLES: { lang: LangCode; text: string }[] = [
  { lang: "en", text: "I transferred the money but my order still says unpaid. What should I do?" },
  { lang: "pid", text: "I don send the money since, but e never enter. Wetin I go do?" },
  { lang: "en", text: "How much is delivery to Port Harcourt and how long does it take?" },
  { lang: "pid", text: "Una dey open for Sunday?" },
];

export default function Playground() {
  const { sample, current, playground, addPlayground, clearPlayground, queued, setQueued } = useStore();
  const [message, setMessage] = useState("");
  const [language, setLanguage] = useState<LangCode>("en");
  const [pending, setPending] = useState<{ message: string; language: LangCode } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const sentQueued = useRef(false);

  const limit = sample?.limits.messageChars ?? 1000;
  const entry: PlaygroundEntry | undefined = playground.find((e) => e.id === selected) ?? playground[playground.length - 1];
  const lang = sample?.languages.find((l) => l.code === language);

  async function send(text: string, lng: LangCode) {
    if (!current || !text.trim() || pending) return;
    setPending({ message: text.trim(), language: lng });
    setError(null);
    try {
      const result = await api.ask({ message: text, language: lng, business: current.business, policy: current.policy });
      const id = newId();
      addPlayground({ id, message: text.trim(), language: lng, configVersion: current.version, result });
      setSelected(id);
      setMessage("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPending(null);
    }
  }

  // A message handed over from the Overview's "Try it now" box.
  useEffect(() => {
    if (queued && current && !sentQueued.current) {
      sentQueued.current = true;
      setLanguage(queued.language);
      void send(queued.message, queued.language);
      setQueued(null);
    }
  }, [queued, current]); // eslint-disable-line react-hooks/exhaustive-deps

  const shownMessage = pending?.message ?? entry?.message;
  const shownLang = pending?.language ?? entry?.language;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <div className="space-y-6">
        <Card className="overflow-hidden">
          <CardHeader
            icon={<IconChat className="h-4 w-4" />}
            title={current?.business.name ?? "Loading…"}
            sub="Customer-support assistant"
            right={<div className="flex gap-1.5"><SampleTag />{current && <Badge>config v{current.version}</Badge>}</div>}
          />

          {/* Conversation */}
          <div className="min-h-[220px] space-y-4 bg-slate-50/70 px-4 py-5 sm:px-5" aria-live="polite">
            {shownMessage ? (
              <>
                <div className="flex justify-end gap-3">
                  <div className="min-w-0 max-w-[85%]">
                    <div className="mb-1 text-right text-xs text-slate-500">
                      Customer · <span className="font-medium">{LANG_LABEL[shownLang!]}</span>
                    </div>
                    <div className="whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-night-900 px-4 py-2.5 text-[15px] leading-relaxed text-white">
                      {shownMessage}
                    </div>
                  </div>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-200 text-slate-600" aria-hidden><IconUser className="h-4 w-4" /></span>
                </div>
                {pending ? (
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-forge-600 text-[11px] font-bold text-white" aria-hidden>N</span>
                    <Spinner className="text-forge-600" /> N-ATLAS is answering… a sleeping GPU takes 2–3 minutes to start.
                  </div>
                ) : entry?.result.ok ? (
                  <ReplyBubble result={entry.result} />
                ) : entry ? (
                  <ErrorNote>{entry.result.error ?? "The request failed."}</ErrorNote>
                ) : null}
              </>
            ) : (
              <Empty title="Start a conversation" icon={<IconChat className="h-5 w-5" />}>
                Write what a customer would send. The reply comes live from N-ATLAS.
              </Empty>
            )}
          </div>

          {/* Composer */}
          <form onSubmit={(e) => { e.preventDefault(); void send(message, language); }} className="space-y-3 border-t border-slate-200 px-4 py-4 sm:px-5">
            {sample && <LangPills languages={sample.languages} value={language} onChange={setLanguage} />}
            {lang && !lang.officiallyListed && (
              <p className="text-xs text-amber-700">
                * NCAIR lists English, Yoruba, Hausa and Igbo for N-ATLAS. Pidgin is tested to measure how it copes, not because support is claimed.
              </p>
            )}
            <label className="block">
              <span className="sr-only">Customer message</span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) void send(message, language);
                }}
                maxLength={limit}
                rows={3}
                placeholder="e.g. Abeg how much una dey charge to deliver go Abuja?"
                className="w-full resize-y rounded-lg border-0 px-3 py-2.5 text-[15px] ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-forge-500"
              />
            </label>
            {error && <ErrorNote>{error}</ErrorNote>}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-slate-400">{message.length}/{limit} · Ctrl+Enter to send</span>
              <Button type="submit" disabled={!!pending || !message.trim() || !current}>
                {pending ? <><Spinner /> Waiting…</> : <>Send to N-ATLAS <IconArrowRight className="h-4 w-4" /></>}
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLES.map((x) => (
                <button
                  type="button"
                  key={x.text}
                  onClick={() => { setMessage(x.text); setLanguage(x.lang); }}
                  className="max-w-full truncate rounded-md bg-slate-100 px-2 py-1 text-left text-xs text-slate-600 hover:bg-slate-200"
                >
                  {x.text}
                </button>
              ))}
            </div>
          </form>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader title="Inspect this reply" sub="Checks, your review, and exactly what N-ATLAS was given." right={entry && !pending && <VerdictBadge verdict={entry.result.verdict} />} />
          <div className="space-y-4 px-5 py-4">
            {entry && !pending ? (
              <>
                <ChecksList result={entry.result} />
                {entry.result.ok && <HumanReview key={entry.id} reviewId={reviewKey("playground", entry.id)} />}
                <ContextPanels result={entry.result} />
              </>
            ) : (
              <p className="text-sm text-slate-500">{pending ? "Waiting for the reply…" : "Send a message to see the automated checks and the facts supplied."}</p>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="History"
            sub="Saved in this browser."
            right={playground.length > 0 && <Button variant="ghost" size="sm" onClick={clearPlayground}>Clear</Button>}
          />
          {playground.length === 0 ? (
            <p className="px-5 py-4 text-sm text-slate-500">No messages yet.</p>
          ) : (
            <ul className="scroll-thin max-h-80 divide-y divide-slate-100 overflow-auto">
              {[...playground].reverse().map((e) => (
                <li key={e.id}>
                  <button
                    onClick={() => setSelected(e.id)}
                    className={`flex w-full items-center gap-2.5 px-5 py-2.5 text-left text-sm hover:bg-slate-50 ${entry?.id === e.id ? "bg-slate-50" : ""}`}
                  >
                    <span className="w-9 shrink-0 font-mono text-[11px] text-slate-400">{e.language.toUpperCase()}</span>
                    <span className="min-w-0 flex-1 truncate text-slate-700">{e.message}</span>
                    <VerdictBadge verdict={e.result.verdict} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
