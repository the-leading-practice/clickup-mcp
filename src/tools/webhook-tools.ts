import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CONFIG } from "../shared/config";

// ClickUp webhook event types
const WEBHOOK_EVENTS = [
  'taskCreated', 'taskUpdated', 'taskDeleted', 'taskPriorityUpdated',
  'taskStatusUpdated', 'taskAssigneeUpdated', 'taskDueDateUpdated',
  'taskTagUpdated', 'taskMoved', 'taskCommentPosted', 'taskCommentUpdated',
  'taskTimeEstimateUpdated', 'taskTimeTrackedUpdated', 'taskAttachmentUpdated',
  'listCreated', 'listUpdated', 'listDeleted',
  'folderCreated', 'folderUpdated', 'folderDeleted',
  'spaceCreated', 'spaceUpdated', 'spaceDeleted',
  'goalCreated', 'goalUpdated', 'goalDeleted',
  'keyResultCreated', 'keyResultUpdated', 'keyResultDeleted'
] as const;

type WebhookEvent = typeof WEBHOOK_EVENTS[number];

// Helper to format webhook for display
function formatWebhook(webhook: any): string {
  const lines = [
    `**${webhook.id}**`,
    `Endpoint: ${webhook.endpoint}`,
    `Events: ${webhook.events?.join(', ') || 'all'}`,
    `Status: ${webhook.health?.status || 'unknown'}`,
    webhook.health?.fail_count ? `Fail Count: ${webhook.health.fail_count}` : null,
    webhook.secret ? `Secret: ****${webhook.secret.slice(-4)}` : null,
  ].filter(Boolean);

  return lines.join('\n');
}

/**
 * Register read-only webhook tools
 */
export function registerWebhookToolsRead(server: McpServer) {
  // Get Webhooks
  server.tool(
    "getWebhooks",
    "List all webhooks configured for the workspace. Returns webhook endpoints, subscribed events, and health status.",
    {},
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    async () => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/team/${CONFIG.teamId}/webhook`,
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
            content: [{ type: "text" as const, text: `Error fetching webhooks: ${response.status} - ${errorText}` }],
            isError: true,
          };
        }

        const data = await response.json();
        const webhooks = data.webhooks || [];

        if (webhooks.length === 0) {
          return {
            content: [{ type: "text" as const, text: "No webhooks configured for this workspace." }],
          };
        }

        const formatted = webhooks.map(formatWebhook).join('\n\n---\n\n');

        return {
          content: [{
            type: "text" as const,
            text: `# Webhooks (${webhooks.length})\n\n${formatted}`
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
 * Register write webhook tools
 */
export function registerWebhookToolsWrite(server: McpServer) {
  // Create Webhook
  server.tool(
    "createWebhook",
    "Create a new webhook to receive notifications for ClickUp events. Specify the endpoint URL and which events to subscribe to.",
    {
      endpoint: z.string().url().describe("The URL that will receive webhook POST requests"),
      events: z.array(z.enum(WEBHOOK_EVENTS)).min(1).describe(`Events to subscribe to. Available events: ${WEBHOOK_EVENTS.join(', ')}`),
      space_id: z.string().optional().describe("Optional space ID to limit webhook to a specific space"),
      folder_id: z.string().optional().describe("Optional folder ID to limit webhook to a specific folder"),
      list_id: z.string().optional().describe("Optional list ID to limit webhook to a specific list"),
      task_id: z.string().optional().describe("Optional task ID to limit webhook to a specific task"),
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    async ({ endpoint, events, space_id, folder_id, list_id, task_id }) => {
      try {
        const body: any = {
          endpoint,
          events,
        };

        // Add optional filters
        if (space_id) body.space_id = space_id;
        if (folder_id) body.folder_id = folder_id;
        if (list_id) body.list_id = list_id;
        if (task_id) body.task_id = task_id;

        const response = await fetch(
          `https://api.clickup.com/api/v2/team/${CONFIG.teamId}/webhook`,
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
            content: [{ type: "text" as const, text: `Error creating webhook: ${response.status} - ${errorText}` }],
            isError: true,
          };
        }

        const data = await response.json();
        const webhook = data.webhook;

        const result = [
          `# Webhook Created Successfully`,
          ``,
          `**Webhook ID**: ${webhook.id}`,
          `**Endpoint**: ${webhook.endpoint}`,
          `**Events**: ${webhook.events?.join(', ')}`,
          webhook.secret ? `**Secret**: ${webhook.secret} (save this - it won't be shown again!)` : null,
          ``,
          `The webhook will now receive POST requests for the subscribed events.`,
        ].filter(Boolean).join('\n');

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

  // Update Webhook
  server.tool(
    "updateWebhook",
    "Update an existing webhook's endpoint URL, subscribed events, or status.",
    {
      webhook_id: z.string().min(1).describe("The webhook ID to update"),
      endpoint: z.string().url().optional().describe("New endpoint URL for the webhook"),
      events: z.array(z.enum(WEBHOOK_EVENTS)).optional().describe("New list of events to subscribe to (replaces existing)"),
      status: z.enum(['active', 'suspended']).optional().describe("Set webhook status to active or suspended"),
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    async ({ webhook_id, endpoint, events, status }) => {
      try {
        const body: any = {};
        if (endpoint) body.endpoint = endpoint;
        if (events) body.events = events;
        if (status) body.status = status;

        if (Object.keys(body).length === 0) {
          return {
            content: [{ type: "text" as const, text: "No updates specified. Provide at least one of: endpoint, events, or status." }],
            isError: true,
          };
        }

        const response = await fetch(
          `https://api.clickup.com/api/v2/webhook/${webhook_id}`,
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
            content: [{ type: "text" as const, text: `Error updating webhook: ${response.status} - ${errorText}` }],
            isError: true,
          };
        }

        const data = await response.json();
        const webhook = data.webhook;

        return {
          content: [{
            type: "text" as const,
            text: `# Webhook Updated\n\n${formatWebhook(webhook)}`
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

  // Delete Webhook
  server.tool(
    "deleteWebhook",
    "Delete a webhook. This will stop all notifications to the webhook endpoint.",
    {
      webhook_id: z.string().min(1).describe("The webhook ID to delete"),
    },
    { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    async ({ webhook_id }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/webhook/${webhook_id}`,
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
            content: [{ type: "text" as const, text: `Error deleting webhook: ${response.status} - ${errorText}` }],
            isError: true,
          };
        }

        return {
          content: [{
            type: "text" as const,
            text: `Webhook ${webhook_id} has been deleted successfully. The endpoint will no longer receive notifications.`
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
