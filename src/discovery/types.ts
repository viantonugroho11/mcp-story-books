import { z } from "zod";

export const discoveryReportSchema = z.object({
  generatedAt: z.string(),
  baseUrl: z.string().url(),
  framework: z.string().optional(),
  authentication: z.object({
    edgeProtection: z.string().optional(),
    appLevel: z.string().optional(),
  }),
  endpoints: z.object({
    listStories: z.string().optional(),
    getStory: z.string().optional(),
    search: z.string().optional(),
  }),
  notes: z.array(z.string()).default([]),
  probes: z.array(
    z.object({
      path: z.string(),
      status: z.number(),
      contentType: z.string().optional(),
    }),
  ),
});

export type DiscoveryReport = z.infer<typeof discoveryReportSchema>;

export function loadDiscoveryFromEnv(path: string | undefined): DiscoveryReport | undefined {
  if (!path) {
    return undefined;
  }
  // Dynamic import at runtime is avoided; callers read file in repository factory.
  void discoveryReportSchema;
  return undefined;
}
