#!/usr/bin/env node

import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { CONFIG } from "./shared/config";
import { getCurrentUser, getSpaceSearchIndex } from "./shared/utils";

// Import tool registration functions
import { registerTaskToolsRead } from "./tools/task-tools";
import { registerTaskToolsWrite } from "./tools/task-write-tools";
import { registerSearchTools } from "./tools/search-tools";
import { registerSpaceToolsRead, registerSpaceToolsWrite } from "./tools/space-tools";
import { registerFolderToolsRead, registerFolderToolsWrite } from "./tools/folder-tools";
import { registerListToolsRead, registerListToolsWrite } from "./tools/list-tools";
import { registerTimeToolsRead, registerTimeToolsWrite } from "./tools/time-tools";
import { registerDocumentToolsRead, registerDocumentToolsWrite } from "./tools/doc-tools";
import { registerTemplateToolsRead, registerTemplateToolsWrite } from "./tools/template-tools";
import { registerChecklistToolsRead, registerChecklistToolsWrite } from "./tools/checklist-tools";
import { registerCustomFieldToolsRead, registerCustomFieldToolsWrite } from "./tools/custom-field-tools";
import { registerAttachmentToolsRead, registerAttachmentToolsWrite } from "./tools/attachment-tools";
import { registerCommentToolsRead, registerCommentToolsWrite } from "./tools/comment-tools";
import { registerGoalToolsRead, registerGoalToolsWrite } from "./tools/goal-tools";
import { registerViewToolsRead, registerViewToolsWrite } from "./tools/view-tools";
import { registerUserToolsRead, registerUserToolsWrite } from "./tools/user-tools";
import { registerWebhookToolsRead, registerWebhookToolsWrite } from "./tools/webhook-tools";
import { registerV3ToolsRead, registerV3ToolsWrite } from "./tools/v3-tools";
import { registerTagMemberToolsRead, registerTagMemberToolsWrite } from "./tools/tag-member-tools";
import { registerChatToolsRead, registerChatToolsWrite } from "./tools/chat-tools";
import { registerSpaceResources } from "./resources/space-resources";

const PORT = parseInt(process.env.PORT || "8417", 10);

// Shared transport store: sessionId -> { transport, server }
const transports = new Map<string, { transport: StreamableHTTPServerTransport | SSEServerTransport; server: McpServer }>();

/**
 * Create and initialize an MCP server with all tools registered.
 * Uses the current CONFIG values (apiKey, teamId) which must be set before calling.
 */
async function createMcpServer(): Promise<McpServer> {
  // Fetch current user and spaces for enhanced tool documentation
  const [userData, spacesIndex] = await Promise.all([
    getCurrentUser(),
    getSpaceSearchIndex()
  ]);
  const spaces = (spacesIndex as any)._docs || [];
  console.error(`Connected as: ${userData.user.username} (${userData.user.email})`);

  const activeSpaces = spaces.filter((s: any) => !s.archived);
  const formattedSpaces = activeSpaces
    .map((s: any) => `- ${s.name} (space_id: ${s.id})`)
    .join('\n');

  const instructions = [
    `ClickUp is a Ticket system. It is used to track tasks, bugs, and other work items.`,
    `If you are asked for infos about projects or tasks, search for tasks or documents in ClickUp (this MCP) first.`,
    `The following spaces/projects are available:`,
    formattedSpaces
  ].join('\n');
  console.error(`Pre-loaded ${activeSpaces.length} active spaces`);

  const server = new McpServer({
    name: "Clickup MCP",
    version: require('../package.json').version,
  }, {
    instructions
  });

  // Register all tools based on mode
  if (CONFIG.mode === 'read-minimal') {
    registerTaskToolsRead(server, userData);
    registerSearchTools(server, userData);
  } else if (CONFIG.mode === 'read') {
    registerTaskToolsRead(server, userData);
    registerSearchTools(server, userData);
    registerSpaceToolsRead(server);
    registerSpaceResources(server);
    registerFolderToolsRead(server);
    registerListToolsRead(server);
    registerTimeToolsRead(server);
    registerDocumentToolsRead(server);
    registerTemplateToolsRead(server);
    registerChecklistToolsRead(server);
    registerCustomFieldToolsRead(server);
    registerAttachmentToolsRead(server);
    registerCommentToolsRead(server);
    registerGoalToolsRead(server);
    registerViewToolsRead(server);
    registerUserToolsRead(server);
    registerWebhookToolsRead(server);
    registerV3ToolsRead(server);
    registerTagMemberToolsRead(server);
    registerChatToolsRead(server);
  } else {
    // write mode (default)
    registerTaskToolsRead(server, userData);
    registerTaskToolsWrite(server, userData);
    registerSearchTools(server, userData);
    registerSpaceToolsRead(server);
    registerSpaceToolsWrite(server);
    registerSpaceResources(server);
    registerFolderToolsRead(server);
    registerFolderToolsWrite(server);
    registerListToolsRead(server);
    registerListToolsWrite(server);
    registerTimeToolsRead(server);
    registerTimeToolsWrite(server);
    registerDocumentToolsRead(server);
    registerDocumentToolsWrite(server);
    registerTemplateToolsRead(server);
    registerTemplateToolsWrite(server);
    registerChecklistToolsRead(server);
    registerChecklistToolsWrite(server);
    registerCustomFieldToolsRead(server);
    registerCustomFieldToolsWrite(server);
    registerAttachmentToolsRead(server);
    registerAttachmentToolsWrite(server);
    registerCommentToolsRead(server);
    registerCommentToolsWrite(server);
    registerGoalToolsRead(server);
    registerGoalToolsWrite(server);
    registerViewToolsRead(server);
    registerViewToolsWrite(server);
    registerUserToolsRead(server);
    registerUserToolsWrite(server);
    registerWebhookToolsRead(server);
    registerWebhookToolsWrite(server);
    registerV3ToolsRead(server);
    registerV3ToolsWrite(server);
    registerTagMemberToolsRead(server);
    registerTagMemberToolsWrite(server);
    registerChatToolsRead(server);
    registerChatToolsWrite(server);
  }

  return server;
}

