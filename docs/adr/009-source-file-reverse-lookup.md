# ADR-009: Source File Reverse Lookup

## Status

Accepted — implemented in v0.3.0

## Date

2026-09-24

## Context

Official Storybook MCP provides `stories-find-by-component` — a reverse lookup from a component source file path to its stories, backed by Storybook's dependency graph. AI agents editing code in `src/components/Button.tsx` need to know which stories cover that file to run tests, add new variants, or verify changes visually.

Our MCP server reads from a deployed Storybook and does not have access to Storybook's internal reverse dependency graph. However, each story entry in `index.json` carries an `importPath` field pointing at the story source file (usually `Button.stories.tsx`), which is co-located with the component.

## Decision

Add a `find_stories_by_source_file` tool that maps a source file path to matching stories using three match tiers:

1. **Exact** — the input path equals or is a suffix of an `importPath`
2. **Basename** — the file basename (with `.stories` suffix stripped) matches
3. **Fuzzy** — the guessed component name (derived from PascalCase filename) matches the tail of a component title path

### Proposed Tool Schema

```typescript
{
  name: "find_stories_by_source_file",
  input: {
    sourceFile: string  // e.g. "src/components/Button.tsx"
  },
  output: {
    sourceFile: string,
    matches: Array<{
      storyId: string,
      storyTitle: string,
      componentPath: string,
      variantName: string,
      importPath: string,
      matchType: "exact" | "basename" | "fuzzy"
    }>
  }
}
```

## Consequences

### Positive

- Closes feature parity gap with official Storybook MCP's `stories-find-by-component`
- Works purely from `index.json` metadata — no chunk parsing needed
- Handles co-located `Button.tsx` ↔ `Button.stories.tsx` convention out of the box
- Three-tier match strategy handles path variations across monorepo layouts

### Negative

- Cannot follow re-exports or barrel files — pure filename-based matching
- Fuzzy tier can produce false positives when component names overlap
- Assumes the co-location convention; teams that split stories into separate directories may see basename matches only

### Risks

- Component names shared across categories (e.g. two `Menu` components in different folders) will collide
- Non-standard Storybook `importPath` values (absolute paths, aliases) may skip exact matches

## Alternatives Considered

1. **Require full source parsing** — would need cloning the repo; out of scope for a deployed-Storybook reader
2. **Match only by exact path** — misses common cases like `apps/web/src/components/Button.tsx` vs `./src/Button.stories.tsx`
3. **Require user-provided mapping file** — pushes work onto the user
