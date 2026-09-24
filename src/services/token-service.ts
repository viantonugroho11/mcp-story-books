import type { StoryBookClient } from "../api/storybook-client.js";
import type { Cache } from "../cache/memory-cache.js";
import { StoryBookError } from "../domain/errors.js";
import {
  extractCssVariables,
  type DesignToken,
  type TokenCategory,
} from "../storybook/token-extractor.js";

const IFRAME_PATH = "/iframe.html";
const TOKENS_CACHE_KEY = "storybook:design-tokens";

export interface DesignTokensResult {
  tokens: DesignToken[];
  sources: string[];
  totalCount: number;
}

export class TokenService {
  constructor(
    private readonly client: StoryBookClient,
    private readonly cache: Cache,
    private readonly cacheTtlSeconds: number,
    private readonly cacheEnabled: boolean,
  ) {}

  async getDesignTokens(options: {
    category?: TokenCategory | "all";
  } = {}): Promise<DesignTokensResult> {
    const all = await this.loadAllTokens();
    const filtered =
      !options.category || options.category === "all"
        ? all.tokens
        : all.tokens.filter((t) => t.category === options.category);

    return {
      tokens: filtered,
      sources: all.sources,
      totalCount: filtered.length,
    };
  }

  private async loadAllTokens(): Promise<{ tokens: DesignToken[]; sources: string[] }> {
    if (this.cacheEnabled) {
      const cached = this.cache.get<{ tokens: DesignToken[]; sources: string[] }>(TOKENS_CACHE_KEY);
      if (cached) return cached;
    }

    const iframeHtml = await this.client.requestText(IFRAME_PATH);
    const cssLinks = this.extractStylesheetPaths(iframeHtml);

    if (cssLinks.length === 0) {
      throw new StoryBookError(
        "NOT_FOUND",
        "No stylesheets found in Storybook iframe. Design tokens require CSS variables.",
      );
    }

    const tokens: DesignToken[] = [];
    const sources: string[] = [];

    for (const cssPath of cssLinks) {
      try {
        const cssSource = await this.client.requestText(cssPath);
        const extracted = extractCssVariables(cssSource);
        if (extracted.length > 0) {
          tokens.push(...extracted);
          sources.push(cssPath);
        }
      } catch {
        // skip stylesheets that fail to load
      }
    }

    const deduped = this.dedupeTokens(tokens);
    const result = { tokens: deduped, sources };

    if (this.cacheEnabled) {
      this.cache.set(TOKENS_CACHE_KEY, result, this.cacheTtlSeconds);
    }

    return result;
  }

  private extractStylesheetPaths(iframeHtml: string): string[] {
    const paths = new Set<string>();
    const linkPattern = /<link[^>]+href="([^"]+\.css[^"]*)"/gi;

    for (const match of iframeHtml.matchAll(linkPattern)) {
      const href = match[1];
      if (!href) continue;
      const normalized = href.startsWith("./") ? href.slice(1) : href;
      if (normalized.startsWith("http")) continue;
      paths.add(normalized.startsWith("/") ? normalized : `/${normalized}`);
    }

    return [...paths];
  }

  private dedupeTokens(tokens: DesignToken[]): DesignToken[] {
    const map = new Map<string, DesignToken>();
    for (const token of tokens) {
      if (!map.has(token.name)) {
        map.set(token.name, token);
      }
    }
    return [...map.values()].sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      return a.name.localeCompare(b.name);
    });
  }
}
