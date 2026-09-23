export interface StorySection {
  id: string;
  storyId: string;
  title: string;
  content: string;
  order?: number;
}

export interface StoryMetadata {
  id: string;
  title: string;
  slug?: string;
  description?: string;
  category?: string;
  tags: string[];
  url?: string;
  createdAt?: string;
  updatedAt?: string;
  extra: Record<string, unknown>;
}

export interface Story {
  id: string;
  title: string;
  slug?: string;
  description?: string;
  content?: string;
  category?: string;
  tags: string[];
  sections: StorySection[];
  metadata: Record<string, unknown>;
  url?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StoryFilter {
  query?: string;
  category?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface SearchOptions {
  limit?: number;
}

export interface StorySearchResult {
  storyId: string;
  storyTitle: string;
  sectionId?: string;
  sectionTitle?: string;
  snippet: string;
  score?: number;
}

export interface StoryContextResult {
  query: string;
  results: Array<{
    storyId: string;
    storyTitle: string;
    sectionId?: string;
    sectionTitle?: string;
    content: string;
    score?: number;
  }>;
}
