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
