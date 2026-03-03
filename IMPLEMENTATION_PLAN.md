# ClickUp MCP Server - Complete API Implementation Plan

**Created**: 2025-02-04
**Goal**: Implement ALL ClickUp API v2 and v3 endpoints as MCP tools

---

## Current Implementation Status

### Already Implemented (20+ tools)
| Category | Tools |
|----------|-------|
| Tasks | getTaskById, createTask, updateTask, deleteTask, searchTasks |
| Comments | addComment (task only) |
| Lists | getListInfo, updateListInfo, deleteList |
| Spaces | searchSpaces |
| Time Tracking | getTimeEntries, createTimeEntry |
| Documents | readDocument, updateDocumentPage, createDocumentOrPage |
| Templates | getListTemplates, getFolderTemplates, createListFromTemplate, createFolderFromTemplate |

---

## Phase 1: Core Infrastructure (Folders, Spaces, Lists CRUD)

### New File: `src/tools/folder-tools.ts`

| Tool | API Endpoint | Method | Description |
|------|-------------|--------|-------------|
| getFolders | `/v2/space/{space_id}/folder` | GET | Get all folders in a space |
| getFolder | `/v2/folder/{folder_id}` | GET | Get folder details |
| createFolder | `/v2/space/{space_id}/folder` | POST | Create a new folder |
| updateFolder | `/v2/folder/{folder_id}` | PUT | Update folder name/settings |
| deleteFolder | `/v2/folder/{folder_id}` | DELETE | Delete a folder |

### Enhance: `src/tools/space-tools.ts`

| Tool | API Endpoint | Method | Description |
|------|-------------|--------|-------------|
| getSpaces | `/v2/team/{team_id}/space` | GET | List all spaces in workspace |
| getSpace | `/v2/space/{space_id}` | GET | Get space details |
| createSpace | `/v2/team/{team_id}/space` | POST | Create a new space |
| updateSpace | `/v2/space/{space_id}` | PUT | Update space settings |
| deleteSpace | `/v2/space/{space_id}` | DELETE | Delete a space |

### Enhance: `src/tools/list-tools.ts`

| Tool | API Endpoint | Method | Description |
|------|-------------|--------|-------------|
| getLists | `/v2/folder/{folder_id}/list` | GET | Get lists in a folder |
| getFolderlessLists | `/v2/space/{space_id}/list` | GET | Get folderless lists |
| createList | `/v2/folder/{folder_id}/list` | POST | Create list in folder |
| createFolderlessList | `/v2/space/{space_id}/list` | POST | Create folderless list |
| addTaskToList | `/v2/list/{list_id}/task/{task_id}` | POST | Add task to additional list |
| removeTaskFromList | `/v2/list/{list_id}/task/{task_id}` | DELETE | Remove task from list |

---

## Phase 2: Task Enhancements (Checklists, Attachments, Custom Fields)

### New File: `src/tools/checklist-tools.ts`

| Tool | API Endpoint | Method | Description |
|------|-------------|--------|-------------|
| createChecklist | `/v2/task/{task_id}/checklist` | POST | Create a checklist on task |
| updateChecklist | `/v2/checklist/{checklist_id}` | PUT | Rename checklist |
| deleteChecklist | `/v2/checklist/{checklist_id}` | DELETE | Delete checklist |
| createChecklistItem | `/v2/checklist/{checklist_id}/checklist_item` | POST | Add item to checklist |
| updateChecklistItem | `/v2/checklist/{checklist_id}/checklist_item/{item_id}` | PUT | Update item (name, resolved, assignee) |
| deleteChecklistItem | `/v2/checklist/{checklist_id}/checklist_item/{item_id}` | DELETE | Delete checklist item |

### New File: `src/tools/attachment-tools.ts`

| Tool | API Endpoint | Method | Description |
|------|-------------|--------|-------------|
| createTaskAttachment | `/v2/task/{task_id}/attachment` | POST | Upload file attachment to task |

### New File: `src/tools/custom-field-tools.ts`

