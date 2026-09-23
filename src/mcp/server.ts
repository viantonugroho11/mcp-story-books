import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerStoryTools } from "./tools/register-tools.js";
import { registerStoryResources } from "./resources/story-resources.js";
import type { StoryService } from "../services/story-service.js";
import type { SearchService } from "../services/search-service.js";
import type { ComponentService } from "../services/component-service.js";

export function createMcpServer(
  storyService: StoryService,
  searchService: SearchService,
  componentService: ComponentService,
): McpServer {
  const server = new McpServer({
    name: "fds-storybook-mcp",
    version: "0.1.0",
  });

  registerStoryTools(server, storyService, searchService, componentService);
  registerStoryResources(server, storyService);

  return server;
}
