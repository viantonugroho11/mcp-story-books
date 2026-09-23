export interface ExtractedSection {
  id: string;
  title: string;
  content: string;
}

function decodeJsString(value: string): string {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

export function extractPlainTextFromChunk(source: string): string {
  const parts: string[] = [];

  const quotedChildren = /children:"((?:[^"\\]|\\.)*)"/g;
  for (const match of source.matchAll(quotedChildren)) {
    const text = decodeJsString(match[1] ?? "").trim();
    if (text.length >= 2 && !text.startsWith("./") && !text.includes("jsx")) {
      parts.push(text);
    }
  }

  const templateChildren = /children:`([^`]*)`/g;
  for (const match of source.matchAll(templateChildren)) {
    const text = (match[1] ?? "").trim();
    if (text.length >= 8) {
      parts.push(text);
    }
  }

  return [...new Set(parts)].join("\n\n");
}

export function extractSectionsFromChunk(source: string): ExtractedSection[] {
  const sections: ExtractedSection[] = [];
  const headingPattern = /(?:n\.)?h2,\{id:"([^"]+)",children:"([^"]+)"\}/g;

  for (const match of source.matchAll(headingPattern)) {
    const id = match[1];
    const title = match[2];
    if (!id || !title) {
      continue;
    }
    sections.push({ id, title, content: "" });
  }

  if (sections.length === 0) {
    const text = extractPlainTextFromChunk(source);
    if (text) {
      sections.push({ id: "content", title: "Content", content: text });
    }
    return sections;
  }

  const fullText = extractPlainTextFromChunk(source);
  for (const section of sections) {
    const idx = fullText.indexOf(section.title);
    section.content = idx >= 0 ? fullText.slice(idx) : section.title;
  }

  return sections;
}