| Tool | API Endpoint | Method | Description |
|------|-------------|--------|-------------|
| getListCustomFields | `/v2/list/{list_id}/field` | GET | Get custom fields for list |
| getFolderCustomFields | `/v2/folder/{folder_id}/field` | GET | Get custom fields for folder |
| getSpaceCustomFields | `/v2/space/{space_id}/field` | GET | Get custom fields for space |
| getWorkspaceCustomFields | `/v2/team/{team_id}/field` | GET | Get all workspace custom fields |
| setCustomFieldValue | `/v2/task/{task_id}/field/{field_id}` | POST | Set custom field value on task |
| removeCustomFieldValue | `/v2/task/{task_id}/field/{field_id}` | DELETE | Remove custom field value |

### Enhance: `src/tools/task-tools.ts`

| Tool | API Endpoint | Method | Description |
|------|-------------|--------|-------------|
| getTasks | `/v2/list/{list_id}/task` | GET | Get tasks in a list with filters |
| getFilteredTeamTasks | `/v2/team/{team_id}/task` | GET | Search tasks across workspace |
| mergeTasks | `/v2/task/{task_id}/merge/{merge_with_task_id}` | POST | Merge two tasks |
| getBulkTasksTimeInStatus | `/v2/task/bulk_time_in_status/task_ids` | GET | Bulk time in status |
| createTaskFromTemplate | `/v2/list/{list_id}/taskTemplate/{template_id}` | POST | Create task from template |
| getTaskTemplates | `/v2/team/{team_id}/taskTemplate` | GET | Get available task templates |

---

## Phase 3: Comments Expansion

### Enhance: `src/tools/task-write-tools.ts` → Rename to `src/tools/comment-tools.ts`

| Tool | API Endpoint | Method | Description |
|------|-------------|--------|-------------|
| getTaskComments | `/v2/task/{task_id}/comment` | GET | Get task comments (standalone) |
| createTaskComment | `/v2/task/{task_id}/comment` | POST | Add comment to task |
| getViewComments | `/v2/view/{view_id}/comment` | GET | Get chat view comments |
| createViewComment | `/v2/view/{view_id}/comment` | POST | Create chat view comment |
| getListComments | `/v2/list/{list_id}/comment` | GET | Get list comments |
| createListComment | `/v2/list/{list_id}/comment` | POST | Create list comment |
| updateComment | `/v2/comment/{comment_id}` | PUT | Update any comment |
| deleteComment | `/v2/comment/{comment_id}` | DELETE | Delete any comment |
| getThreadedComments | `/v2/comment/{comment_id}/reply` | GET | Get replies to comment |
| createThreadedComment | `/v2/comment/{comment_id}/reply` | POST | Reply to a comment |

---

## Phase 4: Time Tracking Expansion

### Enhance: `src/tools/time-tools.ts`

| Tool | API Endpoint | Method | Description |
|------|-------------|--------|-------------|
| getTimeEntry | `/v2/team/{team_id}/time_entries/{timer_id}` | GET | Get single time entry |
| updateTimeEntry | `/v2/team/{team_id}/time_entries/{timer_id}` | PUT | Update time entry |
| deleteTimeEntry | `/v2/team/{team_id}/time_entries/{timer_id}` | DELETE | Delete time entry |
| getTimeEntryHistory | `/v2/team/{team_id}/time_entries/{timer_id}/history` | GET | Get entry change history |
| getRunningTimeEntry | `/v2/team/{team_id}/time_entries/current` | GET | Get currently running timer |
| startTimeEntry | `/v2/team/{team_id}/time_entries/start` | POST | Start a timer |
| stopTimeEntry | `/v2/team/{team_id}/time_entries/stop` | POST | Stop running timer |
| getTimeEntryTags | `/v2/team/{team_id}/time_entries/tags` | GET | Get all time entry tags |
| addTimeEntryTags | `/v2/team/{team_id}/time_entries/{timer_id}/tags` | POST | Add tags to entry |
| removeTimeEntryTags | `/v2/team/{team_id}/time_entries/{timer_id}/tags` | DELETE | Remove tags from entry |
| updateTimeEntryTags | `/v2/team/{team_id}/time_entries/tags` | PUT | Rename tags |

---

## Phase 5: Goals & Key Results

### New File: `src/tools/goal-tools.ts`

