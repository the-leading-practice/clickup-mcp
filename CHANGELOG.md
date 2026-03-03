# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

#### HTTP Transport & Docker Support
- New HTTP/SSE transport mode for Docker and network deployments (`CLICKUP_MCP_TRANSPORT=http`)
- `src/http-server.ts` - Streamable HTTP server with per-session API credential injection
- API credentials provided via request headers (`X-ClickUp-API-Key`, `X-ClickUp-Team-ID`, `X-ClickUp-MCP-Mode`) — no secrets in environment variables
- Dockerfile and docker-compose.yml for containerized deployment on port 8417
- Health check endpoint at `GET /health`
- CORS support for cross-origin MCP clients
- Graceful shutdown on SIGINT/SIGTERM

#### Task Query Endpoints (4 new read tools)
- `getTasks` - Get tasks from a list with filtering (status, assignees, tags, due dates, custom fields)
- `getFilteredTeamTasks` - Get tasks across the entire workspace with extensive filters
- `getCustomTaskTypes` - Get custom task types configured for the workspace
- `getBulkTasksTimeInStatus` - Get time-in-status for multiple tasks at once

#### Task Write Endpoint
- `mergeTasks` - Merge multiple tasks into one

#### Chat Tools (20 tools — new module)
- `getChatChannels` - List chat channels in workspace
- `getChatChannel` - Get channel details
- `getChatChannelMembers` - List channel members
- `getChatChannelFollowers` - List channel followers
- `getChatMessages` - List messages in a channel
- `getChatMessageReactions` - Get reactions on a message
- `getChatMessageReplies` - Get threaded replies
- `getChatMessageTaggedUsers` - Get users tagged in a message
- `getChatPostSubtypes` - Get available post subtypes
- `createChatChannel` - Create a new chat channel
- `createLocationChatChannel` - Create a channel attached to a location (space, folder, list, task)
- `createDirectMessage` - Send a direct message
- `updateChatChannel` - Update channel settings
- `deleteChatChannel` - Delete a chat channel
- `sendChatMessage` - Send a message to a channel
- `updateChatMessage` - Edit a message
- `deleteChatMessage` - Delete a message
- `createChatReaction` - Add reaction to a message
- `deleteChatReaction` - Remove a reaction
- `createChatReply` - Reply to a message thread

#### Guest & Workspace Endpoints (6 new tools in user-tools)
- `getGuest` - Get guest details on workspace
- `inviteGuestToWorkspace` - Invite a guest to the workspace
- `editGuestOnWorkspace` - Edit guest permissions
- `removeGuestFromWorkspace` - Remove a guest from workspace
- `getAuthorizedWorkspaces` - Get workspaces the authenticated user can access
- `getWorkspacePlan` - Get the workspace's current plan details

#### Template Endpoints (3 new tools)
- `getTaskTemplates` - List task templates in workspace
- `createTaskFromTemplate` - Create a task from a template
- `createListFromTemplateInSpace` - Create a list in a space from a template

#### Document Search (v3)
- `searchDocs` - Search documents via v3 API with query, space, and creator filters

#### View Endpoint
- `createWorkspaceView` - Create a view at workspace level

#### Time Tracking Legacy Endpoints (4 new tools)
- `getTrackedTimeLegacy` - Get time entries via legacy endpoint
- `trackTimeLegacy` - Create time entry via legacy endpoint
- `editTimeTrackedLegacy` - Update time entry via legacy endpoint
- `deleteTimeTrackedLegacy` - Delete time entry via legacy endpoint

#### Space Endpoint
- `getSharedHierarchy` - Get the shared hierarchy for the workspace

#### v3 API Endpoint
- `updatePrivacyAccess` - Update ACL/privacy for any object type (space, folder, list, task, doc, view)

#### Deletion Tools
- **deleteTask tool** - Moves tasks to trash (soft delete) with mandatory user confirmation
- **deleteList tool** - Moves lists and all their tasks to trash (soft delete) with mandatory user confirmation
- Both deletion tools require explicit `user_confirmed=true` parameter to prevent accidental deletions

