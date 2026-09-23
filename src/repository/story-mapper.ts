import type { Story, StoryMetadata, StorySection } from "../domain/story.js";
import { StoryBookError } from "../domain/errors.js";

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((v): v is string => typeof v === "string");
}

function mapSection(raw: unknown, storyId: string, index: number): StorySection | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }
  const obj = raw as Record<string, unknown>;
  const id = asString(obj.id ?? obj.sectionId ?? obj.slug ?? `section-${index + 1}`);
  const title = asString(obj.title ?? obj.name ?? `Section ${index + 1}`);
  const content = asString(
    obj.content ?? obj.body ?? obj.markdown ?? obj.text ?? obj.description,
  );
  return {
    id,
    storyId,
    title,
    content,
    order: typeof obj.order === "number" ? obj.order : index,
  };
}

export function normalizeStory(raw: unknown, fallbackId?: string): Story {
  if (!raw || typeof raw !== "object") {
    throw new StoryBookError("INVALID_RESPONSE", "Story payload is not an object");
  }
  const obj = raw as Record<string, unknown>;
  const id = asString(obj.id ?? obj.storyId ?? obj.slug ?? fallbackId);
  if (!id) {
    throw new StoryBookError("INVALID_RESPONSE", "Story is missing id");
  }

  const sectionsRaw = obj.sections ?? obj.chapters ?? obj.parts ?? [];
  const sections: StorySection[] = [];
  if (Array.isArray(sectionsRaw)) {
    sectionsRaw.forEach((section, index) => {
      const mapped = mapSection(section, id, index);
      if (mapped) {
        sections.push(mapped);
      }
    });
  }

  const tags = asStringArray(obj.tags ?? obj.labels);

  return {
    id,
    title: asString(obj.title ?? obj.name, id),
    slug: asString(obj.slug) || undefined,
    description: asString(obj.description ?? obj.summary) || undefined,
    content: asString(obj.content ?? obj.body ?? obj.markdown) || undefined,
    category: asString(obj.category ?? obj.type) || undefined,
    tags,
    sections,
    metadata: typeof obj.metadata === "object" && obj.metadata ? (obj.metadata as Record<string, unknown>) : {},
    url: asString(obj.url ?? obj.href) || undefined,
    createdAt: asString(obj.createdAt ?? obj.created_at) || undefined,
    updatedAt: asString(obj.updatedAt ?? obj.updated_at) || undefined,
  };
}

export function normalizeStoryList(payload: unknown): Story[] {
  if (Array.isArray(payload)) {
    return payload.map((item, index) => normalizeStory(item, `story-${index + 1}`));
  }
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    const candidates = [obj.stories, obj.items, obj.data, obj.results];
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate.map((item, index) => normalizeStory(item, `story-${index + 1}`));
      }
    }
  }
  throw new StoryBookError("INVALID_RESPONSE", "Unable to parse story list from upstream payload");
}

export function toMetadata(story: Story): StoryMetadata {
  return {
    id: story.id,
    title: story.title,
    slug: story.slug,
    description: story.description,
    category: story.category,
    tags: story.tags,
    url: story.url,
    createdAt: story.createdAt,
    updatedAt: story.updatedAt,
    extra: story.metadata,
  };
}

export function truncateContent(content: string, maxLength?: number): string {
  if (!maxLength || content.length <= maxLength) {
    return content;
  }
  return `${content.slice(0, maxLength)}…`;
}
