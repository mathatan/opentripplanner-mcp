import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { requireEnv } from "./infrastructure/env.js";
import { findAddressOrStop } from "./tools/findAddressOrStop.js";
import { planRouteTool } from "./tools/planRoute.js";
import { getStopTimetableTool } from "./tools/getStopTimetable.js";

// Create server instance
// Validate required env at startup
requireEnv("DIGITRANSIT_API_KEY");

const server = new McpServer({
    name: "transit-assistant",
    version: "1.0.0",
    capabilities: {
        resources: {},
        tools: {},
    },
});

// Register hello tool
export async function helloToolHandler({ name }: { name: string }) {
    return {
        content: [
            {
                type: "text",
                text: `Hello, ${name}!`,
                // Add _meta and other required properties if needed
            } as { type: "text"; text: string; _meta?: any },
        ],
    };
}

server.tool(
    "hello",
    "Returns a hello world message",
    {
        name: z.string().describe("Name to greet"),
    },
    helloToolHandler,
);

// Register implemented tools
server.tool(
    "findAddressOrStop",
    "Resolve free-text address or stop",
    {
        text: z.string().describe("Free-text place or stop query"),
        focus: z
            .object({ lat: z.number(), lon: z.number() })
            .optional()
            .describe("Optional geographic focus coordinate"),
    },
    async (args) => {
        const res = await findAddressOrStop(args as any);
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(res),
                },
            ],
        };
    },
);

server.tool(
    "planRoute",
    "Plan itinerary between two points",
    {
        from: z.object({ lat: z.number(), lon: z.number() }),
        to: z.object({ lat: z.number(), lon: z.number() }),
    },
    async (args) => {
        const res = await planRouteTool(args as any);
        return { content: [{ type: "text", text: JSON.stringify(res) }] };
    },
);

server.tool(
    "getStopTimetable",
    "Get upcoming departures for a stop",
    {
        stopId: z.string().describe("Stop identifier"),
    },
    async (args) => {
        const res = await getStopTimetableTool(args as any);
        return { content: [{ type: "text", text: JSON.stringify(res) }] };
    },
);

// Main function to run the server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.log("Hello World MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
