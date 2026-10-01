# @viantotech/mcp-storybook

[![npm version](https://img.shields.io/npm/v/@viantotech/mcp-storybook.svg)](https://www.npmjs.com/package/@viantotech/mcp-storybook)
[![license](https://img.shields.io/npm/l/@viantotech/mcp-storybook.svg)](LICENSE)
[![node](https://img.shields.io/node/v/@viantotech/mcp-storybook.svg)](package.json)

A [Model Context Protocol](https://modelcontextprotocol.io) server that gives AI agents (Claude, Cursor, and any MCP client) structured access to a deployed **Storybook** — including private, authenticated ones.

Agents can browse and search components, read docs and prop contracts, pull design tokens, generate correct usage code, and — new in v0.5 — **check their own UI code** against the design system before you ever see it.

---

## Contents

- [Why](#why)
- [Features](#features)
- [Quick start](#quick-start)
- [Client configuration](#client-configuration)
- [Configuration reference](#configuration-reference)
- [Tools](#tools)
- [Recommended agent workflow](#recommended-agent-workflow)
- [Resources](#resources)
- [How it works](#how-it-works)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [Architecture decisions](#architecture-decisions)
- [License](#license)

---

## Why

AI coding agents are good at writing UI and bad at knowing *your* UI. Without context they:

- rebuild a `<div>`-based button when `<Button>` already exists,
- invent props and values (`<Button kind="danger">` when the prop is `variant="destructive"`),
- hardcode `#1a73e8` instead of `var(--color-primary)`.

This server turns your Storybook into the agent's source of truth: what exists, how to import it, which props are valid, and which tokens to use.

## Features

| Area | What you get |
|------|--------------|
| **Browse & search** | List and full-text search stories and components, read docs sections, get concise context for natural-language questions |
| **Component contracts** | argTypes (props, controls, options), style presets, dependency graph, copy-paste usage code |
| **Design tokens** | CSS custom properties extracted and categorized (colors, spacing, typography, radius, shadows, …) |
| **Usage guardrails** | Token-cheap catalog for "check before you build", and deterministic validation of agent-written JSX |
| **Token drift** | Find hardcoded colors/lengths that should be tokens, with `var(--token)` replacements |
| **Story scaffolding** | Generate CSF3 stories for new components in your house style |
| **Local memory** | Components created by agents are visible to other tools before Storybook is redeployed |
| **Figma & previews** | Map Figma components to Storybook, build iframe preview URLs with args/globals/viewport |
| **Versioning** | Structured diff between two Storybook deployments |
| **Auth** | `none`, `basic`, `bearer`, `cookie`, `oauth` |

**Requirements:** Node.js ≥ 20, a deployed Storybook 8 (static build). Storybook is read-only: the server never writes to your deployment.

---

## Quick start

Run without installing:

```bash
STORYBOOK_BASE_URL=https://your-storybook.example.com npx -y @viantotech/mcp-storybook
```

Or install globally:

```bash
npm install -g @viantotech/mcp-storybook
mcp-storybook
```

The server speaks MCP over **stdio**, so you normally don't run it by hand — your MCP client starts it. See below.

---

## Client configuration

### Claude Code

```bash
claude mcp add storybook \
  -e STORYBOOK_BASE_URL=https://your-storybook.example.com \
  -- npx -y @viantotech/mcp-storybook
```

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "storybook": {
      "command": "npx",
      "args": ["-y", "@viantotech/mcp-storybook"],
      "env": {
        "STORYBOOK_BASE_URL": "https://your-storybook.example.com"
      }
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json` (project) or `~/.cursor/mcp.json` (global) — same shape as above.

### Authentication examples

<details>
<summary><b>Basic auth</b></summary>

```json
"env": {
  "STORYBOOK_BASE_URL": "https://your-storybook.example.com",
  "STORYBOOK_AUTH_TYPE": "basic",
  "STORYBOOK_BASIC_AUTH_USERNAME": "your-username",
  "STORYBOOK_BASIC_AUTH_PASSWORD": "your-password"
}
```
</details>

<details>
<summary><b>Bearer token</b></summary>

```json
"env": {
  "STORYBOOK_BASE_URL": "https://your-storybook.example.com",
  "STORYBOOK_AUTH_TYPE": "bearer",
  "STORYBOOK_ACCESS_TOKEN": "your-token"
}
```
</details>

<details>
<summary><b>Session cookie</b> (e.g. Storybook behind SSO)</summary>

```json
"env": {
  "STORYBOOK_BASE_URL": "https://your-storybook.example.com",
  "STORYBOOK_AUTH_TYPE": "cookie",
  "STORYBOOK_SESSION_COOKIE": "session=abc123"
}
```
</details>

<details>
<summary><b>OAuth</b></summary>

```json
"env": {
  "STORYBOOK_BASE_URL": "https://your-storybook.example.com",
  "STORYBOOK_AUTH_TYPE": "oauth",
  "STORYBOOK_CLIENT_ID": "your-client-id",
  "STORYBOOK_CLIENT_SECRET": "your-client-secret",
  "STORYBOOK_REFRESH_TOKEN": "your-refresh-token"
}
```
</details>

### Docker

```bash
docker build -t mcp-storybook .
docker run --rm -i -e STORYBOOK_BASE_URL=https://your-storybook.example.com mcp-storybook
```

Use `-i` (stdin open) — the server communicates over stdio.

---

## Configuration reference

All configuration is via environment variables.

### Connection

| Variable | Default | Description |
|----------|---------|-------------|
| `STORYBOOK_BASE_URL` | — **(required)** | URL of the deployed Storybook. Must be `http`/`https`; credentials in the URL are rejected |
| `STORYBOOK_DATA_SOURCE` | `auto` | `storybook-static` (reads `/index.json` + chunks), `rest-api` (custom API), or `auto` (detects static build, falls back to REST) |
| `STORYBOOK_REQUEST_TIMEOUT_MS` | `30000` | Per-request timeout |
| `STORYBOOK_MAX_RESPONSE_BYTES` | `5242880` | Maximum response size (5 MB) |
| `STORYBOOK_MAX_RETRIES` | `3` | Retries for transient upstream failures (0–10) |

### Authentication

| Variable | Required when | Description |
|----------|---------------|-------------|
| `STORYBOOK_AUTH_TYPE` | — | `none` (default), `basic`, `bearer`, `cookie`, `oauth` |
| `STORYBOOK_BASIC_AUTH_USERNAME` | `basic` | Username |
| `STORYBOOK_BASIC_AUTH_PASSWORD` | `basic` | Password |
| `STORYBOOK_ACCESS_TOKEN` | `bearer` | Bearer token |
| `STORYBOOK_SESSION_COOKIE` | `cookie` | Cookie header value |
| `STORYBOOK_CLIENT_ID` | `oauth` | OAuth client ID |
| `STORYBOOK_CLIENT_SECRET` | `oauth` | OAuth client secret |
| `STORYBOOK_REFRESH_TOKEN` | — | OAuth refresh token |

### Caching

| Variable | Default | Description |
|----------|---------|-------------|
| `CACHE_ENABLED` | `true` | In-memory cache for index, chunks, and tokens |
| `CACHE_TTL` | `300` | Cache TTL in seconds |

### Features

| Variable | Default | Description |
|----------|---------|-------------|
| `STORYBOOK_FIGMA_MAPPING` | — | Path to a JSON file with explicit Figma → Storybook component mappings |
| `STORYBOOK_LOCAL_MEMORY` | `.storybook-mcp/memory.json` | Local pending-component memory file (relative to the server's working directory), or `off` to disable memory tools |
| `STORYBOOK_LOCAL_MEMORY_STALE_DAYS` | `30` | Age after which a pending component is flagged `stale` |

### REST API mode (advanced)

Only used when `STORYBOOK_DATA_SOURCE=rest-api` or auto-detection falls back.

| Variable | Description |
|----------|-------------|
| `STORYBOOK_DISCOVERY_PATH` | Path to an API discovery document |
| `STORYBOOK_API_LIST_STORIES` | Override endpoint for listing stories |
| `STORYBOOK_API_GET_STORY` | Override endpoint for a single story |
| `STORYBOOK_API_SEARCH` | Override endpoint for search |

---

## Tools

24 tools, grouped by purpose. All return JSON text.

### Stories

| Tool | Inputs | Description |
|------|--------|-------------|
| `list_stories` | `query?`, `category?`, `tags?`, `limit?` (≤200), `offset?` | List stories, metadata only |
| `search_stories` | `query`, `limit?` (≤100) | Full-text search over title, description, tags, sections, content |
| `get_story` | `storyId`, `maxContentLength?` | Full story content, optionally capped |
| `get_story_section` | `storyId`, `sectionId` | One section of a story |
| `get_story_metadata` | `storyId` | Metadata without body |
| `get_story_context` | `query`, `storyId?`, `maxResults?` (≤20) | Concise context for a natural-language question |

### Components

| Tool | Inputs | Description |
|------|--------|-------------|
| `list_components` | `query?`, `category?`, `limit?`, `offset?` | Components grouped from story titles (e.g. `Components/Button`) |
| `get_component` | `component`, `includeOverviewContent?`, `maxContentLength?` | Docs overview, sections, variant story IDs |
| `get_component_config` | `component` | argTypes (controls, options, descriptions) and style presets with args |
| `get_component_usage` | `componentName`, `variant?`, `format?` (`tsx`/`jsx`) | Copy-paste import + JSX built from story presets |
| `get_component_dependencies` | `componentName`, `direction?`, `depth?` (≤5) | Which components it uses / is used by |
| `find_stories_by_source_file` | `sourceFile` | Reverse lookup: source path → stories |

### Design tokens

| Tool | Inputs | Description |
|------|--------|-------------|
| `get_design_tokens` | `category?` | CSS custom properties, categorized: `colors`, `spacing`, `typography`, `breakpoints`, `shadows`, `radius`, `motion`, `z-index`, `other` |
| `find_token_drift` | `code`, `filename?`, `categories?`, `tolerance?`, `remBase?` | Hardcoded literals that match token values |

### Usage guardrails

| Tool | Inputs | Description |
|------|--------|-------------|
| `get_catalog_summary` | `category?`, `maxDescriptionLength?` | Compact catalog: name, import, short description, key props. Includes pending components |
| `validate_usage` | `code` | Validate JSX/TSX against argTypes |

### Authoring & memory

| Tool | Inputs | Description |
|------|--------|-------------|
| `get_story_instructions` | — | Opinionated CSF3 authoring guide |
| `scaffold_story` | `componentName`, `componentSource`, `title?`, `referenceComponent?`, `importPath?`, `description?` | Generate a CSF3 story in house style; also remembers the component |
| `remember_component` | `componentName`, `import`, `description`, `componentSource?`, `sourcePath?` | Record a not-yet-deployed component |
| `list_pending_components` | — | Remembered components; deployed ones are dropped, old ones flagged `stale` |
| `forget_component` | `componentName` | Remove from memory |

### Integration

| Tool | Inputs | Description |
|------|--------|-------------|
| `preview_story` | `storyId`, `args?`, `globals?`, `viewport?` | Storybook iframe URL with encoded args/globals |
| `map_figma_component` | `figmaName?`, `figmaNodeId?`, `figmaUrl?` | Matching Storybook component and suggested props |
| `compare_versions` | `baseUrl`, `targetUrl?`, `components?` | Diff two deployments: added/removed components, variant and argType changes |

### Guardrail details

<details>
<summary><b><code>validate_usage</code> — what is checked</b></summary>

| Issue kind | Example | Notes |
|------------|---------|-------|
| `unknown_component` | `<Buton />` imported from your design-system package | Suggests closest name |
| `unknown_prop` | `<Button lable="Hi" />` | Suggests closest declared prop |
| `invalid_value` | `<Button variant="danger" />` | Lists allowed enum values |
| `invalid_value` | `<Button disabled="true" />` | String passed to a boolean prop |
| `missing_required_prop` | `<DatePicker />` | Pending components only (Storybook argTypes don't record required-ness) |

Not flagged: dynamic expressions (`variant={v}`), spread props, standard attributes (`className`, `style`, `id`, `aria-*`, `data-*`, `on*` handlers, …). Components without argTypes are listed under `unvalidated` instead of producing errors.

Example response:

```json
{
  "valid": false,
  "issues": [
    {
      "component": "Button",
      "line": 3,
      "kind": "invalid_value",
      "message": "variant=\"danger\" not allowed. Allowed: primary | secondary | destructive",
      "suggestion": "variant=\"destructive\""
    }
  ],
  "unvalidated": []
}
```
</details>

<details>
<summary><b><code>find_token_drift</code> — matching rules</b></summary>

- **Colors:** hex (3/4/6/8 digits), `rgb()`/`rgba()`, `hsl()`/`hsla()` are normalized, so `rgb(26,115,232)` matches a token of `#1A73E8`.
- **Lengths:** `px` and `rem` (`remBase`, default 16) are compared in px. Matched against `spacing`, `radius`, and `typography` tokens. `0` is ignored.
- **Token aliases:** `--color-primary: var(--blue-500)` is resolved; all tokens with the same value are returned (`token` + `alternatives`).
- **Near matches:** off by default. `tolerance` is ΔE (CIE76) for colors and px for lengths. Treat near matches as hints.
- Literals already inside `var(...)` are skipped.
</details>

<details>
<summary><b><code>scaffold_story</code> — inference rules</b></summary>

Props are read from an `interface` or `type` named `<Component>Props` (falls back to the first `*Props` declaration).

| Prop type | Generated argType |
|-----------|-------------------|
| `"a" \| "b"` | `{ control: "select", options: [...] }` + one story per extra option |
| `boolean` | `{ control: "boolean" }` |
| `string` / `number` | `{ control: "text" }` / `{ control: "number" }` |
| function | `{ action: "<name>" }` |
| other | none, with a warning |

Title prefix, `tags: ["autodocs"]`, and decorators are copied from `referenceComponent`, or inferred from the most common pattern in the index. The tool returns file content only; write it to disk yourself.
</details>

<details>
<summary><b>Local memory</b></summary>

New components only reach Storybook after a rebuild and redeploy. Until then, `remember_component` (called implicitly by `scaffold_story`) stores them in `STORYBOOK_LOCAL_MEMORY`. `get_catalog_summary` and `validate_usage` merge them in with `source: "pending"`.

- Entries are removed automatically once a component with the same name appears in the deployed Storybook.
- Entries older than `STORYBOOK_LOCAL_MEMORY_STALE_DAYS` are flagged `stale`, not deleted.
- The file is per working directory. Commit it to share with your team, or keep it in `.gitignore`.
- Set `STORYBOOK_LOCAL_MEMORY=off` to disable the memory tools entirely.
</details>

---

## Recommended agent workflow

Add something like this to your `CLAUDE.md`, `.cursorrules`, or agent instructions:

```markdown
When writing UI code:
1. Call `get_catalog_summary` first. Reuse existing components; don't build new ones that duplicate them.
2. Use `get_component_usage` or `get_component_config` for the components you pick.
3. After writing JSX, call `validate_usage` on it and fix every issue.
4. Run `find_token_drift` on new styles and replace hardcoded values with tokens.
5. If you created a new component, call `scaffold_story` and save the returned story file.
```

---

## Resources

| URI | Description |
|-----|-------------|
| `storybook://stories` | All stories |
| `storybook://story/{storyId}` | A single story |
| `storybook://story/{storyId}/section/{sectionId}` | A single section |

---

## How it works

```
MCP client (Claude, Cursor, …)
        │ stdio
        ▼
  mcp-storybook ──► tools / resources
        │
        ├─ services (component, usage, tokens, catalog, validation, drift, scaffold, memory, …)
        ├─ repository (storybook-static | rest-api)  ── in-memory cache
        └─ HTTP client + auth provider ──► your Storybook deployment
                                            /index.json, /assets/*, /iframe.html, CSS
        local file (optional): .storybook-mcp/memory.json
```

- **Static mode** reads Storybook 8's `/index.json`, then fetches story chunks from `/assets/*` to extract argTypes, presets, docs, and dependencies.
- **Design tokens** come from stylesheets linked in `/iframe.html`.
- JSX and TypeScript are parsed with `@babel/parser`; no code is executed.

---

## Security

- The Storybook deployment is **never modified**. The only write is the optional local memory file.
- Credentials are read from environment variables only; credentials embedded in `STORYBOOK_BASE_URL` are rejected.
- Logs go to stderr and drop fields that look sensitive (authorization, cookies, tokens, passwords, secrets).
- Responses are size-limited (`STORYBOOK_MAX_RESPONSE_BYTES`) and requests time out (`STORYBOOK_REQUEST_TIMEOUT_MS`).
- `compare_versions` reuses the configured auth when only `baseUrl` is given — only point it at deployments you trust with those credentials.

---

## Troubleshooting

| Symptom | Likely cause / fix |
|---------|--------------------|
| `Invalid configuration: ...` on start | Missing required env var for the chosen `STORYBOOK_AUTH_TYPE`, or `STORYBOOK_BASE_URL` not a valid URL |
| `AUTHENTICATION_REQUIRED` / `FORBIDDEN` | Wrong or expired credentials; for cookie auth, refresh the session cookie |
| `CONFIGURATION_ERROR: Component config requires Storybook static mode` | Using REST mode. Set `STORYBOOK_DATA_SOURCE=storybook-static` if your deployment is a static Storybook build |
| `get_design_tokens` returns `NOT_FOUND` | No stylesheets with CSS custom properties in `/iframe.html` |
| `get_catalog_summary` slow on first call | It loads every component's config once; later calls hit the cache (`CACHE_TTL`) |
| `validate_usage` reports nothing for a component | It has no argTypes; check the `unvalidated` list |
| Agent never calls the guardrail tools | Add the [recommended workflow](#recommended-agent-workflow) to your agent instructions |

---

## Development

```bash
git clone https://github.com/viantonugroho11/mcp-story-books.git
cd mcp-story-books
npm install
```

| Command | Description |
|---------|-------------|
| `npm run dev` | Run from source with `tsx` |
| `npm run build` | Compile to `dist/` |
| `npm test` | Run tests (Vitest) |
| `npm run typecheck` | Type-check without emitting |
| `npm run discover` | Probe a Storybook deployment's API |

Test locally with the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector -e STORYBOOK_BASE_URL=https://your-storybook.example.com -- npx tsx src/index.ts
```

Project layout:

```
src/
├── api/          HTTP client
├── auth/         auth providers
├── config/       env parsing (zod)
├── mcp/          server, tool + resource registration, input schemas
├── repository/   storybook-static and rest-api data sources
├── services/     one service per feature
└── storybook/    parsers: CSF config, tokens, dependencies, JSX/TS, value normalization
docs/adr/         architecture decision records
```

---

## Architecture decisions

Design rationale lives in [`docs/adr/`](docs/adr/README.md), including features that were deliberately rejected and how this server compares to the official Storybook MCP.

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## License

[MIT](LICENSE)
