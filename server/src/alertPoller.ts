import { callTool } from "./mcpClient";
import { Response } from "express";

// Store connected SSE clients
const sseClients: Response[] = [];

export function addSseClient(res: Response) {
    sseClients.push(res);
    res.on("close", () => {
        const i = sseClients.indexOf(res);
        if (i !== -1) sseClients.splice(i, 1);
    });
}

function broadcast(data: object) {
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    sseClients.forEach((client) => {
        try { client.write(payload); } catch { /* disconnected */ }
    });
}

export function startAlertPoller() {
    console.log("Alert poller started — checking every 30s");

    setInterval(async () => {
        try {
            const result = await callTool("check_alerts", {});

            if (result.triggeredCount > 0) {
                console.log(`${result.triggeredCount} alert(s) triggered!`);
                broadcast({
                    type: "ALERTS_TRIGGERED",
                    triggered: result.triggered,
                    triggeredCount: result.triggeredCount,
                });
            }

            broadcast({ type: "POLL_COMPLETE", triggeredCount: result.triggeredCount ?? 0 });
        } catch (err: any) {
            console.error("Poller error:", err.message);
        }
    }, 30_000);
}