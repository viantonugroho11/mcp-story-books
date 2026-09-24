import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerStoryTools } from "./tools/register-tools.js";
import { registerStoryResources } from "./resources/story-resources.js";
import type { StoryService } from "../services/story-service.js";
import type { SearchService } from "../services/search-service.js";
import type { ComponentService } from "../services/component-service.js";
import type { TokenService } from "../services/token-service.js";
import type { DependencyService } from "../services/dependency-service.js";
import type { FigmaService } from "../services/figma-service.js";

export function createMcpServer(
  storyService: StoryService,
  searchService: SearchService,
  componentService: ComponentService,
  tokenService?: TokenService,
  dependencyService?: DependencyService,
  figmaService?: FigmaService,
): McpServer {
  const server = new McpServer({
    name: "mcp-storybook",
    version: "0.1.0",
  });

  registerStoryTools(
    server,
    storyService,
    searchService,
    componentService,
    tokenService,
    dependencyService,
    figmaService,
  );
  registerStoryResources(server, storyService);

  return server;
}
