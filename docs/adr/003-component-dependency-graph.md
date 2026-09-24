# ADR-003: Component Dependency Graph

## Status

Proposed

## Date

2026-09-24

## Context

Design systems have hierarchical component relationships — a `Card` uses `Button`, `Avatar`, and `Typography`; a `Modal` uses `Overlay`, `Card`, and `IconButton`. When an AI modifies or recommends a component, understanding these relationships is critical to avoid breaking dependent components and to suggest complete implementations.

Currently, the MCP server treats each component as isolated. There is no way to ask "what components use Button?" or "what does Modal depend on?".

## Decision

Add a `get_component_dependencies` tool that builds and queries a dependency graph by:

1. Parsing story source files and CSF modules for import statements
2. Analyzing component composition patterns (JSX children, render props)
3. Building a directed graph of component relationships
4. Supporting both "depends on" (downward) and "used by" (upward) queries

### Proposed Tool Schema

```typescript
{
  name: "get_component_dependencies",
  input: {
    componentName: string,
    direction: "dependencies" | "dependents" | "both",
    depth?: number  // default: 1, max: 5
  },
  output: {
    component: string,
    dependencies: Array<{ name: string, type: "composition" | "import" | "prop" }>,
    dependents: Array<{ name: string, type: "composition" | "import" | "prop" }>,
    graph: Record<string, string[]>  // adjacency list for visualization
  }
}
```

## Consequences

### Positive

- AI understands component relationships before making changes
- Enables impact analysis: "changing Button affects these 12 components"
- Helps AI suggest complete component compositions, not just individual components
- Graph data can power visualization tools

### Negative

- Accurate dependency extraction requires parsing source code, not just built output
- Dynamic composition patterns (render props, HOCs, context) are hard to detect statically
- Graph construction adds startup latency if computed eagerly

### Risks

- Storybook static builds may not include raw source files — only compiled chunks
- Import aliases and barrel exports can obscure real dependencies
- Graph may become stale if not rebuilt when Storybook is redeployed

## Alternatives Considered

1. **Manual dependency declaration in story metadata** — Accurate but requires user effort
2. **Runtime analysis via Storybook addon** — Requires addon installation
3. **AST parsing of source repo** — Most accurate but requires source code access, not just Storybook URL
