import type {
  SearchOptions,
  Story,
  StoryFilter,
  StoryMetadata,
  StorySearchResult,
  StorySection,
} from "../domain/story.js";

export interface StoryRepository {
  listStories(filter?: StoryFilter): Promise<Story[]>;
  getStory(storyId: string): Promise<Story>;
  searchStories(query: string, options?: SearchOptions): Promise<StorySearchResult[]>;
  getStorySection(storyId: string, sectionId: string): Promise<StorySection>;
  getStoryMetadata(storyId: string): Promise<StoryMetadata>;
}