| Tool | API Endpoint | Method | Description |
|------|-------------|--------|-------------|
| getGoals | `/v2/team/{team_id}/goal` | GET | List all goals |
| getGoal | `/v2/goal/{goal_id}` | GET | Get goal details |
| createGoal | `/v2/team/{team_id}/goal` | POST | Create a goal |
| updateGoal | `/v2/goal/{goal_id}` | PUT | Update goal |
| deleteGoal | `/v2/goal/{goal_id}` | DELETE | Delete goal |
| createKeyResult | `/v2/goal/{goal_id}/key_result` | POST | Add key result to goal |
| updateKeyResult | `/v2/key_result/{key_result_id}` | PUT | Update key result |
| deleteKeyResult | `/v2/key_result/{key_result_id}` | DELETE | Delete key result |

---

## Phase 6: Views

### New File: `src/tools/view-tools.ts`

| Tool | API Endpoint | Method | Description |
|------|-------------|--------|-------------|
| getWorkspaceViews | `/v2/team/{team_id}/view` | GET | Get workspace-level views |
| createWorkspaceView | `/v2/team/{team_id}/view` | POST | Create workspace view |
| getSpaceViews | `/v2/space/{space_id}/view` | GET | Get space views |
| createSpaceView | `/v2/space/{space_id}/view` | POST | Create space view |
| getFolderViews | `/v2/folder/{folder_id}/view` | GET | Get folder views |
| createFolderView | `/v2/folder/{folder_id}/view` | POST | Create folder view |
| getListViews | `/v2/list/{list_id}/view` | GET | Get list views |
| createListView | `/v2/list/{list_id}/view` | POST | Create list view |
| getView | `/v2/view/{view_id}` | GET | Get view details |
| updateView | `/v2/view/{view_id}` | PUT | Update view settings |
| deleteView | `/v2/view/{view_id}` | DELETE | Delete view |
| getViewTasks | `/v2/view/{view_id}/task` | GET | Get tasks in a view |

---

## Phase 7: User & Team Management

### New File: `src/tools/user-tools.ts`

| Tool | API Endpoint | Method | Description |
|------|-------------|--------|-------------|
| inviteUserToWorkspace | `/v2/team/{team_id}/user` | POST | Invite user |
| getUser | `/v2/team/{team_id}/user/{user_id}` | GET | Get user details |
| updateUser | `/v2/team/{team_id}/user/{user_id}` | PUT | Update user role |
| removeUser | `/v2/team/{team_id}/user/{user_id}` | DELETE | Remove user |
| getAuthorizedUser | `/v2/user` | GET | Get current user |

### New File: `src/tools/guest-tools.ts`

| Tool | API Endpoint | Method | Description |
|------|-------------|--------|-------------|
| inviteGuest | `/v2/team/{team_id}/guest` | POST | Invite guest |
| getGuest | `/v2/team/{team_id}/guest/{guest_id}` | GET | Get guest details |
| updateGuest | `/v2/team/{team_id}/guest/{guest_id}` | PUT | Update guest |
| removeGuest | `/v2/team/{team_id}/guest/{guest_id}` | DELETE | Remove guest |
| addGuestToTask | `/v2/task/{task_id}/guest/{guest_id}` | POST | Add guest to task |
| removeGuestFromTask | `/v2/task/{task_id}/guest/{guest_id}` | DELETE | Remove from task |
| addGuestToList | `/v2/list/{list_id}/guest/{guest_id}` | POST | Add guest to list |
| removeGuestFromList | `/v2/list/{list_id}/guest/{guest_id}` | DELETE | Remove from list |
| addGuestToFolder | `/v2/folder/{folder_id}/guest/{guest_id}` | POST | Add guest to folder |
| removeGuestFromFolder | `/v2/folder/{folder_id}/guest/{guest_id}` | DELETE | Remove from folder |

### New File: `src/tools/group-tools.ts`

| Tool | API Endpoint | Method | Description |
|------|-------------|--------|-------------|
| getGroups | `/v2/team/{team_id}/group` | GET | Get user groups |
| createGroup | `/v2/team/{team_id}/group` | POST | Create user group |
| updateGroup | `/v2/group/{group_id}` | PUT | Update group |
| deleteGroup | `/v2/group/{group_id}` | DELETE | Delete group |

