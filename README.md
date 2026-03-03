# ClickUp MCP for AI Assistants

Model Context Protocol (MCP) server enabling AI assistants to interact with ClickUp workspaces. Get complete task context with comments and images, search across projects, create and update tasks, collaborate through comments, and track time - all through natural language.

## What You Can Do

Turn natural language into powerful ClickUp actions:

**Agentic Coding & Development:**
- *"Look at CU-abc123, can you find the relevant code?"*
- *"Can you build the dashboard like described in https://app.clickup.com/t/12a23b45c?"*
- *"Check task CU-xyz789 and fix the bugs mentioned in the comments"*
- *"Implement the API endpoints described in the integration task"*

**Time Tracking & Productivity:**
- *"Book 2 hours for the client meeting on the XYZ project"*
- *"How much time did I spend on development tasks this week?"*
- *"Log 30 minutes for code review on the authentication feature"*

**Smart Search & Discovery:**
- *"What task did I mention the CSV import in?"*
- *"Find all tasks related to the payment gateway integration"*
- *"Show me tasks where users reported login issues"*

**Daily Workflow Management:**
- *"What do I need to do today?"*
- *"Create a task for fixing the dashboard bug in the frontend list"*
- *"Update the API documentation task to 'in review' status"*
- *"What tasks are blocking the mobile app release?"*

**Rich Context & Collaboration:**
- *"Show me all comments on the user authentication task"*
- *"What's the latest update on the database migration?"*
- *"Add a comment to the design task about the new wireframes"*

**Document Management:**
- *"Find documents about job posting in hauptsache.net space"*
- *"Search for API documentation across all spaces"*
- *"Read the API documentation in the development space"*
- *"Create a new requirements document for the mobile app project"*
- *"Update the meeting notes with today's decisions"*
- *"What documents are in the product strategy space?"*

## Key Features

### 170 Tools Across 20 Modules

| Category | Tools | Capabilities |
|----------|:-----:|--------------|
| Tasks | 10 | CRUD, search, bulk query, merge, custom task types |
| Search | 1 | Fuzzy matching across names, descriptions, content |
| Spaces & Folders | 12 | Hierarchy browsing, CRUD, shared hierarchy |
| Lists | 9 | CRUD with append-only descriptions |
| Documents | 4 | Read, search, create, update pages |
| Chat (v3) | 20 | Channels, messages, reactions, replies, DMs |
| Comments | 9 | Task/list/view comments with threading |
| Time Tracking | 17 | Entries, timers, tags, legacy endpoints |
| Goals | 8 | Goals and key results with progress |
| Views | 12 | Workspace/space/folder/list views, CRUD |
| Users & Guests | 25 | Workspace members, guests, roles, groups |
| Templates | 7 | Task/list/folder templates |
| Checklists | 6 | Checklist items on tasks |
| Custom Fields | 6 | Field values on tasks |
| Tags & Members | 12 | Tags, watchers, member access |
| Webhooks | 4 | Event subscription management |
| v3 API | 7 | Audit logs, task activity, move, duplicate, bulk update, ACL |
| Attachments | 1 | Task attachment retrieval |

### Core Capabilities

- **Intelligent Search** - Fuzzy matching across task names, descriptions, and comments with multi-language support
- **Complete Context** - Full comment histories, embedded images, document content with page navigation
- **Time Tracking** - Log entries, start/stop timers, tags, legacy endpoint support
- **Chat Integration** - Full ClickUp Chat API: channels, messages, reactions, replies, direct messages
- **Task & Document Management** - Create and update with markdown, manage priorities, dates, assignees, custom fields
- **Safety Features** - Append-only descriptions prevent data loss; normal fields easily revertible through ClickUp history

## Installation

### Prerequisites

For all installation methods, you'll need:
- Your `CLICKUP_API_KEY` (Profile Icon > Settings > Apps > API Token ~ usually starts with pk_)
- Your `CLICKUP_TEAM_ID` (The 7–10 digit number in the URL when you are in the settings)

### Option 1: MCPB Bundle (Recommended for Claude Desktop)

