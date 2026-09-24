import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { StoryService } from "../../services/story-service.js";
import type { SearchService } from "../../services/search-service.js";
import type { ComponentService } from "../../services/component-service.js";
import type { TokenService } from "../../services/token-service.js";
import type { DependencyService } from "../../services/dependency-service.js";
import type { FigmaService } from "../../services/figma-service.js";
import type { SourceLookupService } from "../../services/source-lookup-service.js";
import type { PreviewService } from "../../services/preview-service.js";
import type { InstructionsService } from "../../services/instructions-service.js";
import type { UsageService } from "../../services/usage-service.js";
import type { CompareService } from "../../services/compare-service.js";
import { logError, logInfo } from "../../logging/logger.js";
import { StoryBookError } from "../../domain/errors.js";
import {
  compareVersionsInputSchema,
  findStoriesBySourceFileInputSchema,
  getComponentConfigInputSchema,
  getComponentDependenciesInputSchema,
  getComponentInputSchema,
  getComponentUsageInputSchema,
  getDesignTokensInputSchema,
  getStoryContextInputSchema,
  getStoryInputSchema,
  getStoryInstructionsInputSchema,
  getStoryMetadataInputSchema,
  getStorySectionInputSchema,
  listComponentsInputSchema,
  listStoriesInputSchema,
  mapFigmaComponentInputSchema,
  previewStoryInputSchema,
  searchStoriesInputSchema,
} from "./schemas.js";

function toolError(error: unknown): { content: [{ type: "text"; text: string }]; isError: true } {
  if (error instanceof StoryBookError) {
    return {
      isError: true,
      content: [{ type: "text", text: `${error.code}: ${error.message}` }],
    };
  }
  return {
    isError: true,
    content: [
      {
        type: "text",
        text: error instanceof Error ? error.message : "Unknown error",
      },
    ],
  };
}

