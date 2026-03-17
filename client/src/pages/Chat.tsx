import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Bot, Send, User, Loader2 } from "lucide-react";
import { ChatMessage } from "../types";

const SUGGESTIONS = [
  "What's the current BTC price?",
  "Alert me if ETH drops below $3000",
  "Alert me when SOL goes above $200",
  "Show my active alerts",
  "24h stats for BNB?",
];

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([{
    role: "assistant",
    content: "Hello! I'm your crypto assistant.\n\nI can fetch live prices, set price alerts, and manage your monitors.\n\nTry: \"Alert me if BTC drops below $80,000\"",
  }]);
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput(""); setError("");
    const history = [...messages, { role: "user" as const, content }];
    setMessages(history);
    setLoading(true);
    try {
      const { data } = await axios.post<{ reply: string }>("/api/chat", { messages: history });
      setMessages((p) => [...p, { role: "assistant", content: data.reply }]);
    } catch (err: any) {
      const msg = err.response?.data?.error || "Could not reach server.";
      setError(msg);
      setMessages((p) => [...p, { role: "assistant", content: `⚠️ ${msg}` }]);
    }
    setLoading(false);
    inputRef.current?.focus();
  };

  return (
    <div className="fade-up d-0 flex flex-col" style={{ height: "calc(100vh - 210px)", minHeight: "500px" }}>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-6 pr-1">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 fade-up ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            style={{ animationDelay: `${i * 20}ms` }}>

            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{
                background: msg.role === "assistant" ? "rgba(0,0,0,0.07)" : "var(--text-primary)",
                color: msg.role === "assistant" ? "var(--text-secondary)" : "#faf7f3",
              }}>
              {msg.role === "assistant"
                ? <Bot  size={15} strokeWidth={1.8} />
                : <User size={15} strokeWidth={1.8} />}
            </div>

            <div className="max-w-[80%] px-5 py-3.5 text-sm leading-relaxed whitespace-pre-wrap"
              style={{
                background:   msg.role === "assistant" ? "var(--glass-2)" : "var(--text-primary)",
                border:       msg.role === "assistant" ? "1px solid var(--glass-border)" : "none",
                borderRadius: msg.role === "assistant" ? "4px 16px 16px 16px" : "16px 4px 16px 16px",
                backdropFilter: msg.role === "assistant" ? "blur(24px)" : "none",
                color:        msg.role === "assistant" ? "var(--text-primary)" : "#faf7f3",
                fontWeight:   msg.role === "user" ? 500 : 400,
                fontSize:     "13.5px",
                boxShadow:    msg.role === "assistant" ? "var(--shadow-sm)" : "var(--shadow-md)",
              }}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 fade-in">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(0,0,0,0.07)", color: "var(--text-secondary)" }}>
              <Bot size={15} strokeWidth={1.8} />
            </div>
            <div className="flex items-center gap-2 px-5 py-3.5 text-sm rounded-2xl"
              style={{
                background: "var(--glass-2)",
                border: "1px solid var(--glass-border)",
                borderRadius: "4px 16px 16px 16px",
                color: "var(--text-tertiary)",
                fontSize: "13px",
              }}>
              <Loader2 size={13} className="animate-spin" strokeWidth={2} />
              Thinking...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="mb-5 fade-up d-120">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-3"
            style={{ color: "var(--text-tertiary)" }}>Try asking</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s, i) => (
              <button key={s} onClick={() => send(s)}
                className={`glass px-3.5 py-2 rounded-xl text-xs font-medium transition-all hover:shadow-md active:scale-95 fade-in d-${i * 60}`}
                style={{ color: "var(--text-secondary)" }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-xs mb-2" style={{ color: "var(--red)" }}>{error}</p>}

      {/* Input */}
      <div style={{ borderTop: "1px solid rgba(0,0,0,0.07)", paddingTop: "16px" }}>
        <div className="flex gap-2 glass-strong rounded-2xl p-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask about prices or set an alert…"
            disabled={loading}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--text-primary)",
              fontSize: "13.5px",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 500,
              padding: "8px 12px",
            }}
          />
          <button onClick={() => send()} disabled={loading || !input.trim()}
            className="btn-primary w-10 h-10 flex items-center justify-center flex-shrink-0">
            <Send size={15} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}