import { useEffect, useState } from "react";
import axios from "axios";
import { TrendingUp, TrendingDown, Plus, RefreshCw, AlertTriangle, Bell, ChevronDown } from "lucide-react";
import { Alert, Stats24h } from "../types";
import AlertRow from "../components/AlertRow";

const COINS   = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT"];
const LABELS: Record<string, string> = {
  BTCUSDT: "Bitcoin", ETHUSDT: "Ethereum",
  SOLUSDT: "Solana",  BNBUSDT: "BNB",   XRPUSDT: "XRP",
};

interface Props { refreshSignal: number; }

export default function Dashboard({ refreshSignal }: Props) {
  const [stats,   setStats]   = useState<Stats24h[]>([]);
  const [alerts,  setAlerts]  = useState<Alert[]>([]);
  const [statsLoading,  setStatsLoading]  = useState(true);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [form, setForm] = useState({
    symbol: "BTCUSDT", condition: "below" as "above"|"below", targetPrice: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError,  setFormError]  = useState("");

  const fetchStats = async () => {
    setStatsLoading(true);
    try { const { data } = await axios.get<Stats24h[]>("/api/stats"); setStats(data); } catch {}
    setStatsLoading(false);
  };
  const fetchAlerts = async () => {
    setAlertsLoading(true);
    try { const { data } = await axios.get("/api/alerts"); setAlerts(data.alerts ?? []); }
    catch { setAlerts([]); }
    setAlertsLoading(false);
  };

  useEffect(() => {
    fetchStats(); fetchAlerts();
    const id = setInterval(fetchStats, 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => { if (refreshSignal > 0) fetchAlerts(); }, [refreshSignal]);

  const handleAdd = async () => {
    const price = parseFloat(form.targetPrice);
    if (!form.targetPrice || isNaN(price) || price <= 0) { setFormError("Enter a valid target price."); return; }
    setFormError(""); setSubmitting(true);
    try {
      await axios.post("/api/alerts", { symbol: form.symbol, condition: form.condition, targetPrice: price });
      setForm((f) => ({ ...f, targetPrice: "" }));
      fetchAlerts();
    } catch { setFormError("Failed. Is the server running?"); }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    try { await axios.delete(`/api/alerts/${id}`); setAlerts((p) => p.filter((a) => a.id !== id)); } catch {}
  };

  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  const active   = alerts.filter((a) => !a.triggered);
  const triggered = alerts.filter((a) => a.triggered);

  return (
    <div className="space-y-10">

      {/* ── Market overview ── */}
      <section>
        <div className="flex items-end justify-between mb-5 fade-up d-0">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] mb-1"
              style={{ color: "var(--text-tertiary)" }}>Market Overview</p>
            <h2 className="font-serif text-3xl font-light" style={{ color: "var(--text-primary)", letterSpacing: "0.02em" }}>
              Live Prices
            </h2>
          </div>
          <button onClick={fetchStats} disabled={statsLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium glass transition-opacity hover:opacity-70 disabled:opacity-40"
            style={{ color: "var(--text-secondary)" }}>
            <RefreshCw size={12} className={statsLoading ? "animate-spin" : ""} strokeWidth={2} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {COINS.map((coin, i) => {
            const s   = stats.find((x) => x.symbol === coin);
            const up  = (s?.change24h ?? 0) >= 0;
            return (
              <div key={coin}
                className={`card-hover glass-strong rounded-2xl p-5 fade-up d-${Math.min(i * 60, 300)}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em]"
                    style={{ color: "var(--text-tertiary)" }}>{coin.replace("USDT","")}</span>
                  <div className="w-5 h-5 rounded-md flex items-center justify-center"
                    style={{ background: up ? "var(--green-light)" : "var(--red-light)" }}>
                    {up
                      ? <TrendingUp  size={11} style={{ color: "var(--green)" }} strokeWidth={2.5} />
                      : <TrendingDown size={11} style={{ color: "var(--red)"   }} strokeWidth={2.5} />}
                  </div>
                </div>
                {s ? (
                  <>
                    <div className="font-serif text-xl font-light mb-1 leading-tight"
                      style={{ color: "var(--text-primary)", letterSpacing: "0.01em" }}>
                      ${fmt(s.price)}
                    </div>
                    <div className="text-[11px] font-semibold"
                      style={{ color: up ? "var(--green)" : "var(--red)" }}>
                      {up ? "+" : ""}{s.change24h.toFixed(2)}%
                    </div>
                  </>
                ) : (
                  <div className="space-y-2 mt-1">
                    <div className="skeleton h-5 w-full" />
                    <div className="skeleton h-3 w-2/5" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Create alert ── */}
      <section className="fade-up d-180">
        <div className="glass-strong rounded-2xl p-7">
          <div className="flex items-center gap-3 mb-7">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.06)" }}>
              <Bell size={17} strokeWidth={1.8} style={{ color: "var(--text-secondary)" }} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-0.5"
                style={{ color: "var(--text-tertiary)" }}>New Alert</p>
              <h3 className="font-serif text-xl font-light" style={{ color: "var(--text-primary)" }}>
                Set Price Target
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            {/* Asset */}
            <div className="lg:col-span-3">
              <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5"
                style={{ color: "var(--text-tertiary)" }}>Asset</label>
              <div className="relative">
                <select value={form.symbol}
                  onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value }))}
                  className="select-field w-full px-4 py-2.5 pr-8">
                  {COINS.map((c) => <option key={c} value={c}>{LABELS[c]}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: "var(--text-tertiary)" }} />
              </div>
            </div>

            {/* Condition */}
            <div className="lg:col-span-3">
              <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5"
                style={{ color: "var(--text-tertiary)" }}>Condition</label>
              <div className="relative">
                <select value={form.condition}
                  onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value as "above"|"below" }))}
                  className="select-field w-full px-4 py-2.5 pr-8">
                  <option value="below">Falls below</option>
                  <option value="above">Rises above</option>
                </select>
                <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: "var(--text-tertiary)" }} />
              </div>
            </div>

            {/* Price */}
            <div className="lg:col-span-4">
              <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5"
                style={{ color: "var(--text-tertiary)" }}>Target Price (USD)</label>
              <input type="number" placeholder="e.g. 80,000"
                value={form.targetPrice}
                onChange={(e) => setForm((f) => ({ ...f, targetPrice: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                className="input-field w-full px-4 py-2.5" />
            </div>

            {/* Submit */}
            <div className="lg:col-span-2 flex items-end">
              <button onClick={handleAdd} disabled={submitting}
                className="btn-primary w-full flex items-center justify-center gap-1.5 px-4 py-2.5">
                {submitting
                  ? <RefreshCw size={14} className="animate-spin" />
                  : <Plus size={15} strokeWidth={2.5} />}
                {submitting ? "Adding" : "Set Alert"}
              </button>
            </div>
          </div>

          {formError && (
            <div className="mt-4 flex items-center gap-2 text-xs font-medium px-4 py-2.5 rounded-xl fade-in"
              style={{ background: "var(--red-light)", color: "var(--red)", border: "1px solid rgba(184,58,58,0.12)" }}>
              <AlertTriangle size={13} strokeWidth={2} /> {formError}
            </div>
          )}
        </div>
      </section>

      {/* ── Active alerts ── */}
      <section className="fade-up d-240">
        <div className="flex items-end justify-between mb-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-1"
              style={{ color: "var(--text-tertiary)" }}>Monitoring</p>
            <h2 className="font-serif text-3xl font-light flex items-center gap-3"
              style={{ color: "var(--text-primary)", letterSpacing: "0.02em" }}>
              Active Alerts
              <span className="text-sm font-sans font-semibold px-2 py-0.5 rounded-full"
                style={{ background: "rgba(0,0,0,0.06)", color: "var(--text-secondary)" }}>
                {active.length}
              </span>
            </h2>
          </div>
        </div>

        {alertsLoading ? (
          <div className="space-y-3">
            {[1,2].map((i) => <div key={i} className="skeleton h-[72px] rounded-2xl" />)}
          </div>
        ) : active.length === 0 ? (
          <div className="glass rounded-2xl py-14 text-center"
            style={{ border: "1.5px dashed rgba(0,0,0,0.1)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(0,0,0,0.05)", color: "var(--text-tertiary)" }}>
              <Bell size={20} strokeWidth={1.5} />
            </div>
            <p className="font-serif text-lg font-light mb-1" style={{ color: "var(--text-primary)" }}>
              No active monitors
            </p>
            <p className="text-xs" style={{ color: "var(--text-tertiary)", maxWidth: "200px", margin: "0 auto" }}>
              Set a target above or ask the AI assistant.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {active.map((a, i) => (
              <div key={a.id} className={`fade-up d-${Math.min(i * 60, 240)}`}>
                <AlertRow alert={a} onDelete={() => handleDelete(a.id)} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Triggered history ── */}
      {triggered.length > 0 && (
        <section className="fade-up d-300">
          <div className="flex items-center gap-3 mb-5 pt-8"
            style={{ borderTop: "1px solid rgba(0,0,0,0.07)" }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em]"
              style={{ color: "var(--text-tertiary)" }}>Recent Activity</p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(0,0,0,0.05)", color: "var(--text-tertiary)" }}>
              {triggered.length}
            </span>
          </div>
          <div className="space-y-2.5 opacity-50 hover:opacity-100 transition-opacity duration-500">
            {triggered.map((a) => (
              <AlertRow key={a.id} alert={a} onDelete={() => handleDelete(a.id)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}