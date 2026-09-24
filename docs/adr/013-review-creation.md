# ADR-013: Review Creation (review-create equivalent)

## Status

Rejected — vendor-specific feature outside consumer scope

## Date

2026-09-24

## Context

Official Storybook MCP provides `review-create`, which generates and shares curated reviews of current changes with a review-page URL. It requires Storybook's own review feature enabled, which stores review state server-side within Storybook's own infrastructure.

The tool is coupled to:

- A running Storybook dev server that can serve the review page
- A review data store (Storybook-specific backend)
- An identity model for review authors

## Decision

**Do not implement.** The feature is tightly bound to Storybook's own hosted review workflow. Recreating it in a consumer-side MCP server would either:

- Require a separate review backend we control (out of scope for a Storybook reader)
- Duplicate the Storybook review addon's storage (unnecessary and brittle)
- Only work when pointed at a Storybook instance that already has the review addon enabled — in which case use official Storybook MCP for that tool

### Recommendation

Users who need change reviews should use one of:

1. Official Storybook MCP alongside ours (both can be enabled simultaneously — MCP clients namespace tools per server)
2. Git-based PR review flows (`gh pr create`, `gh pr view`) — the standard code review path
3. `compare_versions` (ADR-004) to produce structured diff data that the agent can post to any review destination (Slack, Notion, PR comment)

## Consequences

### Positive

- No coupling to Storybook's review addon
- No vendor-specific data store
- Clear responsibility split: content review via git PR / Slack; component diff via `compare_versions`

### Negative

- Feature gap vs official Storybook MCP for teams that use its review UI
- No single-call "share this review" primitive from our server

### Risks

- Users familiar with Storybook's review flow may expect this tool — documented as intentionally omitted in README compatibility table

## Alternatives Considered

1. **Post to GitHub PR comment** — solves one integration but doesn't generalize; use `mcp__github__*` tools instead
2. **Store reviews in a JSON file** — no persistence guarantees, no sharing story
3. **Compose `compare_versions` + a chat send tool** — already possible via existing MCP servers; no new tool needed
