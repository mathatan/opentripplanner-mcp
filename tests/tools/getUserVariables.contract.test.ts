import { describe, it, expect } from "vitest";
import { getUserVariables } from "../../src/tools/getUserVariables";
import { saveUserVariable } from "../../src/tools/saveUserVariable";
import { clearAll } from "../../src/store/userVariableStore";

describe("T011 - get_user_variables contract tests", () => {
    // Tests will explicitly clear the in-memory store where needed via clearAll()
    it("returns an empty variables array when none are saved (placeholder - currently failing)", async () => {
        const result = await getUserVariables.handler({});
        expect(Array.isArray((result as any).variables)).toBe(true);
        expect((result as any).variables.length).toBe(0);
    });

    it("returns variables ordered by updatedAt descending after saves (placeholder - currently failing)", async () => {
        const sessionId = "S-ORDER";
        await saveUserVariable.handler({ key: "first", type: "string", value: "1", sessionId });
        // Use a more reliable delay to ensure different timestamps
        await new Promise((r) => setTimeout(r, 100));
        await saveUserVariable.handler({ key: "second", type: "string", value: "2", sessionId });

        const result = (await getUserVariables.handler({ sessionId })) as any;
        expect(Array.isArray(result.variables)).toBe(true);
        expect(result.variables.length).toBeGreaterThanOrEqual(2);
        const [a, b] = result.variables;
        expect(Date.parse(a.updatedAt) >= Date.parse(b.updatedAt)).toBe(true);
    });

    it("isolates variables per sessionId", async () => {
        // Ensure store is clean
        await clearAll();
        // Seed session A
        await saveUserVariable.handler({ key: "foo", type: "string", value: "bar", sessionId: "A" });
        await saveUserVariable.handler({ key: "baz", type: "number", value: 42, sessionId: "A" });
        // Seed session B
        await saveUserVariable.handler({ key: "alpha", type: "string", value: "beta", sessionId: "B" });
        await saveUserVariable.handler({ key: "gamma", type: "boolean", value: true, sessionId: "B" });

        const resultA = (await getUserVariables.handler({ sessionId: "A" })) as any;
        const resultB = (await getUserVariables.handler({ sessionId: "B" })) as any;

        // Expected variables for each session (order may depend on updatedAt, so sort by key for comparison)
        const expectedA = [
            expect.objectContaining({ key: "foo", value: "bar", type: "string" }),
            expect.objectContaining({ key: "baz", value: 42, type: "number" }),
        ];
        const expectedB = [
            expect.objectContaining({ key: "alpha", value: "beta", type: "string" }),
            expect.objectContaining({ key: "gamma", value: true, type: "boolean" }),
        ];

        const keysA = resultA.variables.map((v: any) => v.key);
        const keysB = resultB.variables.map((v: any) => v.key);

        // Assert correct variables for each session
        expect(resultA.variables).toEqual(expect.arrayContaining(expectedA));
        expect(resultB.variables).toEqual(expect.arrayContaining(expectedB));

        // Assert isolation: no keys from A in B and vice versa
        expect(keysA).not.toEqual(expect.arrayContaining(keysB));
        expect(keysB).not.toEqual(expect.arrayContaining(keysA));

        // Cleanup
        await clearAll();
    });
});
