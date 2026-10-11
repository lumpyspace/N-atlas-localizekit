import { useStore } from "../store";
import { Badge, Button, Card, CardHeader, ErrorNote, seconds, Spinner } from "../ui";

/** Header pill: the real state of the N-ATLAS connection, never assumed. */
export function ConnectionPill() {
  const { status, connection, checking } = useStore();
  if (checking) return <Badge tone="slate"><Spinner className="h-3 w-3" /> Checking N-ATLAS…</Badge>;
  if (connection?.ok) return <Badge tone="green">● N-ATLAS connected</Badge>;
  if (connection && !connection.ok) return <Badge tone="red">● N-ATLAS unreachable</Badge>;
  if (status && !status.configured) return <Badge tone="red">● N-ATLAS not configured</Badge>;
  return <Badge tone="slate">● N-ATLAS not checked yet</Badge>;
}

export function ConnectionPanel() {
  const { status, connection, checking, checkConnection } = useStore();
  return (
    <Card>
      <CardHeader title="N-ATLAS connection" right={<ConnectionPill />} />
      <div className="space-y-3 px-5 py-4 text-sm text-slate-600">
        {status === null && <p>Could not read the server status.</p>}
        {status && !status.configured && <ErrorNote>{status.detail}</ErrorNote>}
        {status?.configured && !connection && (
          <p>An N-ATLAS endpoint is configured. Send a one-word test request to confirm it answers.</p>
        )}
        {connection?.ok && (
          <p>
            <strong className="text-ink">{connection.model}</strong> answered in {seconds(connection.latencyMs)} at{" "}
            {new Date(connection.checkedAt).toLocaleTimeString()}. Reply: “{connection.reply}”
          </p>
        )}
        {connection && !connection.ok && <ErrorNote>{connection.error}</ErrorNote>}
        <p className="text-xs text-slate-500">
          The model runs on a GPU that sleeps when idle. The first request after a pause can take a few minutes while it starts.
        </p>
        <Button variant="secondary" size="sm" onClick={checkConnection} disabled={checking || status?.configured === false}>
          {checking ? <><Spinner /> Waiting for N-ATLAS…</> : "Check connection"}
        </Button>
      </div>
    </Card>
  );
}
