import { serializeMessage } from "@modelcontextprotocol/sdk/shared/stdio.js";

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn } from "node:child_process";

let serverProcess: ReturnType<typeof spawn>;
let stdoutData = "";

beforeAll(async () => {
    serverProcess = spawn("node", ["build/index.js"], {
        cwd: process.cwd(),
        stdio: ["pipe", "pipe", "inherit"],
    });
    // Collect stdout
    if (serverProcess.stdout) {
        serverProcess.stdout.on("data", (data) => {
            stdoutData += data.toString();
        });
    }
    // Wait for server to be ready
    await new Promise((resolve) => setTimeout(resolve, 500));
});

afterAll(() => {
    if (serverProcess) serverProcess.kill();
});

const debugMode = false; // Set to true to enable debug output

describe("hello tool endpoint (e2e)", () => {
    it("returns correct greeting via MCP stdio", async () => {
        // 1. Send MCP initialize handshake
        const initRequest = {
            method: "initialize",
            jsonrpc: "2.0" as const,
            id: "init",
            params: {
                clientInfo: { name: "e2e-test", version: "1.0.0" },
                protocolVersion: "2025-06-18",
                capabilities: {},
            },
        };
        if (serverProcess.stdin) {
            serverProcess.stdin.write(serializeMessage(initRequest));
        } else {
            throw new Error("serverProcess.stdin is null");
        }

        // Wait for initialize response
        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error("No MCP initialize response")), 10000);
            const onData = () => {
                const lines = stdoutData.trim().split("\n");
                for (const line of lines) {
                    if (debugMode && line.trim()) {
                        try {
                            const parsed = JSON.parse(line);
                            console.log("[MCP STDOUT]", JSON.stringify(parsed, null, 2));
                        } catch {
                            console.log("[MCP STDOUT]", line);
                        }
                    }
                    if (!line.startsWith("{")) continue;
                    try {
                        const obj = JSON.parse(line);
                        if (obj.id === "init" && obj.result) {
                            clearTimeout(timeout);
                            if (serverProcess.stdout) {
                                serverProcess.stdout.off("data", onData);
                            }
                            resolve();
                            return;
                        }
                    } catch {}
                }
            };
            if (serverProcess.stdout) {
                serverProcess.stdout.on("data", onData);
                // Immediately process any buffered data
                onData();
            } else {
                clearTimeout(timeout);
                reject(new Error("serverProcess.stdout is null"));
            }
        });

        // 2. Send tool invocation
        const request = {
            method: "tools/call",
            jsonrpc: "2.0" as const,
            id: 1,
            params: {
                name: "hello",
                arguments: { name: "TestUser" },
            },
        };
        if (serverProcess.stdin) {
            serverProcess.stdin.write(serializeMessage(request));
        } else {
            throw new Error("serverProcess.stdin is null");
        }

        // Wait for response
        // MCP protocol assumption: This test assumes the server emits one JSON message per line.
        // If the server switches to Content-Length framing or streaming, refactor this logic to use a proper framing parser.
        // Do not use this approach for production protocol parsing.
        const result = await new Promise<{ content: { text: string }[] }>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error("No response from MCP server")), 10000);
            const onData = () => {
                // Try to parse last line as JSON
                const lines = stdoutData.trim().split("\n");
                for (const line of lines) {
                    if (debugMode && line.trim()) {
                        try {
                            const parsed = JSON.parse(line);
                            console.log("[MCP STDOUT]", JSON.stringify(parsed, null, 2));
                        } catch {
                            console.log("[MCP STDOUT]", line);
                        }
                    }
                    if (!line.startsWith("{")) continue;
                    try {
                        const obj = JSON.parse(line);
                        if (obj.id === 1 && obj.result && obj.result.content) {
                            clearTimeout(timeout);
                            if (serverProcess.stdout) {
                                serverProcess.stdout.off("data", onData);
                            }
                            resolve(obj.result);
                            return;
                        }
                    } catch {}
                }
            };
            if (serverProcess.stdout) {
                serverProcess.stdout.on("data", onData);
            } else {
                reject(new Error("serverProcess.stdout is null"));
            }
        });
        expect(result.content[0].text).toBe("Hello, TestUser!");
    });
});
