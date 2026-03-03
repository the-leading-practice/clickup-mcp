import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CONFIG } from "../shared/config";
import { generateTaskUrl } from "../shared/utils";

export function registerChecklistToolsRead(server: McpServer) {
  // Note: Checklists are returned as part of getTaskById, so no separate read tool needed
  // This function is a placeholder for consistency with the pattern
}

export function registerChecklistToolsWrite(server: McpServer) {
  server.tool(
    "createChecklist",
    [
      "Create a new checklist on a task.",
      "Checklists contain items that can be checked off to track progress.",
      "Use this to add structured subtasks or steps to a task.",
      "Returns the checklist ID which is needed for adding items."
    ].join("\n"),
    {
      task_id: z.string().min(6).max(9).describe("The task ID to create the checklist on"),
      name: z.string().min(1).describe("Name for the checklist")
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false
    },
    async ({ task_id, name }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/task/${task_id}/checklist`,
          {
            method: 'POST',
            headers: {
              Authorization: CONFIG.apiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name })
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Error creating checklist: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        const checklist = data.checklist;

        return {
          content: [{
            type: "text" as const,
            text: [
              `Checklist created successfully!`,
              `checklist_id: ${checklist.id}`,
              `name: ${checklist.name}`,
              `task_id: ${task_id}`,
              `task_url: ${generateTaskUrl(task_id)}`,
              ``,
              `You can now add items using createChecklistItem with checklist_id: ${checklist.id}`
            ].join('\n')
          }]
        };

      } catch (error) {
        console.error('Error creating checklist:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error creating checklist: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "updateChecklist",
    [
      "Rename an existing checklist.",
      "Use getTaskById first to find the checklist_id.",
      "This only changes the checklist name, not its items."
    ].join("\n"),
    {
      checklist_id: z.string().min(1).describe("The checklist ID to update"),
      name: z.string().min(1).describe("New name for the checklist")
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true
    },
    async ({ checklist_id, name }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/checklist/${checklist_id}`,
          {
            method: 'PUT',
            headers: {
              Authorization: CONFIG.apiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name })
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Error updating checklist: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        const checklist = data.checklist;

        return {
          content: [{
            type: "text" as const,
            text: [
              `Checklist updated successfully!`,
              `checklist_id: ${checklist.id}`,
              `name: ${checklist.name}`
            ].join('\n')
          }]
        };

      } catch (error) {
        console.error('Error updating checklist:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error updating checklist: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "deleteChecklist",
    [
      "Delete a checklist from a task.",
      "WARNING: This will delete the checklist and ALL its items.",
      "Use getTaskById first to find the checklist_id and review its contents."
    ].join("\n"),
    {
      checklist_id: z.string().min(1).describe("The checklist ID to delete")
    },
    {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true
    },
    async ({ checklist_id }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/checklist/${checklist_id}`,
          {
            method: 'DELETE',
            headers: { Authorization: CONFIG.apiKey }
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Error deleting checklist: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        return {
          content: [{
            type: "text" as const,
            text: [
              `Checklist deleted successfully!`,
              `checklist_id: ${checklist_id}`,
              `The checklist and all its items have been removed.`
            ].join('\n')
          }]
        };

      } catch (error) {
        console.error('Error deleting checklist:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error deleting checklist: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "createChecklistItem",
    [
      "Add a new item to a checklist.",
      "Checklist items can be assigned and have their own completion status.",
      "Use createChecklist first to get a checklist_id, or use getTaskById to find existing checklists."
    ].join("\n"),
    {
      checklist_id: z.string().min(1).describe("The checklist ID to add the item to"),
      name: z.string().min(1).describe("Name/text of the checklist item"),
      assignee: z.string().optional().describe("Optional user ID to assign this item to")
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false
    },
    async ({ checklist_id, name, assignee }) => {
      try {
        const body: any = { name };
        if (assignee) body.assignee = assignee;

        const response = await fetch(
          `https://api.clickup.com/api/v2/checklist/${checklist_id}/checklist_item`,
          {
            method: 'POST',
            headers: {
              Authorization: CONFIG.apiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Error creating checklist item: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        const checklist = data.checklist;
        // Find the newly created item (last item in the list)
        const items = checklist.items || [];
        const newItem = items[items.length - 1];

        return {
          content: [{
            type: "text" as const,
            text: [
              `Checklist item created successfully!`,
              `checklist_item_id: ${newItem?.id || 'unknown'}`,
              `name: ${name}`,
              `checklist_id: ${checklist_id}`,
              assignee ? `assignee: ${assignee}` : '',
              `resolved: false`
            ].filter(Boolean).join('\n')
          }]
        };

      } catch (error) {
        console.error('Error creating checklist item:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error creating checklist item: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "updateChecklistItem",
    [
      "Update a checklist item's name, assignee, or completion status.",
      "Use this to rename items, mark them complete/incomplete, or reassign them.",
      "Use getTaskById first to find checklist_id and checklist_item_id."
    ].join("\n"),
    {
      checklist_id: z.string().min(1).describe("The checklist ID containing the item"),
      checklist_item_id: z.string().min(1).describe("The checklist item ID to update"),
      name: z.string().optional().describe("New name for the item"),
      resolved: z.boolean().optional().describe("Set to true to mark complete, false to mark incomplete"),
      assignee: z.string().optional().describe("User ID to assign, or null to unassign"),
      parent: z.string().optional().describe("Move item under another item (make it a sub-item)")
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true
    },
    async ({ checklist_id, checklist_item_id, name, resolved, assignee, parent }) => {
      try {
        const body: any = {};
        if (name !== undefined) body.name = name;
        if (resolved !== undefined) body.resolved = resolved;
        if (assignee !== undefined) body.assignee = assignee;
        if (parent !== undefined) body.parent = parent;

        if (Object.keys(body).length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: "No updates specified. Please provide at least one field to update (name, resolved, assignee, or parent)."
            }]
          };
        }

        const response = await fetch(
          `https://api.clickup.com/api/v2/checklist/${checklist_id}/checklist_item/${checklist_item_id}`,
          {
            method: 'PUT',
            headers: {
              Authorization: CONFIG.apiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Error updating checklist item: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();

        return {
          content: [{
            type: "text" as const,
            text: [
              `Checklist item updated successfully!`,
              `checklist_item_id: ${checklist_item_id}`,
              `checklist_id: ${checklist_id}`,
              name !== undefined ? `name: ${name}` : '',
              resolved !== undefined ? `resolved: ${resolved}` : '',
              assignee !== undefined ? `assignee: ${assignee || 'unassigned'}` : ''
            ].filter(Boolean).join('\n')
          }]
        };

      } catch (error) {
        console.error('Error updating checklist item:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error updating checklist item: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "deleteChecklistItem",
    [
      "Delete a checklist item.",
      "Use getTaskById first to find the checklist_id and checklist_item_id."
    ].join("\n"),
    {
      checklist_id: z.string().min(1).describe("The checklist ID containing the item"),
      checklist_item_id: z.string().min(1).describe("The checklist item ID to delete")
    },
    {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true
    },
    async ({ checklist_id, checklist_item_id }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/checklist/${checklist_id}/checklist_item/${checklist_item_id}`,
          {
            method: 'DELETE',
            headers: { Authorization: CONFIG.apiKey }
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Error deleting checklist item: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        return {
          content: [{
            type: "text" as const,
            text: [
              `Checklist item deleted successfully!`,
              `checklist_item_id: ${checklist_item_id}`,
              `checklist_id: ${checklist_id}`
            ].join('\n')
          }]
        };

      } catch (error) {
        console.error('Error deleting checklist item:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error deleting checklist item: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );
}
