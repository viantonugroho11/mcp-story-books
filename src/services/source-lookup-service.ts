import type { StoryRepository } from "../repository/story-repository.js";

export interface SourceLookupMatch {
  storyId: string;
  storyTitle: string;
  componentPath: string;
  variantName: string;
  importPath: string;
  matchType: "exact" | "basename" | "fuzzy";
}

export interface SourceLookupResult {
  sourceFile: string;
  matches: SourceLookupMatch[];
}

export class SourceLookupService {
  constructor(private readonly repository: StoryRepository) {}

  async findStoriesBySourceFile(sourceFile: string): Promise<SourceLookupResult> {
    const entries = await this.repository.listStories({ limit: 1000 });
    const normalized = normalize(sourceFile);
    const basename = basenameOf(normalized);
    const componentGuess = componentNameFromFile(normalized);

    const matches: SourceLookupMatch[] = [];

    for (const entry of entries) {
      const importPath = entry.metadata.importPath;
      if (typeof importPath !== "string") continue;

      const importNormalized = normalize(importPath);
      const importBasename = basenameOf(importNormalized);
      const parts = entry.title.split(" / ");
      const componentPath = parts[0] ?? entry.title;
      const variantName = parts.slice(1).join(" / ") || "Overview";

      let matchType: SourceLookupMatch["matchType"] | undefined;

      if (importNormalized === normalized || importNormalized.endsWith(normalized)) {
        matchType = "exact";
      } else if (
        importBasename === basename ||
        stripStoriesSuffix(importBasename) === stripStoriesSuffix(basename)
      ) {
        matchType = "basename";
      } else if (
        componentGuess &&
        componentPath.toLowerCase().endsWith(componentGuess.toLowerCase())
      ) {
        matchType = "fuzzy";
      }

      if (!matchType) continue;

      matches.push({
        storyId: entry.id,
        storyTitle: entry.title,
        componentPath,
        variantName,
        importPath,
        matchType,
      });
    }

    matches.sort((a, b) => rank(a.matchType) - rank(b.matchType));

    return { sourceFile, matches };
  }
}

function normalize(path: string): string {
  return path.replace(/^\.\//, "").replace(/\\/g, "/").trim();
}

function basenameOf(path: string): string {
  const idx = path.lastIndexOf("/");
  return idx >= 0 ? path.slice(idx + 1) : path;
}

function stripStoriesSuffix(basename: string): string {
  return basename
    .replace(/\.(stories|story)\.(tsx?|jsx?|mdx)$/, "")
    .replace(/\.(tsx?|jsx?|mdx)$/, "");
}

function componentNameFromFile(path: string): string | undefined {
  const base = stripStoriesSuffix(basenameOf(path));
  if (!base) return undefined;
  if (!/^[A-Z]/.test(base)) return undefined;
  return base;
}

function rank(type: SourceLookupMatch["matchType"]): number {
  switch (type) {
    case "exact":
      return 0;
    case "basename":
      return 1;
    case "fuzzy":
      return 2;
  }
}
