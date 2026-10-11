import { useEffect, useState } from "react";
import { ConnectionPill, SidebarConnection } from "./components/Connection";
import { IconBeaker, IconChat, IconDownload, IconHome, IconStore } from "./icons";
import Config from "./screens/Config";
import Export from "./screens/Export";
import Overview from "./screens/Overview";
import Playground from "./screens/Playground";
import Tests from "./screens/Tests";
import { StoreProvider, useStore } from "./store";
import { ErrorNote } from "./ui";

export type Route = "overview" | "playground" | "tests" | "config" | "export";

const NAV: { id: Route; label: string; icon: (p: { className?: string }) => JSX.Element; title: string; sub: string }[] = [
  { id: "overview", label: "Overview", icon: IconHome, title: "Overview", sub: "What LocalizeKit does and where to start." },
  { id: "playground", label: "Playground", icon: IconChat, title: "Playground", sub: "Send one customer message to N-ATLAS and inspect the reply." },
  { id: "tests", label: "Test suite", icon: IconBeaker, title: "Test suite", sub: "Run repeatable cases, review replies, compare runs." },
  { id: "config", label: "Business & policy", icon: IconStore, title: "Business & policy", sub: "The facts the assistant may state and the rules it follows." },
  { id: "export", label: "Export", icon: IconDownload, title: "Export", sub: "Take the configuration, tests and an integration example with you." },
];

const fromHash = (): Route => {
  const h = window.location.hash.replace("#/", "") as Route;
  return NAV.some((n) => n.id === h) ? h : "overview";
};

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}

function Brand({ dark = true }: { dark?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-forge-600 text-[13px] font-extrabold tracking-tight text-white shadow-sm">LK</span>
      <span className="leading-tight">
        <span className={`block text-[11px] font-semibold uppercase tracking-[0.12em] ${dark ? "text-slate-400" : "text-slate-500"}`}>N-ATLAS</span>
        <span className={`block text-[15px] font-bold ${dark ? "text-white" : "text-ink"}`}>LocalizeKit</span>
      </span>
    </span>
  );
}

function Shell() {
  const [route, setRoute] = useState<Route>(fromHash);
  const { loadError } = useStore();
  const page = NAV.find((n) => n.id === route)!;

  useEffect(() => {
    const on = () => {
      setRoute(fromHash());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  const go = (r: Route) => {
    window.location.hash = `/${r}`;
  };

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col bg-night-900 lg:flex">
        <a href="#/overview" className="px-5 pb-6 pt-6" aria-label="LocalizeKit home"><Brand /></a>
        <nav className="flex-1 space-y-0.5 px-3" aria-label="Main">
          {NAV.map((n) => {
            const active = route === n.id;
            return (
              <a
                key={n.id}
                href={`#/${n.id}`}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                }`}
              >
                <n.icon className={`h-[18px] w-[18px] ${active ? "text-forge-400" : ""}`} />
                {n.label}
              </a>
            );
          })}
        </nav>
        <div className="p-3">
          <SidebarConnection />
          <p className="mt-3 px-2 text-[11px] leading-relaxed text-slate-500">
            Replies come from N-ATLAS (NCAIR1/N-ATLaS). AsoStyle Boutique is fictional sample data.
          </p>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-night-900 lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <a href="#/overview" aria-label="LocalizeKit home"><Brand /></a>
          <ConnectionPill dark />
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2" aria-label="Main">
          {NAV.map((n) => (
            <a
              key={n.id}
              href={`#/${n.id}`}
              aria-current={route === n.id ? "page" : undefined}
              className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium ${
                route === n.id ? "bg-white/10 text-white" : "text-slate-400"
              }`}
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </a>
          ))}
        </nav>
      </header>

      <div className="lg:pl-64">
        {route !== "overview" && (
          <div className="border-b border-slate-200 bg-white">
            <div className="mx-auto max-w-6xl px-4 py-5 sm:px-8">
              <h1 className="text-xl font-bold tracking-tight text-ink">{page.title}</h1>
              <p className="mt-0.5 text-sm text-slate-500">{page.sub}</p>
            </div>
          </div>
        )}
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
          {loadError && <div className="mb-4"><ErrorNote>{loadError}</ErrorNote></div>}
          <div key={route} className="animate-fade-up">
            {route === "overview" && <Overview go={go} />}
            {route === "playground" && <Playground />}
            {route === "tests" && <Tests />}
            {route === "config" && <Config />}
            {route === "export" && <Export />}
          </div>
        </main>
        <footer className="mx-auto max-w-6xl px-4 pb-8 text-xs text-slate-400 sm:px-8">
          Automated checks are heuristics: they flag likely problems and do not prove a reply is correct.
        </footer>
      </div>
    </div>
  );
}