// ━━━ JSON BODY PARSER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString();
      if (!raw) return resolve(undefined);
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

// ━━━ STREAMABLE HTTP TRANSPORT (/mcp) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Extract ClickUp credentials from request headers.
 * Headers: X-ClickUp-API-Key, X-ClickUp-Team-ID, X-ClickUp-MCP-Mode
 */
function extractCredentials(req: IncomingMessage): { apiKey: string; teamId: string; mode?: string } | null {
  const apiKey = req.headers['x-clickup-api-key'] as string;
  const teamId = req.headers['x-clickup-team-id'] as string;
  const mode = req.headers['x-clickup-mcp-mode'] as string | undefined;

  if (!apiKey || !teamId) {
    return null;
  }

  return { apiKey, teamId, mode };
}

/**
 * Set CONFIG values from request headers
 */
function applyCredentials(creds: { apiKey: string; teamId: string; mode?: string }) {
  (CONFIG as any).apiKey = creds.apiKey;
  (CONFIG as any).teamId = creds.teamId;
  if (creds.mode) {
    const m = creds.mode.toLowerCase();
    if (m === 'read-minimal' || m === 'read' || m === 'write') {
      (CONFIG as any).mode = m;
    }
  }
}

async function handleStreamableHttp(req: IncomingMessage, res: ServerResponse, body: any) {
  const sessionId = req.headers["mcp-session-id"] as string;

  if (sessionId && transports.has(sessionId)) {
    const entry = transports.get(sessionId)!;
    if (!(entry.transport instanceof StreamableHTTPServerTransport)) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Session uses a different transport protocol" },
        id: null,
      }));
      return;
    }
    await entry.transport.handleRequest(req, res, body);
    return;
  }

  if (!sessionId && req.method === "POST" && isInitializeRequest(body)) {
    // Extract credentials from headers
    const creds = extractCredentials(req);
    if (!creds) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Missing credentials. Provide X-ClickUp-API-Key and X-ClickUp-Team-ID headers.",
        },
        id: null,
      }));
      return;
    }

    // Apply credentials to CONFIG
    applyCredentials(creds);
    console.error(`New session request from team ${creds.teamId}`);

    // Create MCP server with tools
    const mcpServer = await createMcpServer();

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sid: string) => {
        console.error(`Session initialized: ${sid}`);
        transports.set(sid, { transport, server: mcpServer });
      },
    });

    transport.onclose = () => {
      const sid = transport.sessionId;
      if (sid) {
        console.error(`Session closed: ${sid}`);
        transports.delete(sid);
      }
    };

    await mcpServer.connect(transport);
    await transport.handleRequest(req, res, body);
    return;
  }

  // Not an initialize request and no valid session
  res.writeHead(400, { "Content-Type": "application/json" });
  res.end(JSON.stringify({
    jsonrpc: "2.0",
    error: { code: -32000, message: "Bad Request: No valid session ID provided" },
    id: null,
  }));
}

