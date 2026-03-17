# CryptoAlerts

A real-time cryptocurrency price alert system with an AI-powered chat assistant — built with React, Express, MCP, and Ollama.

<img width="3433" height="980" alt="Group 1" src="https://github.com/user-attachments/assets/1de32ea2-cc4e-451c-81ad-4586af6feef2" />


<img width="3432" height="980" alt="Group 1 (1)" src="https://github.com/user-attachments/assets/16b85466-e6d9-4ddb-8d94-487f99ede474" />


---

## Features

- **Live Prices** — Real-time BTC, ETH, SOL, BNB, XRP prices from Binance, auto-refreshing every 30 seconds
- **Price Alerts** — Set "above" or "below" price targets; get instant toast notifications when they fire
- **AI Chat Assistant** — Natural language interface powered by a local Ollama model; ask for prices, set alerts, or check your monitors conversationally
- **Real-time Push** — Server-Sent Events (SSE) stream alert triggers directly to the UI without polling
- **MCP Tool Bus** — An internal Model Context Protocol server handles all business logic as discrete callable tools

---

## Architecture

```
┌─────────────────────────────────────┐
│  React Frontend  (Vite + Tailwind)  │
│  Dashboard  ·  AI Chat              │
└────────────────┬────────────────────┘
                 │  REST + SSE
┌────────────────▼────────────────────┐
│  Express API Server  (Node.js)      │
│  /api/alerts  /api/chat  /api/events│
└────────────────┬────────────────────┘
                 │  MCP Protocol  (stdio)
┌────────────────▼────────────────────┐
│  MCP Server  (child process)        │
│  get_price · set_alert · check …    │
└────────────────┬────────────────────┘
                 │  HTTP
┌────────────────▼────────────────────┐
│  Binance REST API  +  Ollama (local)│
└─────────────────────────────────────┘
```

---

## Project Structure

```
crypto-alerts/
├── client/                  # React + Vite frontend
│   └── src/
│       ├── pages/
│       │   ├── Dashboard.tsx
│       │   └── Chat.tsx
│       ├── components/
│       │   └── AlertRow.tsx
│       ├── App.tsx
│       └── types.ts
│
├── server/                  # Express API server
│   └── src/
│       ├── index.ts         # Routes
│       ├── mcpClient.ts     # MCP child-process bridge
│       ├── ollama.ts        # Two-pass LLM chat
│       └── alertPoller.ts   # SSE + 30s polling
│
└── mcp-server/              # MCP tool server
    └── src/
        ├── index.ts         # MCP SDK wiring
        ├── tools.ts         # Tool implementations
        └── binance.ts       # Binance API wrapper
```

---

## Getting Started

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18 |
| [Ollama](https://ollama.com) | latest |
| Ollama model | `qwen2.5-coder:7b` |

### 1. Clone

```bash
git clone https://github.com/your-username/crypto-alerts.git
cd crypto-alerts
```

### 2. Install dependencies

```bash
# MCP server
cd mcp-server && npm install && npm run build && cd ..

# API server
cd server && npm install && cd ..

# React client
cd client && npm install && cd ..
```

### 3. Pull the Ollama model

```bash
ollama pull qwen2.5-coder:7b
ollama serve   # keep running in a terminal
```

### 4. Start everything

```bash
# Terminal 1 — API server
cd server && npm run dev

# Terminal 2 — React client
cd client && npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## AI Assistant — How It Works

The chat uses a **two-pass LLM approach** to avoid hallucinated prices:

```
User message
     │
     ▼
Pass 1 ── Model outputs only:  TOOL_CALL: {"tool": "get_price", "args": {...}}
     │
     ▼
Tool executes → live data fetched from Binance
     │
     ▼
Pass 2 ── Model gets live data + conversation → natural language reply
     │
     ▼
"BTC is at $74,621, up 0.58% in the last 24h."
```

### Supported commands (natural language)

| Intent | Example |
|--------|---------|
| Get price | *"What's the current BTC price?"* |
| 24h stats | *"24h stats for BNB?"* |
| Set alert | *"Alert me if ETH drops below $3,000"* |
| List alerts | *"Show my active alerts"* |
| Delete alert | *"Remove alert alert_123"* |
| Check alerts | *"Have any of my alerts triggered?"* |

---

## 🛠️ MCP Tools

The MCP server exposes six tools consumed by both the Express API and the AI assistant:

| Tool | Description |
|------|-------------|
| `get_price` | Live spot price for a symbol |
| `get_24h_stats` | 24h change, high, low |
| `set_alert` | Create a price alert |
| `list_alerts` | All active (untriggered) alerts |
| `delete_alert` | Remove an alert by ID |
| `check_alerts` | Evaluate all alerts against live prices |

---

## 📡 API Endpoints

```
GET  /api/health            Health check
GET  /api/stats             24h stats for all 5 coins
GET  /api/price/:symbol     Spot price for one coin
GET  /api/alerts            List active alerts
POST /api/alerts            Create alert { symbol, condition, targetPrice }
DELETE /api/alerts/:id      Delete alert
POST /api/chat              AI chat { messages: [...] }
GET  /api/events            SSE stream for real-time notifications
```

---

## ⚙️ Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Express server port |
| `OLLAMA_URL` | `http://localhost:11434` | Ollama base URL |
| `MODEL` | `qwen2.5-coder:7b` | Ollama model name |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| UI Design | Cormorant Garamond + Plus Jakarta Sans, CSS glass morphism |
| Backend | Node.js, Express, TypeScript |
| AI | Ollama (local LLM), two-pass tool-routing pattern |
| Tool protocol | Model Context Protocol (MCP) SDK |
| Live data | Binance Public REST API |
| Real-time | Server-Sent Events (SSE) |
| Persistence | `alerts.json` flat file |

---

## License

MIT
