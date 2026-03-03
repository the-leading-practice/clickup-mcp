import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CONFIG } from "../shared/config";
import { generateListUrl, generateSpaceUrl } from "../shared/utils";

export function registerTemplateToolsRead(server: McpServer) {
  server.tool(
    "getListTemplates",
    [
      "Gets all list templates available in the workspace.",
      "List templates can be used to create new lists with predefined structure, statuses, and task templates.",
      "Use this to discover available templates before creating lists from templates."
    ].join("\n"),
    {},
    {
      readOnlyHint: true
    },
    async () => {
      try {
        const response = await fetch(`https://api.clickup.com/api/v2/team/${CONFIG.teamId}/list_template`, {
          headers: { Authorization: CONFIG.apiKey },
        });

        if (!response.ok) {
          throw new Error(`Error fetching list templates: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const templates = data.templates || [];

        if (templates.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "No list templates found in this workspace."
              }
            ],
          };
        }

        const responseLines = [
          `List Templates (${templates.length} total):`,
          ""
        ];

        templates.forEach((template: any) => {
          responseLines.push(`template_id: ${template.id}`);
          responseLines.push(`name: ${template.name}`);
          if (template.description) {
            responseLines.push(`description: ${template.description}`);
          }
          responseLines.push("");
        });

        responseLines.push("Use createListFromTemplate with a template_id and folder_id to create a new list from a template.");

        return {
          content: [
            {
              type: "text" as const,
              text: responseLines.join("\n")
            }
          ],
        };

      } catch (error) {
        console.error('Error getting list templates:', error);
        return {
          content: [
            {
              type: "text",
              text: `Error getting list templates: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    "getTaskTemplates",
    "Get all task templates available in the workspace. Task templates can be used to create new tasks with predefined content, checklists, and settings.",
    {
      page: z.number().optional().describe("Page number for pagination (0-indexed)")
    },
    {
      readOnlyHint: true
    },
    async ({ page }) => {
      try {
        const url = new URL(`https://api.clickup.com/api/v2/team/${CONFIG.teamId}/taskTemplate`);
        if (page !== undefined) {
          url.searchParams.set('page', String(page));
        }

        const response = await fetch(url.toString(), {
          headers: { Authorization: CONFIG.apiKey },
        });

        if (!response.ok) {
          throw new Error(`Error fetching task templates: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const templates = data.templates || [];

        if (templates.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "No task templates found in this workspace."
              }
            ],
          };
        }

        const responseLines = [
          `Task Templates (${templates.length} total):`,
          ""
        ];

        templates.forEach((template: any) => {
          responseLines.push(`template_id: ${template.id}`);
          responseLines.push(`name: ${template.name}`);
          if (template.description) {
            responseLines.push(`description: ${template.description}`);
          }
          responseLines.push("");
        });

        responseLines.push("Use createTaskFromTemplate with a template_id and list_id to create a new task from a template.");

        return {
          content: [
            {
              type: "text" as const,
              text: responseLines.join("\n")
            }
          ],
        };

      } catch (error) {
        console.error('Error getting task templates:', error);
        return {
          content: [
            {
              type: "text",
              text: `Error getting task templates: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    "getFolderTemplates",
    [
      "Gets all folder templates available in the workspace.",
      "Folder templates can be used to create new folders with predefined lists and structure.",
      "Use this to discover available templates before creating folders from templates."
    ].join("\n"),
    {},
    {
      readOnlyHint: true
    },
    async () => {
      try {
        const response = await fetch(`https://api.clickup.com/api/v2/team/${CONFIG.teamId}/folder_template`, {
          headers: { Authorization: CONFIG.apiKey },
        });

        if (!response.ok) {
          throw new Error(`Error fetching folder templates: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const templates = data.templates || [];

        if (templates.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "No folder templates found in this workspace."
              }
            ],
          };
        }

        const responseLines = [
          `Folder Templates (${templates.length} total):`,
          ""
        ];

        templates.forEach((template: any) => {
          responseLines.push(`template_id: ${template.id}`);
          responseLines.push(`name: ${template.name}`);
          if (template.description) {
            responseLines.push(`description: ${template.description}`);
          }
          responseLines.push("");
        });

        responseLines.push("Use createFolderFromTemplate with a template_id and space_id to create a new folder from a template.");

        return {
          content: [
            {
              type: "text" as const,
              text: responseLines.join("\n")
            }
          ],
        };

      } catch (error) {
        console.error('Error getting folder templates:', error);
        return {
          content: [
            {
              type: "text",
              text: `Error getting folder templates: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );
}

export function registerTemplateToolsWrite(server: McpServer) {
  server.tool(
    "createListFromTemplate",
    [
      "Creates a new list in a folder from a list template.",
      "The new list will inherit the template's structure, statuses, and any task templates.",
      "Use getListTemplates first to discover available template IDs.",
      "Use searchSpaces to find folder IDs where you want to create the list."
    ].join("\n"),
    {
      template_id: z.string().min(1).describe("The list template ID to use (from getListTemplates)"),
      folder_id: z.string().min(1).describe("The folder ID where the new list will be created"),
      name: z.string().min(1).describe("Name for the new list")
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
    },
    async ({ template_id, folder_id, name }) => {
      try {
        const response = await fetch(`https://api.clickup.com/api/v2/folder/${folder_id}/list_template/${template_id}`, {
          method: 'POST',
          headers: {
            Authorization: CONFIG.apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ name })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Error creating list from template: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const listData = await response.json();

        const responseLines = [
          `List created successfully from template!`,
          `list_id: ${listData.id}`,
          `list_url: ${generateListUrl(listData.id)}`,
          `name: ${listData.name}`,
          `folder: ${listData.folder?.name || 'Unknown'} (${folder_id})`,
          `space: ${listData.space?.name || 'Unknown'} (${listData.space?.id || 'N/A'})`,
        ];

        if (listData.statuses && Array.isArray(listData.statuses)) {
          responseLines.push(`statuses: ${listData.statuses.map((s: any) => s.status).join(', ')}`);
        }

        return {
          content: [
            {
              type: "text" as const,
              text: responseLines.join("\n")
            }
          ],
        };

      } catch (error) {
        console.error('Error creating list from template:', error);
        return {
          content: [
            {
              type: "text",
              text: `Error creating list from template: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    "createTaskFromTemplate",
    "Create a new task in a list from a task template. The task will inherit the template's content, checklists, and settings. Use getTaskTemplates to discover available template IDs.",
    {
      list_id: z.string().min(1).describe("The list ID where the task will be created"),
      template_id: z.string().min(1).describe("The task template ID to use (from getTaskTemplates)"),
      name: z.string().min(1).describe("Name for the new task")
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
    },
    async ({ list_id, template_id, name }) => {
      try {
        const response = await fetch(`https://api.clickup.com/api/v2/list/${list_id}/taskTemplate/${template_id}`, {
          method: 'POST',
          headers: {
            Authorization: CONFIG.apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ name })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Error creating task from template: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const taskData = await response.json();

        const responseLines = [
          `Task created successfully from template!`,
          `task_id: ${taskData.id}`,
          `name: ${taskData.name}`,
          `list: ${taskData.list?.name || 'Unknown'} (list_id: ${list_id})`,
          `status: ${taskData.status?.status || 'Unknown'}`,
        ];

        return {
          content: [
            {
              type: "text" as const,
              text: responseLines.join("\n")
            }
          ],
        };

      } catch (error) {
        console.error('Error creating task from template:', error);
        return {
          content: [
            {
              type: "text",
              text: `Error creating task from template: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    "createListFromTemplateInSpace",
    "Creates a new list directly in a space (not in a folder) from a list template. Use getListTemplates to discover available template IDs.",
    {
      template_id: z.string().min(1).describe("The list template ID to use (from getListTemplates)"),
      space_id: z.string().min(1).describe("The space ID where the new list will be created"),
      name: z.string().min(1).describe("Name for the new list")
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
    },
    async ({ template_id, space_id, name }) => {
      try {
        const response = await fetch(`https://api.clickup.com/api/v2/space/${space_id}/list_template/${template_id}`, {
          method: 'POST',
          headers: {
            Authorization: CONFIG.apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ name })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Error creating list from template in space: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const listData = await response.json();

        const responseLines = [
          `List created successfully from template in space!`,
          `list_id: ${listData.id}`,
          `list_url: ${generateListUrl(listData.id)}`,
          `name: ${listData.name}`,
          `space: ${listData.space?.name || 'Unknown'} (space_id: ${space_id})`,
          `space_url: ${generateSpaceUrl(space_id)}`,
        ];

        if (listData.statuses && Array.isArray(listData.statuses)) {
          responseLines.push(`statuses: ${listData.statuses.map((s: any) => s.status).join(', ')}`);
        }

        return {
          content: [
            {
              type: "text" as const,
              text: responseLines.join("\n")
            }
          ],
        };

      } catch (error) {
        console.error('Error creating list from template in space:', error);
        return {
          content: [
            {
              type: "text",
              text: `Error creating list from template in space: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    "createFolderFromTemplate",
    [
      "Creates a new folder in a space from a folder template.",
      "The new folder will inherit the template's structure including lists and their configurations.",
      "Use getFolderTemplates first to discover available template IDs.",
      "Use searchSpaces to find space IDs where you want to create the folder."
    ].join("\n"),
    {
      template_id: z.string().min(1).describe("The folder template ID to use (from getFolderTemplates)"),
      space_id: z.string().min(1).describe("The space ID where the new folder will be created"),
      name: z.string().min(1).describe("Name for the new folder")
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
    },
    async ({ template_id, space_id, name }) => {
      try {
        const response = await fetch(`https://api.clickup.com/api/v2/space/${space_id}/folder_template/${template_id}`, {
          method: 'POST',
          headers: {
            Authorization: CONFIG.apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ name })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Error creating folder from template: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const folderData = await response.json();

        const responseLines = [
          `Folder created successfully from template!`,
          `folder_id: ${folderData.id}`,
          `name: ${folderData.name}`,
          `space: ${folderData.space?.name || 'Unknown'} (${space_id})`,
          `space_url: ${generateSpaceUrl(space_id)}`,
        ];

        if (folderData.lists && Array.isArray(folderData.lists)) {
          responseLines.push(`lists_created: ${folderData.lists.length}`);
          folderData.lists.forEach((list: any) => {
            responseLines.push(`  - ${list.name} (${list.id})`);
          });
        }

        return {
          content: [
            {
              type: "text" as const,
              text: responseLines.join("\n")
            }
          ],
        };

      } catch (error) {
        console.error('Error creating folder from template:', error);
        return {
          content: [
            {
              type: "text",
              text: `Error creating folder from template: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );
}
