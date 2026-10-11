/**
 * App state: the editable business configuration (versioned), test runs,
 * human reviews and playground history. Saved in this browser's localStorage
 * so work survives a reload; nothing is sent anywhere except to the backend
 * when a request is made.
 */

import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api, type AskResult, type BusinessConfig, type ConnectionCheck, type LangCode, type Sample, type Status, type TestCase } from "./api";

export interface ConfigVersion {
  version: number;
  savedAt: string;
  note: string;
  business: BusinessConfig;
  policy: string;
}

export interface Run {
  id: string;
  startedAt: string;
  finishedAt?: string;
  configVersion: number;
  caseIds: string[];
  results: Record<string, AskResult>;
  stopped?: boolean;
}

export type HumanVerdict = "correct" | "incorrect" | "unsure";
export interface Review { verdict: HumanVerdict; note: string; at: string }

export interface PlaygroundEntry {
  id: string;
  message: string;
  language: LangCode;
  configVersion: number;
  result: AskResult;
}

interface Persisted {
  versions: ConfigVersion[];
  runs: Run[];
  reviews: Record<string, Review>;
  playground: PlaygroundEntry[];
}

const KEY = "localizekit:v1";

function load(): Persisted | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Persisted) : null;
  } catch {
    return null;
  }
}

function save(p: Persisted) {
  // Capped so a busy session stays well under the browser's storage quota.
  const data: Persisted = {
    versions: p.versions.slice(-20),
    runs: p.runs.slice(-10),
    reviews: p.reviews,
    playground: p.playground.slice(-40),
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Storage full or blocked: the app keeps working for this session.
  }
}

export const reviewKey = (scope: string, id: string) => `${scope}:${id}`;

interface StoreValue {
  sample: Sample | null;
  loadError: string | null;
  current: ConfigVersion | null;
  versions: ConfigVersion[];
  saveConfig: (business: BusinessConfig, policy: string, note: string) => void;
  resetConfig: () => void;

  status: Status | null;
  connection: ConnectionCheck | null;
  checking: boolean;
  checkConnection: () => Promise<void>;

  runs: Run[];
  running: Run | null;
  runCases: (cases: TestCase[]) => Promise<void>;
  stopRun: () => void;
  clearRuns: () => void;

  reviews: Record<string, Review>;
  setReview: (key: string, review: Review | null) => void;

  playground: PlaygroundEntry[];
  addPlayground: (e: PlaygroundEntry) => void;
  clearPlayground: () => void;
}

const Ctx = createContext<StoreValue | null>(null);

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore outside StoreProvider");
  return v;
}

export const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [sample, setSample] = useState<Sample | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [persisted, setPersisted] = useState<Persisted>(() => load() ?? { versions: [], runs: [], reviews: {}, playground: [] });
  const [status, setStatus] = useState<Status | null>(null);
  const [connection, setConnection] = useState<ConnectionCheck | null>(null);
  const [checking, setChecking] = useState(false);
  const [running, setRunning] = useState<Run | null>(null);
  const stopRef = useRef(false);

  useEffect(() => save(persisted), [persisted]);

  useEffect(() => {
    api.sample()
      .then((s) => {
        setSample(s);
        setPersisted((p) =>
          p.versions.length
            ? p
            : { ...p, versions: [{ version: 1, savedAt: new Date().toISOString(), note: "Sample configuration", business: s.business, policy: s.policy }] },
        );
      })
      .catch((e) => setLoadError(e.message));
    api.status().then(setStatus).catch(() => setStatus(null));
  }, []);

  const current = persisted.versions[persisted.versions.length - 1] ?? null;

  const saveConfig = useCallback((business: BusinessConfig, policy: string, note: string) => {
    setPersisted((p) => {
      const last = p.versions[p.versions.length - 1];
      const version = (last?.version ?? 0) + 1;
      return { ...p, versions: [...p.versions, { version, savedAt: new Date().toISOString(), note: note || `Version ${version}`, business, policy }] };
    });
  }, []);

  const resetConfig = useCallback(() => {
    if (sample) saveConfig(sample.business, sample.policy, "Reset to the sample configuration");
  }, [sample, saveConfig]);

  const checkConnection = useCallback(async () => {
    setChecking(true);
    try {
      setConnection(await api.checkConnection());
    } catch (e: any) {
      setConnection({ ok: false, model: status?.model ?? "", latencyMs: 0, reply: "", error: e.message, checkedAt: new Date().toISOString() });
    } finally {
      setChecking(false);
    }
  }, [status]);

  const runCases = useCallback(async (cases: TestCase[]) => {
    if (!current || running) return;
    stopRef.current = false;
    let run: Run = { id: newId(), startedAt: new Date().toISOString(), configVersion: current.version, caseIds: cases.map((c) => c.id), results: {} };
    setRunning(run);
    for (const c of cases) {
      if (stopRef.current) {
        run = { ...run, stopped: true };
        break;
      }
      let result: AskResult;
      try {
        result = await api.runCase({ case: c, business: current.business, policy: current.policy });
      } catch (e: any) {
        result = {
          ok: false, output: "", error: e.message, model: "", latencyMs: 0, language: c.language, facts: [],
          matchedFactIds: [], citedFactIds: [], systemPrompt: "", checks: [], verdict: "request-failed", at: new Date().toISOString(),
        };
      }
      run = { ...run, results: { ...run.results, [c.id]: result } };
      setRunning(run);
    }
    run = { ...run, finishedAt: new Date().toISOString() };
    setRunning(null);
    setPersisted((p) => ({ ...p, runs: [...p.runs, run] }));
  }, [current, running]);

  const value: StoreValue = {
    sample,
    loadError,
    current,
    versions: persisted.versions,
    saveConfig,
    resetConfig,
    status,
    connection,
    checking,
    checkConnection,
    runs: persisted.runs,
    running,
    runCases,
    stopRun: () => { stopRef.current = true; },
    clearRuns: () => setPersisted((p) => ({ ...p, runs: [] })),
    reviews: persisted.reviews,
    setReview: (key, review) =>
      setPersisted((p) => {
        const reviews = { ...p.reviews };
        if (review) reviews[key] = review;
        else delete reviews[key];
        return { ...p, reviews };
      }),
    playground: persisted.playground,
    addPlayground: (e) => setPersisted((p) => ({ ...p, playground: [...p.playground, e] })),
    clearPlayground: () => setPersisted((p) => ({ ...p, playground: [] })),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
