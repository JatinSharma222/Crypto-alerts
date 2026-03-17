import { useEffect, useRef, useState } from "react";
import { LayoutDashboard, MessageSquare, Zap, X } from "lucide-react";
import Dashboard from "./pages/Dashboard";
import Chat from "./pages/Chat";
import { Alert } from "./types";

type Tab = "dashboard" | "chat";

interface Notification {
  id: string;
  message: string;
  triggered: Alert[];
}

export default function App() {
  const [tab, setTab]                 = useState<Tab>("dashboard");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource("/api/events");
    esRef.current = es;
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "ALERTS_TRIGGERED" && data.triggeredCount > 0)
          setNotifications((p) => [
            { id: Date.now().toString(), message: `${data.triggeredCount} alert${data.triggeredCount > 1 ? "s" : ""} triggered`, triggered: data.triggered },
            ...p,
          ].slice(0, 4));
        if (data.type === "POLL_COMPLETE") setRefreshSignal((n) => n + 1);
      } catch {}
    };
    return () => es.close();
  }, []);

  return (
    <div className="relative min-h-screen" style={{ zIndex: 1 }}>

      {/* ── Header ── */}
      <header className="glass sticky top-0 z-40 px-8 py-5"
        style={{ borderRadius: 0, borderTop: "none", borderLeft: "none", borderRight: "none" }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-3 fade-in d-0">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "var(--text-primary)" }}>
              <Zap size={15} color="#faf7f3" strokeWidth={2.5} />
            </div>
            <span className="font-serif text-2xl font-light tracking-wide" style={{ color: "var(--text-primary)", letterSpacing: "0.04em" }}>
              CryptoAlerts
            </span>
          </div>

          {/* Live pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full fade-in d-60"
            style={{ background: "rgba(45,122,79,0.08)", border: "1px solid rgba(45,122,79,0.15)" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--green)", boxShadow: "0 0 5px rgba(45,122,79,0.5)" }} />
            <span className="text-xs font-semibold tracking-wide" style={{ color: "var(--green)" }}>Live</span>
          </div>
        </div>
      </header>

      {/* ── Nav tabs ── */}
      <nav className="px-8 sticky top-[69px] z-30"
        style={{ background: "rgba(242,236,228,0.8)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
        <div className="max-w-5xl mx-auto flex gap-0">
          {([
            { id: "dashboard", label: "Dashboard",    icon: LayoutDashboard },
            { id: "chat",      label: "AI Assistant", icon: MessageSquare },
          ] as const).map((t) => {
            const Icon   = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="relative flex items-center gap-2.5 px-5 py-4 text-sm font-semibold transition-colors duration-150"
                style={{ color: active ? "var(--text-primary)" : "var(--text-tertiary)" }}>
                <Icon size={15} strokeWidth={active ? 2.5 : 2} />
                {t.label}
                {active && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full slide-down"
                    style={{ background: "var(--text-primary)" }} />
                )}
                {t.id === "dashboard" && notifications.length > 0 && (
                  <span className="absolute top-3 right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
                    style={{ background: "var(--red)" }}>
                    {notifications.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── Toast notifications ── */}
      <div className="fixed top-28 right-6 z-50 flex flex-col gap-2.5 w-[320px]">
        {notifications.map((n) => (
          <div key={n.id} className="glass-strong rounded-2xl p-4 slide-down"
            style={{ borderLeft: "3px solid var(--red)" }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold mb-1.5" style={{ color: "var(--red)" }}>
                  🚨 {n.message}
                </p>
                {n.triggered.map((a) => (
                  <p key={a.id} className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{a.symbol.replace("USDT","")}</span>
                    {" "}{a.condition}{" "}
                    <span style={{ color: "var(--amber)" }}>${a.targetPrice.toLocaleString()}</span>
                  </p>
                ))}
              </div>
              <button onClick={() => setNotifications((p) => p.filter((x) => x.id !== n.id))}
                className="p-1 rounded-lg transition-opacity hover:opacity-60"
                style={{ color: "var(--text-tertiary)" }}>
                <X size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Page content ── */}
      <main className="relative z-10 max-w-5xl mx-auto px-8 py-10">
        {tab === "dashboard" && <Dashboard refreshSignal={refreshSignal} />}
        {tab === "chat"      && <Chat />}
      </main>
    </div>
  );
}