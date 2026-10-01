import { describe, it, expect } from "vitest";
import { DriftService } from "../../src/services/drift-service.js";
import type { TokenService } from "../../src/services/token-service.js";
import type { DesignToken } from "../../src/storybook/token-extractor.js";
import { parseColor, colorKey, parseLengthPx } from "../../src/storybook/value-normalizer.js";

const tokens: DesignToken[] = [
  { name: "--blue-500", value: "#1A73E8", category: "colors", source: "css-variables" },
  { name: "--color-primary", value: "var(--blue-500)", category: "colors", source: "css-variables" },
  { name: "--space-3", value: "0.75rem", category: "spacing", source: "css-variables" },
  { name: "--radius-md", value: "8px", category: "radius", source: "css-variables" },
];

const service = new DriftService({
  async getDesignTokens() {
    return { tokens, sources: [], totalCount: tokens.length };
  },
} as unknown as TokenService);

describe("value-normalizer", () => {
  it("normalizes hex, rgb, and hsl to the same key", () => {
    expect(colorKey(parseColor("#1a73e8")!)).toBe("#1a73e8");
    expect(colorKey(parseColor("rgb(26, 115, 232)")!)).toBe("#1a73e8");
    expect(colorKey(parseColor("#fff")!)).toBe("#ffffff");
    expect(colorKey(parseColor("hsl(0, 100%, 50%)")!)).toBe("#ff0000");
    expect(parseLengthPx("0.75rem")).toBe(12);
  });
});

describe("DriftService", () => {
  it("finds exact color and length matches with resolved var() tokens", async () => {
    const code = [
      `.btn { color: rgb(26, 115, 232); padding: 12px; }`,
      `.card { border-radius: 8px; margin: 0px; background: var(--x, #1a73e8); }`,
    ].join("\n");
    const result = await service.findTokenDrift({ code });

    expect(result.findings).toEqual([
      expect.objectContaining({
        line: 1,
        literal: "rgb(26, 115, 232)",
        match: "exact",
        token: "--blue-500",
        alternatives: ["--color-primary"],
        replacement: "var(--blue-500)",
      }),
      expect.objectContaining({ line: 1, literal: "12px", token: "--space-3", category: "spacing" }),
      expect.objectContaining({ line: 2, literal: "8px", token: "--radius-md", category: "radius" }),
    ]);
    expect(result.summary).toEqual({ exact: 3, near: 0, byCategory: { colors: 1, spacing: 1, radius: 1 } });
  });

  it("reports near matches only with tolerance and respects categories", async () => {
    const code = `color: #1b74e9; padding: 13px;`;
    expect((await service.findTokenDrift({ code })).findings).toHaveLength(0);

    const near = await service.findTokenDrift({ code, tolerance: 2, categories: ["colors"] });
    expect(near.findings).toEqual([expect.objectContaining({ match: "near", token: "--blue-500" })]);
  });
});
