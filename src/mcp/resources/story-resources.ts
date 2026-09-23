import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { StoryService } from "../../services/story-service.js";
import { StoryBookError } from "../../domain/errors.js";

export function registerStoryResources(server: McpServer, storyService: StoryService): void {
  server.registerResource(
    "stories-index",
    "storybook://stories",
    {
      title: "Story Book index",
      description: "Metadata for all stories (no full content).",
      mimeType: "application/json",
    },
    async (uri) => {
      const stories = await storyService.listStories({ limit: 200 });
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(stories, null, 2),
          },
        ],
      };
    },
  );

  server.registerResource(
    "story-by-id",
    new ResourceTemplate("storybook://story/{storyId}", { list: undefined }),
    {
      title: "Story",
      description: "Full story content by id.",
      mimeType: "application/json",
    },
    async (uri, variables) => {
      const storyId = [variables.storyId].flat()[0];
      if (!storyId) {
        throw new StoryBookError("INVALID_RESPONSE", "Missing storyId resource parameter");
      }
      const story = await storyService.getStory(storyId, 50_000);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(story, null, 2),
          },
        ],
      };
    },
  );

  server.registerResource(
    "story-section",
    new ResourceTemplate("storybook://story/{storyId}/section/{sectionId}", { list: undefined }),
    {
      title: "Story section",
      description: "One section from a story.",
      mimeType: "application/json",
    },
    async (uri, variables) => {
      const storyId = [variables.storyId].flat()[0];
      const sectionId = [variables.sectionId].flat()[0];
      if (!storyId) {
        throw new StoryBookError("INVALID_RESPONSE", "Missing storyId resource parameter");
      }
      if (!sectionId) {
        throw new StoryBookError("INVALID_RESPONSE", "Missing sectionId resource parameter");
      }
      const section = await storyService.getStorySection(storyId, sectionId);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(section, null, 2),
          },
        ],
      };
    },
  );
}
