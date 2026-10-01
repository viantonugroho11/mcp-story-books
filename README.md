# @viantotech/mcp-storybook

MCP server for browsing and searching **Storybook** component libraries with authentication support.

Reads Storybook 8 static data (`/index.json` + chunk MDX/stories in `/assets/*`).

## Install

```bash
npm install -g @viantotech/mcp-storybook
```

Or use directly with `npx`:

```bash
npx @viantotech/mcp-storybook
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `STORYBOOK_BASE_URL` | **Yes** | URL of your Storybook deployment |
| `STORYBOOK_AUTH_TYPE` | No | Auth type: `none` (default), `basic`, `bearer`, `cookie`, `oauth` |
| `STORYBOOK_BASIC_AUTH_USERNAME` | If basic | Basic auth username |
| `STORYBOOK_BASIC_AUTH_PASSWORD` | If basic | Basic auth password |
| `STORYBOOK_ACCESS_TOKEN` | If bearer | Bearer token |
| `STORYBOOK_SESSION_COOKIE` | If cookie | Session cookie value |
| `STORYBOOK_CLIENT_ID` | If oauth | OAuth client ID |
| `STORYBOOK_CLIENT_SECRET` | If oauth | OAuth client secret |
| `STORYBOOK_REFRESH_TOKEN` | If oauth | OAuth refresh token |
| `STORYBOOK_DATA_SOURCE` | No | `auto` (default), `storybook-static`, `rest-api` |
| `STORYBOOK_FIGMA_MAPPING` | No | Path to a JSON file with explicit Figma → Storybook component mappings |
| `STORYBOOK_LOCAL_MEMORY` | No | Path of the local pending-component memory file (default `.storybook-mcp/memory.json`), or `off` to disable |
| `STORYBOOK_LOCAL_MEMORY_STALE_DAYS` | No | Days before a pending component is flagged stale (default: 30) |
| `CACHE_ENABLED` | No | `true` (default) |
| `CACHE_TTL` | No | Cache TTL in seconds (default: 300) |

## MCP Configuration

### Claude Desktop / Claude Code

```json
{
  "mcpServers": {
    "storybook": {
      "command": "npx",
      "args": ["-y", "@viantotech/mcp-storybook"],
      "env": {
        "STORYBOOK_BASE_URL": "https://your-storybook.example.com",
        "STORYBOOK_AUTH_TYPE": "basic",
        "STORYBOOK_BASIC_AUTH_USERNAME": "your-username",
        "STORYBOOK_BASIC_AUTH_PASSWORD": "your-password"
      }
    }
  }
}
```

### Cursor

```json
{
  "mcpServers": {
    "storybook": {
      "command": "npx",
      "args": ["-y", "@viantotech/mcp-storybook"],
      "env": {
        "STORYBOOK_BASE_URL": "https://your-storybook.example.com",
        "STORYBOOK_AUTH_TYPE": "bearer",
        "STORYBOOK_ACCESS_TOKEN": "your-token"
      }
    }
  }
}
```

### No Auth (Public Storybook)

```json
{
  "mcpServers": {
    "storybook": {
      "command": "npx",
      "args": ["-y", "@viantotech/mcp-storybook"],
      "env": {
        "STORYBOOK_BASE_URL": "https://your-public-storybook.example.com"
      }
    }
  }
}
```

## Tools

| Tool | Description |
|------|-------------|
| `list_stories` | List stories (metadata only) |
| `search_stories` | Full-text search |
| `get_story` | Full story content (+ `maxContentLength`) |
| `get_story_section` | Single section |
| `get_story_metadata` | Metadata without full body |
| `get_story_context` | Concise context for NL questions |
| `list_components` | List UI components (grouped) |
| `get_component` | Component detail + docs + variant story IDs |
| `get_component_config` | argTypes (variant, size, …) + style presets + args |
| `get_design_tokens` | Extract design tokens (colors, spacing, typography, shadows, …) from CSS variables |
| `get_component_dependencies` | Component dependency graph — dependencies and dependents |
| `map_figma_component` | Map a Figma component name / URL to the matching Storybook component |
| `find_stories_by_source_file` | Reverse lookup: source file path → matching stories |
| `preview_story` | Build a Storybook iframe preview URL with custom args, globals, viewport |
| `get_story_instructions` | Best-practice guide for writing CSF3 stories |
| `get_component_usage` | Copy-paste-ready component usage (import + JSX) built from story presets |
| `compare_versions` | Structured diff between two Storybook deployments |
| `get_catalog_summary` | Compact catalog of all components (import, short description, key props) — call before writing UI |
| `validate_usage` | Check JSX against argTypes: unknown components/props, invalid enum values, missing required props |
| `find_token_drift` | Find hardcoded colors/spacing/radius/font sizes that match design tokens, with `var(--token)` replacements |
| `scaffold_story` | Generate a CSF3 story for a new component that follows this Storybook's conventions |
| `remember_component` | Record a component that exists in code but is not deployed to Storybook yet |
| `list_pending_components` | List locally remembered components (auto-dropped once deployed) |
| `forget_component` | Remove a component from local memory |

> `remember_component` and `scaffold_story` write to the local memory file only. The Storybook deployment is never modified.

## Resources

- `storybook://stories`
- `storybook://story/{storyId}`
- `storybook://story/{storyId}/section/{sectionId}`

## Development

```bash
git clone https://github.com/viantonugroho11/mcp-story-books.git
cd mcp-story-books
npm install
npm run dev
```

## Docker

```bash
docker build -t mcp-storybook .
docker run --rm -i -e STORYBOOK_BASE_URL=https://your-storybook.example.com mcp-storybook
```

## License

MIT
