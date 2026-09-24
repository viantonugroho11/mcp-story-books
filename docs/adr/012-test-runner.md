# ADR-012: Test Runner Integration (test-run equivalent)

## Status

Rejected — out of scope for a deployed-Storybook reader

## Date

2026-09-24

## Context

Official Storybook MCP provides `test-run`, which executes tests for specific stories via Storybook's test runner (Vitest + Playwright). Results include accessibility violations if `@storybook/addon-a11y` is configured.

Executing tests requires:

- The component source code and story files locally
- A configured test runner in the repo
- A browser (Playwright / Chromium)
- Node process management to spawn the runner and stream results

None of these are available to an MCP server that reads a deployed Storybook over HTTP.

## Decision

**Do not implement.** Running the Storybook test runner is a dev-time concern owned by the repo's own tooling. An MCP server that reads deployed static assets cannot execute the code it reads.

Recommended alternative composition when an AI agent needs test coverage information:

1. Use `get_story_instructions` (ADR-010) to generate a `play` function
2. Have the agent add the story to the local repo
3. Run `npm run test-storybook` (or equivalent) in the user's own shell
4. Optionally: implement ADR-013 (Accessibility Audit) for a11y-only checks via a headless browser against the deployed URL

The a11y slice is worth doing separately (ADR-013 covers it) because it can run against a deployed URL without needing source code. The rest of `test-run` cannot.

## Consequences

### Positive

- No headless browser dependency in the base package
- No runner installation, no repo requirements
- Clear boundary: MCP reads, user tooling runs tests

### Negative

- Feature gap vs official Storybook MCP for teams that expected test execution
- Users who want AI-driven test loops need to invoke tests in their own shell

### Risks

- If AI agents assume `test-run` exists (because official Storybook MCP has it), they may fail silently when composing multi-tool workflows — documented explicitly in README

## Alternatives Considered

1. **Bundle Playwright** — adds ~200MB to package, slow install, security surface
2. **Delegate to a remote runner service** — introduces auth, network, and vendor lock-in
3. **Static test result caching** — assumes tests ran elsewhere; needs a place to store results, out of scope
