export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

const HEX_PATTERN = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB_PATTERN = /^rgba?\(\s*([\d.]+%?)[\s,]+([\d.]+%?)[\s,]+([\d.]+%?)(?:[\s,/]+([\d.]+%?))?\s*\)$/i;
const HSL_PATTERN = /^hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%(?:[\s,/]+([\d.]+%?))?\s*\)$/i;
const LENGTH_PATTERN = /^(-?\d*\.?\d+)(px|rem)$/i;

function channel(value: string): number {
  return value.endsWith("%") ? (parseFloat(value) / 100) * 255 : parseFloat(value);
}

function alpha(value: string | undefined): number {
  if (value === undefined) return 1;
  return value.endsWith("%") ? parseFloat(value) / 100 : parseFloat(value);
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const sat = s / 100;
  const light = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

export function parseColor(input: string): Rgba | undefined {
  const value = input.trim().toLowerCase();
  const hex = HEX_PATTERN.exec(value);
  if (hex) {
    let digits = hex[1]!;
    if (digits.length <= 4) digits = [...digits].map((d) => d + d).join("");
    const n = (i: number) => parseInt(digits.slice(i, i + 2), 16);
    return { r: n(0), g: n(2), b: n(4), a: digits.length === 8 ? n(6) / 255 : 1 };
  }
  const rgb = RGB_PATTERN.exec(value);
  if (rgb) {
    return { r: channel(rgb[1]!), g: channel(rgb[2]!), b: channel(rgb[3]!), a: alpha(rgb[4]) };
  }
  const hsl = HSL_PATTERN.exec(value);
  if (hsl) {
    const [r, g, b] = hslToRgb(parseFloat(hsl[1]!), parseFloat(hsl[2]!), parseFloat(hsl[3]!));
    return { r, g, b, a: alpha(hsl[4]) };
  }
  return undefined;
}

export function colorKey(color: Rgba): string {
  const hex = [color.r, color.g, color.b]
    .map((c) => Math.round(c).toString(16).padStart(2, "0"))
    .join("");
  return color.a < 1 ? `#${hex}/${color.a.toFixed(2)}` : `#${hex}`;
}

function toLab({ r, g, b }: Rgba): [number, number, number] {
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

/** CIE76 ΔE. Values under ~2.3 are barely perceptible. */
export function deltaE(a: Rgba, b: Rgba): number {
  const [l1, a1, b1] = toLab(a);
  const [l2, a2, b2] = toLab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2) + Math.abs(a.a - b.a) * 100;
}

export function parseLengthPx(input: string, remBase = 16): number | undefined {
  const match = LENGTH_PATTERN.exec(input.trim());
  if (!match) return undefined;
  const value = parseFloat(match[1]!);
  return match[2]!.toLowerCase() === "rem" ? value * remBase : value;
}
