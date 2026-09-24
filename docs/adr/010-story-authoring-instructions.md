# ADR-010: Story Authoring Instructions

## Status

Accepted — implemented in v0.3.0

## Date

2026-09-24

## Context

Official Storybook MCP includes `get-storybook-story-instructions`, a static tool returning guidance on how to write good Storybook stories — what props to capture, how to structure argTypes, when to write play functions.

An AI agent that generates a new story for an existing component benefits from a shared authoring convention rather than inventing structure. The content is static and version-agnostic per CSF version.

## Decision

Add a `get_story_instructions` tool that returns an opinionated CSF3 authoring guide covering:

- File naming and co-location conventions
- CSF3 `Meta` / `StoryObj` structure
- What variants and states to capture per component
- `argTypes` guidance (controls, options, descriptions, `table.category`)
- Interaction test skeleton with `play` function
- Anti-patterns to avoid

### Proposed Tool Schema

```typescript
{
  name: "get_story_instructions",
  input: {},
  output: {
    content: string,   // Markdown authoring guide
    version: "csf3"
  }
}
```

## Consequences

### Positive

- Matches feature parity with official Storybook MCP
- Static content — zero external calls, zero cache invalidation concerns
- AI generates stories that follow one consistent house style
- Low implementation cost

### Negative

- Content is opinionated — teams with different conventions must override via CLAUDE.md or agent instructions
- Duplicates official guidance in principle, but tailored for consumer-side generation

### Risks

- Guide drifts from Storybook framework updates over time — needs manual review each Storybook major version
- Prescriptive advice may conflict with team-specific tooling (Vitest-only setups, jest, playwright)

## Alternatives Considered

1. **Fetch guide dynamically from Storybook docs URL** — adds network dependency for static content
2. **Skip entirely** — offloads convention to AI's memory, produces inconsistent output
3. **Configurable via env var / mapping file** — flexible but adds setup burden for no clear win
