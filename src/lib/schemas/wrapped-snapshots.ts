import { z } from "zod";

export const busiestMonthCaptionSchema = z.object({
  caption: z.string().trim().min(1).max(300)
});

export type BusiestMonthCaption = z.infer<typeof busiestMonthCaptionSchema>;

export const wrappedVibeSchema = z.object({
  drink: z.object({
    name: z.string().trim().min(1).max(80),
    reason: z.string().trim().min(1).max(300)
  }),
  season: z.object({
    value: z.enum(["spring", "summer", "autumn", "winter"]),
    reason: z.string().trim().min(1).max(300)
  }),
  word: z.string().trim().min(1).max(40)
});

export type WrappedVibe = z.infer<typeof wrappedVibeSchema>;
