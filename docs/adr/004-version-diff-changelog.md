# ADR-004: Version Diff and Changelog Tool

## Status

Proposed

## Date

2026-09-24

## Context

Design systems evolve — components get new props, deprecated variants are removed, APIs change. When a team upgrades their design system, they need to know what changed. Currently, discovering these changes requires manually comparing two Storybook deployments or reading release notes (if they exist).

An AI agent helping with migration needs structured diff data to generate accurate upgrade guides and code modifications.

## Decision

Add a `compare_versions` tool that compares two Storybook deployments and produces a structured changelog:

1. Fetch `index.json` from both Storybook URLs
2. Diff component lists (added, removed, renamed)
3. Compare argTypes/props for changed components
4. Detect story additions/removals per component
5. Optionally compare design tokens between versions

### Proposed Tool Schema

```typescript
{
  name: "compare_versions",
  input: {
    baseUrl: string,      // older version URL
    targetUrl?: string,   // newer version URL (defaults to configured STORYBOOK_BASE_URL)
    components?: string[] // filter to specific components
  },
  output: {
    summary: { added: number, removed: number, modified: number },
    changes: Array<{
      component: string,
      type: "added" | "removed" | "modified",
      details: {
        propsAdded?: string[],
        propsRemoved?: string[],
        propsChanged?: Array<{ name: string, before: string, after: string }>,
        storiesAdded?: string[],
        storiesRemoved?: string[]
      }
    }>
  }
}
```

## Consequences

### Positive

- AI generates precise migration guides with exact prop changes
- Teams can audit design system changes before upgrading
- Structured diff enables automated codemod generation
- Useful for design system maintainers reviewing their own releases

### Negative

- Requires network access to two Storybook deployments simultaneously
- Auth credentials may differ between environments
- Prop type comparison is limited to what argTypes expose (not full TypeScript types)

### Risks

- Older Storybook versions may use different `index.json` formats
- Renamed components appear as "removed + added" without manual mapping
- Deep prop type changes (union types, object shapes) may not be fully captured

## Alternatives Considered

1. **Git-based diff of source code** — More accurate but requires repo access
2. **Storybook changelog addon** — Requires addon installation and maintenance
3. **npm package diff** — Only works for published packages, misses story-level changes
