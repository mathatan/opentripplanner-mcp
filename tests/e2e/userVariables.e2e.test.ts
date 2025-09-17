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
    // Wait for server to be ready by polling stdout for the readiness marker.
    const readyMarker = "Hello World MCP Server running on stdio";
    const startupTimeout = Number(process.env.E2E_STARTUP_TIMEOUT_MS ?? 5000);
    const pollInterval = Number(process.env.E2E_STARTUP_POLL_MS ?? 100);

    const waitUntil = Date.now() + startupTimeout;
    while (Date.now() < waitUntil) {
        if (stdoutData.includes(readyMarker)) {
            break;
        }
        // If process exited early, fail fast
        if (serverProcess.exitCode !== null) {
            throw new Error(`Server process exited early with code ${serverProcess.exitCode}. stdout: ${stdoutData}`);
        }
        await new Promise((r) => setTimeout(r, pollInterval));
    }

    if (!stdoutData.includes(readyMarker)) {
        // timed out
        if (serverProcess.exitCode !== null) {
            throw new Error(`Server failed to start (exit ${serverProcess.exitCode}). stdout: ${stdoutData}`);
        }
        throw new Error(`Server did not become ready within ${startupTimeout}ms. stdout: ${stdoutData}`);
    }
});

afterAll(() => {
    if (serverProcess) serverProcess.kill();
});

const debugMode = false; // Set to true to enable debug output

describe("user_variables (e2e)", () => {
    it("save_user_variable then get_user_variables via MCP stdio", async () => {
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
                    } catch {
                        /* intentionally ignored: parsing non-JSON lines from stdout */
                    }
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

        // 2. Send save_user_variable
        const saveReq = {
            method: "tools/call",
            jsonrpc: "2.0" as const,
            id: 1,
            params: {
                name: "save_user_variable",
                arguments: {
                    key: "e2e-home",
                    type: "location",
                    value: { lat: 60.17, lon: 24.93 },
                },
            },
        };
        if (serverProcess.stdin) {
            serverProcess.stdin.write(serializeMessage(saveReq));
        } else {
            throw new Error("serverProcess.stdin is null");
        }

        // Wait for save response
        const saveResult = await new Promise<any>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error("No response from MCP server (save)")), 10000);
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
                        if (obj.id === 1 && obj.result) {
                            clearTimeout(timeout);
                            if (serverProcess.stdout) {
                                serverProcess.stdout.off("data", onData);
                            }
                            resolve(obj.result);
                            return;
                        }
                    } catch {
                        /* intentionally ignored: parsing non-JSON lines from stdout */
                    }
                }
            };
            if (serverProcess.stdout) {
                serverProcess.stdout.on("data", onData);
            } else {
                reject(new Error("serverProcess.stdout is null"));
            }
        });

        // rudimentary assertion - expect confirmation property (will fail in RED)
        expect(saveResult.confirmation).toBeTruthy();

        // 3. Send get_user_variables
        const getReq = {
            method: "tools/call",
            jsonrpc: "2.0" as const,
            id: 2,
            params: {
                name: "get_user_variables",
                arguments: {},
            },
        };
        if (serverProcess.stdin) {
            serverProcess.stdin.write(serializeMessage(getReq));
        } else {
            throw new Error("serverProcess.stdin is null");
        }

        const getResult = await new Promise<any>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error("No response from MCP server (get)")), 10000);
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
                        if (obj.id === 2 && obj.result) {
                            clearTimeout(timeout);
                            if (serverProcess.stdout) {
                                serverProcess.stdout.off("data", onData);
                            }
                            resolve(obj.result);
                            return;
                        }
                    } catch {
                        /* intentionally ignored: parsing non-JSON lines from stdout */
                    }
                }
            };
            if (serverProcess.stdout) {
                serverProcess.stdout.on("data", onData);
            } else {
                reject(new Error("serverProcess.stdout is null"));
            }
        });

        // assert variables include e2e-home
        expect(Array.isArray(getResult.variables)).toBe(true);
        const found = getResult.variables.find((v: any) => v.key === "e2e-home");
        expect(found).toBeDefined();
    }, 20000);
});
