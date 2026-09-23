export interface ComponentVariantRef {
  storyId: string;
  name: string;
  type: "docs" | "story";
}

export interface ComponentSummary {
  /** Storybook title path, e.g. Components/Alert */
  path: string;
  /** Short name, e.g. Alert */
  name: string;
  category: string;
  overviewStoryId?: string;
  variantCount: number;
  variantNames: string[];
  tags: string[];
}

export interface ComponentConfig {
  path: string;
  name: string;
  title?: string;
  description?: string;
  /** Prop/style knobs from Storybook Controls (argTypes) */
  argTypes: Array<{
    name: string;
    control?: string;
    options?: string[];
    description?: string;
    typeSummary?: string;
    defaultSummary?: string;
  }>;
  /** Story variants = visual style presets in Storybook */
  stylePresets: Array<{
    label: string;
    storyId?: string;
    args: Record<string, unknown>;
  }>;
}

export interface ComponentDetail {
  path: string;
  name: string;
  category: string;
  overview?: {
    storyId: string;
    content?: string;
    sections: Array<{ id: string; title: string }>;
  };
  variants: ComponentVariantRef[];
  tags: string[];
}
