import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadConfig } from "../src/config/config.js";
import { createAuthProvider } from "../src/auth/auth-provider.js";
import { createStoryBookClient } from "../src/api/storybook-client.js";
import type { DiscoveryReport } from "../src/discovery/types.js";

const PROBE_PATHS = [
  "/",
  "/index.json",
  "/project.json",
  "/iframe.html",
  "/api/stories",
  "/api/story",
  "/api/books",
  "/api/search",
  "/stories",
  "/storybook",
  "/docs",
  "/sitemap.xml",
  "/robots.txt",
  "/_next/static",
  "/manifest.json",
];

function detectFramework(html: string): string | undefined {
  if (html.includes("STORYBOOK_FRAMEWORK") || html.includes("storybook - Storybook")) {
    return "Storybook (static)";
  }
  if (html.includes("__NEXT_DATA__")) {
    return "Next.js";
  }
  if (html.includes("_nuxt")) {
    return "Nuxt";
  }
  if (html.includes("vite") && html.includes("react")) {
    return "Vite + React";
  }
  return undefined;
}

function extractNextData(html: string): unknown | undefined {
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match?.[1]) {
    return undefined;
  }
  try {
    return JSON.parse(match[1]);
  } catch {
    return undefined;
  }
}

function guessEndpoints(payload: unknown): DiscoveryReport["endpoints"] {
  const endpoints: DiscoveryReport["endpoints"] = {};
  const json = JSON.stringify(payload);

  const patterns: Array<[keyof DiscoveryReport["endpoints"], RegExp]> = [
    ["listStories", /\/api\/stories(?!\/)/i],
    ["getStory", /\/api\/stories\/\{?storyId\}?/i],
    ["search", /\/api\/(?:stories\/)?search/i],
  ];

  for (const [key, regex] of patterns) {
    const found = json.match(regex);
    if (found?.[0]) {
      endpoints[key] = found[0].replace(/"/g, "");
    }
  }

  return endpoints;
}

async function main(): Promise<void> {
  const config = loadConfig();
  const client = createStoryBookClient(config, createAuthProvider(config));

  const probes: DiscoveryReport["probes"] = [];
  let framework: string | undefined;
  let homeHtml = "";

  for (const path of PROBE_PATHS) {
    try {
      const text = await client.requestText(path);
      probes.push({ path, status: 200, contentType: "text" });
      if (path === "/") {
        homeHtml = text;
        framework = detectFramework(text);
      }
    } catch (error) {
      const status = typeof error === "object" && error && "status" in error ? Number((error as { status: number }).status) : 0;
      probes.push({ path, status: status || 599 });
    }
  }

  const nextData = homeHtml ? extractNextData(homeHtml) : undefined;
  const guessedEndpoints = nextData ? guessEndpoints(nextData) : {};

  const report: DiscoveryReport = {
    generatedAt: new Date().toISOString(),
    baseUrl: config.baseUrl,
    framework,
    authentication: {
      edgeProtection: "HTTP Basic Auth (Vercel deployment protection observed without credentials)",
      appLevel: framework ? `${framework} app (post-edge auth not verified in this run)` : undefined,
    },
    endpoints: {
      listStories: framework === "Storybook (static)" ? "/index.json" : guessedEndpoints.listStories,
      getStory:
        framework === "Storybook (static)"
          ? "storybook-index-entry:{storyId}"
          : (guessedEndpoints.getStory ?? "/api/stories/{storyId}"),
      search: framework === "Storybook (static)" ? "(client-side)" : guessedEndpoints.search,
    },
    notes: [
      "Review successful probe paths and set STORYBOOK_API_* env vars if endpoints differ.",
      "Do not commit credentials. Keep discovery-output.json out of git if it contains sensitive hints.",
    ],
    probes,
  };

  const outputPath = resolve(process.cwd(), "discovery-output.json");
  writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`Discovery report written to ${outputPath}`);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
