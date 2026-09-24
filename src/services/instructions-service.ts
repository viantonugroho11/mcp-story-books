const INSTRUCTIONS = `# Writing Storybook Stories

## File Naming
- Co-locate stories with components: \`Button.tsx\` + \`Button.stories.tsx\`
- Use \`.stories.tsx\` (CSF3) or \`.mdx\` (docs)

## CSF3 Structure

\`\`\`tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button";

const meta = {
  title: "Components/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "ghost"],
    },
    size: { control: "select", options: ["sm", "md", "lg"] },
    disabled: { control: "boolean" },
    onClick: { action: "clicked" },
  },
  args: { variant: "primary", size: "md", children: "Click me" },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
export const Secondary: Story = { args: { variant: "secondary" } };
export const Disabled: Story = { args: { disabled: true } };
\`\`\`

## What to Capture in Stories

1. **Every visual variant** (variant × size × state combinations that look different)
2. **Every meaningful state**: default, hover, active, focus, disabled, loading, error
3. **Edge cases**: empty content, very long text, overflow, RTL
4. **Composed usage**: how the component looks inside common parent contexts

## argTypes Guidance

- Prefer \`control: "select"\` over free-text for enums — surfaces variants in the UI
- Use \`control: "boolean"\` for toggles
- Add \`description\` for non-obvious props
- Group related props with \`table.category\`

## Interaction Tests (play function)

\`\`\`tsx
import { within, userEvent, expect } from "@storybook/test";

export const ClickInteraction: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button");
    await userEvent.click(button);
    await expect(button).toHaveAttribute("data-pressed", "true");
  },
};
\`\`\`

## Common Anti-Patterns to Avoid

- Don't stub props inline in the render function — use \`args\` instead so controls work
- Don't mix rendering logic and test logic — keep play functions focused
- Don't duplicate variants across stories — one story per meaningful state
- Don't skip a11y — enable \`@storybook/addon-a11y\` and treat violations as bugs
`;

export class InstructionsService {
  getInstructions(): { content: string; version: string } {
    return {
      content: INSTRUCTIONS,
      version: "csf3",
    };
  }
}
