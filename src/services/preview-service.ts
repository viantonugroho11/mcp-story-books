import type { StoryRepository } from "../repository/story-repository.js";
import { StoryBookError } from "../domain/errors.js";

export interface PreviewResult {
  storyId: string;
  storyTitle: string;
  previewUrl: string;
  managerUrl: string;
  viewport?: { width: number; height: number };
  args?: Record<string, unknown>;
}

export class PreviewService {
  constructor(
    private readonly repository: StoryRepository,
    private readonly baseUrl: string,
  ) {}

  async previewStory(input: {
    storyId: string;
    args?: Record<string, unknown>;
    viewport?: { width: number; height: number };
    globals?: Record<string, unknown>;
  }): Promise<PreviewResult> {
    const story = await this.repository.getStoryMetadata(input.storyId);

    const params = new URLSearchParams();
    params.set("id", story.id);
    params.set("viewMode", "story");

    if (input.args && Object.keys(input.args).length > 0) {
      params.set("args", encodeArgs(input.args));
    }
    if (input.globals && Object.keys(input.globals).length > 0) {
      params.set("globals", encodeArgs(input.globals));
    }

    const previewUrl = joinUrl(this.baseUrl, `/iframe.html?${params.toString()}`);
    const managerParams = new URLSearchParams({ path: `/story/${story.id}` });
    if (input.args && Object.keys(input.args).length > 0) {
      managerParams.set("args", encodeArgs(input.args));
    }
    const managerUrl = joinUrl(this.baseUrl, `/?${managerParams.toString()}`);

    return {
      storyId: story.id,
      storyTitle: story.title,
      previewUrl,
      managerUrl,
      viewport: input.viewport,
      args: input.args,
    };
  }
}

function encodeArgs(args: Record<string, unknown>): string {
  return Object.entries(args)
    .map(([key, value]) => `${escapeArg(key)}:${escapeArg(serializeValue(value))}`)
    .join(";");
}

function serializeValue(value: unknown): string {
  if (value === null) return "!null";
  if (value === undefined) return "!undefined";
  if (typeof value === "boolean") return value ? "!true" : "!false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function escapeArg(value: string): string {
  return value.replace(/[;:"]/g, (c) => `\\${c}`);
}

function joinUrl(base: string, path: string): string {
  const trimmedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const target = new URL(normalizedPath, `${trimmedBase}/`);
  if (target.origin !== new URL(trimmedBase).origin) {
    throw new StoryBookError("FORBIDDEN", "Preview URL must stay on configured STORYBOOK_BASE_URL");
  }
  return target.toString();
}
