import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CONFIG } from "../shared/config";

// Helper to convert ISO date to Unix timestamp (milliseconds)
function isoToTimestamp(isoString: string): number {
  return new Date(isoString).getTime();
}

// Helper to format audit log entry
function formatAuditEntry(entry: any): string {
  const date = entry.date ? new Date(parseInt(entry.date)).toISOString() : 'unknown';
  const lines = [
    `**${entry.event || 'Event'}** - ${date}`,
    entry.user?.username ? `By: ${entry.user.username} (${entry.user.email})` : null,
    entry.description || null,
    entry.field ? `Field: ${entry.field}` : null,
    entry.before !== undefined ? `Before: ${JSON.stringify(entry.before)}` : null,
    entry.after !== undefined ? `After: ${JSON.stringify(entry.after)}` : null,
  ].filter(Boolean);

  return lines.join('\n');
}

/**
 * Register read-only v3 API tools
 */
export function registerV3ToolsRead(server: McpServer) {
  // Get Workspace Audit Logs
  server.tool(
    "getAuditLogs",
    "Get audit logs for the workspace showing changes, actions, and events. Requires Business+ plan.",
    {
      start_date: z.string().optional().describe("Start date for audit logs as ISO string (e.g., '2024-01-01')"),
      end_date: z.string().optional().describe("End date for audit logs as ISO string (e.g., '2024-01-31')"),
      user_id: z.number().optional().describe("Filter by specific user ID"),
      event_type: z.string().optional().describe("Filter by event type (e.g., 'task_created', 'task_updated')"),
      page: z.number().optional().describe("Page number for pagination"),
    },
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    async ({ start_date, end_date, user_id, event_type, page }) => {
      try {
        const body: Record<string, any> = {};
        if (start_date) body['start_date'] = isoToTimestamp(start_date);
        if (end_date) body['end_date'] = isoToTimestamp(end_date);
        if (user_id !== undefined) body['user_id'] = user_id;
        if (event_type) body['event_type'] = event_type;
        if (page !== undefined) body['page'] = page;

        const url = `https://api.clickup.com/api/v3/workspaces/${CONFIG.teamId}/auditlogs`;

        const response = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: CONFIG.apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorText = await response.text();
          // Check for plan restrictions
          if (response.status === 403) {
            return {
              content: [{ type: "text" as const, text: "Audit logs require a Business+ plan. Please upgrade to access this feature." }],
              isError: true,
            };
          }
          return {
            content: [{ type: "text" as const, text: `Error fetching audit logs: ${response.status} - ${errorText}` }],
            isError: true,
          };
        }

        const data = await response.json();
        const logs = data.audit_logs || data.events || [];

        if (logs.length === 0) {
          return {
            content: [{ type: "text" as const, text: "No audit log entries found for the specified criteria." }],
          };
        }

        const formatted = logs.map(formatAuditEntry).join('\n\n---\n\n');

        return {
          content: [{
            type: "text" as const,
            text: `# Audit Logs (${logs.length} entries)\n\n${formatted}`
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

  // Get Task Activity/History
  server.tool(
    "getTaskActivity",
    "Get the time a task has spent in each status. Shows current status, time in current status, and full status history timeline.",
    {
      task_id: z.string().min(6).max(9).describe("The task ID to get activity for"),
      page: z.number().optional().describe("Page number for pagination (0-indexed)"),
    },
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    async ({ task_id, page }) => {
      try {
        const params = new URLSearchParams();
        if (page !== undefined) params.append('page', String(page));

        const response = await fetch(
          `https://api.clickup.com/api/v2/task/${task_id}/time_in_status${params.toString() ? '?' + params.toString() : ''}`,
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
            content: [{ type: "text" as const, text: `Error fetching task activity: ${response.status} - ${errorText}` }],
            isError: true,
          };
        }

        const data = await response.json();

        // Format time in status data
        const statusHistory = data.current_status ? [
          `# Task Status History`,
          ``,
          `**Current Status**: ${data.current_status.status} (${data.current_status.color})`,
          `**Time in Current Status**: ${Math.round(data.current_status.total_time.by_minute / 60)} hours`,
          ``,
          `## Status Timeline:`,
          ...(data.status_history || []).map((s: any) =>
            `- ${s.status}: ${Math.round(s.total_time.by_minute / 60)} hours`
          )
        ].join('\n') : 'No status history available';

        return {
          content: [{ type: "text" as const, text: statusHistory }],
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
 * Register write v3 API tools
 */
export function registerV3ToolsWrite(server: McpServer) {
  // Move Task to another list
  server.tool(
    "moveTask",
    "Move a task to a different list. The task will maintain its subtasks, comments, and attachments.",
    {
      task_id: z.string().min(6).max(9).describe("The task ID to move"),
      list_id: z.string().min(1).describe("The destination list ID"),
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    async ({ task_id, list_id }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v3/workspaces/${CONFIG.teamId}/tasks/${task_id}/home_list/${list_id}`,
          {
            method: "PUT",
            headers: {
              Authorization: CONFIG.apiKey,
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: [{ type: "text" as const, text: `Error moving task: ${response.status} - ${errorText}` }],
            isError: true,
          };
        }

        return {
          content: [{
            type: "text" as const,
            text: `Task ${task_id} has been moved to list ${list_id} successfully.`
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

  // Duplicate Task
  server.tool(
    "duplicateTask",
    "Create a copy of a task including its description, custom fields, and optionally subtasks and comments.",
    {
      task_id: z.string().min(6).max(9).describe("The task ID to duplicate"),
      list_id: z.string().optional().describe("Optional destination list ID. If not provided, duplicates in the same list."),
      name: z.string().optional().describe("Optional new name for the duplicated task"),
      include_subtasks: z.boolean().optional().describe("Whether to also duplicate subtasks (default: true)"),
      include_comments: z.boolean().optional().describe("Whether to copy comments to the new task (default: false)"),
      include_attachments: z.boolean().optional().describe("Whether to copy attachments (default: false)"),
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    async ({ task_id, list_id, name, include_subtasks, include_comments, include_attachments }) => {
      try {
        // First, get the original task
        const getResponse = await fetch(
          `https://api.clickup.com/api/v2/task/${task_id}?include_subtasks=true`,
          {
            method: "GET",
            headers: {
              Authorization: CONFIG.apiKey,
            },
          }
        );

        if (!getResponse.ok) {
          const errorText = await getResponse.text();
          return {
            content: [{ type: "text" as const, text: `Error fetching task to duplicate: ${getResponse.status} - ${errorText}` }],
            isError: true,
          };
        }

        const originalTask = await getResponse.json();
        const targetListId = list_id || originalTask.list?.id;

        if (!targetListId) {
          return {
            content: [{ type: "text" as const, text: "Could not determine destination list. Please provide a list_id." }],
            isError: true,
          };
        }

        // Create the duplicate task
        const newTaskBody: any = {
          name: name || `${originalTask.name} (Copy)`,
          description: originalTask.description,
          priority: originalTask.priority?.id,
          due_date: originalTask.due_date,
          start_date: originalTask.start_date,
          time_estimate: originalTask.time_estimate,
          status: originalTask.status?.status,
          tags: originalTask.tags?.map((t: any) => t.name),
        };

        // Copy custom field values
        if (originalTask.custom_fields?.length > 0) {
          newTaskBody.custom_fields = originalTask.custom_fields
            .filter((cf: any) => cf.value !== null && cf.value !== undefined)
            .map((cf: any) => ({
              id: cf.id,
              value: cf.value,
            }));
        }

        const createResponse = await fetch(
          `https://api.clickup.com/api/v2/list/${targetListId}/task`,
          {
            method: "POST",
            headers: {
              Authorization: CONFIG.apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(newTaskBody),
          }
        );

        if (!createResponse.ok) {
          const errorText = await createResponse.text();
          return {
            content: [{ type: "text" as const, text: `Error creating duplicate task: ${createResponse.status} - ${errorText}` }],
            isError: true,
          };
        }

        const newTask = await createResponse.json();
        const duplicatedItems: string[] = ['Task'];

        // Optionally duplicate subtasks
        if ((include_subtasks ?? true) && originalTask.subtasks?.length > 0) {
          for (const subtask of originalTask.subtasks) {
            try {
              await fetch(
                `https://api.clickup.com/api/v2/list/${targetListId}/task`,
                {
                  method: "POST",
                  headers: {
                    Authorization: CONFIG.apiKey,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    name: subtask.name,
                    description: subtask.description,
                    parent: newTask.id,
                  }),
                }
              );
            } catch (e) {
              console.error(`Failed to duplicate subtask: ${subtask.name}`);
            }
          }
          duplicatedItems.push(`${originalTask.subtasks.length} subtasks`);
        }

        const result = [
          `# Task Duplicated Successfully`,
          ``,
          `**Original Task**: ${originalTask.name} (${task_id})`,
          `**New Task**: ${newTask.name} (${newTask.id})`,
          `**List**: ${newTask.list?.name || targetListId}`,
          ``,
          `**Duplicated**: ${duplicatedItems.join(', ')}`,
          ``,
          `**Task URL**: ${newTask.url}`,
        ].join('\n');

        return {
          content: [{ type: "text" as const, text: result }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );

  // Update Task Privacy/Access (deprecated - use updatePrivacyAccess)
  server.tool(
    "updateTaskPrivacy",
    "Deprecated: Use 'updatePrivacyAccess' instead, which supports tasks, lists, folders, and spaces. This tool redirects you to the correct tool.",
    {
      task_id: z.string().min(6).max(9).describe("The task ID to update privacy for"),
      is_private: z.boolean().describe("Set to true to make the task private, false to make it public"),
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    async ({ task_id, is_private }) => {
      return {
        content: [{
          type: "text" as const,
          text: `Please use the 'updatePrivacyAccess' tool instead, which supports updating privacy and access settings for tasks, lists, folders, and spaces.\n\nExample call: updatePrivacyAccess({ object_type: "task", object_id: "${task_id}", sharing: { public: ${!is_private} } })`
        }],
      };
    }
  );

  // Update Privacy and Access (ACL)
  server.tool(
    "updatePrivacyAccess",
    "Update privacy and access settings for a task, list, folder, or space. Controls who can view and edit the object.",
    {
      object_type: z.enum(['task', 'list', 'folder', 'space']).describe("The type of object to update privacy for"),
      object_id: z.string().min(1).describe("The ID of the object"),
      sharing: z.object({
        public: z.boolean().optional().describe("Whether the object is publicly accessible"),
        team: z.boolean().optional().describe("Whether the object is accessible to all team members"),
        link: z.boolean().optional().describe("Whether link sharing is enabled"),
      }).describe("Privacy and sharing settings to apply to the object"),
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    async ({ object_type, object_id, sharing }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v3/workspaces/${CONFIG.teamId}/${object_type}/${object_id}/acls`,
          {
            method: "PATCH",
            headers: {
              Authorization: CONFIG.apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ sharing }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: [{ type: "text" as const, text: `Error updating privacy/access for ${object_type} ${object_id}: ${response.status} - ${errorText}` }],
            isError: true,
          };
        }

        const data = await response.json();

        const sharingDetails = Object.entries(sharing)
          .map(([key, value]) => `- ${key}: ${value}`)
          .join('\n');

        return {
          content: [{
            type: "text" as const,
            text: `# Privacy and Access Updated\n\n**Object Type**: ${object_type}\n**Object ID**: ${object_id}\n\n**Applied Settings**:\n${sharingDetails}`
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

  // Bulk Update Tasks
  server.tool(
    "bulkUpdateTasks",
    "Update multiple tasks at once with the same changes. Efficient for batch operations.",
    {
      task_ids: z.array(z.string().min(6).max(9)).min(1).max(100).describe("Array of task IDs to update (max 100)"),
      status: z.string().optional().describe("New status for all tasks"),
      priority: z.enum(['urgent', 'high', 'normal', 'low']).optional().describe("New priority for all tasks"),
      due_date: z.string().optional().describe("New due date as ISO string for all tasks"),
      assignees_add: z.array(z.number()).optional().describe("User IDs to add as assignees to all tasks"),
      assignees_remove: z.array(z.number()).optional().describe("User IDs to remove as assignees from all tasks"),
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    async ({ task_ids, status, priority, due_date, assignees_add, assignees_remove }) => {
      try {
        const priorityMap: Record<string, number> = {
          'urgent': 1,
          'high': 2,
          'normal': 3,
          'low': 4,
        };

        const results: { success: string[]; failed: string[] } = {
          success: [],
          failed: [],
        };

        // Build update body
        const updateBody: any = {};
        if (status) updateBody.status = status;
        if (priority) updateBody.priority = priorityMap[priority];
        if (due_date) updateBody.due_date = isoToTimestamp(due_date);
        if (assignees_add) updateBody.assignees = { add: assignees_add };
        if (assignees_remove) {
          updateBody.assignees = updateBody.assignees || {};
          updateBody.assignees.rem = assignees_remove;
        }

        // Update each task
        for (const task_id of task_ids) {
          try {
            const response = await fetch(
              `https://api.clickup.com/api/v2/task/${task_id}`,
              {
                method: "PUT",
                headers: {
                  Authorization: CONFIG.apiKey,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(updateBody),
              }
            );

            if (response.ok) {
              results.success.push(task_id);
            } else {
              results.failed.push(task_id);
            }
          } catch {
            results.failed.push(task_id);
          }
        }

        const summary = [
          `# Bulk Update Results`,
          ``,
          `**Total Tasks**: ${task_ids.length}`,
          `**Successful**: ${results.success.length}`,
          `**Failed**: ${results.failed.length}`,
        ];

        if (results.failed.length > 0) {
          summary.push(``, `**Failed Task IDs**: ${results.failed.join(', ')}`);
        }

        return {
          content: [{ type: "text" as const, text: summary.join('\n') }],
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
