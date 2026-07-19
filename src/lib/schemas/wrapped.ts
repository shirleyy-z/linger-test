import { z } from "zod";

export const wrappedInsightsSchema = z.object({
  narrative: z.string().trim().min(1).max(2000),
  callback: z.object({
    before_memory_id: z.uuid(),
    after_memory_id: z.uuid(),
    text: z.string().trim().min(1).max(600)
  })
});

export type WrappedInsights = z.infer<typeof wrappedInsightsSchema>;
