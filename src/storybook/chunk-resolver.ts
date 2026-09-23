import type { StoryBookClient } from "../api/storybook-client.js";
import type { Cache } from "../cache/memory-cache.js";
import { StoryBookError } from "../domain/errors.js";

const IFRAME_PATH = "/iframe.html";
const INDEX_PATH = "/index.json";

export class StorybookChunkResolver {
  private readonly iframeBundleCacheKey = "storybook:iframe-bundle";
  private readonly importMapCacheKey = "storybook:import-map";

  constructor(
    private readonly client: StoryBookClient,
    private readonly cache: Cache,
    private readonly cacheTtlSeconds: number,
    private readonly cacheEnabled: boolean,
  ) {}

  async loadIndex(): Promise<unknown> {
    return this.client.request(INDEX_PATH);
  }

  private async getIframeBundleSource(): Promise<string> {
    if (this.cacheEnabled) {
      const cached = this.cache.get<string>(this.iframeBundleCacheKey);
      if (cached) {
        return cached;
      }
    }

    const iframeHtml = await this.client.requestText(IFRAME_PATH);
    const scriptMatch = iframeHtml.match(/src="\.\/assets\/(iframe-[^"]+\.js)"/);
    if (!scriptMatch?.[1]) {
      throw new StoryBookError("INVALID_RESPONSE", "Unable to locate Storybook iframe bundle");
    }

    const bundle = await this.client.requestText(`/assets/${scriptMatch[1]}`);
    if (this.cacheEnabled) {
      this.cache.set(this.iframeBundleCacheKey, bundle, this.cacheTtlSeconds);
    }
    return bundle;
  }

  private async getImportMap(): Promise<Map<string, string>> {
    if (this.cacheEnabled) {
      const cached = this.cache.get<Record<string, string>>(this.importMapCacheKey);
      if (cached) {
        return new Map(Object.entries(cached));
      }
    }

    const bundle = await this.getIframeBundleSource();
    const map = new Map<string, string>();
    const importPattern =
      /"(\.\/src\/[^"]+)":async\(\)=>[^.]+\(\(\)=>import\("\.\/([^"]+\.js)"\)/g;

    for (const match of bundle.matchAll(importPattern)) {
      const importPath = match[1];
      const chunkFile = match[2];
      if (importPath && chunkFile) {
        map.set(importPath, `/assets/${chunkFile}`);
      }
    }

    if (this.cacheEnabled) {
      this.cache.set(this.importMapCacheKey, Object.fromEntries(map), this.cacheTtlSeconds);
    }

    return map;
  }

  async fetchEntrySource(importPath: string | undefined): Promise<string | undefined> {
    if (!importPath) {
      return undefined;
    }

    const map = await this.getImportMap();
    const assetPath = map.get(importPath);
    if (!assetPath) {
      return undefined;
    }

    const cacheKey = `storybook:chunk:${assetPath}`;
    if (this.cacheEnabled) {
      const cached = this.cache.get<string>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const source = await this.client.requestText(assetPath);
    if (this.cacheEnabled) {
      this.cache.set(cacheKey, source, this.cacheTtlSeconds);
    }
    return source;
  }
}
