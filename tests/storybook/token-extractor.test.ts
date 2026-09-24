import { describe, it, expect } from "vitest";
import { extractCssVariables, categorizeToken } from "../../src/storybook/token-extractor.js";

describe("token-extractor", () => {
  it("extracts CSS custom properties with categorization", () => {
    const css = `
      :root {
        --color-primary: #3b82f6;
        --spacing-md: 1rem;
        --font-size-lg: 1.25rem;
        --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
        --radius-md: 8px;
      }
    `;

    const tokens = extractCssVariables(css);

    expect(tokens.length).toBe(5);
    expect(tokens.find((t) => t.name === "--color-primary")?.category).toBe("colors");
    expect(tokens.find((t) => t.name === "--spacing-md")?.category).toBe("spacing");
    expect(tokens.find((t) => t.name === "--font-size-lg")?.category).toBe("typography");
    expect(tokens.find((t) => t.name === "--shadow-sm")?.category).toBe("shadows");
    expect(tokens.find((t) => t.name === "--radius-md")?.category).toBe("radius");
  });

  it("dedupes tokens by name, keeping first occurrence", () => {
    const css = `
      :root { --primary: #fff; }
      [data-theme="dark"] { --primary: #000; }
    `;
    const tokens = extractCssVariables(css);
    expect(tokens.length).toBe(1);
    expect(tokens[0]!.value).toBe("#fff");
  });

  it("categorizes color values by pattern when name is ambiguous", () => {
    expect(categorizeToken("--brand-500", "#ff0088")).toBe("colors");
    expect(categorizeToken("--foo", "rgba(0,0,0,0.5)")).toBe("colors");
    expect(categorizeToken("--foo", "0 4px 8px rgba(0,0,0,0.1)")).toBe("shadows");
  });

  it("falls back to 'other' for unknown patterns", () => {
    expect(categorizeToken("--custom-thing", "some-value")).toBe("other");
  });
});
