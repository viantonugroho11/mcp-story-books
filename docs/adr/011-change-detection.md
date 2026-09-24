# ADR-011: Change Detection (stories-changed equivalent)

## Status

Rejected — out of scope for a deployed-Storybook reader

## Date

2026-09-24

## Context

Official Storybook MCP provides `stories-changed`, which identifies stories affected by local file modifications. It relies on Storybook running in dev mode with change detection enabled — the addon watches the filesystem and reports diffs.

Our MCP server reads from a deployed Storybook over HTTP with authentication. It has no filesystem access to the source repo, no watch capability, and no notion of "local edits."

## Decision

**Do not implement.** The feature is fundamentally incompatible with our use case (consumer-side, deployed-Storybook access) and would either duplicate git tooling that already exists or require a full filesystem watcher outside the MCP model.

If a similar need arises, users should:

1. Use `git diff --name-only` to list changed files locally
2. Feed each file to `find_stories_by_source_file` (ADR-009) to find matching stories
3. Optionally trigger `preview_story` for each match

This composition gives the same end result — "which stories are affected by my local edits" — without a filesystem watcher inside the MCP server.

## Consequences

### Positive

- No new dependency on filesystem watching, IPC, or CI signals
- Keeps the MCP server stateless and read-only
- Existing tools compose to cover the underlying need

### Negative

- No single tool call answers "what changed?" — user (or agent) must orchestrate two steps
- Requires the user to run `git diff` themselves before calling the MCP

### Risks

- If a future user request truly needs live change detection tied to the running Storybook build, we'd need a companion addon that publishes changes to a persistent endpoint — out of scope for this package

## Alternatives Considered

1. **Poll `index.json` for hash changes** — detects redeployments, not source edits; wrong granularity
2. **Companion Storybook addon** — would require dev-server installation and defeats the "read a deployed Storybook" model
3. **Git hook integration** — belongs in the user's shell, not in an MCP server
