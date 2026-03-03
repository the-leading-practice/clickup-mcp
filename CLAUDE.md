# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ClickUp MCP server enabling AI assistants to interact with ClickUp workspaces through the Model Context Protocol. Provides **170 tools** across 20 modules covering tasks, search, comments, time tracking, documents, chat, goals, views, webhooks, templates, checklists, custom fields, attachments, tags, user/guest management, and v3 API features.

## Common Development Commands

### Building & Testing
- `npm run build` - Compile TypeScript for validation
- `npm run test` - Run all tests in src/**/*.test.ts
- `npm run prettier` - Format code with Prettier

### CLI Testing Tool
- `npm run cli <tool>` - Test MCP tools directly from command line
- CLI syntax: `npm run cli <tool> key=value key2="\"quoted string\"" arrayKey='["item1","item2"]' objectKey='{"field":"value"}'`
- `npm run cli instructions` - Show server instructions
- `npm run cli resources` - List available resources
- `npm run cli resource <uri>` - Read specific resource

### Development & Release
- `npm run dev` - Watch mode with nodemon
- `npm run release` - Build, publish, commit, tag, and push
- `npm run mcpb` - Package as MCPB bundle

## Architecture

### Transport Modes
- **stdio** (default) - Standard I/O for Claude Desktop, npx, and CLI usage
- **http** - HTTP/SSE transport for Docker and network deployments
  - Set `CLICKUP_MCP_TRANSPORT=http` to enable
  - API credentials provided per-session via request headers (`X-ClickUp-API-Key`, `X-ClickUp-Team-ID`, `X-ClickUp-MCP-Mode`)
  - Entry point: `src/http-server.ts` → `dist/http-server.js`
  - Endpoint: `POST /mcp` (MCP protocol), `GET /health` (health check)
  - Default port: 8417

### Entry Point & Mode System
- **src/index.ts** - Stdio transport entry point with three operational modes:
  - `read-minimal`: Only getTaskById and searchTasks (for AI coding context)
  - `read`: All read-only tools
  - `write`: Complete functionality (default)
- **src/http-server.ts** - HTTP transport entry point for Docker/network deployment
  - Creates per-session MCP servers with credentials from headers
  - Session management with UUID-based session IDs
  - CORS support and graceful shutdown
- Mode controlled by `CLICKUP_MCP_MODE` environment variable
- Tools conditionally registered based on mode in initializeServer() / createMcpServer()

### Tool Organization (170 tools across 20 modules)
Tools are modularized in `src/tools/` with separate read/write registration:
- **task-tools.ts** - Read operations (getTaskById, getTasks, getFilteredTeamTasks, getCustomTaskTypes, getBulkTasksTimeInStatus)
- **task-write-tools.ts** - Write operations (createTask, updateTask, deleteTask, deleteList, mergeTasks)
- **search-tools.ts** - searchTasks with fuzzy matching
- **space-tools.ts** - searchSpaces, getSharedHierarchy, space CRUD
- **folder-tools.ts** - Folder CRUD operations
- **list-tools.ts** - List CRUD with append-only descriptions
- **time-tools.ts** - Time tracking (17 tools including legacy endpoints)
- **doc-tools.ts** - Document operations (read, search, create, update)
- **chat-tools.ts** - ClickUp Chat v3 API (20 tools: channels, messages, reactions, replies)
- **comment-tools.ts** - Task/list/view comments with threading (9 tools)
- **checklist-tools.ts** - Checklist CRUD operations (6 tools)
- **custom-field-tools.ts** - Custom field management (6 tools)
- **attachment-tools.ts** - Attachment operations
- **goal-tools.ts** - Goals and key results (8 tools)
- **view-tools.ts** - Views CRUD including workspace-level (12 tools)
- **user-tools.ts** - User, guest, and workspace management (25 tools)
- **template-tools.ts** - Task/list templates (7 tools)
- **tag-member-tools.ts** - Tags, watchers, and member access (12 tools)
- **webhook-tools.ts** - Webhook CRUD (4 tools)
- **v3-tools.ts** - v3 API: audit logs, task activity, move, duplicate, bulk update, ACL (7 tools)

### Core Utilities (src/shared/)

#### Caching System (utils.ts)
**Critical Pattern**: Cache promises, not results, to prevent race conditions
```typescript
// Pattern used in: getCurrentUser, getAllTeamMembers, getTaskSearchIndex, getSpaceSearchIndex
let cachedPromise: Promise<T> | null = null;
const fetchPromise = (async () => { /* API call */ })();
cachedPromise = fetchPromise;
setTimeout(() => { cachedPromise = null; }, GLOBAL_REFRESH_INTERVAL);
```
- `GLOBAL_REFRESH_INTERVAL = 60000` (60 seconds) aligns with ClickUp's rate limit window
- All caches auto-invalidate after 60 seconds

#### Text Processing (clickup-text.ts)
- **convertClickUpTextItemsToToolCallResult()** - Converts ClickUp's proprietary text format to MCP content blocks, preserving markdown formatting (headers, lists, blockquotes, code blocks, inline styles)
- **convertMarkdownToToolCallResult()** - Processes markdown with image references
- **convertMarkdownToClickUpBlocks()** - Uses remark/unified to convert markdown back to ClickUp's format for comments

#### Image Processing (image-processing.ts)
Smart image handling with dual limits:
- Count limit (MAX_IMAGES, default: 4) - keeps most recent images
- Size budget (MAX_RESPONSE_SIZE_MB, default: 1MB) - intelligent per-image budgeting
- Tries multiple thumbnail sizes (large → medium → small) until budget satisfied
- Handles both external URLs and inline data URIs

### Search Architecture
Uses Fuse.js for fuzzy search with weighted keys:
- Task search weights: name (0.7), id (0.6), text_content (0.5), tags (0.4), assignees (0.4), list (0.3), folder (0.2), space (0.1)
- Multi-term search with aggressive boosting for items matching multiple terms
- Search indices cached with promise-based pattern to prevent race conditions

## API Integration Guidelines

### Rate Limiting
- ClickUp allows **100 API calls per minute per user**
- Typical workflow must not exceed this limit
- Use caching extensively (60-second window aligns with rate limit reset)

### API Documentation
- ClickUp API docs: https://developer.clickup.com/reference/
- Use v2 endpoints for most operations, v3 for documents, chat, audit logs, ACL, and task move

### Logging
- Use `console.error()` to prevent writing log messages to stdout (MCP uses stdio)
- Example: `console.error('Refreshing task index for filters:', key)`

## Important Patterns & Constraints

### Append-Only Safety
Task/list descriptions are **append-only** to prevent data loss:
- Never overwrite existing description content
- New content appended with timestamps
- Status, priority, assignees are normally updatable (easily revertible in ClickUp)

### ID Output Convention
When outputting references, always include IDs:
```
"User: Username (user_id: 12345)"
"Space: Project Name (space_id: 789)"
```

### MCPB Manifest
- Update `manifest.json` when adding new MCP tools
- Spec: https://github.com/anthropics/mcpb/blob/main/README.md

### Changelog
- Update `CHANGELOG.md` when changing or implementing features

### Backward Compatibility
- Backwards compatibility does not matter - LLMs will understand new parameters
- Feel free to add/modify parameters without migration concerns

## Testing Structure

Tests follow naming pattern: `src/tests/<feature>.test.ts`
- Test files use Node's built-in test runner
- Mock data and test utilities in `src/test-utils.ts`
- Run specific test: `node --test -r ts-node/register src/tests/<feature>.test.ts`