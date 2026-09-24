# ADR-007: Multi-Instance Support

## Status

Proposed

## Date

2026-09-24

## Context

Organizations often run multiple Storybook deployments:

- **Dev/staging/prod** environments of the same design system
- **Multiple design systems** (e.g., internal admin UI vs public-facing UI)
- **Micro-frontend** architectures where each team maintains their own Storybook

Currently, the MCP server connects to a single Storybook URL configured via `STORYBOOK_BASE_URL`. Users who need to reference multiple Storybooks must run separate MCP server instances, each with different configuration.

## Decision

Support multiple Storybook instances in a single MCP server by:

1. Accepting a JSON configuration for multiple instances via `STORYBOOK_INSTANCES` env var
2. Prefixing tool results with the instance name for disambiguation
3. Adding an `instance` parameter to all existing tools
4. Adding a `list_instances` tool to discover configured Storybooks

### Proposed Configuration

```bash
# Single instance (backwards compatible)
STORYBOOK_BASE_URL=https://design-system.example.com

# Multiple instances
STORYBOOK_INSTANCES='[
  {"name": "design-system", "url": "https://ds.example.com", "authType": "basic", "username": "user", "password": "pass"},
  {"name": "admin-ui", "url": "https://admin-ds.example.com", "authType": "bearer", "token": "xxx"},
  {"name": "public-ui", "url": "https://public-ds.example.com", "authType": "none"}
]'
```

### Proposed Tool Addition

```typescript
{
  name: "list_instances",
  input: {},
  output: {
    instances: Array<{
      name: string,
      url: string,
      authType: string,
      componentCount: number,
      status: "connected" | "error"
    }>
  }
}

// All existing tools get optional `instance` parameter
{
  name: "list_stories",
  input: {
    instance?: string  // defaults to first/only instance
  }
}
```

## Consequences

### Positive

- Single MCP server serves all Storybook instances — simpler user configuration
- Enables cross-instance comparison (see ADR-004)
- AI can recommend components from the correct design system based on context
- Backwards compatible — single URL config still works

### Negative

- Increases configuration complexity for multi-instance setups
- Memory usage scales linearly with number of instances (each has its own cache)
- Tool responses need disambiguation when multiple instances have same-named components

### Risks

- Credential management becomes more complex with multiple auth configurations
- JSON env var is fragile — typos break all instances
- Instance names may collide if not validated

## Alternatives Considered

1. **Multiple MCP server instances** — Works but clutters MCP client configuration
2. **Config file instead of env var** — More readable but harder to deploy in containers
3. **Dynamic instance registration via tool** — Flexible but adds state management complexity
