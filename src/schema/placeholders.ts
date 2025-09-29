import { z } from "zod";

export const PlaceholderSchema = z
    .object({
        placeholder: z.literal(true),
    })
    .describe("Placeholder schema until real schemas are implemented");

export type Placeholder = z.infer<typeof PlaceholderSchema>;
