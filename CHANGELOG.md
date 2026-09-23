# Changelog

All notable changes to this project will be documented in this file.

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
