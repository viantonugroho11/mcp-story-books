import type { StoryRepository } from "../repository/story-repository.js";
import type { Story, StoryFilter, StoryMetadata, StorySection } from "../domain/story.js";
import { truncateContent } from "../repository/story-mapper.js";

export class StoryService {
  constructor(private readonly repository: StoryRepository) {}

  listStories(filter?: StoryFilter): Promise<Story[]> {
    return this.repository.listStories(filter);
  }

  getStory(storyId: string, maxContentLength?: number): Promise<Story> {
    return this.repository.getStory(storyId).then((story) => ({
      ...story,
      content: story.content ? truncateContent(story.content, maxContentLength) : story.content,
      sections: story.sections.map((section) => ({
        ...section,
        content: truncateContent(section.content, maxContentLength),
      })),
    }));
  }

  getStorySection(storyId: string, sectionId: string): Promise<StorySection> {
    return this.repository.getStorySection(storyId, sectionId);
  }

  getStoryMetadata(storyId: string): Promise<StoryMetadata> {
    return this.repository.getStoryMetadata(storyId);
  }
}
