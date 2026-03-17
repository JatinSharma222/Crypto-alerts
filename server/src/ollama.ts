import axios from "axios";
import { callTool } from "./mcpClient";

const OLLAMA_URL = "http://localhost:11434";
const MODEL = "qwen2.5-coder:7b";

export interface ChatMessage {
    role: "user" | "assistant" | "system";
    content: string;
}

// ── System prompt ─────────────────────────────────────────────────────────────
// First pass: model ONLY decides which tool to call, nothing else.
// Second pass: model gets the tool data and answers naturally.
const FIRST_PASS_PROMPT = `You are a crypto assistant. Your job is to decide which tool to call.

ONLY respond with a single line in this exact format — nothing else:
TOOL_CALL: {"tool": "<name>", "args": {<args>}}

Available tools:
- get_price       → {"symbol": "BTCUSDT"}
- get_24h_stats   → {"symbol": "ETHUSDT"}
- set_alert       → {"symbol": "BTCUSDT", "condition": "below", "targetPrice": 80000}
- list_alerts     → {}
- delete_alert    → {"id": "alert_123"}
- check_alerts    → {}

Symbol mapping: Bitcoin=BTCUSDT, Ethereum=ETHUSDT, Solana=SOLUSDT, BNB=BNBUSDT, XRP=XRPUSDT

If no tool is needed (e.g. user is just chatting), respond with exactly: NO_TOOL`;

const SECOND_PASS_PROMPT = `You are a friendly crypto assistant. Answer the user's question using the data provided.
Be concise and clear. Use $ for prices. Do NOT mention tools, JSON, or technical details.`;

// ── Main chat function ────────────────────────────────────────────────────────
export async function chat(history: ChatMessage[]): Promise<string> {

    // First pass: figure out which tool to call
    const firstMessages: ChatMessage[] = [
        { role: "system", content: FIRST_PASS_PROMPT },
        { role: "user", content: getLastUserMessage(history) },
    ];

    const firstReply = (await ollamaChat(firstMessages)).trim();

    // No tool needed — respond conversationally
    if (firstReply.startsWith("NO_TOOL") || !firstReply.includes("TOOL_CALL")) {
        const conversationMessages: ChatMessage[] = [
            { role: "system", content: SECOND_PASS_PROMPT },
            ...history,
        ];
        return ollamaChat(conversationMessages);
    }

    // Parse the TOOL_CALL line
    const match = firstReply.match(/TOOL_CALL:\s*(\{.*\})/s);
    if (!match) {
        const fallbackMessages: ChatMessage[] = [
            { role: "system", content: SECOND_PASS_PROMPT },
            ...history,
        ];
        return ollamaChat(fallbackMessages);
    }

    // Execute the tool
    let toolData: string;
    let toolName = "unknown";
    try {
        const parsed = JSON.parse(match[1]);
        toolName = parsed.tool;
        const result = await callTool(parsed.tool, parsed.args ?? {});
        toolData = JSON.stringify(result, null, 2);
    } catch (err: any) {
        toolData = JSON.stringify({ error: err.message ?? "Tool failed" });
    }

    // Second pass: give the model the live data and ask for a plain answer
    const secondMessages: ChatMessage[] = [
        { role: "system", content: SECOND_PASS_PROMPT },
        ...history,
        {
            role: "system",
            content: `Live data from "${toolName}":\n\n${toolData}\n\nUse this to answer the user. Do not show raw JSON or mention tools.`,
        },
    ];

    return ollamaChat(secondMessages);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getLastUserMessage(history: ChatMessage[]): string {
    for (let i = history.length - 1; i >= 0; i--) {
        if (history[i].role === "user") return history[i].content;
    }
    return "";
}

async function ollamaChat(messages: readonly ChatMessage[]): Promise<string> {
    const res = await axios.post(`${OLLAMA_URL}/api/chat`, {
        model: MODEL,
        messages,
        stream: false,
        options: { temperature: 0.1 },
    });
    return res.data.message.content as string;
}