#### Template Tools
- `getListTemplates` - List all available list templates in the workspace
- `getFolderTemplates` - List all available folder templates in the workspace
- `createListFromTemplate` - Create a new list in a folder from a template
- `createFolderFromTemplate` - Create a new folder in a space from a template

#### Expanded Comment Tools (9 tools)
- `getTaskComments` - Get all comments on a task
- `getListComments` - Get comments on a list
- `getViewComments` - Get comments on a view
- `getThreadedComments` - Get threaded comment replies
- `createListComment` - Add comment to a list with markdown support
- `createViewComment` - Add comment to a view
- `createThreadedComment` - Reply to an existing comment
- `updateComment` - Edit an existing comment
- `deleteComment` - Remove a comment

#### Expanded Time Tracking Tools (9 tools)
- `getTimeEntryTags` - Get all time entry tags for workspace
- `getRunningTimeEntry` - Get currently running timer
- `updateTimeEntry` - Modify time entry details
- `deleteTimeEntry` - Remove a time entry
- `startTimeEntry` - Start a new timer on a task
- `stopTimeEntry` - Stop a running timer
- `addTimeEntryTags` - Add tags to time entries
- `removeTimeEntryTags` - Remove tags from time entries
- `updateTimeEntryTags` - Replace all tags on time entries

#### Goals & Key Results Tools (8 tools)
- `getGoals` - List all workspace goals with progress
- `getGoal` - Get detailed goal with all key results
- `createGoal` - Create a new goal
- `updateGoal` - Modify goal settings
- `deleteGoal` - Remove a goal
- `createKeyResult` - Add measurable key result to a goal
- `updateKeyResult` - Update key result progress
- `deleteKeyResult` - Remove a key result

#### Views Tools (12 tools)
- `getWorkspaceViews` - List all views at workspace level
- `getSpaceViews` - List views in a space
- `getFolderViews` - List views in a folder
- `getListViews` - List views in a list
- `getView` - Get detailed view information
- `getViewTasks` - Get tasks filtered by view criteria
- `createWorkspaceView` - Create view at workspace level
- `createSpaceView` - Create view in a space (list, board, calendar, gantt, etc.)
- `createFolderView` - Create view in a folder
- `createListView` - Create view in a list
- `updateView` - Modify view settings
- `deleteView` - Remove a view

#### User & Team Management Tools (25 tools)
- `getUser` - Get current authenticated user details
- `getWorkspaceSeats` - Get workspace member seat information
- `getCustomRoles` - List custom roles in workspace
- `getUserGroups` - List all user groups/teams
- `getGuest` - Get guest details on workspace
- `getTaskGuests` - Get guest users on a task
- `getListGuests` - Get guest users on a list
- `getFolderGuests` - Get guest users on a folder
- `getAuthorizedWorkspaces` - Get workspaces the authenticated user can access
- `getWorkspacePlan` - Get workspace plan details
- `inviteUserToWorkspace` - Invite new user to workspace
- `editUserOnWorkspace` - Modify user's workspace role
- `removeUserFromWorkspace` - Remove user from workspace
- `inviteGuestToWorkspace` - Invite a guest to workspace
- `editGuestOnWorkspace` - Edit guest permissions
- `removeGuestFromWorkspace` - Remove guest from workspace
- `createUserGroup` - Create a new team/user group
- `updateUserGroup` - Modify group settings
- `deleteUserGroup` - Remove a user group
- `addGuestToTask` / `removeGuestFromTask` - Manage task guest access
- `addGuestToList` / `removeGuestFromList` - Manage list guest access
- `addGuestToFolder` / `removeGuestFromFolder` - Manage folder guest access

#### Webhooks Tools (4 tools)
- `getWebhooks` - List all configured webhooks
- `createWebhook` - Create webhook with event subscriptions
- `updateWebhook` - Modify webhook settings or status
- `deleteWebhook` - Remove a webhook

