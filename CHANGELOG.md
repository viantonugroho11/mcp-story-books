# Changelog

All notable changes to this project will be documented in this file.

## [0.3.0] - 2026-09-24

### Added
- `find_stories_by_source_file` tool — reverse lookup from component source file path to matching Storybook stories (exact, basename, and fuzzy match tiers). Closes the gap with official Storybook MCP's `stories-find-by-component`.
- `preview_story` tool — builds Storybook iframe preview URL with encoded args, globals, and viewport. Partial implementation of ADR-001 (URL-only mode).
- `get_story_instructions` tool — returns best-practice CSF3 authoring guide (structure, argTypes, play functions, anti-patterns). Mirrors official Storybook MCP's `get-storybook-story-instructions`.
- Tests for source lookup and preview URL construction.

## [0.2.0] - 2026-09-24

### Added
- `get_design_tokens` tool — extracts CSS custom properties from Storybook stylesheets and categorizes them (colors, spacing, typography, shadows, radius, breakpoints, motion, z-index). Implements ADR-002.
- `get_component_dependencies` tool — builds a component dependency graph from CSF chunk source (imports + JSX composition) with configurable direction and depth. Implements ADR-003.
- `map_figma_component` tool — maps Figma component names / URLs to Storybook components using explicit mapping files or convention-based matching with prop inference. Implements ADR-008.
- `STORYBOOK_FIGMA_MAPPING` env var for pointing at an explicit Figma → Storybook mapping JSON file.
- Tests for token extraction, dependency extraction, and Figma mapping.

## [0.1.0] - 2026-09-24

### Added
- Initial release as `@viantotech/mcp-storybook`
- MCP server for browsing and searching Storybook component libraries
- Authentication support: basic, bearer, cookie, OAuth, none
- Tools: `list_stories`, `search_stories`, `get_story`, `get_story_section`, `get_story_metadata`, `get_story_context`, `list_components`, `get_component`, `get_component_config`
- Resources: `storybook://stories`, `storybook://story/{storyId}`, `storybook://story/{storyId}/section/{sectionId}`
- Storybook 8 static data source (`/index.json` + chunk MDX/stories)
- In-memory caching with configurable TTL
- Docker support
- MIT license

### Changed
- Package renamed from `fds-storybook-mcp` to `@viantotech/mcp-storybook`
- `STORYBOOK_BASE_URL` now required (no hardcoded default)
- Default auth type changed from `basic` to `none`
- Removed runtime `dotenv` dependency — env vars come from MCP client config
