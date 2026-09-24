import { readFile } from "node:fs/promises";
import type { StoryRepository } from "../repository/story-repository.js";
import { StoryBookError } from "../domain/errors.js";

export interface FigmaMapping {
  figmaName: string;
  storybookComponent: string;
  storyId?: string;
  props?: Record<string, unknown>;
}

export interface FigmaMatchResult {
  match: {
    confidence: "exact" | "high" | "medium" | "low";
    storybookComponent: string;
    storyId?: string;
    suggestedProps: Record<string, unknown>;
    importPath?: string;
  } | null;
  alternatives: Array<{
    storybookComponent: string;
    confidence: "exact" | "high" | "medium" | "low";
    reason: string;
  }>;
}

interface ComponentEntry {
  path: string;
  name: string;
  variant: string;
  storyId: string;
  importPath?: string;
}

export class FigmaService {
  private mappingsCache: FigmaMapping[] | null = null;

  constructor(
    private readonly repository: StoryRepository,
    private readonly mappingFilePath: string | undefined,
  ) {}

  async mapFigmaComponent(input: {
    figmaName?: string;
    figmaNodeId?: string;
    figmaUrl?: string;
  }): Promise<FigmaMatchResult> {
    const figmaName = this.resolveFigmaName(input);
    if (!figmaName) {
      throw new StoryBookError(
        "CONFIGURATION_ERROR",
        "One of figmaName, figmaNodeId, or figmaUrl must be provided",
      );
    }

    const explicitMappings = await this.loadExplicitMappings();
    const explicit = explicitMappings.find(
      (m) => m.figmaName.toLowerCase() === figmaName.toLowerCase(),
    );

    const components = await this.buildComponentIndex();

    if (explicit) {
      const entry = this.findComponentEntry(components, explicit.storybookComponent);
      return {
        match: {
          confidence: "exact",
          storybookComponent: explicit.storybookComponent,
          storyId: explicit.storyId ?? entry?.storyId,
          suggestedProps: explicit.props ?? {},
          importPath: entry?.importPath,
        },
        alternatives: [],
      };
    }

    const { componentName, variantParts } = this.parseFigmaConvention(figmaName);
    return this.matchByConvention(components, componentName, variantParts);
  }

  private resolveFigmaName(input: {
    figmaName?: string;
    figmaNodeId?: string;
    figmaUrl?: string;
  }): string | undefined {
    if (input.figmaName) return input.figmaName;
    if (input.figmaUrl) {
      const nameMatch = input.figmaUrl.match(/[?&]node-name=([^&]+)/);
      if (nameMatch?.[1]) return decodeURIComponent(nameMatch[1].replace(/\+/g, " "));
    }
    if (input.figmaNodeId) return input.figmaNodeId;
    return undefined;
  }

  private parseFigmaConvention(figmaName: string): {
    componentName: string;
    variantParts: string[];
  } {
    const parts = figmaName.split(/\s*\/\s*/).map((p) => p.trim()).filter(Boolean);
    const componentName = parts[0] ?? figmaName;
    const variantParts = parts.slice(1);
    return { componentName, variantParts };
  }

  private matchByConvention(
    components: ComponentEntry[],
    componentName: string,
    variantParts: string[],
  ): FigmaMatchResult {
    const normalized = componentName.toLowerCase().replace(/\s+/g, "");

    const exact = components.filter(
      (c) => c.name.toLowerCase() === normalized || c.name.toLowerCase() === componentName.toLowerCase(),
    );

    const scored = components
      .filter((c) => !exact.includes(c))
      .map((c) => ({
        entry: c,
        score: similarity(c.name.toLowerCase(), normalized),
      }))
      .filter((s) => s.score > 0.5)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const alternatives = scored.map((s) => ({
      storybookComponent: s.entry.name,
      confidence: (s.score > 0.85 ? "high" : s.score > 0.7 ? "medium" : "low") as
        | "high"
        | "medium"
        | "low",
      reason: `Name similarity ${(s.score * 100).toFixed(0)}%`,
    }));

    if (exact.length === 0) {
      return { match: null, alternatives };
    }

    const bestVariant = this.pickBestVariant(exact, variantParts);
    const props = this.inferPropsFromVariant(variantParts);

    return {
      match: {
        confidence: variantParts.length === 0 ? "high" : "medium",
        storybookComponent: bestVariant.name,
        storyId: bestVariant.storyId,
        suggestedProps: props,
        importPath: bestVariant.importPath,
      },
      alternatives,
    };
  }

  private pickBestVariant(entries: ComponentEntry[], variantParts: string[]): ComponentEntry {
    if (variantParts.length === 0) return entries[0]!;

    const lowerParts = variantParts.map((p) => p.toLowerCase());
    let best = entries[0]!;
    let bestScore = 0;

    for (const entry of entries) {
      const variantLower = entry.variant.toLowerCase();
      let score = 0;
      for (const part of lowerParts) {
        if (variantLower.includes(part)) score += 1;
      }
      if (score > bestScore) {
        bestScore = score;
        best = entry;
      }
    }

    return best;
  }

  private inferPropsFromVariant(variantParts: string[]): Record<string, unknown> {
    const props: Record<string, unknown> = {};

    for (const part of variantParts) {
      const lower = part.toLowerCase();
      if (/^(xs|sm|md|lg|xl|small|medium|large)$/.test(lower)) {
        props.size = lower;
      } else if (/(primary|secondary|tertiary|ghost|outline|solid|destructive|danger|success)/.test(lower)) {
        props.variant = lower.replace(/\s+/g, "-");
      } else if (/(default|disabled|hover|active|focus|loading)/.test(lower)) {
        props.state = lower;
      } else {
        const key = `variant_${Object.keys(props).length + 1}`;
        props[key] = part;
      }
    }

    return props;
  }

  private findComponentEntry(
    components: ComponentEntry[],
    name: string,
  ): ComponentEntry | undefined {
    return components.find((c) => c.name.toLowerCase() === name.toLowerCase());
  }

  private async buildComponentIndex(): Promise<ComponentEntry[]> {
    const entries = await this.repository.listStories({ limit: 1000 });
    const result: ComponentEntry[] = [];

    for (const entry of entries) {
      const parts = entry.title.split(" / ");
      const path = parts[0] ?? entry.title;
      const variant = parts.slice(1).join(" / ") || "Overview";
      const name = path.split("/").pop() ?? path;

      result.push({
        path,
        name,
        variant,
        storyId: entry.id,
        importPath: typeof entry.metadata.importPath === "string" ? entry.metadata.importPath : undefined,
      });
    }

    return result;
  }

  private async loadExplicitMappings(): Promise<FigmaMapping[]> {
    if (this.mappingsCache) return this.mappingsCache;
    if (!this.mappingFilePath) {
      this.mappingsCache = [];
      return this.mappingsCache;
    }

    try {
      const raw = await readFile(this.mappingFilePath, "utf-8");
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        throw new StoryBookError(
          "INVALID_RESPONSE",
          `Figma mapping file must be a JSON array: ${this.mappingFilePath}`,
        );
      }
      this.mappingsCache = parsed as FigmaMapping[];
      return this.mappingsCache;
    } catch (error) {
      if (error instanceof StoryBookError) throw error;
      throw new StoryBookError(
        "CONFIGURATION_ERROR",
        `Failed to load Figma mapping file: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  const editDistance = levenshtein(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i]![0] = i;
  for (let j = 0; j <= b.length; j++) dp[0]![j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1,
        dp[i]![j - 1]! + 1,
        dp[i - 1]![j - 1]! + cost,
      );
    }
  }

  return dp[a.length]![b.length]!;
}
