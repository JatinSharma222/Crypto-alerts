import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";

// Points to the compiled MCP server binary
const MCP_SERVER = path.join(__dirname, "../../mcp-server/dist/index.js");

let client: Client | null = null;

export async function getMcpClient(): Promise<Client> {
    if (client) return client;

    // Spawns mcp-server/dist/index.js as a child process
    // and communicates with it over stdin/stdout using the MCP protocol
    const transport = new StdioClientTransport({
        command: "node",
        args: [MCP_SERVER],
    });

    client = new Client(
        { name: "crypto-alerts-express", version: "1.0.0" },
        { capabilities: {} }
    );

    await client.connect(transport);
    console.log("Connected to MCP server");
    return client;
}

export async function callTool(
    name: string,
    args: Record<string, any> = {}
): Promise<any> {
    const c = await getMcpClient();
    const result = await c.callTool({ name, arguments: args });
    const text = (result.content as any[])[0]?.text ?? "{}";
    try {
        return JSON.parse(text);
    } catch {
        return { raw: text };
    }
}