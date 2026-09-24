# ADR-005: Code Snippet Tool

## Status

Proposed

## Date

2026-09-24

## Context

The most common task for an AI using this MCP server is generating component usage code. Currently, the AI reads component metadata and argTypes, then constructs import statements and JSX from scratch. This is error-prone — import paths, component names, and required props may be guessed incorrectly.

Storybook stories are already working code examples. Each story demonstrates a valid component usage with correct imports, props, and composition. Extracting these as copy-paste-ready snippets would give the AI verified, working code.

## Decision

Add a `get_component_usage` tool that extracts ready-to-use code snippets from story source:

1. Parse story CSF source from Storybook's static chunks
2. Extract import statements and component usage from each story
3. Combine into a self-contained, copy-paste-ready snippet
4. Include the minimal required props and commonly used optional props

### Proposed Tool Schema

```typescript
{
  name: "get_component_usage",
  input: {
    componentName: string,
    variant?: string,     // specific story/variant name
    format?: "jsx" | "tsx" // default: "tsx"
  },
  output: {
    import: string,         // e.g. "import { Button } from '@org/ui'"
    usage: string,          // e.g. "<Button variant='primary' size='md'>Click</Button>"
    fullExample: string,    // complete copy-paste snippet with imports
    variants: Array<{
      name: string,
      code: string
    }>
  }
}
```

## Consequences

### Positive

- AI provides verified, working code instead of reconstructed guesses
- Import paths come directly from the source — always correct
- Reduces hallucinated props and incorrect component APIs
- High-impact: directly addresses the most common AI use case

### Negative

- Story source may be compiled/minified in static builds — extraction quality varies
- Some stories use internal test utilities that shouldn't appear in user-facing snippets
- Format conversion (JS to TSX) requires additional transformation logic

### Risks

- Storybook's chunk format may change between versions, breaking extraction
- Stories with complex setup (decorators, providers, mock data) produce noisy snippets
- Auto-generated stories (from autodocs) may not have meaningful source code

## Alternatives Considered

1. **Use Storybook's built-in code panel** — Requires specific addon; not always available
2. **Generate snippets from argTypes only** — Misses import paths and real-world usage patterns
3. **Template-based snippet generation** — Requires per-component templates, doesn't scale
