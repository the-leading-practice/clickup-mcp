import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CONFIG } from "../shared/config";

// Helper to format tag
function formatTag(tag: any): string {
  return `- **${tag.name}** ${tag.tag_bg ? `(bg: ${tag.tag_bg}, fg: ${tag.tag_fg})` : ''}`;
}

// Helper to format member
function formatMember(member: any): string {
  return `- ${member.username || member.email} (user_id: ${member.id})${member.role ? ` - ${member.role}` : ''}`;
}

/**
 * Register read-only tag and member tools
 */
export function registerTagMemberToolsRead(server: McpServer) {
  // Get Space Tags
  server.tool(
    "getSpaceTags",
    "Get all tags defined in a space. Tags can be used to categorize and filter tasks.",
    {
      space_id: z.string().min(1).describe("The space ID to get tags from"),
    },
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    async ({ space_id }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/space/${space_id}/tag`,
          {
            method: "GET",
            headers: {
              Authorization: CONFIG.apiKey,
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: [{ type: "text" as const, text: `Error fetching space tags: ${response.status} - ${errorText}` }],
            isError: true,
          };
        }

        const data = await response.json();
        const tags = data.tags || [];

        if (tags.length === 0) {
          return {
            content: [{ type: "text" as const, text: "No tags defined in this space." }],
          };
        }

        const formatted = tags.map(formatTag).join('\n');

        return {
          content: [{
            type: "text" as const,
            text: `# Space Tags (${tags.length})\n\n${formatted}`
          }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );

  // Get List Members
  server.tool(
    "getListMembers",
    "Get all members who have access to a specific list.",
    {
      list_id: z.string().min(1).describe("The list ID to get members from"),
    },
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    async ({ list_id }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/list/${list_id}/member`,
          {
            method: "GET",
            headers: {
              Authorization: CONFIG.apiKey,
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: [{ type: "text" as const, text: `Error fetching list members: ${response.status} - ${errorText}` }],
            isError: true,
          };
        }

        const data = await response.json();
        const members = data.members || [];

        if (members.length === 0) {
          return {
            content: [{ type: "text" as const, text: "No members found for this list." }],
          };
        }

        const formatted = members.map(formatMember).join('\n');

        return {
          content: [{
            type: "text" as const,
            text: `# List Members (${members.length})\n\n${formatted}`
          }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );

  // Get Task Members
  server.tool(
    "getTaskMembers",
    "Get all members who have access to a specific task (watchers and assignees).",
    {
      task_id: z.string().min(6).max(9).describe("The task ID to get members from"),
    },
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    async ({ task_id }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/task/${task_id}/member`,
          {
            method: "GET",
            headers: {
              Authorization: CONFIG.apiKey,
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: [{ type: "text" as const, text: `Error fetching task members: ${response.status} - ${errorText}` }],
            isError: true,
          };
        }

        const data = await response.json();
        const members = data.members || [];

        if (members.length === 0) {
          return {
            content: [{ type: "text" as const, text: "No members found for this task." }],
          };
        }

        const formatted = members.map(formatMember).join('\n');

        return {
          content: [{
            type: "text" as const,
            text: `# Task Members (${members.length})\n\n${formatted}`
          }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );
}

/**
 * Register write tag and member tools
 */
