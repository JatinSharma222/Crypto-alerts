import express from "express";
import cors from "cors";
import { callTool, getMcpClient } from "./mcpClient";
import { chat, ChatMessage } from "./ollama";
import { startAlertPoller, addSseClient } from "./alertPoller";

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/api/health", (_, res) => {
    res.json({ status: "ok" });
});

// ── Alerts ────────────────────────────────────────────────────────────────────
app.get("/api/alerts", async (_, res) => {
    try {
        res.json(await callTool("list_alerts"));
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/api/alerts", async (req, res) => {
    try {
        const { symbol, condition, targetPrice } = req.body;
        if (!symbol || !condition || targetPrice == null)
            return res.status(400).json({ error: "symbol, condition, and targetPrice required" });
        res.json(await callTool("set_alert", { symbol, condition, targetPrice }));
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.delete("/api/alerts/:id", async (req, res) => {
    try {
        res.json(await callTool("delete_alert", { id: req.params.id }));
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/api/alerts/check", async (_, res) => {
    try {
        res.json(await callTool("check_alerts"));
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ── Prices ────────────────────────────────────────────────────────────────────
app.get("/api/price/:symbol", async (req, res) => {
    try {
        res.json(await callTool("get_price", { symbol: req.params.symbol }));
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/api/stats", async (_, res) => {
    try {
        const symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT"];
        const results = await Promise.all(
            symbols.map((s) => callTool("get_24h_stats", { symbol: s }))
        );
        res.json(results);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ── AI Chat ───────────────────────────────────────────────────────────────────
app.post("/api/chat", async (req, res) => {
    try {
        const { messages } = req.body as { messages: ChatMessage[] };
        if (!messages || !Array.isArray(messages))
            return res.status(400).json({ error: "messages array required" });
        const reply = await chat(messages);
        res.json({ reply });
    } catch (err: any) {
        console.error("Chat error:", err.message);
        res.status(500).json({
            error: "Could not reach Ollama. Run: ollama serve",
        });
    }
});

// ── SSE — real-time push notifications ───────────────────────────────────────
app.get("/api/events", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const heartbeat = setInterval(() => {
        res.write(`data: {"type":"heartbeat"}\n\n`);
    }, 20_000);

    res.on("close", () => clearInterval(heartbeat));
    addSseClient(res);
});

// ── Start ─────────────────────────────────────────────────────────────────────
async function main() {
    await getMcpClient(); // warm up MCP connection on startup
    app.listen(PORT, () => {
        console.log(`Server running → http://localhost:${PORT}`);
        startAlertPoller();
    });
}

main().catch((err) => {
    console.error("Startup error:", err.message);
    process.exit(1);
});