import { spawn } from "node:child_process";
import { resolve } from "node:path";

const cwd = resolve(import.meta.dirname, "..");

function encodeMessage(msg) {
  const body = JSON.stringify(msg);
  return `Content-Length: ${Buffer.byteLength(body, "utf8")}\r\n\r\n${body}`;
}

function parseMessages(buffer) {
  const messages = [];
  let rest = buffer;
  while (true) {
    const headerEnd = rest.indexOf("\r\n\r\n");
    if (headerEnd === -1) {
      break;
    }
    const header = rest.slice(0, headerEnd);
    const lengthMatch = header.match(/Content-Length:\s*(\d+)/i);
    if (!lengthMatch?.[1]) {
      break;
    }
    const length = Number(lengthMatch[1]);
    const start = headerEnd + 4;
    if (rest.length < start + length) {
      break;
    }
    const body = rest.slice(start, start + length);
    rest = rest.slice(start + length);
    try {
      messages.push(JSON.parse(body));
    } catch {
      // ignore
    }
  }
  return { messages, rest };
}

const child = spawn("node", ["dist/index.js"], {
  cwd,
  stdio: ["pipe", "pipe", "pipe"],
  env: process.env,
});

let stdoutBuffer = "";
child.stdout.on("data", (chunk) => {
  stdoutBuffer += chunk.toString();
});

child.stderr.on("data", (chunk) => {
  process.stderr.write(chunk);
});

const send = (msg) => {
  child.stdin.write(encodeMessage(msg));
};

send({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "mcp-smoke-test", version: "1.0.0" },
  },
});

setTimeout(() => {
  send({ jsonrpc: "2.0", method: "notifications/initialized" });
  send({ jsonrpc: "2.0", id: 2, method: "tools/list" });
  send({
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: { name: "list_components", arguments: { limit: 3 } },
  });
}, 500);

setTimeout(() => {
  const { messages } = parseMessages(stdoutBuffer);
  for (const msg of messages) {
    if (msg.id === 2) {
      console.log("\n=== tools/list ===");
      console.log(msg.result?.tools?.map((t) => t.name).join(", "));
    }
    if (msg.id === 3) {
      console.log("\n=== list_components ===");
      console.log(msg.result?.content?.[0]?.text?.slice(0, 1500) ?? JSON.stringify(msg));
    }
  }
  child.kill();
  process.exit(0);
}, 5000);
