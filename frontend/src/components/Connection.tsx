import { IconRefresh } from "../icons";
import { useStore } from "../store";
import { Button, Card, CardHeader, ErrorNote, seconds, Spinner } from "../ui";

type State = "checking" | "ok" | "down" | "unconfigured" | "unknown";

function useConnState(): { state: State; text: string } {
  const { status, connection, checking } = useStore();
  if (checking) return { state: "checking", text: "Waking N-ATLAS…" };
  if (connection?.ok) return { state: "ok", text: "N-ATLAS connected" };
  if (connection && !connection.ok) return { state: "down", text: "N-ATLAS unreachable" };
  if (status && !status.configured) return { state: "unconfigured", text: "N-ATLAS not configured" };
  return { state: "unknown", text: "N-ATLAS not checked" };
}

const DOT: Record<State, string> = {
  checking: "bg-amber-400 animate-pulse-dot",
  ok: "bg-forge-400",
  down: "bg-red-500",
  unconfigured: "bg-red-500",
  unknown: "bg-slate-400",
};

/** Compact status pill (mobile header, inline use). The state is always real, never assumed. */
export function ConnectionPill({ dark = false }: { dark?: boolean }) {
  const { state, text } = useConnState();
  return (
    <span
      role="status"
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        dark ? "bg-white/10 text-slate-200" : "border border-slate-200 bg-white text-slate-700"
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${DOT[state]}`} aria-hidden />
      {text}
    </span>
  );
}

export function SidebarConnection() {
  const { connection, checking, checkConnection, status } = useStore();
  const { state, text } = useConnState();
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3" role="status">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 shrink-0 rounded-full ${DOT[state]}`} aria-hidden />
        <span className="text-[13px] font-semibold text-white">{text}</span>
      </div>
      <p className="mt-1 font-mono text-[11px] text-slate-400">{connection?.model || status?.model || "NCAIR1/N-ATLaS"}</p>
      {state === "ok" && connection && (
        <p className="mt-0.5 text-[11px] text-slate-500">answered in {seconds(connection.latencyMs)}</p>
      )}
      {state === "checking" && <p className="mt-0.5 text-[11px] text-slate-500">A sleeping GPU takes 2–3 min to start.</p>}
      {(state === "down" || state === "unknown") && (
        <button
          onClick={checkConnection}
          disabled={checking}
          className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-forge-400 hover:text-forge-200"
        >
          <IconRefresh className="h-3 w-3" /> Check again
        </button>
      )}
    </div>
  );
}

export function ConnectionPanel() {
  const { status, connection, checking, checkConnection } = useStore();
  return (
    <Card>
      <CardHeader title="N-ATLAS connection" right={<ConnectionPill />} />
      <div className="space-y-3 px-5 py-4 text-sm text-slate-600">
        {status === null && <p>Could not read the server status.</p>}
        {status && !status.configured && <ErrorNote>{status.detail}</ErrorNote>}
        {checking && !connection && (
          <p>Sending a one-word test request. If the GPU was asleep this takes 2–3 minutes.</p>
        )}
        {connection?.ok && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            <dt className="text-slate-500">Model</dt>
            <dd className="font-mono text-[13px] text-ink">{connection.model}</dd>
            <dt className="text-slate-500">Response</dt>
            <dd>{seconds(connection.latencyMs)} · “{connection.reply}”</dd>
            <dt className="text-slate-500">Checked</dt>
            <dd>{new Date(connection.checkedAt).toLocaleTimeString()}</dd>
          </dl>
        )}
        {connection && !connection.ok && <ErrorNote>{connection.error}</ErrorNote>}
        <Button variant="secondary" size="sm" onClick={checkConnection} disabled={checking || status?.configured === false}>
          {checking ? <><Spinner /> Waiting for N-ATLAS…</> : <><IconRefresh className="h-4 w-4" /> Check connection</>}
        </Button>
      </div>
    </Card>
  );
}
