#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config/config.js";
import { createAuthProvider } from "./auth/auth-provider.js";
import { createStoryBookClient } from "./api/storybook-client.js";
import { MemoryCache } from "./cache/memory-cache.js";
import { createStoryRepository } from "./repository/create-story-repository.js";
import { StoryService } from "./services/story-service.js";
import { SearchService } from "./services/search-service.js";
import { ComponentService } from "./services/component-service.js";
import { TokenService } from "./services/token-service.js";
import { DependencyService } from "./services/dependency-service.js";
import { FigmaService } from "./services/figma-service.js";
import { StorybookChunkResolver } from "./storybook/chunk-resolver.js";
import { createMcpServer } from "./mcp/server.js";
import { logInfo } from "./logging/logger.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const authProvider = createAuthProvider(config);
  const client = createStoryBookClient(config, authProvider);
  const cache = new MemoryCache();
  const repository = await createStoryRepository(config, client, cache);
  const chunkResolver = new StorybookChunkResolver(
    client,
    cache,
    config.cacheTtlSeconds,
    config.cacheEnabled,
  );
  const storyService = new StoryService(repository);
  const searchService = new SearchService(repository);
  const componentService = new ComponentService(repository, chunkResolver);
  const tokenService = new TokenService(
    client,
    cache,
    config.cacheTtlSeconds,
    config.cacheEnabled,
  );
  const dependencyService = new DependencyService(repository, chunkResolver);
  const figmaService = new FigmaService(repository, config.figmaMappingPath);
  const server = createMcpServer(
    storyService,
    searchService,
    componentService,
    tokenService,
    dependencyService,
    figmaService,
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  logInfo("mcp_started", {
    baseUrl: config.baseUrl,
    authType: config.authType,
    dataSource: config.dataSource,
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
