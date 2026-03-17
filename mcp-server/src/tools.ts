import fs from "fs";
import path from "path";
import { fetchPrice, fetch24hStats } from "./binance";

const ALERTS_FILE = path.join(process.cwd(), "alerts.json");

export interface Alert {
    id: string;
    symbol: string;
    condition: "above" | "below";
    targetPrice: number;
    createdAt: string;
    triggered: boolean;
    triggeredAt?: string;
    triggeredPrice?: number;
}

function readAlerts(): Alert[] {
    try {
        if (!fs.existsSync(ALERTS_FILE)) return [];
        return JSON.parse(fs.readFileSync(ALERTS_FILE, "utf-8"));
    } catch {
        return [];
    }
}

function writeAlerts(alerts: Alert[]): void {
    fs.writeFileSync(ALERTS_FILE, JSON.stringify(alerts, null, 2));
}

export const TOOL_DEFINITIONS = [
    {
        name: "get_price",
        description:
            "Get the current live price of a cryptocurrency from Binance. Use symbols like BTCUSDT, ETHUSDT, SOLUSDT, BNBUSDT, XRPUSDT.",
        inputSchema: {
            type: "object",
            properties: {
                symbol: {
                    type: "string",
                    description: "Trading pair e.g. BTCUSDT. Always append USDT.",
                },
            },
            required: ["symbol"],
        },
    },
    {
        name: "get_24h_stats",
        description:
            "Get 24-hour price statistics: current price, % change, 24h high, 24h low.",
        inputSchema: {
            type: "object",
            properties: {
                symbol: { type: "string", description: "Trading pair e.g. BTCUSDT" },
            },
            required: ["symbol"],
        },
    },
    {
        name: "set_alert",
        description:
            "Set a price alert. Triggers when price goes above or below a threshold.",
        inputSchema: {
            type: "object",
            properties: {
                symbol: { type: "string", description: "Trading pair e.g. BTCUSDT" },
                condition: {
                    type: "string",
                    enum: ["above", "below"],
                    description: "Trigger when price goes above or below the target",
                },
                targetPrice: { type: "number", description: "Target price in USD" },
            },
            required: ["symbol", "condition", "targetPrice"],
        },
    },
    {
        name: "list_alerts",
        description: "List all active (not yet triggered) price alerts.",
        inputSchema: { type: "object", properties: {} },
    },
    {
        name: "delete_alert",
        description: "Delete a price alert by its ID.",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "string", description: "The alert ID to delete" },
            },
            required: ["id"],
        },
    },
    {
        name: "check_alerts",
        description:
            "Check all active alerts against current live prices. Returns which alerts triggered.",
        inputSchema: { type: "object", properties: {} },
    },
];

export async function handleTool(
    name: string,
    args: Record<string, any>
): Promise<string> {
    switch (name) {
        case "get_price": {
            const data = await fetchPrice(args.symbol);
            return JSON.stringify({
                symbol: data.symbol,
                price: data.price,
                formattedPrice: `$${data.price.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 6,
                })}`,
            });
        }

        case "get_24h_stats": {
            const data = await fetch24hStats(args.symbol);
            const up = data.priceChangePercent >= 0;
            return JSON.stringify({
                symbol: data.symbol,
                price: data.lastPrice,
                change24h: data.priceChangePercent,
                high24h: data.highPrice,
                low24h: data.lowPrice,
                trend: up ? "UP 📈" : "DOWN 📉",
                summary: `${data.symbol} is at $${data.lastPrice.toLocaleString()}, ${up ? "up" : "down"} ${Math.abs(data.priceChangePercent).toFixed(2)}% in 24h. High: $${data.highPrice.toLocaleString()}, Low: $${data.lowPrice.toLocaleString()}.`,
            });
        }

        case "set_alert": {
            const alerts = readAlerts();
            const alert: Alert = {
                id: `alert_${Date.now()}`,
                symbol: args.symbol.toUpperCase(),
                condition: args.condition,
                targetPrice: args.targetPrice,
                createdAt: new Date().toISOString(),
                triggered: false,
            };
            alerts.push(alert);
            writeAlerts(alerts);
            return JSON.stringify({
                success: true,
                alert,
                message: `Alert set! You will be notified when ${alert.symbol} goes ${alert.condition} $${alert.targetPrice.toLocaleString()}.`,
            });
        }

        case "list_alerts": {
            const alerts = readAlerts().filter((a) => !a.triggered);
            return JSON.stringify({
                count: alerts.length,
                alerts,
                message:
                    alerts.length === 0
                        ? "No active alerts."
                        : `You have ${alerts.length} active alert(s).`,
            });
        }

        case "delete_alert": {
            const alerts = readAlerts();
            const index = alerts.findIndex((a) => a.id === args.id);
            if (index === -1)
                return JSON.stringify({ success: false, message: "Alert not found." });
            const deleted = alerts.splice(index, 1)[0];
            writeAlerts(alerts);
            return JSON.stringify({
                success: true,
                message: `Deleted alert for ${deleted.symbol} ${deleted.condition} $${deleted.targetPrice.toLocaleString()}.`,
            });
        }

        case "check_alerts": {
            const alerts = readAlerts();
            const active = alerts.filter((a) => !a.triggered);
            if (active.length === 0)
                return JSON.stringify({ triggered: [], message: "No active alerts to check." });

            const symbols = [...new Set(active.map((a) => a.symbol))];
            const prices: Record<string, number> = {};
            await Promise.all(
                symbols.map(async (sym) => {
                    const p = await fetchPrice(sym);
                    prices[sym] = p.price;
                })
            );

            const nowTriggered: Alert[] = [];
            for (const alert of alerts) {
                if (alert.triggered) continue;
                const currentPrice = prices[alert.symbol];
                if (!currentPrice) continue;
                const isTriggered =
                    alert.condition === "above"
                        ? currentPrice >= alert.targetPrice
                        : currentPrice <= alert.targetPrice;
                if (isTriggered) {
                    alert.triggered = true;
                    alert.triggeredAt = new Date().toISOString();
                    alert.triggeredPrice = currentPrice;
                    nowTriggered.push(alert);
                }
            }

            writeAlerts(alerts);
            return JSON.stringify({
                checkedCount: active.length,
                triggeredCount: nowTriggered.length,
                triggered: nowTriggered,
                pricesChecked: prices,
                message:
                    nowTriggered.length > 0
                        ? `🚨 ${nowTriggered.length} alert(s) triggered!`
                        : "No alerts triggered yet.",
            });
        }

        default:
            return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
}