Download the pre-built bundle from our [releases page](https://github.com/hauptsacheNet/clickup-mcp/releases). This method requires no Node.js installation.

You'll get a configuration screen where you are prompted to enter your API key and team ID.

### Option 2: NPX Installation

This method automatically updates to the latest version and is preferred for users who want the newest features.

**For Claude Desktop, Windsurf, Cursor and others:**

Add the following to your MCP configuration file:

```json
{
  "mcpServers": {
    "clickup": {
      "command": "npx",
      "args": [
        "@hauptsache.net/clickup-mcp@latest"
      ],
      "env": {
        "CLICKUP_API_KEY": "your_api_key",
        "CLICKUP_TEAM_ID": "your_team_id"
      }
    }
  }
}
```

Replace `your_api_key` and `your_team_id` with your actual ClickUp credentials.

**Where to add this configuration:**
- **Claude Desktop**: Settings > Developer > Edit Config
- **Windsurf**: Add to your MCP configuration file
- **Cursor**: Configure through the MCP settings panel

### Option 3: Docker (HTTP Transport)

Run as a Docker container with HTTP transport. API credentials are provided per-session via request headers — no secrets in environment variables.

```bash
docker compose up -d
```

Or build and run manually:
```bash
npm run build
docker build -t clickup-mcp .
docker run -d -p 8417:8417 --name clickup-mcp clickup-mcp
```

The server exposes:
- `POST /mcp` — MCP protocol endpoint (Streamable HTTP)
- `GET /health` — Health check

**Connecting an MCP client:**

MCP clients must provide credentials via HTTP headers on the initialization request:

| Header | Required | Description |
|--------|----------|-------------|
| `X-ClickUp-API-Key` | Yes | Your ClickUp API key |
| `X-ClickUp-Team-ID` | Yes | Your ClickUp Team ID |
| `X-ClickUp-MCP-Mode` | No | `read-minimal`, `read`, or `write` (default) |

Clients must also send `Accept: application/json, text/event-stream` and `Content-Type: application/json` headers.

Example initialization:
```bash
curl -X POST http://localhost:8417/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "X-ClickUp-API-Key: your_api_key" \
  -H "X-ClickUp-Team-ID: your_team_id" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}},"id":1}'
```

**docker-compose.yml:**
```yaml
services:
  clickup-mcp:
    build: .
    container_name: clickup-mcp
    ports:
      - "8417:8417"
    environment:
      - CLICKUP_MCP_TRANSPORT=http
      - CLICKUP_MCP_MODE=${CLICKUP_MCP_MODE:-write}
      - PORT=8417
    restart: unless-stopped
```

### Option 4: Coding Tools Integration

**Claude Code (CLI):**
```bash
claude mcp add --scope user clickup \
  --env CLICKUP_API_KEY=YOUR_KEY \
  --env CLICKUP_TEAM_ID=YOUR_ID \
  --env CLICKUP_MCP_MODE=read-minimal \
  --env MAX_IMAGES=16 \
  --env MAX_RESPONSE_SIZE_MB=4 \
  -- npx -y @hauptsache.net/clickup-mcp
```

> Claude Code can handle a lot of images, thus the recommended increased limits.
 
> Note the `CLICKUP_MCP_MODE=read-minimal`. This is my usage recommendation, but feel free to use one of the other modes.

**OpenAI Codex:**
Add these lines to your `~/.codex/config.toml` file:
```toml
[mcp_servers.clickup]
command = "npx"
args = ["-y", "@hauptsache.net/clickup-mcp@latest"]
env = { "CLICKUP_API_KEY" = "YOUR_KEY", "CLICKUP_TEAM_ID" = "YOUR_ID", "CLICKUP_MCP_MODE" = "read-minimal" }
```

> Codex seems to not be able to handle images from MCP's. See [this issue](https://github.com/openai/codex/issues/3741) for more details.

> Note the `CLICKUP_MCP_MODE=read-minimal`. This is my usage recommendation, but feel free to use one of the other modes.

## MCP Modes & Available Tools

The ClickUp MCP supports three operational modes to balance functionality, security, and performance:

- **🚀 `read-minimal`**: Perfect for AI coding assistants and context gathering
- **📖 `read`**: Full read-only access for project exploration and workflow understanding  
- **✏️ `write`** (Default): Complete functionality for task management and productivity workflows

| Category | read-minimal | read | write | Tools |
|----------|:------------:|:----:|:-----:|:-----:|
| Tasks (read) | 5 | 5 | 5 | getTaskById, getTasks, getFilteredTeamTasks, getCustomTaskTypes, getBulkTasksTimeInStatus |
| Tasks (write) | — | — | 5 | createTask, updateTask, deleteTask, deleteList, mergeTasks |
| Search | 1 | 1 | 1 | searchTasks |
| Spaces | — | 4 | 7 | searchSpaces, getSharedHierarchy, createSpace, updateSpace, deleteSpace |
| Folders | — | 2 | 5 | getFolders, getFolder, createFolder, updateFolder, deleteFolder |
| Lists | — | 4 | 9 | getListInfo, getLists, getFolderlessLists, createList, updateListInfo, deleteList, createFolderlessList, addTaskToList, removeTaskFromList |
| Documents | — | 3 | 4 | readDocument, searchDocuments, searchDocs (v3), updateDocumentPage, createDocumentOrPage |
| Chat (v3) | — | 9 | 20 | Channels, messages, reactions, replies, DMs |
| Comments | — | 4 | 9 | Task/list/view/threaded comments, create, update, delete |
| Time Tracking | — | 8 | 17 | Entries, timers, tags, legacy endpoints |
| Goals | — | 2 | 8 | Goals and key results CRUD |
| Views | — | 6 | 12 | Workspace/space/folder/list views CRUD |
| Users & Guests | — | 13 | 25 | Members, guests, roles, groups, workspace plan |
| Templates | — | 4 | 7 | Task/list/folder templates |
| Checklists | — | 2 | 6 | Checklist and item management |
| Custom Fields | — | 2 | 6 | Get and set field values |
| Tags & Members | — | 3 | 12 | Tags, watchers, member access |
| Webhooks | — | 1 | 4 | Webhook CRUD |
| v3 API | — | 3 | 7 | Audit logs, task activity, move, duplicate, bulk update, ACL |
| Attachments | — | 1 | 1 | Get task attachments |
| **Total** | **6** | **72** | **170** | |

### Setting the Mode

Add the mode to your MCP configuration:

```json
{
  "mcpServers": {
    "clickup": {
      "command": "npx",
      "args": ["-y", "@hauptsache.net/clickup-mcp@latest"],
      "env": {
        "CLICKUP_API_KEY": "your_api_key",
        "CLICKUP_TEAM_ID": "your_team_id",
        "CLICKUP_MCP_MODE": "read"
      }
    }
  }
}
```

## Configuration

This MCP server can be configured using environment variables:

- `CLICKUP_API_KEY`: (Required for stdio) Your ClickUp API key. In HTTP mode, provided via `X-ClickUp-API-Key` header.
- `CLICKUP_TEAM_ID`: (Required for stdio) Your ClickUp Team ID (formerly Workspace ID). In HTTP mode, provided via `X-ClickUp-Team-ID` header.
- `CLICKUP_MCP_MODE`: (Optional) Controls which tools are available. Options: `read-minimal`, `read`, `write` (default).
- `CLICKUP_MCP_TRANSPORT`: (Optional) Transport mode: `stdio` (default) or `http` (for Docker/network deployment).
- `PORT`: (Optional) HTTP server port when using HTTP transport. Defaults to `8417`.
- `MAX_IMAGES`: (Optional) The maximum number of images to return for a task in `getTaskById`. Defaults to 4.
- `MAX_RESPONSE_SIZE_MB`: (Optional) The maximum response size in megabytes for `getTaskById`. Uses intelligent size budgeting to fit the most important images within the limit. Defaults to 1.
- `CLICKUP_PRIMARY_LANGUAGE`: (Optional) A hint for the primary language used in your ClickUp tasks (e.g., "de" for German, "en" for English). This helps the `searchTask` tool provide more tailored guidance in its description for multilingual searches.
- `LANG`: (Optional) If `CLICKUP_PRIMARY_LANGUAGE` is not set, the MCP will check this standard environment variable (e.g., "en_US.UTF-8", "de_DE") as a fallback to infer the primary language.

### Language-Aware Search Guidance

The `searchTask` tool's description will dynamically adjust based on the detected primary language:
- If `CLICKUP_PRIMARY_LANGUAGE` or `LANG` suggests a known primary language (e.g., German), the tool's description will specifically recommend providing search terms in both English and that detected language (e.g., German) for optimal results.
- If no primary language is detected, a more general recommendation for multilingual workspaces will be provided.

This feature aims to improve search effectiveness when the language of user queries (often English) differs from the language of the tasks in ClickUp, without making the MCP itself perform translations. The responsibility for providing bilingual search terms still lies with the agent calling the MCP, but the MCP offers more specific advice if it has a language hint.

## Markdown Formatting Support

Task descriptions and list documentation support full markdown formatting:

### Examples

**Task Creation with Markdown:**
```
Create a task called "API Integration" with description:
# API Integration Requirements

## Authentication
- Implement OAuth 2.0 flow
- Add JWT token validation
- **Priority**: High security standards

## Endpoints
1. `/api/users` - User management
2. `/api/data` - Data retrieval
3. `/api/webhook` - Event notifications

## Testing
- [ ] Unit tests for auth flow
- [ ] Integration tests
- [ ] Load testing with 1000+ concurrent users

> **Note**: This replaces the legacy REST implementation

See related task: https://app.clickup.com/t/abc123
```

**Append-Only Updates (Safe):**
When updating task descriptions, content is safely appended:
```markdown
[Existing task description content]

---
**Edit (2024-01-15):** Added new acceptance criteria based on client feedback:
- Must support mobile responsive design
- Performance requirement: < 2s load time
```

This ensures no existing content is ever lost while maintaining a clear audit trail.

## Performance & Limitations

**Optimized for AI Workflows:**
- **Smart Image Processing**: Intelligent size budgeting prioritizes the most recent images while respecting both count (`MAX_IMAGES`, default: 4) and total response size limits (`MAX_RESPONSE_SIZE_MB`, default: 1MB)
- **Search Scope**: Searches within the most recent 1000-3000 tasks to prevent running into rate limits (exact number varies by endpoint)
- **Search Results**: Returns up to 50 most relevant matches to prevent flooding the agent with too many results

**Deployment Options:**
- **stdio** — Direct integration with Claude Desktop, Cursor, Windsurf, and CLI tools
- **HTTP** — Docker container with per-session credentials via headers (port 8417)

**API Coverage:**
- 170 tools covering both ClickUp API v2 and v3
- Full coverage of tasks, spaces, folders, lists, documents, chat, comments, time tracking, goals, views, users, guests, templates, checklists, custom fields, tags, webhooks, and audit logs

## Recommended Agents

With 170 tools across 20 modules, loading all tools into a single agent context can be noisy and wasteful. Splitting tools across purpose-built agents keeps each agent focused, reduces prompt bloat, and makes it easier to grant the right level of access (e.g. read-only vs. write) per workflow. The groupings below give each agent a coherent, non-overlapping responsibility so tools never conflict between agents.

### 1. Task Management Agent (29 tools)

Creates, reads, updates, and deletes tasks; handles search; manages checklists on tasks; and uploads attachments. This is the workhorse agent for day-to-day work item management.

<details>
<summary>Tool list</summary>

`getTasks`, `getFilteredTeamTasks`, `getCustomTaskTypes`, `getBulkTasksTimeInStatus`, `getTaskById`, `searchTasks`, `addComment`, `updateTask`, `createTask`, `mergeTasks`, `deleteTask`, `createChecklist`, `updateChecklist`, `deleteChecklist`, `createChecklistItem`, `updateChecklistItem`, `deleteChecklistItem`, `createTaskAttachment`
</details>

### 2. Workspace Structure Agent (20 tools)

Manages the hierarchy of spaces, folders, and lists — the containers that hold tasks. Use this agent when reorganising projects, creating new project areas, or moving tasks between lists.

<details>
<summary>Tool list</summary>

`getSpaces`, `getSpace`, `searchSpaces`, `createSpace`, `updateSpace`, `deleteSpace`, `getFolders`, `getFolder`, `createFolder`, `updateFolder`, `deleteFolder`, `getLists`, `getFolderlessLists`, `getListInfo`, `searchLists`, `createList`, `updateListInfo`, `deleteList`, `createFolderlessList`, `addTaskToList`, `removeTaskFromList`
</details>

### 3. Content & Docs Agent (13 tools)

Handles documents and all comment types (task, list, view, and threaded). Use this agent to read or author rich written content without touching task metadata.

<details>
<summary>Tool list</summary>

`readDocument`, `searchDocuments`, `searchDocs`, `createDocumentOrPage`, `updateDocumentPage`, `getTaskComments`, `getListComments`, `getViewComments`, `getThreadedComments`, `updateTaskComment`, `deleteTaskComment`, `updateListComment`, `deleteListComment`, `createTaskCommentReply`
</details>

### 4. Time Tracking Agent (17 tools)

Full time-entry lifecycle: logging hours, starting and stopping live timers, managing time tags, and querying historical entries across both the current and legacy ClickUp time-tracking APIs.

<details>
<summary>Tool list</summary>

`getTimeEntry`, `getRunningTimeEntry`, `getTimeEntryHistory`, `getTimeEntries`, `getTimeEntriesLegacy`, `getTimeTags`, `getTeamTimeEntries`, `createTimeEntry`, `startTimer`, `stopTimer`, `updateTimeEntry`, `deleteTimeEntry`, `addTimeTag`, `removeTimeTag`, `trackTimeOnLegacy`, `stopTimerLegacy`
</details>

### 5. Chat Agent (19 tools)

Full ClickUp Chat coverage: channels, direct messages, message threads, reactions, and channel membership. Keeps all real-time communication tooling in one agent.

<details>
<summary>Tool list</summary>

`getChatChannels`, `getChatChannel`, `getChatChannelMembers`, `getChatMessages`, `getChatDMs`, `getChatMessageReplies`, `getChatReactions`, `getChatChannelInfo`, `createChatChannel`, `sendChatMessage`, `sendChatDirectMessage`, `addChatReaction`, `removeChatReaction`, `updateChatMessage`, `deleteChatMessage`, `addChatMessageReply`, `updateChatMessageReply`, `deleteChatMessageReply`, `updateChatChannel`
</details>

### 6. Goals, Views & Reporting Agent (27 tools)

Covers strategic planning (goals and key results), workspace views (dashboards, list views, board views), and the v3 reporting APIs for audit logs, activity feeds, bulk data, and task operations like move, duplicate, and bulk update.

<details>
<summary>Tool list</summary>

`getGoals`, `getGoal`, `createGoal`, `updateGoal`, `deleteGoal`, `createKeyResult`, `updateKeyResult`, `deleteKeyResult`, `getWorkspaceViews`, `getSpaceViews`, `getFolderViews`, `getListViews`, `getViewInfo`, `getViewTasks`, `createWorkspaceView`, `createSpaceView`, `createFolderView`, `createListView`, `updateView`, `deleteView`, `getAuditLogs`, `getTaskActivity`, `getBulkTasksData`, `moveTask`, `duplicateTask`, `bulkUpdateTasks`, `setTaskACL`
</details>

### 7. Users, Admin & Automation Agent (45 tools)

Handles everything related to people and automation: workspace members, guests, roles, user groups, templates for bootstrapping new work, custom field definitions and values, tags, task watchers and assignees, member access, and webhooks.

<details>
<summary>Tool list</summary>

`getUser`, `getWorkspaceSeats`, `getCustomRoles`, `getUserGroups`, `getWorkspaceMembers`, `getGuests`, `getGuest`, `getTeamMembers`, `getWorkspacePlan`, `getOrganizationMembers`, `addTeamMember`, `removeTeamMember`, `updateTeamMemberRole`, `inviteGuest`, `removeGuest`, `createUserGroup`, `updateUserGroup`, `deleteUserGroup`, `addToGroup`, `removeFromGroup`, `editCustomRole`, `removeCustomRole`, `getListTemplates`, `getTaskTemplates`, `getFolderTemplates`, `getTaskTemplateInfo`, `createListFromTemplate`, `createTaskFromTemplate`, `createFolderFromTemplate`, `getAccessibleCustomFields`, `getFolderCustomFields`, `getSpaceCustomFields`, `getWorkspaceCustomFields`, `setTaskCustomFieldValue`, `removeTaskCustomFieldValue`, `getSpaceTags`, `getListMembers`, `getTaskMembers`, `createSpaceTag`, `deleteSpaceTag`, `addTaskTag`, `removeTaskTag`, `addTaskWatcher`, `removeTaskWatcher`, `setTaskAssignee`, `unsetTaskAssignee`, `updateMemberListAccess`, `getWebhooks`, `createWebhook`, `updateWebhook`, `deleteWebhook`
</details>

## License

MIT
