# ADR-002: Design Token Extraction

## Status

Proposed

## Date

2026-09-24

## Context

When AI agents generate UI code, they need to use the correct design tokens (colors, spacing, typography, breakpoints) to maintain visual consistency with the existing design system. Currently, the AI must guess or ask the user for these values.

Storybook-based design systems typically expose tokens in one or more of these locations:

- CSS custom properties in the built assets (`--color-primary`, `--spacing-md`)
- Theme configuration files bundled in Storybook's static output
- Dedicated "Design Tokens" addon pages
- `preview.js` / `preview.ts` theme configuration

## Decision

Add a `get_design_tokens` tool that extracts design tokens from the Storybook deployment by:

1. Parsing CSS custom properties from the main stylesheet bundles in `/assets/`
2. Detecting and parsing the Design Tokens addon data if present
3. Extracting theme configuration from Storybook's runtime config

### Proposed Tool Schema

```typescript
{
  name: "get_design_tokens",
  input: {
    category?: "colors" | "spacing" | "typography" | "breakpoints" | "shadows" | "all"
  },
  output: {
    tokens: Array<{
      name: string,        // e.g. "--color-primary"
      value: string,       // e.g. "#3b82f6"
      category: string,    // e.g. "colors"
      source: string       // e.g. "css-variables" | "addon" | "theme"
    }>
  }
}
```

## Consequences

### Positive

- AI generates code using correct design tokens instead of guessing
- Reduces back-and-forth between AI and user about color/spacing values
- Works with any CSS-based design system without special configuration
- High-impact: most frequently needed data when AI generates UI code

### Negative

- CSS variable parsing is heuristic — may include non-token variables
- Token categorization (color vs spacing) requires naming convention detection
- Different Storybook setups expose tokens differently — no single extraction path works for all

### Risks

- Minified CSS bundles may strip variable names or make them unreadable
- Storybook addons store data in varying formats across versions
- Some design systems use JS-only tokens (Tailwind config) not exposed as CSS variables

## Alternatives Considered

1. **Require users to provide a token file path** — Reliable but adds configuration burden
2. **Parse Tailwind/theme config directly** — Framework-specific, not generic
3. **Use the Storybook API addon** — Not all Storybooks have this addon installed
