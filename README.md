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

## Resources

- `storybook://stories`
- `storybook://story/{storyId}`
- `storybook://story/{storyId}/section/{sectionId}`

## Development

```bash
git clone https://github.com/viantotech/mcp-storybook.git
cd mcp-storybook
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
