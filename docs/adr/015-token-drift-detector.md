# ADR-015: Design Token Drift Detector

## Status

Accepted — implemented, unreleased

## Date

2026-10-01

## Context

Design-system maintainers lose consistency gradually: app code hardcodes `#1a73e8` or `padding: 12px` instead of using the token (`--color-primary`, `--space-3`). Each instance is small; together they make theme changes and rebrands expensive.

`get_design_tokens` (ADR-002) already extracts token names and resolved values. Nothing compares app code against them.

This serves a different persona than ADR-014 (maintainer, not the agent writing code), so it is a separate tool.

## Decision

Add a `find_token_drift` tool that scans supplied code for literal values that match, or nearly match, a known token value.

```typescript
{
  name: "find_token_drift",
  input: {
    code: string,                 // CSS / SCSS / JSX (inline styles, styled-components, Tailwind arbitrary values)
    filename?: string,            // used for reporting and syntax hints
    categories?: Array<"colors" | "spacing" | "typography" | "shadows" | "radius">,
    tolerance?: number            // color distance (ΔE) / px tolerance for near matches; default 0 = exact only
  },
  output: {
    findings: Array<{
      line: number,
      literal: string,            // "#1a73e8"
      category: string,
      match: "exact" | "near",
      token: string,              // "--color-primary"
      tokenValue: string,
      replacement: string         // "var(--color-primary)"
    }>,
    summary: { exact: number, near: number, byCategory: Record<string, number> }
  }
}
```

- Input is code text, not a repository path: the server has no access to the user's repo, and the agent already has file contents.
- Matching: normalize colors (hex/rgb/hsl to one form), lengths (`px`/`rem` using 16px base unless configured).
- `near` matches are hints, never auto-fix suggestions (an off-by-one gray may be intentional).
- Values that map to several tokens return all candidates; the LLM picks by context.

## Consequences

### Positive

- Reuses ADR-002 extraction; small new surface.
- Works as a review aid for agents and humans; deterministic output.
- Summary counts give maintainers a cheap adoption metric.

### Negative

- Only as good as token extraction; Storybooks without CSS custom properties or a tokens addon yield nothing.
- Literal matching misses computed values (`calc()`, JS-generated colors).
- Per-file input means a full-repo report needs the agent to loop over files.

## Open Questions

- Should the tool accept a glob-style batch (`files: Array<{ name, code }>`) to cut round trips?
- Configurable rem base per instance (ties into ADR-007 multi-instance config)?
