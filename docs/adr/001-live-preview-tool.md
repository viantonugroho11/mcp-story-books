# ADR-001: Live Preview Tool

## Status

Proposed

## Date

2026-09-24

## Context

AI agents using this MCP server can read component metadata and documentation, but cannot visually see what a component looks like with specific props. When generating UI code, the AI has no way to verify that its prop combinations produce the intended visual result.

Storybook already renders components in an iframe via `/iframe.html?id={storyId}&args={encodedArgs}`. This existing infrastructure can be leveraged to provide visual previews.

## Decision

Add a `preview_component` tool that constructs a Storybook iframe URL with user-specified props/args and returns either:

1. The constructed preview URL (lightweight, no server-side rendering needed)
2. A screenshot of the rendered component (requires headless browser — heavier dependency)

### Proposed Tool Schema

```typescript
{
  name: "preview_component",
  input: {
    storyId: string,       // e.g. "button--primary"
    args?: Record<string, unknown>, // props to pass
    viewport?: { width: number, height: number },
    format: "url" | "screenshot"  // default: "url"
  },
  output: {
    url: string,
    screenshot?: string  // base64 PNG if format=screenshot
  }
}
```

## Consequences

### Positive

- AI can visually verify component rendering before recommending prop combinations
- Users get direct links to see components with specific configurations
- URL-only mode has zero additional dependencies

### Negative

- Screenshot mode requires a headless browser dependency (Puppeteer/Playwright), significantly increasing package size
- Authenticated Storybooks may block iframe access depending on CSP headers
- Screenshot capture adds latency (2-5s per render)

### Risks

- Storybook iframe URL format may vary across Storybook versions (v6 vs v7 vs v8)
- Args encoding format is not formally documented and may change

## Alternatives Considered

1. **Server-side rendering with React** — Too complex, requires full component tree setup
2. **Return raw HTML** — Doesn't include styles/assets, components won't render correctly
3. **Link to Storybook UI only** — Simplest but requires manual navigation to set args
