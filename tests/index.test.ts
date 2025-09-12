import { describe, it, expect } from "vitest";
import { helloToolHandler } from "../src/index";

describe("hello tool", () => {
    it("returns correct greeting", async () => {
        const result = await helloToolHandler({ name: "TestUser" });
        expect(result.content[0].text).toBe("Hello, TestUser!");
    });
});
