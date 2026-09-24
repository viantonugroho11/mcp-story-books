# Architecture Decision Records

| ADR | Title | Status | Shipped In |
|-----|-------|--------|------------|
| [001](001-live-preview-tool.md) | Live Preview Tool | Partial (URL mode) | v0.3.0 |
| [002](002-design-token-extraction.md) | Design Token Extraction | Accepted | v0.2.0 |
| [003](003-component-dependency-graph.md) | Component Dependency Graph | Accepted | v0.2.0 |
| [004](004-version-diff-changelog.md) | Version Diff & Changelog | Accepted | v0.4.0 |
| [005](005-code-snippet-tool.md) | Code Snippet Tool | Accepted | v0.4.0 |
| [006](006-accessibility-audit.md) | Accessibility Audit | Proposed | — |
| [007](007-multi-instance-support.md) | Multi-Instance Support | Proposed | — |
| [008](008-figma-bridge.md) | Figma Bridge | Accepted | v0.2.0 |
| [009](009-source-file-reverse-lookup.md) | Source File Reverse Lookup | Accepted | v0.3.0 |
| [010](010-story-authoring-instructions.md) | Story Authoring Instructions | Accepted | v0.3.0 |
| [011](011-change-detection.md) | Change Detection | **Rejected** — out of scope | — |
| [012](012-test-runner.md) | Test Runner Integration | **Rejected** — out of scope | — |
| [013](013-review-creation.md) | Review Creation | **Rejected** — vendor-specific | — |

## Feature Parity vs Official Storybook MCP

| Official tool | Our equivalent | Status |
|---------------|----------------|--------|
| `docs-list` | `list_components` | ✅ |
| `docs-show` | `get_component` | ✅ |
| `docs-show-story` | `get_story` / `get_story_section` | ✅ |
| `stories-find-by-component` | `find_stories_by_source_file` | ✅ (ADR-009) |
| `stories-preview` | `preview_story` | ✅ URL mode (ADR-001), screenshot deferred |
| `get-storybook-story-instructions` | `get_story_instructions` | ✅ (ADR-010) |
| `stories-changed` | — | ❌ Rejected (ADR-011) |
| `test-run` | — | ❌ Rejected (ADR-012), see ADR-006 for a11y slice |
| `review-create` | — | ❌ Rejected (ADR-013) |

## Priority for Remaining Work

1. **ADR-007 Multi-Instance** — highest enterprise value, cross-env diff use case
2. **ADR-006 Accessibility Audit** — the salvageable slice of `test-run`
3. **ADR-001 screenshot mode** — nice-to-have, +200MB Playwright cost
