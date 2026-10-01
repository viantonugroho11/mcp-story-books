# ADR-016: Story Scaffolding (Storybook as Agent Output)

## Status

Accepted — implemented, unreleased

## Date

2026-10-01

## Context

Every existing tool treats Storybook as *input*: the agent reads it. When an agent creates a new component, nothing pushes it back into the design system, so the catalog falls behind the code and later agents (and ADR-014's catalog summary) cannot see the new component.

ADR-010 provides static authoring guidance, but the agent still writes the story from scratch and frequently diverges from the conventions already used in the target Storybook.

## Decision

Add a `scaffold_story` tool that returns a CSF3 story file for a new component, modeled on the conventions of existing stories in the deployed Storybook.

```typescript
{
  name: "scaffold_story",
  input: {
    componentName: string,
    componentSource: string,     // the new component's TSX source
    title?: string,              // e.g. "Forms/DatePicker"; inferred from nearest sibling if omitted
    referenceComponent?: string  // existing component whose stories to mirror
  },
  output: {
    filename: string,            // "DatePicker.stories.tsx"
    content: string,             // full CSF3 file
    inferredArgTypes: Record<string, unknown>,
    conventions: {
      titlePrefix: string,
      usesAutodocs: boolean,
      decorators: string[],
      referenceStory?: string    // story id the structure was copied from
    },
    warnings: string[]           // e.g. "Prop `onChange` has no type; argTypes left empty"
  }
}
```

- Props are inferred by parsing the component's TypeScript props interface (same parser as ADR-014).
- Conventions (title hierarchy, `tags: ['autodocs']`, decorators, arg naming) are copied from `referenceComponent`, or from the most common pattern in the index when omitted.
- Unions of string literals become `control: 'select'` with `options`; booleans become `control: 'boolean'`.
- The tool **returns** file content. It does not write to disk or push to the deployment; the agent or user commits the file. The server stays read-only against Storybook.

## Consequences

### Positive

- Closes the loop: components created by agents become discoverable for future agents.
- Stories match house style instead of generic CSF3.
- Builds on ADR-010 (rules) and ADR-014 (parser), so marginal cost is modest.

### Negative

- New components only appear in tools after the user rebuilds and redeploys Storybook; latency outside our control.
- Prop inference from source is approximate (generics, spread props, HOCs).
- Risk of low-value boilerplate stories if agents scaffold without curating variants.

## Dependencies

- ADR-014 (JSX/TS parser)
- ADR-010 (authoring rules, embedded as defaults)
