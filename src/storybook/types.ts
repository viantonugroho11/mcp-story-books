import { z } from "zod";

export const storybookIndexEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  name: z.string(),
  importPath: z.string().optional(),
  type: z.enum(["docs", "story"]),
  tags: z.array(z.string()).optional(),
  componentPath: z.string().optional(),
  storiesImports: z.array(z.string()).optional(),
});

export const storybookIndexSchema = z.object({
  v: z.number(),
  entries: z.record(storybookIndexEntrySchema),
});

export type StorybookIndex = z.infer<typeof storybookIndexSchema>;
export type StorybookIndexEntry = z.infer<typeof storybookIndexEntrySchema>;