#### Advanced/v3 API Tools (7 tools)
- `getAuditLogs` - Get workspace audit logs (Business+ plan, POST v3 endpoint)
- `getTaskActivity` - Get task time-in-status history
- `moveTask` - Move task to another list (v3 PUT endpoint)
- `duplicateTask` - Create copy of task with options
- `updateTaskPrivacy` - Update task privacy settings (deprecated, points to updatePrivacyAccess)
- `updatePrivacyAccess` - Update ACL/privacy for any object type via v3
- `bulkUpdateTasks` - Batch update multiple tasks

#### Tags & Members Tools (12 tools)
- `getSpaceTags` - Get all tags defined in a space
- `getListMembers` - Get members with list access
- `getTaskMembers` - Get task watchers and assignees
- `createSpaceTag` - Create new tag with colors
- `updateSpaceTag` - Modify tag name/colors
- `deleteSpaceTag` - Remove tag from space
- `addTagToTask` - Apply tag to a task
- `removeTagFromTask` - Remove tag from a task
- `addTaskWatcher` - Add user as task watcher
- `removeTaskWatcher` - Remove task watcher
- `shareListWithUser` - Grant list access to user
- `unshareListFromUser` - Revoke list access

### Changed
- Expanded from ~14 tools to **170 tools** across 20 modules
- All new tools follow established patterns with proper hints (readOnlyHint, destructiveHint, idempotentHint)
- `moveTask` now uses correct v3 PUT endpoint instead of v2 add-to-list
- `getAuditLogs` now uses correct v3 POST endpoint with JSON body
- `getTaskActivity` description corrected to "time in status" (not "activity/history")

## [1.6.0] - 2025-11-25

### Added
- **Full markdown support for comments** - `addComment` now converts markdown to ClickUp's rich text format
- Comments now preserve formatting when reading back from ClickUp, including nested formatting

## [1.5.1] - 2025-10-02

### Changed
- The space resource now has a `ClickUp Space` suffix in the title.
- Add additional hints to all tools to potentially improve client handling.

### Added
- Added Icon to the manifest.json file.

## [1.5.0] - 2025-10-01

### Breaking Changes
- Replaced `writeDocument` tool with two focused tools for better clarity:
  - `updateDocumentPage`: Updates existing pages (requires doc_id and page_id)
  - `createDocumentOrPage`: Creates new documents or pages (uses space_id/list_id/doc_id)
- This change makes parameter requirements clearer and eliminates the confusion between creating and updating operations

### Fixed
- Fixed "my-todos" prompt failing with "Failed to get prompt" error in Claude Desktop by adding `prompts_generated: true` to manifest.json to declare runtime-generated prompts
- Fixed critical bug in document page updates: now uses correct ClickUp API v3 endpoint (`/workspaces/{teamId}/docs/{docId}/pages/{pageId}`) instead of incorrect endpoint that was causing 404 errors
- Fixed empty response handling in `updateDocumentPage` - now gracefully handles ClickUp API responses that don't return JSON body

### Removed
- Removed `searchDocuments` tool as it only searched document names/spaces, not content, which confused LLMs that are trained on fulltext searches. Documents can still be discovered via `searchSpaces` (which includes documents in space tree) or by direct URL.

### Changed
- Removed time entries from `searchTasks` results to improve reliability and prevent rate limit issues. Time entries are still available via `getTaskById` for individual tasks.
- Updated `readDocument` to reference new tool names (`updateDocumentPage` and `createDocumentOrPage`) in its suggestions

## [1.4.3] - 2025-09-26

### Fixed
- Add required `title` field to MCP space resources to comply with newer MCP specification

## [1.4.2] - 2025-09-23

### Added
- Task dependency and relationship management in `updateTask` tool (thanks @itinance)

### Fixed
- Strip inline base64 data URIs from `getTaskById` responses and surface them as proper image blocks instead of embedding them in text content

## [1.4.1] - 2025-08-31

### Fixed
- Fixed tag management in `updateTask` - tags are now properly added/removed using dedicated API endpoints (thanks @itinance)
- Fixed Claude Desktop dxt support. It had the word `cli` in the argument list which triggered the cli debug mode of this library.

## [1.4.0] - 2025-08-18

