# Architecture Decision Records

| ADR | Title | Status | Impact |
|-----|-------|--------|--------|
| [001](001-live-preview-tool.md) | Live Preview Tool | Proposed | High |
| [002](002-design-token-extraction.md) | Design Token Extraction | Proposed | High |
| [003](003-component-dependency-graph.md) | Component Dependency Graph | Proposed | Medium |
| [004](004-version-diff-changelog.md) | Version Diff & Changelog | Proposed | Medium |
| [005](005-code-snippet-tool.md) | Code Snippet Tool | Proposed | High |
| [006](006-accessibility-audit.md) | Accessibility Audit | Proposed | Medium |
| [007](007-multi-instance-support.md) | Multi-Instance Support | Proposed | Medium |
| [008](008-figma-bridge.md) | Figma Bridge | Proposed | Low |

## Priority Recommendation

1. **ADR-002 Design Tokens** + **ADR-005 Code Snippets** — highest impact, most requested by AI agents generating UI
2. **ADR-001 Live Preview** — visual verification capability
3. **ADR-007 Multi-Instance** — enables enterprise use cases
4. **ADR-003 Dependency Graph** + **ADR-004 Version Diff** — component relationship intelligence
5. **ADR-006 Accessibility Audit** — quality gate
6. **ADR-008 Figma Bridge** — design-to-code workflow (depends on Figma API)
