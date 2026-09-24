# ADR-008: Figma Bridge

## Status

Proposed

## Date

2026-09-24

## Context

In many organizations, the design workflow flows from Figma (design) to Storybook (implementation). Designers create components in Figma; engineers implement them as React/Vue/etc. components visible in Storybook. However, there is often a naming gap — Figma calls a component "CTA Button / Primary / Large" while Storybook calls it "Button" with `variant="primary"` and `size="lg"`.

When an AI agent receives a Figma design reference, it needs to know which Storybook component corresponds to which Figma component to generate correct implementation code.

## Decision

Add a Figma-to-Storybook mapping tool that:

1. Accepts Figma component names or node IDs
2. Matches them to Storybook components using configurable mapping strategies
3. Returns the corresponding Storybook component with correct props

### Mapping Strategies (in priority order)

1. **Explicit mapping file** — User provides a JSON mapping of Figma name → Storybook component
2. **Figma Code Connect** — If the project uses Figma's Code Connect, parse its mappings
3. **Name similarity matching** — Fuzzy match Figma component names to Storybook component names
4. **Convention-based** — Parse Figma naming patterns (e.g., "Component / Variant / Size") into Storybook props

### Proposed Tool Schema

```typescript
{
  name: "map_figma_component",
  input: {
    figmaName?: string,        // e.g. "CTA Button / Primary / Large"
    figmaNodeId?: string,      // Figma node ID
    figmaUrl?: string          // Figma frame/component URL
  },
  output: {
    match: {
      confidence: "exact" | "high" | "medium" | "low",
      storybookComponent: string,
      storyId: string,
      suggestedProps: Record<string, unknown>,
      importPath: string
    },
    alternatives: Array<{
      storybookComponent: string,
      confidence: string,
      reason: string
    }>
  }
}
```

### Proposed Configuration

```bash
# Optional: explicit mapping file
STORYBOOK_FIGMA_MAPPING=/path/to/figma-storybook-mapping.json

# Optional: Figma access token for Code Connect integration
FIGMA_ACCESS_TOKEN=xxx
```

## Consequences

### Positive

- Bridges the design-to-code gap — AI translates Figma designs to correct components
- Reduces errors from manual Figma-to-Storybook lookup
- Supports multiple matching strategies for different team setups
- Integrates with existing Figma Code Connect if available

### Negative

- Figma API access requires separate authentication and API token
- Name similarity matching can produce false positives
- Convention-based parsing is brittle and varies across teams
- Adds a dependency on Figma's API stability

### Risks

- Figma naming conventions are not standardized — every team is different
- Component variants in Figma don't always map 1:1 to Storybook props
- Stale mapping files lead to incorrect recommendations
- Figma API rate limits may affect performance

## Alternatives Considered

1. **Require explicit mapping only** — Most reliable but highest user effort
2. **Figma plugin that exports mappings** — Good UX but requires plugin development and installation
3. **Rely on Figma MCP server** — Complementary but doesn't solve the mapping problem itself
4. **AI-powered matching** — Use embeddings to match visual similarity — interesting but complex and unreliable