### New File: `src/tools/role-tools.ts`

| Tool | API Endpoint | Method | Description |
|------|-------------|--------|-------------|
| getCustomRoles | `/v2/team/{team_id}/customroles` | GET | Get custom roles |

---

## Phase 8: Webhooks

### New File: `src/tools/webhook-tools.ts`

| Tool | API Endpoint | Method | Description |
|------|-------------|--------|-------------|
| getWebhooks | `/v2/team/{team_id}/webhook` | GET | List webhooks |
| createWebhook | `/v2/team/{team_id}/webhook` | POST | Create webhook |
| updateWebhook | `/v2/webhook/{webhook_id}` | PUT | Update webhook |
| deleteWebhook | `/v2/webhook/{webhook_id}` | DELETE | Delete webhook |

---

## Phase 9: v3 API Features

### New File: `src/tools/chat-tools.ts`

| Tool | API Endpoint | Method | Description |
|------|-------------|--------|-------------|
| getChannels | `/v3/workspaces/{team_id}/channels` | GET | List channels |
| createChannel | `/v3/workspaces/{team_id}/channels` | POST | Create channel |
| getChannel | `/v3/workspaces/{team_id}/channels/{channel_id}` | GET | Get channel |
| updateChannel | `/v3/workspaces/{team_id}/channels/{channel_id}` | PATCH | Update channel |
| deleteChannel | `/v3/workspaces/{team_id}/channels/{channel_id}` | DELETE | Delete channel |
| getChannelMessages | `/v3/workspaces/{team_id}/channels/{channel_id}/messages` | GET | Get messages |
| sendMessage | `/v3/workspaces/{team_id}/channels/{channel_id}/messages` | POST | Send message |
| updateMessage | `/v3/workspaces/{team_id}/channels/{channel_id}/messages/{msg_id}` | PATCH | Update message |
| deleteMessage | `/v3/workspaces/{team_id}/channels/{channel_id}/messages/{msg_id}` | DELETE | Delete message |
| getMessageReactions | `/v3/.../messages/{msg_id}/reactions` | GET | Get reactions |
| addReaction | `/v3/.../messages/{msg_id}/reactions` | POST | Add reaction |
| removeReaction | `/v3/.../messages/{msg_id}/reactions` | DELETE | Remove reaction |
| getMessageReplies | `/v3/.../messages/{msg_id}/replies` | GET | Get replies |
| createReply | `/v3/.../messages/{msg_id}/replies` | POST | Create reply |
| createDirectMessage | `/v3/workspaces/{team_id}/channels/direct` | POST | Create DM |

### Enhance: `src/tools/task-write-tools.ts`

| Tool | API Endpoint | Method | Description |
|------|-------------|--------|-------------|
| moveTaskToList | `/v3/task/{task_id}/list/{list_id}` | PUT | Move task to different list |

### New File: `src/tools/audit-tools.ts`

| Tool | API Endpoint | Method | Description |
|------|-------------|--------|-------------|
| createAuditLogs | `/v3/workspaces/{team_id}/audit` | POST | Create audit log export |

### New File: `src/tools/privacy-tools.ts`

| Tool | API Endpoint | Method | Description |
|------|-------------|--------|-------------|
| updatePrivacyAccess | `/v3/workspaces/{team_id}/...` | PATCH | Update privacy settings |

---

## Phase 10: Tags & Members

### Enhance: `src/tools/space-tools.ts` or new `src/tools/tag-tools.ts`

| Tool | API Endpoint | Method | Description |
|------|-------------|--------|-------------|
| getSpaceTags | `/v2/space/{space_id}/tag` | GET | Get all tags in space |
| createSpaceTag | `/v2/space/{space_id}/tag` | POST | Create new tag |
| updateSpaceTag | `/v2/space/{space_id}/tag/{tag_name}` | PUT | Update tag (name, color) |
| deleteSpaceTag | `/v2/space/{space_id}/tag/{tag_name}` | DELETE | Delete tag |

### New File: `src/tools/member-tools.ts`

