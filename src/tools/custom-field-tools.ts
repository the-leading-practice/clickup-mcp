import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CONFIG } from "../shared/config";
import { generateTaskUrl, generateListUrl, generateFolderUrl, generateSpaceUrl } from "../shared/utils";

export function registerCustomFieldToolsRead(server: McpServer) {
  server.tool(
    "getAccessibleCustomFields",
    [
      "Get all custom fields accessible in a list.",
      "Returns field IDs, names, types, and configuration.",
      "Use this to discover available custom fields before setting values on tasks.",
      "Fields can be inherited from folder, space, or workspace levels."
    ].join("\n"),
    {
      list_id: z.string().min(1).describe("The list ID to get accessible custom fields for")
    },
    {
      readOnlyHint: true
    },
    async ({ list_id }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/list/${list_id}/field`,
          { headers: { Authorization: CONFIG.apiKey } }
        );

        if (!response.ok) {
          throw new Error(`Error fetching custom fields: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const fields = data.fields || [];

        if (fields.length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: `No custom fields found accessible in list ${list_id}.`
            }]
          };
        }

        const lines: string[] = [
          `Found ${fields.length} custom field(s) accessible in list ${list_id}:`,
          ''
        ];

        fields.forEach((field: any) => {
          lines.push(`📋 ${field.name} (field_id: ${field.id})`);
          lines.push(`   Type: ${field.type}`);
          if (field.required) lines.push(`   Required: yes`);

          // Show options for dropdown/label fields
          if (field.type_config?.options && field.type_config.options.length > 0) {
            const optionNames = field.type_config.options.map((o: any) => o.name || o.label).join(', ');
            lines.push(`   Options: ${optionNames}`);
          }

          lines.push('');
        });

        return {
          content: [{
            type: "text" as const,
            text: lines.join('\n')
          }]
        };

      } catch (error) {
        console.error('Error getting custom fields:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error getting custom fields: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "getFolderCustomFields",
    [
      "Get custom fields defined at the folder level.",
      "These fields are available to all lists within the folder."
    ].join("\n"),
    {
      folder_id: z.string().min(1).describe("The folder ID to get custom fields for")
    },
    {
      readOnlyHint: true
    },
    async ({ folder_id }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/folder/${folder_id}/field`,
          { headers: { Authorization: CONFIG.apiKey } }
        );

        if (!response.ok) {
          throw new Error(`Error fetching folder custom fields: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const fields = data.fields || [];

        if (fields.length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: `No custom fields defined at folder level for folder ${folder_id}.`
            }]
          };
        }

        const lines: string[] = [
          `Found ${fields.length} custom field(s) at folder level:`,
          `folder_url: ${generateFolderUrl(folder_id)}`,
          ''
        ];

        fields.forEach((field: any) => {
          lines.push(`📋 ${field.name} (field_id: ${field.id})`);
          lines.push(`   Type: ${field.type}`);
          if (field.required) lines.push(`   Required: yes`);
          lines.push('');
        });

        return {
          content: [{
            type: "text" as const,
            text: lines.join('\n')
          }]
        };

      } catch (error) {
        console.error('Error getting folder custom fields:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error getting folder custom fields: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "getSpaceCustomFields",
    [
      "Get custom fields defined at the space level.",
      "These fields are available to all lists and folders within the space."
    ].join("\n"),
    {
      space_id: z.string().min(1).describe("The space ID to get custom fields for")
    },
    {
      readOnlyHint: true
    },
    async ({ space_id }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/space/${space_id}/field`,
          { headers: { Authorization: CONFIG.apiKey } }
        );

        if (!response.ok) {
          throw new Error(`Error fetching space custom fields: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const fields = data.fields || [];

        if (fields.length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: `No custom fields defined at space level for space ${space_id}.`
            }]
          };
        }

        const lines: string[] = [
          `Found ${fields.length} custom field(s) at space level:`,
          `space_url: ${generateSpaceUrl(space_id)}`,
          ''
        ];

        fields.forEach((field: any) => {
          lines.push(`📋 ${field.name} (field_id: ${field.id})`);
          lines.push(`   Type: ${field.type}`);
          if (field.required) lines.push(`   Required: yes`);
          lines.push('');
        });

        return {
          content: [{
            type: "text" as const,
            text: lines.join('\n')
          }]
        };

      } catch (error) {
        console.error('Error getting space custom fields:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error getting space custom fields: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "getWorkspaceCustomFields",
    [
      "Get all custom fields defined at the workspace level.",
      "These fields are available across the entire workspace."
    ].join("\n"),
    {},
    {
      readOnlyHint: true
    },
    async () => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/team/${CONFIG.teamId}/field`,
          { headers: { Authorization: CONFIG.apiKey } }
        );

        if (!response.ok) {
          throw new Error(`Error fetching workspace custom fields: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const fields = data.fields || [];

        if (fields.length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: `No custom fields defined at workspace level.`
            }]
          };
        }

        const lines: string[] = [
          `Found ${fields.length} custom field(s) at workspace level:`,
          ''
        ];

        fields.forEach((field: any) => {
          lines.push(`📋 ${field.name} (field_id: ${field.id})`);
          lines.push(`   Type: ${field.type}`);
          if (field.required) lines.push(`   Required: yes`);

          // Show options for dropdown/label fields
          if (field.type_config?.options && field.type_config.options.length > 0) {
            const optionNames = field.type_config.options.map((o: any) => o.name || o.label).join(', ');
            lines.push(`   Options: ${optionNames}`);
          }

          lines.push('');
        });

        return {
          content: [{
            type: "text" as const,
            text: lines.join('\n')
          }]
        };

      } catch (error) {
        console.error('Error getting workspace custom fields:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error getting workspace custom fields: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );
}

export function registerCustomFieldToolsWrite(server: McpServer) {
  server.tool(
    "setCustomFieldValue",
    [
      "Set a custom field value on a task.",
      "Use getAccessibleCustomFields first to find the field_id and understand the expected value format.",
      "Value format depends on field type:",
      "- Text: string value",
      "- Number: numeric value",
      "- Date: Unix timestamp in milliseconds",
      "- Dropdown: option ID or option name",
      "- Checkbox: true/false",
      "- Currency: numeric value (uses field's currency settings)",
      "- Labels: array of label IDs",
      "- Users: array of user IDs"
    ].join("\n"),
    {
      task_id: z.string().min(6).max(9).describe("The task ID to set the custom field on"),
      field_id: z.string().min(1).describe("The custom field ID"),
      value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]).describe("The value to set (format depends on field type)")
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true
    },
    async ({ task_id, field_id, value }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/task/${task_id}/field/${field_id}`,
          {
            method: 'POST',
            headers: {
              Authorization: CONFIG.apiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ value })
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Error setting custom field value: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        return {
          content: [{
            type: "text" as const,
            text: [
              `Custom field value set successfully!`,
              `task_id: ${task_id}`,
              `task_url: ${generateTaskUrl(task_id)}`,
              `field_id: ${field_id}`,
              `value: ${JSON.stringify(value)}`
            ].join('\n')
          }]
        };

      } catch (error) {
        console.error('Error setting custom field value:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error setting custom field value: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "removeCustomFieldValue",
    [
      "Remove a custom field value from a task.",
      "This clears the field value, setting it to empty/null.",
      "Use getTaskById first to see current custom field values."
    ].join("\n"),
    {
      task_id: z.string().min(6).max(9).describe("The task ID to remove the custom field value from"),
      field_id: z.string().min(1).describe("The custom field ID to clear")
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true
    },
    async ({ task_id, field_id }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/task/${task_id}/field/${field_id}`,
          {
            method: 'DELETE',
            headers: { Authorization: CONFIG.apiKey }
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Error removing custom field value: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        return {
          content: [{
            type: "text" as const,
            text: [
              `Custom field value removed successfully!`,
              `task_id: ${task_id}`,
              `task_url: ${generateTaskUrl(task_id)}`,
              `field_id: ${field_id}`,
              `The field value has been cleared.`
            ].join('\n')
          }]
        };

      } catch (error) {
        console.error('Error removing custom field value:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error removing custom field value: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );
}
