# ADR-017: Local Component Memory (Pre-Deploy Overlay)

## Status

Accepted — implemented in v0.5.0

## Date

2026-10-01

## Context

ADR-016 lets agents generate stories for new components, turning Storybook into agent *output*. But the loop only closes after the user rebuilds and redeploys Storybook. Until then, a new component is invisible to `list_components`, `get_catalog_summary` (ADR-014) and `validate_usage`. In practice:

- Agent A creates `DatePicker` in session 1.
- Agent B (same day, Storybook not redeployed) builds another date picker because the catalog does not show one.

Agents need a memory of components that exist in code but not yet in the deployed Storybook.

## Decision

Add a local, file-backed overlay of "pending" components that is merged into catalog-facing tools.

### Storage

- JSON file at `STORYBOOK_LOCAL_MEMORY` (default `.storybook-mcp/memory.json` in the server's working directory).
- One entry per component: name, import path, description, inferred argTypes, source file path, created timestamp, origin (`scaffold_story` | `remember_component`).
- No network writes; the deployed Storybook stays read-only.

### Tools

```typescript
{
  name: "remember_component",
  input: {
    componentName: string,
    import: string,             // "import { DatePicker } from '@org/ui'"
    description: string,
    componentSource?: string,   // if given, argTypes are inferred (ADR-014 parser)
    sourcePath?: string
  },
  output: { stored: true, entry: PendingComponent }
}

{
  name: "list_pending_components",
  input: {},
  output: { components: PendingComponent[] }
}

{
  name: "forget_component",
  input: { componentName: string },
  output: { removed: boolean }
}
```

- `scaffold_story` (ADR-016) calls `remember_component` implicitly.
- `get_catalog_summary` and `validate_usage` merge pending entries, marked `source: "pending"` so the agent knows they are not yet documented.

### Reconciliation

On index refresh (cache TTL), any pending entry whose name now exists in the deployed `index.json` is dropped automatically. Entries older than a configurable age (default 30 days) are reported as stale in `list_pending_components` rather than deleted.

## Consequences

### Positive

- Closes the latency gap of ADR-016; agents see components created minutes ago.
- Reduces duplicate components across agent sessions.
- Self-cleaning once the real Storybook catches up.

### Negative

- State becomes local to one machine / working directory; teammates do not share it unless the file is committed.
- Pending data is unreviewed and may be wrong; marking it `pending` mitigates but does not remove the risk.
- First tool with write side effects in this server; needs clear docs and an opt-out (`STORYBOOK_LOCAL_MEMORY=off`).

## Open Questions

- Commit `memory.json` to the repo for team sharing, or keep it gitignored by default?
- Scope per Storybook instance once ADR-007 multi-instance lands (key entries by instance id).

## Dependencies

- ADR-014 (catalog summary, parser)
- ADR-016 (scaffold_story)
