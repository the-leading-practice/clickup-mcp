#!/usr/bin/env node

import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
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

// Session storage
const transports: Record<string, StreamableHTTPServerTransport> = {};

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

/**
 * Read the full request body as a string
 */
function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

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

// Create the HTTP server
const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
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

  // Health check endpoint
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', transport: 'streamable-http' }));
    return;
  }

  // Only handle /mcp path
  if (req.url !== '/mcp') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found. Use POST /mcp for MCP requests.' }));
    return;
  }

  // Handle POST /mcp
  if (req.method === 'POST') {
    try {
      const body = await readBody(req);
      const parsedBody = JSON.parse(body);
      const sessionId = req.headers['mcp-session-id'] as string;

      if (sessionId && transports[sessionId]) {
        // Existing session - reuse transport
        await transports[sessionId].handleRequest(req, res, parsedBody);
      } else if (!sessionId && isInitializeRequest(parsedBody)) {
        // New session - extract credentials from headers
        const creds = extractCredentials(req);
        if (!creds) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            jsonrpc: '2.0',
            error: {
              code: -32000,
              message: 'Missing credentials. Provide X-ClickUp-API-Key and X-ClickUp-Team-ID headers.',
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

        // Create transport
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sid) => {
            console.error(`Session initialized: ${sid}`);
            transports[sid] = transport;
          },
        });

        transport.onclose = () => {
          const sid = transport.sessionId;
          if (sid && transports[sid]) {
            console.error(`Session closed: ${sid}`);
            delete transports[sid];
          }
        };

        await mcpServer.connect(transport);
        await transport.handleRequest(req, res, parsedBody);
      } else {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Bad Request: No valid session ID provided',
          },
          id: null,
        }));
      }
    } catch (error) {
      console.error('Error handling MCP request:', error);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        }));
      }
    }
    return;
  }

  // Handle GET /mcp (SSE streams)
  if (req.method === 'GET') {
    const sessionId = req.headers['mcp-session-id'] as string;
    if (!sessionId || !transports[sessionId]) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid or missing session ID' }));
      return;
    }
    await transports[sessionId].handleRequest(req, res);
    return;
  }

  // Handle DELETE /mcp (session termination)
  if (req.method === 'DELETE') {
    const sessionId = req.headers['mcp-session-id'] as string;
    if (!sessionId || !transports[sessionId]) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid or missing session ID' }));
      return;
    }
    await transports[sessionId].handleRequest(req, res);
    return;
  }

  res.writeHead(405, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Method not allowed' }));
});

// Start the server
httpServer.listen(PORT, () => {
  console.error(`ClickUp MCP HTTP server listening on port ${PORT}`);
  console.error(`Mode: ${CONFIG.mode}`);
  console.error(`Endpoint: POST http://0.0.0.0:${PORT}/mcp`);
  console.error(`Health: GET http://0.0.0.0:${PORT}/health`);
  console.error(`API credentials provided via headers: X-ClickUp-API-Key, X-ClickUp-Team-ID`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.error('Shutting down...');
  for (const sessionId in transports) {
    try {
      await transports[sessionId].close();
      delete transports[sessionId];
    } catch (error) {
      console.error(`Error closing session ${sessionId}:`, error);
    }
  }
  httpServer.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('Received SIGTERM, shutting down...');
  for (const sessionId in transports) {
    try {
      await transports[sessionId].close();
      delete transports[sessionId];
    } catch (error) {
      console.error(`Error closing session ${sessionId}:`, error);
    }
  }
  httpServer.close();
  process.exit(0);
});
