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

export const getComponentUsageInputSchema = z.object({
  componentName: z.string().min(1).max(200),
  variant: z.string().min(1).max(200).optional(),
  format: z.enum(["tsx", "jsx"]).optional(),
});

export const compareVersionsInputSchema = z.object({
  baseUrl: z.string().url().max(500),
  targetUrl: z.string().url().max(500).optional(),
  components: z.array(z.string().min(1).max(200)).max(100).optional(),
});

export const getCatalogSummaryInputSchema = z.object({
  category: z.string().min(1).max(200).optional(),
  maxDescriptionLength: z.number().int().min(0).max(1000).optional(),
});

export const validateUsageInputSchema = z.object({
  code: z.string().min(1).max(200_000),
});

export const findTokenDriftInputSchema = z.object({
  code: z.string().min(1).max(200_000),
  filename: z.string().max(500).optional(),
  categories: z
    .array(z.enum(["colors", "spacing", "typography", "shadows", "radius"]))
    .max(5)
    .optional(),
  tolerance: z.number().min(0).max(100).optional(),
  remBase: z.number().positive().max(100).optional(),
});

export const scaffoldStoryInputSchema = z.object({
  componentName: z.string().min(1).max(200).regex(/^[A-Z][A-Za-z0-9_]*$/),
  componentSource: z.string().min(1).max(200_000),
  title: z.string().min(1).max(300).optional(),
  referenceComponent: z.string().min(1).max(200).optional(),
  importPath: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional(),
});

export const rememberComponentInputSchema = z.object({
  componentName: z.string().min(1).max(200).regex(/^[A-Z][A-Za-z0-9_]*$/),
  import: z.string().min(1).max(500),
  description: z.string().max(2000),
  componentSource: z.string().max(200_000).optional(),
  sourcePath: z.string().max(500).optional(),
});

export const listPendingComponentsInputSchema = z.object({});

export const forgetComponentInputSchema = z.object({
  componentName: z.string().min(1).max(200),
});