export function registerTagMemberToolsWrite(server: McpServer) {
  // Create Space Tag
  server.tool(
    "createSpaceTag",
    "Create a new tag in a space. Tags can be applied to tasks for categorization.",
    {
      space_id: z.string().min(1).describe("The space ID to create the tag in"),
      name: z.string().min(1).describe("Name of the tag"),
      tag_bg: z.string().optional().describe("Background color hex code (e.g., '#FF0000')"),
      tag_fg: z.string().optional().describe("Foreground/text color hex code (e.g., '#FFFFFF')"),
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    async ({ space_id, name, tag_bg, tag_fg }) => {
      try {
        const body: any = {
          tag: {
            name,
          },
        };
        if (tag_bg) body.tag.tag_bg = tag_bg;
        if (tag_fg) body.tag.tag_fg = tag_fg;

        const response = await fetch(
          `https://api.clickup.com/api/v2/space/${space_id}/tag`,
          {
            method: "POST",
            headers: {
              Authorization: CONFIG.apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: [{ type: "text" as const, text: `Error creating tag: ${response.status} - ${errorText}` }],
            isError: true,
          };
        }

        return {
          content: [{
            type: "text" as const,
            text: `Tag "${name}" created successfully in space ${space_id}.`
          }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );

  // Update Space Tag
  server.tool(
    "updateSpaceTag",
    "Update an existing tag's name or colors in a space.",
    {
      space_id: z.string().min(1).describe("The space ID containing the tag"),
      tag_name: z.string().min(1).describe("Current name of the tag to update"),
      new_name: z.string().optional().describe("New name for the tag"),
      tag_bg: z.string().optional().describe("New background color hex code"),
      tag_fg: z.string().optional().describe("New foreground/text color hex code"),
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    async ({ space_id, tag_name, new_name, tag_bg, tag_fg }) => {
      try {
        const body: any = {
          tag: {},
        };
        if (new_name) body.tag.name = new_name;
        if (tag_bg) body.tag.tag_bg = tag_bg;
        if (tag_fg) body.tag.tag_fg = tag_fg;

        if (Object.keys(body.tag).length === 0) {
          return {
            content: [{ type: "text" as const, text: "No updates specified. Provide at least one of: new_name, tag_bg, or tag_fg." }],
            isError: true,
          };
        }

        const response = await fetch(
          `https://api.clickup.com/api/v2/space/${space_id}/tag/${encodeURIComponent(tag_name)}`,
          {
            method: "PUT",
            headers: {
              Authorization: CONFIG.apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: [{ type: "text" as const, text: `Error updating tag: ${response.status} - ${errorText}` }],
            isError: true,
          };
        }

        return {
          content: [{
            type: "text" as const,
            text: `Tag "${tag_name}" updated successfully${new_name ? ` (renamed to "${new_name}")` : ''}.`
          }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );

  // Delete Space Tag
  server.tool(
    "deleteSpaceTag",
    "Delete a tag from a space. This will remove the tag from all tasks that have it.",
    {
      space_id: z.string().min(1).describe("The space ID containing the tag"),
      tag_name: z.string().min(1).describe("Name of the tag to delete"),
    },
    { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    async ({ space_id, tag_name }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/space/${space_id}/tag/${encodeURIComponent(tag_name)}`,
          {
            method: "DELETE",
            headers: {
              Authorization: CONFIG.apiKey,
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: [{ type: "text" as const, text: `Error deleting tag: ${response.status} - ${errorText}` }],
            isError: true,
          };
        }

        return {
          content: [{
            type: "text" as const,
            text: `Tag "${tag_name}" deleted from space ${space_id}. The tag has been removed from all tasks.`
          }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );

  // Add Tag to Task
  server.tool(
    "addTagToTask",
    "Add an existing space tag to a task.",
    {
      task_id: z.string().min(6).max(9).describe("The task ID to add the tag to"),
      tag_name: z.string().min(1).describe("Name of the tag to add (must exist in the space)"),
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    async ({ task_id, tag_name }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/task/${task_id}/tag/${encodeURIComponent(tag_name)}`,
          {
            method: "POST",
            headers: {
              Authorization: CONFIG.apiKey,
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: [{ type: "text" as const, text: `Error adding tag to task: ${response.status} - ${errorText}` }],
            isError: true,
          };
        }

        return {
          content: [{
            type: "text" as const,
            text: `Tag "${tag_name}" added to task ${task_id}.`
          }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );

  // Remove Tag from Task
  server.tool(
    "removeTagFromTask",
    "Remove a tag from a task.",
    {
      task_id: z.string().min(6).max(9).describe("The task ID to remove the tag from"),
      tag_name: z.string().min(1).describe("Name of the tag to remove"),
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    async ({ task_id, tag_name }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/task/${task_id}/tag/${encodeURIComponent(tag_name)}`,
          {
            method: "DELETE",
            headers: {
              Authorization: CONFIG.apiKey,
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: [{ type: "text" as const, text: `Error removing tag from task: ${response.status} - ${errorText}` }],
            isError: true,
          };
        }

        return {
          content: [{
            type: "text" as const,
            text: `Tag "${tag_name}" removed from task ${task_id}.`
          }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );

  // Add Member to Task (Watcher)
  server.tool(
    "addTaskWatcher",
    "Add a user as a watcher to a task. Watchers receive notifications about task updates.",
    {
      task_id: z.string().min(6).max(9).describe("The task ID to add the watcher to"),
      user_id: z.number().describe("The user ID to add as a watcher"),
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    async ({ task_id, user_id }) => {
      try {
        // First get the task to check existing watchers
        const response = await fetch(
          `https://api.clickup.com/api/v2/task/${task_id}`,
          {
            method: "PUT",
            headers: {
              Authorization: CONFIG.apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              watchers: {
                add: [user_id],
              },
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: [{ type: "text" as const, text: `Error adding watcher: ${response.status} - ${errorText}` }],
            isError: true,
          };
        }

        return {
          content: [{
            type: "text" as const,
            text: `User ${user_id} added as a watcher to task ${task_id}.`
          }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );

  // Remove Member from Task (Watcher)
  server.tool(
    "removeTaskWatcher",
    "Remove a user as a watcher from a task.",
    {
      task_id: z.string().min(6).max(9).describe("The task ID to remove the watcher from"),
      user_id: z.number().describe("The user ID to remove as a watcher"),
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    async ({ task_id, user_id }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/task/${task_id}`,
          {
            method: "PUT",
            headers: {
              Authorization: CONFIG.apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              watchers: {
                rem: [user_id],
              },
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: [{ type: "text" as const, text: `Error removing watcher: ${response.status} - ${errorText}` }],
            isError: true,
          };
        }

        return {
          content: [{
            type: "text" as const,
            text: `User ${user_id} removed as a watcher from task ${task_id}.`
          }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );

  // Share List with User
  server.tool(
    "shareListWithUser",
    "Share a list with a specific user, granting them access to view and work on tasks in the list.",
    {
      list_id: z.string().min(1).describe("The list ID to share"),
      user_id: z.number().describe("The user ID to share the list with"),
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    async ({ list_id, user_id }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/list/${list_id}/member/${user_id}`,
          {
            method: "POST",
            headers: {
              Authorization: CONFIG.apiKey,
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: [{ type: "text" as const, text: `Error sharing list: ${response.status} - ${errorText}` }],
            isError: true,
          };
        }

        return {
          content: [{
            type: "text" as const,
            text: `List ${list_id} shared with user ${user_id}.`
          }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );

  // Unshare List from User
  server.tool(
    "unshareListFromUser",
    "Remove a user's access to a list.",
    {
      list_id: z.string().min(1).describe("The list ID to unshare"),
      user_id: z.number().describe("The user ID to remove access from"),
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    async ({ list_id, user_id }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/list/${list_id}/member/${user_id}`,
          {
            method: "DELETE",
            headers: {
              Authorization: CONFIG.apiKey,
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: [{ type: "text" as const, text: `Error unsharing list: ${response.status} - ${errorText}` }],
            isError: true,
          };
        }

        return {
          content: [{
            type: "text" as const,
            text: `User ${user_id} removed from list ${list_id}.`
          }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );
}