export function registerStoryTools(
  server: McpServer,
  storyService: StoryService,
  searchService: SearchService,
  componentService: ComponentService,
  tokenService?: TokenService,
  dependencyService?: DependencyService,
  figmaService?: FigmaService,
  sourceLookupService?: SourceLookupService,
  previewService?: PreviewService,
  instructionsService?: InstructionsService,
  usageService?: UsageService,
  compareService?: CompareService,
): void {
  server.registerTool(
    "list_stories",
    {
      description: "List Story Book entries (metadata only, no full content).",
      inputSchema: listStoriesInputSchema.shape,
    },
    async (input) => {
      const started = Date.now();
      try {
        const parsed = listStoriesInputSchema.parse(input);
        const stories = await storyService.listStories(parsed);
        logInfo("tool_success", { tool: "list_stories", durationMs: Date.now() - started, count: stories.length });
        return {
          content: [{ type: "text", text: JSON.stringify(stories, null, 2) }],
        };
      } catch (error) {
        logError("tool_error", { tool: "list_stories", durationMs: Date.now() - started });
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "search_stories",
    {
      description: "Search stories by title, description, tags, sections, and content.",
      inputSchema: searchStoriesInputSchema.shape,
    },
    async (input) => {
      const started = Date.now();
      try {
        const parsed = searchStoriesInputSchema.parse(input);
        const results = await searchService.searchStories(parsed.query, parsed.limit);
        logInfo("tool_success", { tool: "search_stories", durationMs: Date.now() - started, count: results.length });
        return {
          content: [{ type: "text", text: JSON.stringify({ results }, null, 2) }],
        };
      } catch (error) {
        logError("tool_error", { tool: "search_stories", durationMs: Date.now() - started });
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "get_story",
    {
      description: "Get a full story with optional content length cap.",
      inputSchema: getStoryInputSchema.shape,
    },
    async (input) => {
      const started = Date.now();
      try {
        const parsed = getStoryInputSchema.parse(input);
        const story = await storyService.getStory(parsed.storyId, parsed.maxContentLength);
        logInfo("tool_success", { tool: "get_story", storyId: parsed.storyId, durationMs: Date.now() - started });
        return {
          content: [{ type: "text", text: JSON.stringify(story, null, 2) }],
        };
      } catch (error) {
        logError("tool_error", { tool: "get_story", durationMs: Date.now() - started });
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "get_story_section",
    {
      description: "Get one section from a story.",
      inputSchema: getStorySectionInputSchema.shape,
    },
    async (input) => {
      const started = Date.now();
      try {
        const parsed = getStorySectionInputSchema.parse(input);
        const section = await storyService.getStorySection(parsed.storyId, parsed.sectionId);
        logInfo("tool_success", {
          tool: "get_story_section",
          storyId: parsed.storyId,
          sectionId: parsed.sectionId,
          durationMs: Date.now() - started,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(section, null, 2) }],
        };
      } catch (error) {
        logError("tool_error", { tool: "get_story_section", durationMs: Date.now() - started });
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "get_story_metadata",
    {
      description: "Get story metadata without loading full content.",
      inputSchema: getStoryMetadataInputSchema.shape,
    },
    async (input) => {
      const started = Date.now();
      try {
        const parsed = getStoryMetadataInputSchema.parse(input);
        const metadata = await storyService.getStoryMetadata(parsed.storyId);
        logInfo("tool_success", { tool: "get_story_metadata", storyId: parsed.storyId, durationMs: Date.now() - started });
        return {
          content: [{ type: "text", text: JSON.stringify(metadata, null, 2) }],
        };
      } catch (error) {
        logError("tool_error", { tool: "get_story_metadata", durationMs: Date.now() - started });
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "list_components",
    {
      description:
        "List UI components from Storybook (grouped), e.g. Components/Button, Components/Alert. Metadata only.",
      inputSchema: listComponentsInputSchema.shape,
    },
    async (input) => {
      const started = Date.now();
      try {
        const parsed = listComponentsInputSchema.parse(input);
        const components = await componentService.listComponents(parsed);
        logInfo("tool_success", {
          tool: "list_components",
          durationMs: Date.now() - started,
          count: components.length,
        });
        return {
          content: [{ type: "text", text: JSON.stringify({ components }, null, 2) }],
        };
      } catch (error) {
        logError("tool_error", { tool: "list_components", durationMs: Date.now() - started });
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "get_component",
    {
      description:
        "Get one component by name or path (Alert, Components/Alert). Includes docs overview and story variant ids.",
      inputSchema: getComponentInputSchema.shape,
    },
    async (input) => {
      const started = Date.now();
      try {
        const parsed = getComponentInputSchema.parse(input);
        const detail = await componentService.getComponent(parsed.component, {
          includeOverviewContent: parsed.includeOverviewContent,
          maxContentLength: parsed.maxContentLength,
        });
        logInfo("tool_success", {
          tool: "get_component",
          component: parsed.component,
          durationMs: Date.now() - started,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(detail, null, 2) }],
        };
      } catch (error) {
        logError("tool_error", { tool: "get_component", durationMs: Date.now() - started });
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "get_component_config",
    {
      description:
        "Storybook Controls config per component: argTypes (variant, size, …) and stylePresets (Default, Secondary, …) with args.",
      inputSchema: getComponentConfigInputSchema.shape,
    },
    async (input) => {
      const started = Date.now();
      try {
        const parsed = getComponentConfigInputSchema.parse(input);
        const config = await componentService.getComponentConfig(parsed.component);
        logInfo("tool_success", {
          tool: "get_component_config",
          component: parsed.component,
          durationMs: Date.now() - started,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(config, null, 2) }],
        };
      } catch (error) {
        logError("tool_error", { tool: "get_component_config", durationMs: Date.now() - started });
        return toolError(error);
      }
    },
  );

  if (tokenService) {
    server.registerTool(
      "get_design_tokens",
      {
        description:
          "Extract design tokens (colors, spacing, typography, shadows, etc.) from Storybook CSS variables.",
        inputSchema: getDesignTokensInputSchema.shape,
      },
      async (input) => {
        const started = Date.now();
        try {
          const parsed = getDesignTokensInputSchema.parse(input);
          const result = await tokenService.getDesignTokens({ category: parsed.category });
          logInfo("tool_success", {
            tool: "get_design_tokens",
            durationMs: Date.now() - started,
            count: result.totalCount,
          });
          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        } catch (error) {
          logError("tool_error", { tool: "get_design_tokens", durationMs: Date.now() - started });
          return toolError(error);
        }
      },
    );
  }

  if (dependencyService) {
    server.registerTool(
      "get_component_dependencies",
      {
        description:
          "Get component dependency graph: which components a component uses, and which components use it.",
        inputSchema: getComponentDependenciesInputSchema.shape,
      },
      async (input) => {
        const started = Date.now();
        try {
          const parsed = getComponentDependenciesInputSchema.parse(input);
          const result = await dependencyService.getDependencies(parsed.componentName, {
            direction: parsed.direction,
            depth: parsed.depth,
          });
          logInfo("tool_success", {
            tool: "get_component_dependencies",
            component: parsed.componentName,
            durationMs: Date.now() - started,
          });
          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        } catch (error) {
          logError("tool_error", {
            tool: "get_component_dependencies",
            durationMs: Date.now() - started,
          });
          return toolError(error);
        }
      },
    );
  }

  if (figmaService) {
    server.registerTool(
      "map_figma_component",
      {
        description:
          "Map a Figma component name/node/URL to the corresponding Storybook component with suggested props.",
        inputSchema: mapFigmaComponentInputSchema.shape,
      },
      async (input) => {
        const started = Date.now();
        try {
          const parsed = mapFigmaComponentInputSchema.parse(input);
          const result = await figmaService.mapFigmaComponent(parsed);
          logInfo("tool_success", {
            tool: "map_figma_component",
            durationMs: Date.now() - started,
          });
          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        } catch (error) {
          logError("tool_error", { tool: "map_figma_component", durationMs: Date.now() - started });
          return toolError(error);
        }
      },
    );
  }

  if (sourceLookupService) {
    server.registerTool(
      "find_stories_by_source_file",
      {
        description:
          "Reverse lookup: given a component source file path, find matching Storybook stories.",
        inputSchema: findStoriesBySourceFileInputSchema.shape,
      },
      async (input) => {
        const started = Date.now();
        try {
          const parsed = findStoriesBySourceFileInputSchema.parse(input);
          const result = await sourceLookupService.findStoriesBySourceFile(parsed.sourceFile);
          logInfo("tool_success", {
            tool: "find_stories_by_source_file",
            durationMs: Date.now() - started,
            count: result.matches.length,
          });
          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        } catch (error) {
          logError("tool_error", {
            tool: "find_stories_by_source_file",
            durationMs: Date.now() - started,
          });
          return toolError(error);
        }
      },
    );
  }

  if (previewService) {
    server.registerTool(
      "preview_story",
      {
        description:
          "Build a Storybook iframe preview URL for a story with optional args, globals, and viewport.",
        inputSchema: previewStoryInputSchema.shape,
      },
      async (input) => {
        const started = Date.now();
        try {
          const parsed = previewStoryInputSchema.parse(input);
          const result = await previewService.previewStory(parsed);
          logInfo("tool_success", {
            tool: "preview_story",
            storyId: parsed.storyId,
            durationMs: Date.now() - started,
          });
          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        } catch (error) {
          logError("tool_error", { tool: "preview_story", durationMs: Date.now() - started });
          return toolError(error);
        }
      },
    );
  }

  if (instructionsService) {
    server.registerTool(
      "get_story_instructions",
      {
        description:
          "Get best-practice instructions for writing Storybook stories (CSF3, argTypes, play functions).",
        inputSchema: getStoryInstructionsInputSchema.shape,
      },
      async () => {
        const started = Date.now();
        try {
          const result = instructionsService.getInstructions();
          logInfo("tool_success", {
            tool: "get_story_instructions",
            durationMs: Date.now() - started,
          });
          return {
            content: [{ type: "text", text: result.content }],
          };
        } catch (error) {
          logError("tool_error", {
            tool: "get_story_instructions",
            durationMs: Date.now() - started,
          });
          return toolError(error);
        }
      },
    );
  }

  if (usageService) {
    server.registerTool(
      "get_component_usage",
      {
        description:
          "Get copy-paste-ready component usage code (import + JSX) built from story argTypes and preset args.",
        inputSchema: getComponentUsageInputSchema.shape,
      },
      async (input) => {
        const started = Date.now();
        try {
          const parsed = getComponentUsageInputSchema.parse(input);
          const result = await usageService.getComponentUsage(parsed);
          logInfo("tool_success", {
            tool: "get_component_usage",
            component: parsed.componentName,
            durationMs: Date.now() - started,
          });
          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        } catch (error) {
          logError("tool_error", {
            tool: "get_component_usage",
            durationMs: Date.now() - started,
          });
          return toolError(error);
        }
      },
    );
  }

  if (compareService) {
    server.registerTool(
      "compare_versions",
      {
        description:
          "Compare two Storybook deployments and return structured diff (added/removed/modified components, prop changes).",
        inputSchema: compareVersionsInputSchema.shape,
      },
      async (input) => {
        const started = Date.now();
        try {
          const parsed = compareVersionsInputSchema.parse(input);
          const result = await compareService.compareVersions(parsed);
          logInfo("tool_success", {
            tool: "compare_versions",
            durationMs: Date.now() - started,
            changes: result.changes.length,
          });
          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        } catch (error) {
          logError("tool_error", { tool: "compare_versions", durationMs: Date.now() - started });
          return toolError(error);
        }
      },
    );
  }

  server.registerTool(
    "get_story_context",
    {
      description: "Retrieve concise Story Book context for a natural-language question.",
      inputSchema: getStoryContextInputSchema.shape,
    },
    async (input) => {
      const started = Date.now();
      try {
        const parsed = getStoryContextInputSchema.parse(input);
        const context = await searchService.getStoryContext(parsed.query, {
          storyId: parsed.storyId,
          maxResults: parsed.maxResults,
        });
        logInfo("tool_success", {
          tool: "get_story_context",
          durationMs: Date.now() - started,
          count: context.results.length,
        });
        return {
          content: [{ type: "text", text: JSON.stringify(context, null, 2) }],
        };
      } catch (error) {
        logError("tool_error", { tool: "get_story_context", durationMs: Date.now() - started });
        return toolError(error);
      }
    },
  );
}