### Added
- MCP Resources support for dynamic ClickUp space discovery
  - Spaces now appear in Claude Desktop's resource dropdown for easy selection
  - Dynamic resource templates provide real-time space listing without server restart
  - Complete space tree structure with lists, folders, documents, and metadata
  - Resource URIs using `clickup://space/{spaceId}` format for consistent identification

## [1.3.2] - 2025-08-05

### Fixed
- Fix `writeDocument` API response parsing when creating pages in existing documents
- Add fallback handling for both nested (`data.page`) and flat response formats

## [1.3.1] - 2025-07-22

### Added
- Add `readOnlyHint` annotations to all MCP tools to improve user experience
- Add a prompt for "my-todos" in English and German, as a shortcut.

## [1.3.0] - 2025-07-11

### Added
- Document management tools for ClickUp Docs
  - `readDocument` - Read documents with page structure and content
  - `searchDocuments` - Search documents by name and space with fuzzy matching
  - `writeDocument` - Create and update documents and pages with smart parent detection
- Added Server instructions with all ClickUp Spaces to help the LLM make better decisions.

### Fixed
- Null attachment handling in task metadata
- URL generation for lists and spaces

### Improved
- Enhanced search relevance weighting for multi-term queries
- Optimized search scoring with multiple term matches

## [1.2.0] - 2025-07-02

### Added
- Claude DXT manifest.json file for enhanced integration
- Intelligent image handling for ClickUp tasks
- Parent task ID support in task creation and update operations
- Space tags fetching and display in list tools
- Status filtering enhancements in search tools
- Space search functionality replacing generic listing tools

### Changed
- Task description and status update guidelines clarified
- Server version now loaded dynamically from package.json
- Improved caching for promises and enhanced time entries handling
- Split task tools write functionality into separate module for better modularity
- Simplified task-tools descriptions for assignees and update tracking

### Fixed
- Enhanced promise caching to prevent race conditions

## [1.1.1] - 2025-06-17

### Added
- ClickUp URL generation and markdown link formatting utilities
- Enhanced time tools with team-wide filtering and hierarchical output
- New formatting utilities for better data presentation

### Changed
- Simplified private field handling and removed redundant URL guidance
- Improved tool integration for enhanced navigation

## [1.1.0] - 2025-06-16

### Added
- Safe append-only updates for task and list descriptions with markdown support
- MCP mode support and tool segmentation for configurable functionality
- Enhanced time and list tools with getListInfo functionality
- Assignee-based filtering and updates across task tools
- Task comments and status updates support
- Extended valid task ID length to 6-9 characters

### Changed
- Updated README with experimental notice and enhanced feature details
- Enhanced tool descriptions with best practices and important usage notes
- Enriched README with expanded usage examples and optimized AI workflows
- Consolidated task creation/update logic, removed create-tools
- Modularized task search with filters, caching, and fuzzy matching
- Simplified server setup and improved code modularity

### Fixed
- Improved task creation and update functionalities for assignees

## [1.0.5] - 2025-06-03

### Added
- Enhanced task metadata with priority, dates, time estimates, tags, watchers, URL, archived status, and custom fields

## [1.0.4] - 2025-05-26

### Added
- Chronological status history and comment events to task content

### Fixed
- Handle non-string text items in ClickUp text parser by stringifying unknown types

## [1.0.3] - 2025-05-22

### Added
- Fuzzy search with Fuse.js and language-aware search guidance
- Space details to task metadata and .env configuration support
- Enhanced task search to support direct task ID lookups alongside text search

## [1.0.2] - 2025-05-09

### Added
- Image limit functionality with MAX_IMAGES env var and newest-first sorting
- Parent/child task metadata and improved documentation

## [1.0.1] - 2025-05-08

### Fixed
- Executable configuration for npx usage

## [1.0.0] - 2025-05-08

### Added
- Initial release of ClickUp MCP server
- Task search and retrieval functionality
- Markdown and text processing capabilities
- Image processing with attachment support
- MCP server setup and configuration
- Basic README with setup instructions

### Changed
- Consolidated markdown and text processing into unified clickup-text module
- Improved markdown image processing with dedicated loader function

### Fixed
- Initial setup and configuration for npm publishing
