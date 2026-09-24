# ADR-006: Accessibility Audit Tool

## Status

Proposed

## Date

2026-09-24

## Context

Accessibility (a11y) is a critical quality attribute for UI components. Many Storybook deployments include the `@storybook/addon-a11y` which runs axe-core checks on each story. However, this data is only visible when manually browsing Storybook — an AI agent cannot access it.

When the AI recommends or generates component usage, it should be aware of known accessibility issues so it can suggest proper ARIA attributes, keyboard handling, and color contrast considerations.

## Decision

Add an `audit_component` tool that checks component accessibility by:

1. Detecting if the a11y addon is present and extracting its results
2. If no addon data is available, construct the component preview URL and run axe-core via a headless browser
3. Return structured violation data with severity, impact, and remediation suggestions

### Proposed Tool Schema

```typescript
{
  name: "audit_component",
  input: {
    storyId: string,
    args?: Record<string, unknown>,
    rules?: string[]  // specific axe rules to check
  },
  output: {
    violations: Array<{
      id: string,           // axe rule id
      impact: "critical" | "serious" | "moderate" | "minor",
      description: string,
      helpUrl: string,
      nodes: number,
      remediation: string
    }>,
    passes: number,
    incomplete: number,
    score: number  // 0-100 accessibility score
  }
}
```

## Consequences

### Positive

- AI proactively warns about accessibility issues when recommending components
- Provides actionable remediation guidance alongside component usage
- Can be used for design system-wide accessibility audits
- Encourages accessibility-first development practices

### Negative

- Full audit requires headless browser — heavy dependency, slow execution
- Addon-based extraction depends on specific addon version and data format
- axe-core results are point-in-time and may not reflect all usage contexts

### Risks

- Headless browser in an MCP server adds significant complexity and resource usage
- CSP headers on authenticated Storybooks may block axe-core injection
- False positives from axe-core may confuse AI recommendations
- Component rendered in isolation may pass checks but fail in real page context

## Alternatives Considered

1. **Static analysis of component source** — Catches some issues but misses runtime a11y problems
2. **Rely on existing addon data only** — No addon = no audit capability
3. **Link to external a11y tools** — Adds external dependency, not integrated into workflow
