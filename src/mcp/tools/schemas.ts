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
