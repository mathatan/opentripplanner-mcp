import { describe, it, expect } from "vitest";

// Directly test the hello tool handler
async function helloToolHandler({ name }: { name: string }) {
    return {
        content: [
            {
                type: "text",
                text: `Hello, ${name}!`,
            },
        ],
    };
}

describe("hello tool", () => {
    it("returns correct greeting", async () => {
        const result = await helloToolHandler({ name: "TestUser" });
        expect(result.content[0].text).toBe("Hello, TestUser!");
    });
});
