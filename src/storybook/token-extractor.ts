export interface DesignToken {
  name: string;
  value: string;
  category: TokenCategory;
  source: "css-variables" | "theme" | "addon";
}

export type TokenCategory =
  | "colors"
  | "spacing"
  | "typography"
  | "breakpoints"
  | "shadows"
  | "radius"
  | "motion"
  | "z-index"
  | "other";

const COLOR_PATTERNS = [
  /^(--)?colou?r/i,
  /^(--)?(bg|background|fg|foreground|text|border|fill|stroke)-/i,
  /^(--)?(primary|secondary|tertiary|success|danger|warning|error|info|neutral|gray|grey)/i,
];

const SPACING_PATTERNS = [
  /^(--)?(spacing|space|gap|padding|margin|inset)/i,
  /^(--)?size-/i,
];

const TYPOGRAPHY_PATTERNS = [
  /^(--)?(font|text|typography|line-height|letter-spacing|leading|tracking)/i,
];

const SHADOW_PATTERNS = [/^(--)?(shadow|elevation)/i];
const RADIUS_PATTERNS = [/^(--)?(radius|rounded|border-radius)/i];
const BREAKPOINT_PATTERNS = [/^(--)?(breakpoint|screen|viewport|bp-)/i];
const MOTION_PATTERNS = [/^(--)?(duration|easing|transition|animation|motion)/i];
const Z_INDEX_PATTERNS = [/^(--)?(z-index|z-|layer|elevation-z)/i];

const COLOR_VALUE_PATTERNS = [
  /^#[0-9a-f]{3,8}$/i,
  /^rgba?\(/i,
  /^hsla?\(/i,
  /^oklch\(/i,
  /^oklab\(/i,
  /^color\(/i,
];

function categorizeByName(name: string): TokenCategory | undefined {
  if (COLOR_PATTERNS.some((r) => r.test(name))) return "colors";
  if (SPACING_PATTERNS.some((r) => r.test(name))) return "spacing";
  if (TYPOGRAPHY_PATTERNS.some((r) => r.test(name))) return "typography";
  if (SHADOW_PATTERNS.some((r) => r.test(name))) return "shadows";
  if (RADIUS_PATTERNS.some((r) => r.test(name))) return "radius";
  if (BREAKPOINT_PATTERNS.some((r) => r.test(name))) return "breakpoints";
  if (MOTION_PATTERNS.some((r) => r.test(name))) return "motion";
  if (Z_INDEX_PATTERNS.some((r) => r.test(name))) return "z-index";
  return undefined;
}

function categorizeByValue(value: string): TokenCategory | undefined {
  const trimmed = value.trim();
  if (COLOR_VALUE_PATTERNS.some((r) => r.test(trimmed))) return "colors";
  if (/^-?\d+(\.\d+)?(px|rem|em|vh|vw|%)$/.test(trimmed)) {
    if (/^-?\d+(\.\d+)?(rem|em)$/.test(trimmed)) {
      const num = parseFloat(trimmed);
      if (num < 4) return "spacing";
    }
    return "spacing";
  }
  const parts = trimmed.split(/\s+/);
  const hasLengths = parts.filter((p) => /^-?\d+(\.\d+)?(px|em|rem)$/.test(p)).length >= 2;
  const hasColor = /(rgba?\(|hsla?\(|#[0-9a-f]{3,8})/i.test(trimmed);
  if (hasLengths && hasColor) return "shadows";
  return undefined;
}

export function categorizeToken(name: string, value: string): TokenCategory {
  return categorizeByName(name) ?? categorizeByValue(value) ?? "other";
}

/**
 * Extract CSS custom properties from a stylesheet source string.
 * Handles `:root`, `[data-theme]`, and any selector containing `--foo: value` declarations.
 */
export function extractCssVariables(cssSource: string): DesignToken[] {
  const tokens = new Map<string, DesignToken>();
  const varPattern = /(--[a-zA-Z0-9_-]+)\s*:\s*([^;}]+)[;}]/g;

  for (const match of cssSource.matchAll(varPattern)) {
    const name = match[1];
    const rawValue = match[2];
    if (!name || !rawValue) continue;

    const value = rawValue.trim();
    if (!value || value.length > 500) continue;

    if (tokens.has(name)) continue;

    tokens.set(name, {
      name,
      value,
      category: categorizeToken(name, value),
      source: "css-variables",
    });
  }

  return [...tokens.values()];
}
