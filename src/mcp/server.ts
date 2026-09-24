import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerStoryTools } from "./tools/register-tools.js";
import { registerStoryResources } from "./resources/story-resources.js";
import type { StoryService } from "../services/story-service.js";
import type { SearchService } from "../services/search-service.js";
import type { ComponentService } from "../services/component-service.js";
import type { TokenService } from "../services/token-service.js";
import type { DependencyService } from "../services/dependency-service.js";
import type { FigmaService } from "../services/figma-service.js";
import type { SourceLookupService } from "../services/source-lookup-service.js";
import type { PreviewService } from "../services/preview-service.js";
import type { InstructionsService } from "../services/instructions-service.js";
import type { UsageService } from "../services/usage-service.js";
import type { CompareService } from "../services/compare-service.js";

export function createMcpServer(
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
): McpServer {
  const server = new McpServer({
    name: "mcp-storybook",
    version: "0.4.0",
  });

  registerStoryTools(
    server,
    storyService,
    searchService,
    componentService,
    tokenService,
    dependencyService,
    figmaService,
    sourceLookupService,
    previewService,
    instructionsService,
    usageService,
    compareService,
  );
  registerStoryResources(server, storyService);

  return server;
}
