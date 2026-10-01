# ADR-014: Usage Guardrails (validate_usage + catalog summary)

## Status

Proposed

## Date

2026-10-01

## Context

Existing tools (ADR-002..010) expose Storybook data so an AI agent can *read* the design system. They do not stop the agent from producing wrong UI. Two failure modes are common when an agent writes UI code:

1. **Reinvention** — the agent builds a raw `<div>`/`<button>` with ad-hoc styles even though an equivalent design-system component exists. It never looked, because listing every component in full detail (`list_components` + `get_component`) is too token-heavy to do speculatively.
2. **Hallucinated props** — the agent uses a real component but invents props or values (`<Button kind="danger">` when argTypes define `variant: "primary" | "secondary" | "destructive"`).

`get_component_usage` (ADR-005) reduces (2) when the agent asks for a snippet first, but nothing checks code after the agent writes it.

## Decision

Add two tools. The server provides data and deterministic checks; the LLM does the semantic reasoning (which component fits an intent). No embeddings or heuristic intent matching on the server.

### 1. `get_catalog_summary`

Token-optimized catalog of every component, meant to be called once per task before writing UI.

```typescript
{
  name: "get_catalog_summary",
  input: {
    category?: string,      // filter by title prefix, e.g. "Forms"
    maxDescriptionLength?: number // default 120
  },
  output: {
    components: Array<{
      name: string,          // "Button"
      import: string,        // "import { Button } from '@org/ui'"
      description: string,   // truncated docs description
      keyProps: string[]     // e.g. ["variant: primary|secondary|destructive", "size: sm|md|lg"]
    }>
  }
}
```

- Built from data already cached for `list_components` / argTypes; no new fetching.
- `keyProps` limited to enum/boolean props and required props (highest signal per token).

### 2. `validate_usage`

Validates JSX the agent wrote against component argTypes.

```typescript
{
  name: "validate_usage",
  input: {
    code: string            // JSX/TSX snippet or file content
  },
  output: {
    valid: boolean,
    issues: Array<{
      component: string,
      line?: number,
      kind: "unknown_component" | "unknown_prop" | "invalid_value" | "missing_required_prop",
      message: string,       // "variant='danger' not allowed. Allowed: primary | secondary | destructive"
      suggestion?: string
    }>
  }
}
```

- Parse JSX with a lightweight parser (e.g. `@babel/parser` with `jsx`/`typescript` plugins); only analyze elements whose identifier matches a known component or a design-system import.
- Static literal values are checked; dynamic expressions (`{x}`) are skipped, not flagged.
- `unknown_prop` excludes standard DOM/ARIA attributes and `children`, `className`, `style`, `key`, `ref`.
- Unknown-prop suggestions use edit distance against declared argTypes.

### Tool descriptions

Both tools get directive descriptions so agents call them unprompted, e.g. *"Call before writing any UI code to find existing components instead of creating new ones."* / *"Call after writing JSX that uses design-system components to catch invalid props."*

## Consequences

### Positive

- Directly targets the main agent failure mode (UI hallucination) rather than adding another read path.
- `validate_usage` is deterministic and cheap; reuses parsed argTypes.
- Catalog summary makes "check before building" affordable in tokens.

### Negative

- argTypes quality varies; components without typed argTypes give weak validation (report as unvalidated, not invalid).
- Adds a parser dependency.
- Value depends on agents actually calling the tools — not guaranteed.

## Validation Plan

Riskiest assumption: agents call these tools without being told to. Before broad investment, ship `get_catalog_summary` with a directive description and measure call frequency across ~5 real coding sessions. If agents ignore it, revisit (prompt/skill packaging, `get_story_instructions` integration) before building `validate_usage`.

## Parked

- Design-system drift detector (hardcoded colors/spacing vs tokens) — maintainer persona, builds on `get_component_usage`.
- Storybook as agent memory (auto-generate stories for new components) — extends ADR-010.