// ━━━ LEGACY SSE TRANSPORT (/sse + /messages) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function handleSseConnect(req: IncomingMessage, res: ServerResponse) {
  // Extract credentials from headers for SSE sessions too
  const creds = extractCredentials(req);
  if (!creds) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Missing credentials. Provide X-ClickUp-API-Key and X-ClickUp-Team-ID headers." }));
    return;
  }

  applyCredentials(creds);
  console.error(`New SSE session request from team ${creds.teamId}`);

  const transport = new SSEServerTransport("/messages", res);
  const mcpServer = await createMcpServer();

  transports.set(transport.sessionId, { transport, server: mcpServer });

  res.on("close", () => {
    transports.delete(transport.sessionId);
  });

  await mcpServer.connect(transport);
}

async function handleSseMessage(req: IncomingMessage, res: ServerResponse, body: any) {
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);
  const sessionId = url.searchParams.get("sessionId");

  if (!sessionId || !transports.has(sessionId)) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Missing or invalid sessionId" }));
    return;
  }

  const entry = transports.get(sessionId)!;
  if (!(entry.transport instanceof SSEServerTransport)) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Session uses a different transport protocol" },
      id: null,
    }));
    return;
  }

  await entry.transport.handlePostMessage(req, res, body);
}

// ━━━ HTTP SERVER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const serverInfo = {
  name: "clickup-mcp-server",
  version: require('../package.json').version,
  description: "ClickUp MCP Server — Search, create, and retrieve tasks, add comments, and track time through natural language commands.",
  transports: {
    streamableHttp: {
      endpoint: "/mcp",
      methods: ["GET", "POST", "DELETE"],
      protocol: "2025-11-25",
    },
    sse: {
      endpoints: { connect: "/sse", messages: "/messages" },
      protocol: "2024-11-05",
    },
  },
  health: "/health",
};

const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Mcp-Session-Id, X-ClickUp-API-Key, X-ClickUp-Team-ID, X-ClickUp-MCP-Mode, Last-Event-ID');
  res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // ── Root: server info ──
  if (url.pathname === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(serverInfo, null, 2));
    return;
  }

  // ── Health check ──
  if (url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", sessions: transports.size }));
    return;
  }

  // ── Streamable HTTP transport ──
  if (url.pathname === "/mcp") {
    try {
      const body = req.method === "POST" ? await parseJsonBody(req) : undefined;
      await handleStreamableHttp(req, res, body);
    } catch (err) {
      console.error("MCP request error:", err);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal server error" }));
      }
    }
    return;
  }

  // ── Legacy SSE transport: connect ──
  if (url.pathname === "/sse" && req.method === "GET") {
    try {
      await handleSseConnect(req, res);
    } catch (err) {
      console.error("SSE connect error:", err);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal server error" }));
      }
    }
    return;
  }

  // ── Legacy SSE transport: messages ──
  if (url.pathname === "/messages" && req.method === "POST") {
    try {
      const body = await parseJsonBody(req);
      await handleSseMessage(req, res, body);
    } catch (err) {
      console.error("SSE message error:", err);
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal server error" }));
      }
    }
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.error(`ClickUp MCP HTTP server listening on port ${PORT}`);
  console.error(`  Mode:            ${CONFIG.mode}`);
  console.error(`  Streamable HTTP: /mcp`);
  console.error(`  Legacy SSE:      /sse + /messages`);
  console.error(`  Health:          /health`);
  console.error(`  Info:            /`);
  console.error(`  Credentials via headers: X-ClickUp-API-Key, X-ClickUp-Team-ID`);
});

// ━━━ GRACEFUL SHUTDOWN ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function shutdown(signal: string) {
  console.error(`\n${signal} received, shutting down...`);
  const closePromises: Promise<void>[] = [];
  transports.forEach((entry, sid) => {
    closePromises.push(
      entry.transport.close().catch((err: any) => {
        console.error(`Error closing session ${sid}:`, err);
      })
    );
  });
  await Promise.all(closePromises);
  transports.clear();
  httpServer.close(() => {
    console.error("Server shut down");
    process.exit(0);
  });
  // Force exit after 5s if connections don't close
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
