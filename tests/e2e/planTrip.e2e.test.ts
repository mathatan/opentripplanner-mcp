import { serializeMessage } from "@modelcontextprotocol/sdk/shared/stdio.js";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn } from "node:child_process";

/**
 * RED e2e test for plan_trip
 *
 * This is an intentionally failing (RED) end-to-end scaffold that follows the
 * style used in `tests/index.e2e.test.ts`. It:
 *  - spawns the built server
 *  - collects stdout into a buffer
 *  - performs the MCP initialize handshake
 *  - invokes the "plan_trip" tool (id = 1)
 *  - waits for the response and asserts on the result (intentionally failing)
 *
 * Notes on framing:
 *  - These tests assume the MCP server prints one JSON object per line to stdout.
 *    If the server uses Content-Length framing or streams JSON pieces, replace
 *    the simplistic line-per-JSON approach with a proper framing parser.
 *  - Debug logging can be enabled with debugMode = true.
 */

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
        if (stdoutData.includes(readyMarker)) break;
        if (serverProcess.exitCode !== null) {
            throw new Error(`Server process exited early with code ${serverProcess.exitCode}. stdout: ${stdoutData}`);
        }
        await new Promise((r) => setTimeout(r, pollInterval));
    }
    if (!stdoutData.includes(readyMarker)) {
        if (serverProcess.exitCode !== null) {
            throw new Error(`Server failed to start (exit ${serverProcess.exitCode}). stdout: ${stdoutData}`);
        }
        throw new Error(`Server did not become ready within ${startupTimeout}ms. stdout: ${stdoutData}`);
    }
});

afterAll(() => {
    if (serverProcess) serverProcess.kill();
});

const debugMode = false; // Set to true to enable verbose stdout logging

describe("plan_trip tool (e2e)", () => {
    it("invokes plan_trip and asserts itineraries exist (intentional RED)", async () => {
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

        // Wait for initialize response (10s timeout)
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
                // Process any buffered data immediately
                onData();
            } else {
                clearTimeout(timeout);
                reject(new Error("serverProcess.stdout is null"));
            }
        });

        // 2. Send tools/call request for plan_trip (id = 1)
        const request = {
            method: "tools/call",
            jsonrpc: "2.0" as const,
            id: 1,
            params: {
                name: "plan_trip",
                arguments: {
                    origin: {
                        type: "coords",
                        value: { lat: 60.1699, lon: 24.9384 },
                    },
                    destination: {
                        type: "coords",
                        value: { lat: 60.2055, lon: 24.6559 },
                    },
                    when: {
                        type: "depart",
                        time: "now",
                    },
                    constraints: {
                        optimize: "balanced",
                        maxWalkingDistance: 1500,
                    },
                },
            },
        };
        if (serverProcess.stdin) {
            serverProcess.stdin.write(serializeMessage(request));
        } else {
            throw new Error("serverProcess.stdin is null");
        }

        // Wait for response (10s timeout)
        // This uses the same simplistic one-JSON-per-line parsing as other e2e tests.
        const result: any = await new Promise<any>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error("No response from MCP server")), 10000);
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

        // Intentionally failing assertion to mark RED (scaffold)
        // Replace with proper assertions once the tool/server is implemented.
        expect(result.itineraries && result.itineraries.length > 0).toBe(true);
    }, 20000);
});
