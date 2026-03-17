import { Bell, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { Alert } from "../types";

interface Props { alert: Alert; onDelete: () => void; }

export default function AlertRow({ alert: a, onDelete }: Props) {
  const isAbove = a.condition === "above";

  return (
    <div className="row-hover glass rounded-2xl px-5 py-4 flex items-center justify-between group"
      style={{
        borderColor: a.triggered ? "rgba(184,58,58,0.2)" : "var(--glass-border)",
        background: a.triggered ? "rgba(184,58,58,0.04)" : "var(--glass)",
      }}>
      {/* Left */}
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: a.triggered ? "var(--red-light)" : "rgba(0,0,0,0.05)",
            color: a.triggered ? "var(--red)" : "var(--text-secondary)",
          }}>
          <Bell size={17} strokeWidth={1.8} />
        </div>

        <div>
          {/* Coin + condition + price */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-serif text-xl font-light" style={{ color: "var(--text-primary)", letterSpacing: "0.02em" }}>
              {a.symbol.replace("USDT", "")}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
              style={{
                background: isAbove ? "var(--green-light)" : "var(--red-light)",
                color:      isAbove ? "var(--green)"       : "var(--red)",
              }}>
              {isAbove ? <ArrowUp size={9} strokeWidth={3} /> : <ArrowDown size={9} strokeWidth={3} />}
              {a.condition}
            </span>
            <span className="text-sm font-semibold" style={{ color: "var(--amber)" }}>
              ${a.targetPrice.toLocaleString()}
            </span>
          </div>

          {/* Status line */}
          <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
            {a.triggered ? (
              <>
                Hit at{" "}
                <span style={{ color: "var(--red)", fontWeight: 600 }}>${a.triggeredPrice?.toLocaleString()}</span>
                {" · "}{new Date(a.triggeredAt!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </>
            ) : (
              <>Watching since {new Date(a.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</>
            )}
          </p>
        </div>
      </div>

      {/* Delete */}
      <button onClick={onDelete}
        className="w-8 h-8 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200"
        style={{ color: "var(--text-tertiary)", background: "rgba(0,0,0,0.05)" }}>
        <Trash2 size={14} strokeWidth={1.8} />
      </button>
    </div>
  );
}