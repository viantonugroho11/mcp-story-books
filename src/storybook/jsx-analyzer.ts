import { parse } from "@babel/parser";
import type { Node } from "@babel/types";

export type JsxPropValue =
  | { kind: "string"; value: string }
  | { kind: "number"; value: number }
  | { kind: "boolean"; value: boolean }
  | { kind: "dynamic" };

export interface JsxProp {
  name: string;
  value: JsxPropValue;
}

export interface JsxElementUsage {
  name: string;
  line: number;
  props: JsxProp[];
  hasSpread: boolean;
  hasChildren: boolean;
}

export interface ImportBinding {
  local: string;
  imported: string;
  source: string;
}

export interface JsxAnalysis {
  elements: JsxElementUsage[];
  imports: ImportBinding[];
}

export interface InferredProp {
  name: string;
  optional: boolean;
  type: string;
  options?: string[];
  kind: "string" | "number" | "boolean" | "enum" | "function" | "node" | "other";
}

export function parseSource(code: string): Node {
  return parse(code, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
    errorRecovery: true,
  }) as unknown as Node;
}

function walk(node: unknown, visit: (n: Node) => void): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit);
    return;
  }
  const n = node as Node & Record<string, unknown>;
  if (typeof n.type !== "string") return;
  visit(n);
  for (const key of Object.keys(n)) {
    if (key === "loc" || key === "start" || key === "end" || key.endsWith("Comments")) continue;
    walk(n[key], visit);
  }
}

function jsxName(node: Node): string | undefined {
  if (node.type === "JSXIdentifier") return node.name;
  if (node.type === "JSXMemberExpression") {
    const object = jsxName(node.object);
    return object ? `${object}.${node.property.name}` : undefined;
  }
  return undefined;
}

function propValue(value: Node | null | undefined): JsxPropValue {
  if (!value) return { kind: "boolean", value: true };
  if (value.type === "StringLiteral") return { kind: "string", value: value.value };
  if (value.type === "JSXExpressionContainer") {
    const expr = value.expression;
    if (expr.type === "StringLiteral") return { kind: "string", value: expr.value };
    if (expr.type === "NumericLiteral") return { kind: "number", value: expr.value };
    if (expr.type === "BooleanLiteral") return { kind: "boolean", value: expr.value };
    if (expr.type === "TemplateLiteral" && expr.expressions.length === 0) {
      return { kind: "string", value: expr.quasis.map((q) => q.value.cooked ?? "").join("") };
    }
  }
  return { kind: "dynamic" };
}

export function analyzeJsx(code: string): JsxAnalysis {
  const ast = parseSource(code);
  const elements: JsxElementUsage[] = [];
  const imports: ImportBinding[] = [];

  walk(ast, (node) => {
    if (node.type === "ImportDeclaration") {
      for (const spec of node.specifiers) {
        const imported =
          spec.type === "ImportSpecifier"
            ? spec.imported.type === "Identifier"
              ? spec.imported.name
              : spec.imported.value
            : spec.type === "ImportDefaultSpecifier"
              ? "default"
              : "*";
        imports.push({ local: spec.local.name, imported, source: node.source.value });
      }
      return;
    }

    if (node.type !== "JSXElement") return;
    const opening = node.openingElement;
    const name = jsxName(opening.name);
    if (!name) return;

    const props: JsxProp[] = [];
    let hasSpread = false;
    for (const attr of opening.attributes) {
      if (attr.type === "JSXSpreadAttribute") {
        hasSpread = true;
        continue;
      }
      const attrName =
        attr.name.type === "JSXIdentifier" ? attr.name.name : `${attr.name.namespace.name}:${attr.name.name.name}`;
      props.push({ name: attrName, value: propValue(attr.value) });
    }

    const hasChildren = node.children.some(
      (c) => !(c.type === "JSXText" && c.value.trim() === ""),
    );

    elements.push({
      name,
      line: opening.loc?.start.line ?? 0,
      props,
      hasSpread,
      hasChildren,
    });
  });

  return { elements, imports };
}

function typeText(code: string, node: Node): string {
  if (node.start == null || node.end == null) return "unknown";
  return code.slice(node.start, node.end).replace(/\s+/g, " ").trim();
}

function classifyType(code: string, node: Node): Pick<InferredProp, "kind" | "options" | "type"> {
  const type = typeText(code, node);
  switch (node.type) {
    case "TSStringKeyword":
      return { kind: "string", type };
    case "TSNumberKeyword":
      return { kind: "number", type };
    case "TSBooleanKeyword":
      return { kind: "boolean", type };
    case "TSFunctionType":
      return { kind: "function", type };
    case "TSLiteralType":
      if (node.literal.type === "StringLiteral") {
        return { kind: "enum", type, options: [node.literal.value] };
      }
      return { kind: "other", type };
    case "TSUnionType": {
      const literals = node.types.filter(
        (t): t is Extract<Node, { type: "TSLiteralType" }> =>
          t.type === "TSLiteralType" && t.literal.type === "StringLiteral",
      );
      const nonNullish = node.types.filter(
        (t) => t.type !== "TSUndefinedKeyword" && t.type !== "TSNullKeyword",
      );
      if (literals.length > 0 && literals.length === nonNullish.length) {
        return {
          kind: "enum",
          type,
          options: literals.map((l) => (l.literal as { value: string }).value),
        };
      }
      if (nonNullish.length === 1 && nonNullish[0]) return classifyType(code, nonNullish[0]);
      return { kind: "other", type };
    }
    case "TSTypeReference": {
      if (/ReactNode|ReactElement|JSX\.Element/.test(type)) return { kind: "node", type };
      return { kind: "other", type };
    }
    default:
      return { kind: "other", type };
  }
}

/**
 * Infer props of a component from its TypeScript source. Looks for an interface or
 * type alias named `<Component>Props`, falling back to the first `*Props` declaration.
 */
export function inferPropsFromSource(code: string, componentName: string): InferredProp[] {
  const ast = parseSource(code);
  const candidates = new Map<string, Node[]>();

  walk(ast, (node) => {
    if (node.type === "TSInterfaceDeclaration" && node.id.name.endsWith("Props")) {
      candidates.set(node.id.name, node.body.body as Node[]);
    } else if (
      node.type === "TSTypeAliasDeclaration" &&
      node.id.name.endsWith("Props") &&
      node.typeAnnotation.type === "TSTypeLiteral"
    ) {
      candidates.set(node.id.name, node.typeAnnotation.members as Node[]);
    }
  });

  const members = candidates.get(`${componentName}Props`) ?? [...candidates.values()][0] ?? [];
  const props: InferredProp[] = [];

  for (const member of members) {
    if (member.type !== "TSPropertySignature") continue;
    const key = member.key;
    const name =
      key.type === "Identifier" ? key.name : key.type === "StringLiteral" ? key.value : undefined;
    if (!name) continue;
    const annotation = member.typeAnnotation?.typeAnnotation;
    const classified = annotation
      ? classifyType(code, annotation)
      : { kind: "other" as const, type: "unknown" };
    props.push({ name, optional: Boolean(member.optional), ...classified });
  }

  return props;
}