| Tool | API Endpoint | Method | Description |
|------|-------------|--------|-------------|
| getTaskMembers | `/v2/task/{task_id}/member` | GET | Get task members |
| getListMembers | `/v2/list/{list_id}/member` | GET | Get list members |

---

## Additional Workspace Tools

### Enhance: `src/tools/workspace-tools.ts` (new file)

| Tool | API Endpoint | Method | Description |
|------|-------------|--------|-------------|
| getWorkspaces | `/v2/team` | GET | Get authorized workspaces |
| getWorkspaceSeats | `/v2/team/{team_id}/seats` | GET | Get seat usage |
| getWorkspacePlan | `/v2/team/{team_id}/plan` | GET | Get plan details |
| getSharedHierarchy | `/v2/team/{team_id}/shared` | GET | Get shared hierarchy |
| getCustomTaskTypes | `/v2/team/{team_id}/custom_task_type` | GET | Get custom task types |

---

## Summary: New Tool Files to Create

1. `src/tools/folder-tools.ts` - Folder CRUD
2. `src/tools/checklist-tools.ts` - Task checklists
3. `src/tools/attachment-tools.ts` - File attachments
4. `src/tools/custom-field-tools.ts` - Custom fields
5. `src/tools/comment-tools.ts` - Expanded comments (refactor from task-write-tools)
6. `src/tools/goal-tools.ts` - Goals & key results
7. `src/tools/view-tools.ts` - Views management
8. `src/tools/user-tools.ts` - User management
9. `src/tools/guest-tools.ts` - Guest management
10. `src/tools/group-tools.ts` - User groups
11. `src/tools/role-tools.ts` - Custom roles
12. `src/tools/webhook-tools.ts` - Webhooks
13. `src/tools/chat-tools.ts` - v3 Chat API
14. `src/tools/audit-tools.ts` - Audit logs
15. `src/tools/privacy-tools.ts` - Privacy settings
16. `src/tools/tag-tools.ts` - Space tags
17. `src/tools/member-tools.ts` - Members
18. `src/tools/workspace-tools.ts` - Workspace info

## Files to Enhance

1. `src/tools/space-tools.ts` - Add CRUD operations
2. `src/tools/list-tools.ts` - Add create, add/remove task
3. `src/tools/task-tools.ts` - Add getTasks, merge, bulk operations
4. `src/tools/time-tools.ts` - Add update, delete, timers, tags
5. `src/index.ts` - Register all new tools

---

## Estimated New Tools: 100+

### By Category:
- Folders: 5
- Spaces: 5 (4 new)
- Lists: 6 (5 new)
- Tasks: 6 (5 new)
- Checklists: 6
- Attachments: 1
- Custom Fields: 6
- Comments: 10 (9 new)
- Time Tracking: 11 (9 new)
- Goals: 8
- Views: 12
- Users: 5
- Guests: 10
- Groups: 4
- Roles: 1
- Webhooks: 4
- Chat (v3): 15
- Audit: 1
- Privacy: 1
- Tags: 4
- Members: 2
- Workspace: 5

**Total New Tools: ~115**
**Total After Implementation: ~135 tools**

---

## Implementation Order & Priority

### High Priority (Core Functionality)
1. Phase 1: Folders, Spaces, Lists CRUD
2. Phase 2: Checklists, Custom Fields
3. Phase 4: Time Tracking expansion

### Medium Priority (Collaboration)
4. Phase 3: Comments expansion
5. Phase 5: Goals
6. Phase 6: Views

### Lower Priority (Admin/Advanced)
7. Phase 7: User/Guest/Group management
8. Phase 8: Webhooks
9. Phase 9: v3 API (Chat, etc.)
10. Phase 10: Tags, Members

---

## Mode Considerations

Update `src/index.ts` to properly categorize new tools:

- **read-minimal**: Keep minimal (getTaskById, searchTasks)
- **read**: All GET operations
- **write**: All operations including POST, PUT, DELETE

---

## Testing Strategy

Each new tool file should have a corresponding test file:
- `src/tests/folder-tools.test.ts`
- `src/tests/checklist-tools.test.ts`
- etc.

Use the CLI testing tool for manual verification:
```bash
npm run cli getFolders space_id="12345"
npm run cli createFolder space_id="12345" name="New Folder"
```
