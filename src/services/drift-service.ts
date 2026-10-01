import type { TokenService } from "./token-service.js";
import type { DesignToken, TokenCategory } from "../storybook/token-extractor.js";
import {
  colorKey,
  deltaE,
  parseColor,
  parseLengthPx,
  type Rgba,
} from "../storybook/value-normalizer.js";

export type DriftCategory = "colors" | "spacing" | "typography" | "shadows" | "radius";

export interface DriftFinding {
  line: number;
  literal: string;
  category: DriftCategory;
  match: "exact" | "near";
  token: string;
  tokenValue: string;
  replacement: string;
  /** Other tokens with the same value; the caller picks by context. */
  alternatives?: string[];
}

export interface DriftResult {
  findings: DriftFinding[];
  summary: { exact: number; near: number; byCategory: Record<string, number> };
  tokensConsidered: number;
}

interface ResolvedToken {
  token: DesignToken;
  value: string;
  color?: Rgba;
  px?: number;
}

const DRIFT_CATEGORIES: DriftCategory[] = ["colors", "spacing", "typography", "shadows", "radius"];
const LENGTH_CATEGORIES: DriftCategory[] = ["spacing", "radius", "typography"];

const LITERAL_PATTERN =
  /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\([^)]*\)|-?\b\d*\.?\d+(?:px|rem)\b/g;
const VAR_PATTERN = /^var\(\s*(--[\w-]+)\s*(?:,[^)]*)?\)$/;

function resolveValue(name: string, byName: Map<string, DesignToken>, depth = 0): string | undefined {
  const token = byName.get(name);
  if (!token) return undefined;
  const ref = VAR_PATTERN.exec(token.value.trim());
  if (ref && depth < 10) return resolveValue(ref[1]!, byName, depth + 1);
  return token.value.trim();
}

function isInsideVar(line: string, index: number): boolean {
  const before = line.slice(0, index);
  const open = before.lastIndexOf("var(");
  return open !== -1 && before.indexOf(")", open) === -1;
}

/**
 * Finds hardcoded literals that match design token values (ADR-015).
 */
export class DriftService {
  constructor(private readonly tokenService: TokenService) {}

  async findTokenDrift(input: {
    code: string;
    filename?: string;
    categories?: DriftCategory[];
    tolerance?: number;
    remBase?: number;
  }): Promise<DriftResult> {
    const categories = new Set(input.categories?.length ? input.categories : DRIFT_CATEGORIES);
    const tolerance = input.tolerance ?? 0;
    const remBase = input.remBase ?? 16;

    const { tokens } = await this.tokenService.getDesignTokens();
    const byName = new Map(tokens.map((t) => [t.name, t]));
    const resolved: ResolvedToken[] = [];
    for (const token of tokens) {
      if (!categories.has(token.category as DriftCategory)) continue;
      const value = resolveValue(token.name, byName);
      if (!value) continue;
      resolved.push({ token, value, color: parseColor(value), px: parseLengthPx(value, remBase) });
    }

    const findings: DriftFinding[] = [];
    const lines = input.code.split("\n");

    lines.forEach((line, i) => {
      for (const match of line.matchAll(LITERAL_PATTERN)) {
        const literal = match[0];
        if (isInsideVar(line, match.index ?? 0)) continue;

        const color = parseColor(literal);
        if (color) {
          if (!categories.has("colors")) continue;
          const finding = this.matchColor(color, literal, resolved, tolerance);
          if (finding) findings.push({ ...finding, line: i + 1 });
          continue;
        }

        const px = parseLengthPx(literal, remBase);
        if (px === undefined || px === 0) continue;
        const finding = this.matchLength(px, literal, resolved, tolerance);
        if (finding) findings.push({ ...finding, line: i + 1 });
      }
    });

    const byCategory: Record<string, number> = {};
    for (const f of findings) byCategory[f.category] = (byCategory[f.category] ?? 0) + 1;

    return {
      findings,
      summary: {
        exact: findings.filter((f) => f.match === "exact").length,
        near: findings.filter((f) => f.match === "near").length,
        byCategory,
      },
      tokensConsidered: resolved.length,
    };
  }

  private matchColor(
    color: Rgba,
    literal: string,
    tokens: ResolvedToken[],
    tolerance: number,
  ): Omit<DriftFinding, "line"> | undefined {
    const key = colorKey(color);
    const candidates = tokens.filter((t) => t.color && t.token.category === "colors");
    const exact = candidates.filter((t) => colorKey(t.color!) === key);
    if (exact.length > 0) return this.build(literal, "colors", "exact", exact);
    if (tolerance <= 0) return undefined;

    const near = candidates
      .map((t) => ({ t, d: deltaE(color, t.color!) }))
      .filter(({ d }) => d <= tolerance)
      .sort((a, b) => a.d - b.d)
      .map(({ t }) => t);
    return near.length > 0 ? this.build(literal, "colors", "near", near) : undefined;
  }

  private matchLength(
    px: number,
    literal: string,
    tokens: ResolvedToken[],
    tolerance: number,
  ): Omit<DriftFinding, "line"> | undefined {
    const candidates = tokens.filter(
      (t) => t.px !== undefined && LENGTH_CATEGORIES.includes(t.token.category as DriftCategory),
    );
    const exact = candidates.filter((t) => Math.abs(t.px! - px) < 0.01);
    if (exact.length > 0) {
      return this.build(literal, exact[0]!.token.category as DriftCategory, "exact", exact);
    }
    if (tolerance <= 0) return undefined;
    const near = candidates
      .map((t) => ({ t, d: Math.abs(t.px! - px) }))
      .filter(({ d }) => d <= tolerance)
      .sort((a, b) => a.d - b.d)
      .map(({ t }) => t);
    return near.length > 0
      ? this.build(literal, near[0]!.token.category as DriftCategory, "near", near)
      : undefined;
  }

  private build(
    literal: string,
    category: DriftCategory | TokenCategory,
    match: "exact" | "near",
    tokens: ResolvedToken[],
  ): Omit<DriftFinding, "line"> {
    const [first, ...rest] = tokens;
    return {
      literal,
      category: category as DriftCategory,
      match,
      token: first!.token.name,
      tokenValue: first!.value,
      replacement: `var(${first!.token.name})`,
      ...(rest.length > 0 ? { alternatives: rest.map((t) => t.token.name) } : {}),
    };
  }
}
