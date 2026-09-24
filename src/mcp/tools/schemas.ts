import { z } from "zod";

export const listStoriesInputSchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional(),
});

export const searchStoriesInputSchema = z.object({
  query: z.string().min(1).max(500),
  limit: z.number().int().min(1).max(100).optional(),
});

export const getStoryInputSchema = z.object({
  storyId: z.string().min(1).max(200),
  maxContentLength: z.number().int().min(100).max(100_000).optional(),
});

export const getStorySectionInputSchema = z.object({
  storyId: z.string().min(1).max(200),
  sectionId: z.string().min(1).max(200),
});

export const getStoryMetadataInputSchema = z.object({
  storyId: z.string().min(1).max(200),
});

export const getStoryContextInputSchema = z.object({
  query: z.string().min(1).max(1000),
  storyId: z.string().min(1).max(200).optional(),
  maxResults: z.number().int().min(1).max(20).optional(),
});

export const listComponentsInputSchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional(),
});

export const getComponentInputSchema = z.object({
  component: z.string().min(1).max(200),
  includeOverviewContent: z.boolean().optional(),
  maxContentLength: z.number().int().min(100).max(100_000).optional(),
});

export const getComponentConfigInputSchema = z.object({
  component: z.string().min(1).max(200),
});

export const tokenCategorySchema = z.enum([
  "colors",
  "spacing",
  "typography",
  "breakpoints",
  "shadows",
  "radius",
  "motion",
  "z-index",
  "other",
  "all",
]);

export const getDesignTokensInputSchema = z.object({
  category: tokenCategorySchema.optional(),
});

export const getComponentDependenciesInputSchema = z.object({
  componentName: z.string().min(1).max(200),
  direction: z.enum(["dependencies", "dependents", "both"]).optional(),
  depth: z.number().int().min(1).max(5).optional(),
});

export const mapFigmaComponentInputSchema = z.object({
  figmaName: z.string().min(1).max(500).optional(),
  figmaNodeId: z.string().min(1).max(200).optional(),
  figmaUrl: z.string().url().max(1000).optional(),
});

export const findStoriesBySourceFileInputSchema = z.object({
  sourceFile: z.string().min(1).max(500),
});

export const previewStoryInputSchema = z.object({
  storyId: z.string().min(1).max(200),
  args: z.record(z.unknown()).optional(),
  globals: z.record(z.unknown()).optional(),
  viewport: z
    .object({
      width: z.number().int().min(1).max(10_000),
      height: z.number().int().min(1).max(10_000),
    })
    .optional(),
});

export const getStoryInstructionsInputSchema = z.object({});
