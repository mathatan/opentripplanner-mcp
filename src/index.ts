import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Create server instance
const server = new McpServer({
    name: "hello-world",
    version: "1.0.0",
    capabilities: {
        resources: {},
        tools: {},
    },
});

// Placeholder registries for future modules to import (no runtime logic)
export const toolsRegistry: Record<string, unknown> = {};
export const servicesRegistry: Record<string, unknown> = {};
export const infrastructureRegistry: Record<string, unknown> = {};
export const schemaRegistry: Record<string, unknown> = {};

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

// Auto-register tools implemented in src/tools so the MCP server exposes them over stdio.
// Each tool module exports a const like `geocodeAddress` with { name, handler, schema }.
import { geocodeAddress } from "./tools/geocodeAddress.js";
import { findStops } from "./tools/findStops.js";
import { planTrip } from "./tools/planTrip.js";
import { reverseGeocode } from "./tools/reverseGeocode.js";
import { saveUserVariable } from "./tools/saveUserVariable.js";
import { getUserVariables } from "./tools/getUserVariables.js";
import { getDepartures } from "./tools/getDepartures.js";

const toolsToRegister: Array<{ name: string; schema: any; handler: any }> = [
    geocodeAddress as any,
    findStops as any,
    planTrip as any,
    reverseGeocode as any,
    saveUserVariable as any,
    getUserVariables as any,
    getDepartures as any,
];

for (const t of toolsToRegister) {
    try {
        server.tool(t.name, `Auto-registered tool ${t.name}`, t.schema ?? ({} as any), t.handler);
    } catch (err) {
        // Registration should not crash the server; log and continue.
        // eslint-disable-next-line no-console
        console.error(`Failed to register tool ${t?.name}:`, err);
    }
}

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
