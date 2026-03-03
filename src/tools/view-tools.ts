import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CONFIG } from "../shared/config";
import { generateTaskUrl } from "../shared/utils";

export function registerViewToolsRead(server: McpServer) {
  server.tool(
    "getWorkspaceViews",
    [
      "Get all views at the workspace level.",
      "Returns shared views visible across the entire workspace.",
      "Views can be List, Board, Calendar, Gantt, Timeline, Table, etc."
    ].join("\n"),
    {},
    {
      readOnlyHint: true
    },
    async () => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/team/${CONFIG.teamId}/view`,
          {
            headers: { Authorization: CONFIG.apiKey }
          }
        );

        if (!response.ok) {
          throw new Error(`Error fetching workspace views: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const views = data.views || [];

        if (views.length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: `No views found at workspace level.`
            }]
          };
        }

        const lines: string[] = [
          `Found ${views.length} workspace view(s):`,
          ''
        ];

        views.forEach((view: any) => {
          lines.push(`📊 ${view.name} (view_id: ${view.id})`);
          lines.push(`   Type: ${view.type}`);
          if (view.visibility) lines.push(`   Visibility: ${view.visibility}`);
          if (view.creator) lines.push(`   Creator: ${view.creator.username || view.creator.email}`);
          lines.push('');
        });

        return {
          content: [{
            type: "text" as const,
            text: lines.join('\n')
          }]
        };

      } catch (error) {
        console.error('Error getting workspace views:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error getting workspace views: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "getSpaceViews",
    [
      "Get all views in a specific space.",
      "Returns views defined at the space level.",
      "Use searchSpaces to find available space IDs."
    ].join("\n"),
    {
      space_id: z.string().min(1).describe("The space ID to get views for")
    },
    {
      readOnlyHint: true
    },
    async ({ space_id }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/space/${space_id}/view`,
          {
            headers: { Authorization: CONFIG.apiKey }
          }
        );

        if (!response.ok) {
          throw new Error(`Error fetching space views: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const views = data.views || [];

        if (views.length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: `No views found in space ${space_id}.`
            }]
          };
        }

        const lines: string[] = [
          `Found ${views.length} view(s) in space ${space_id}:`,
          ''
        ];

        views.forEach((view: any) => {
          lines.push(`📊 ${view.name} (view_id: ${view.id})`);
          lines.push(`   Type: ${view.type}`);
          if (view.visibility) lines.push(`   Visibility: ${view.visibility}`);
          lines.push('');
        });

        return {
          content: [{
            type: "text" as const,
            text: lines.join('\n')
          }]
        };

      } catch (error) {
        console.error('Error getting space views:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error getting space views: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "getFolderViews",
    [
      "Get all views in a specific folder.",
      "Returns views defined at the folder level.",
      "Use getFolders to find available folder IDs."
    ].join("\n"),
    {
      folder_id: z.string().min(1).describe("The folder ID to get views for")
    },
    {
      readOnlyHint: true
    },
    async ({ folder_id }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/folder/${folder_id}/view`,
          {
            headers: { Authorization: CONFIG.apiKey }
          }
        );

        if (!response.ok) {
          throw new Error(`Error fetching folder views: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const views = data.views || [];

        if (views.length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: `No views found in folder ${folder_id}.`
            }]
          };
        }

        const lines: string[] = [
          `Found ${views.length} view(s) in folder ${folder_id}:`,
          ''
        ];

        views.forEach((view: any) => {
          lines.push(`📊 ${view.name} (view_id: ${view.id})`);
          lines.push(`   Type: ${view.type}`);
          if (view.visibility) lines.push(`   Visibility: ${view.visibility}`);
          lines.push('');
        });

        return {
          content: [{
            type: "text" as const,
            text: lines.join('\n')
          }]
        };

      } catch (error) {
        console.error('Error getting folder views:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error getting folder views: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "getListViews",
    [
      "Get all views in a specific list.",
      "Returns views defined at the list level.",
      "Use getListInfo to find available list IDs."
    ].join("\n"),
    {
      list_id: z.string().min(1).describe("The list ID to get views for")
    },
    {
      readOnlyHint: true
    },
    async ({ list_id }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/list/${list_id}/view`,
          {
            headers: { Authorization: CONFIG.apiKey }
          }
        );

        if (!response.ok) {
          throw new Error(`Error fetching list views: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const views = data.views || [];

        if (views.length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: `No views found in list ${list_id}.`
            }]
          };
        }

        const lines: string[] = [
          `Found ${views.length} view(s) in list ${list_id}:`,
          ''
        ];

        views.forEach((view: any) => {
          lines.push(`📊 ${view.name} (view_id: ${view.id})`);
          lines.push(`   Type: ${view.type}`);
          if (view.visibility) lines.push(`   Visibility: ${view.visibility}`);
          lines.push('');
        });

        return {
          content: [{
            type: "text" as const,
            text: lines.join('\n')
          }]
        };

      } catch (error) {
        console.error('Error getting list views:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error getting list views: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "getView",
    [
      "Get detailed information about a specific view.",
      "Returns view configuration, filters, and settings.",
      "Use getListViews, getFolderViews, or getSpaceViews to find view IDs."
    ].join("\n"),
    {
      view_id: z.string().min(1).describe("The view ID to get details for")
    },
    {
      readOnlyHint: true
    },
    async ({ view_id }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/view/${view_id}`,
          {
            headers: { Authorization: CONFIG.apiKey }
          }
        );

        if (!response.ok) {
          throw new Error(`Error fetching view: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const view = data.view;

        if (!view) {
          return {
            content: [{
              type: "text" as const,
              text: `View ${view_id} not found.`
            }]
          };
        }

        const lines: string[] = [
          `View Details:`,
          `name: ${view.name}`,
          `view_id: ${view.id}`,
          `type: ${view.type}`,
          view.visibility ? `visibility: ${view.visibility}` : '',
          view.protected ? `protected: ${view.protected}` : '',
          view.date_created ? `created: ${new Date(parseInt(view.date_created)).toLocaleString()}` : '',
          view.creator ? `creator: ${view.creator.username || view.creator.email}` : '',
          ''
        ].filter(Boolean);

        // Add filter info if present
        if (view.filters?.filters && view.filters.filters.length > 0) {
          lines.push(`Filters: ${view.filters.filters.length} filter(s) applied`);
        }

        // Add sorting info if present
        if (view.sorting?.fields && view.sorting.fields.length > 0) {
          lines.push(`Sorting: ${view.sorting.fields.length} sort field(s)`);
        }

        // Add grouping info if present
        if (view.grouping?.field) {
          lines.push(`Grouped by: ${view.grouping.field}`);
        }

        return {
          content: [{
            type: "text" as const,
            text: lines.join('\n')
          }]
        };

      } catch (error) {
        console.error('Error getting view:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error getting view: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "getViewTasks",
    [
      "Get tasks visible in a specific view.",
      "Returns tasks filtered and sorted according to the view settings.",
      "Useful for getting tasks that match specific view criteria.",
      "Note: Limited to 100 tasks per page."
    ].join("\n"),
    {
      view_id: z.string().min(1).describe("The view ID to get tasks from"),
      page: z.number().optional().describe("Page number for pagination (default: 0)")
    },
    {
      readOnlyHint: true
    },
    async ({ view_id, page }) => {
      try {
        const params = new URLSearchParams();
        if (page !== undefined) params.append('page', page.toString());

        const url = `https://api.clickup.com/api/v2/view/${view_id}/task${params.toString() ? '?' + params.toString() : ''}`;
        const response = await fetch(url, {
          headers: { Authorization: CONFIG.apiKey }
        });

        if (!response.ok) {
          throw new Error(`Error fetching view tasks: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const tasks = data.tasks || [];

        if (tasks.length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: `No tasks found in view ${view_id}${page ? ` (page ${page})` : ''}.`
            }]
          };
        }

        const lines: string[] = [
          `Found ${tasks.length} task(s) in view ${view_id}${page ? ` (page ${page})` : ''}:`,
          data.last_page !== undefined ? `Last page: ${data.last_page}` : '',
          ''
        ].filter(Boolean);

        tasks.forEach((task: any) => {
          const status = task.status?.status || 'unknown';
          const priority = task.priority?.priority || 'none';
          lines.push(`📋 ${task.name} (task_id: ${task.id})`);
          lines.push(`   Status: ${status} | Priority: ${priority}`);
          lines.push(`   URL: ${generateTaskUrl(task.id)}`);
          if (task.due_date) {
            lines.push(`   Due: ${new Date(parseInt(task.due_date)).toLocaleDateString()}`);
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
        console.error('Error getting view tasks:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error getting view tasks: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );
}

export function registerViewToolsWrite(server: McpServer) {
  server.tool(
    "createWorkspaceView",
    [
      "Create a view at the workspace (Everything) level.",
      "This creates a top-level view visible across the entire workspace."
    ].join("\n"),
    {
      name: z.string().min(1).describe("Name for the view"),
      type: z.enum(['list', 'board', 'calendar', 'gantt', 'table', 'timeline', 'workload', 'map', 'activity'])
        .describe("Type of view to create"),
      grouping: z.object({
        field: z.string(),
        dir: z.number().optional(),
        collapsed: z.array(z.string()).optional()
      }).optional().describe("Grouping configuration"),
      sorting: z.object({
        fields: z.array(z.object({ field: z.string(), dir: z.number() }))
      }).optional().describe("Sorting configuration"),
      filters: z.object({
        op: z.string().optional(),
        fields: z.array(z.any()).optional()
      }).optional().describe("Filter configuration")
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false
    },
    async ({ name, type, grouping, sorting, filters }) => {
      try {
        const body: any = { name, type };

        if (grouping) body.grouping = grouping;
        if (sorting) body.sorting = sorting;
        if (filters) body.filters = filters;

        const response = await fetch(
          `https://api.clickup.com/api/v2/team/${CONFIG.teamId}/view`,
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
          throw new Error(`Error creating workspace view: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        const view = data.view;

        return {
          content: [{
            type: "text" as const,
            text: [
              `Workspace view created successfully!`,
              `view_id: ${view?.id || 'unknown'}`,
              `name: ${name}`,
              `type: ${type}`
            ].join('\n')
          }]
        };

      } catch (error) {
        console.error('Error creating workspace view:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error creating workspace view: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "createSpaceView",
    [
      "Create a new view in a space.",
      "View types: list, board, calendar, gantt, timeline, table, mindmap, activity, map, workload.",
      "The view will be visible to users with access to the space."
    ].join("\n"),
    {
      space_id: z.string().min(1).describe("The space ID to create the view in"),
      name: z.string().min(1).describe("Name for the new view"),
      type: z.enum(['list', 'board', 'calendar', 'gantt', 'timeline', 'table', 'mindmap', 'activity', 'map', 'workload'])
        .describe("Type of view to create"),
      grouping_field: z.string().optional().describe("Field to group by (e.g., 'status', 'assignee')"),
      divide_field: z.string().optional().describe("Field to divide/swimlane by"),
      sorting_field: z.string().optional().describe("Field to sort by"),
      sorting_order: z.number().optional().describe("Sort order: 1 for ascending, -1 for descending")
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false
    },
    async ({ space_id, name, type, grouping_field, divide_field, sorting_field, sorting_order }) => {
      try {
        const body: any = { name, type };

        if (grouping_field) {
          body.grouping = { field: grouping_field, dir: 1, collapsed: [], ignore: false };
        }

        if (divide_field) {
          body.divide = { field: divide_field, dir: -1, collapsed: [] };
        }

        if (sorting_field) {
          body.sorting = { fields: [{ field: sorting_field, dir: sorting_order || -1 }] };
        }

        const response = await fetch(
          `https://api.clickup.com/api/v2/space/${space_id}/view`,
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
          throw new Error(`Error creating view: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        const view = data.view;

        return {
          content: [{
            type: "text" as const,
            text: [
              `View created successfully!`,
              `view_id: ${view?.id || 'unknown'}`,
              `name: ${name}`,
              `type: ${type}`,
              `space_id: ${space_id}`
            ].join('\n')
          }]
        };

      } catch (error) {
        console.error('Error creating view:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error creating view: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "createFolderView",
    [
      "Create a new view in a folder.",
      "View types: list, board, calendar, gantt, timeline, table, mindmap, activity, map, workload.",
      "The view will be visible to users with access to the folder."
    ].join("\n"),
    {
      folder_id: z.string().min(1).describe("The folder ID to create the view in"),
      name: z.string().min(1).describe("Name for the new view"),
      type: z.enum(['list', 'board', 'calendar', 'gantt', 'timeline', 'table', 'mindmap', 'activity', 'map', 'workload'])
        .describe("Type of view to create"),
      grouping_field: z.string().optional().describe("Field to group by"),
      sorting_field: z.string().optional().describe("Field to sort by"),
      sorting_order: z.number().optional().describe("Sort order: 1 for ascending, -1 for descending")
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false
    },
    async ({ folder_id, name, type, grouping_field, sorting_field, sorting_order }) => {
      try {
        const body: any = { name, type };

        if (grouping_field) {
          body.grouping = { field: grouping_field, dir: 1, collapsed: [], ignore: false };
        }

        if (sorting_field) {
          body.sorting = { fields: [{ field: sorting_field, dir: sorting_order || -1 }] };
        }

        const response = await fetch(
          `https://api.clickup.com/api/v2/folder/${folder_id}/view`,
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
          throw new Error(`Error creating view: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        const view = data.view;

        return {
          content: [{
            type: "text" as const,
            text: [
              `View created successfully!`,
              `view_id: ${view?.id || 'unknown'}`,
              `name: ${name}`,
              `type: ${type}`,
              `folder_id: ${folder_id}`
            ].join('\n')
          }]
        };

      } catch (error) {
        console.error('Error creating view:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error creating view: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "createListView",
    [
      "Create a new view in a list.",
      "View types: list, board, calendar, gantt, timeline, table, mindmap, activity, map, workload.",
      "The view will be visible to users with access to the list."
    ].join("\n"),
    {
      list_id: z.string().min(1).describe("The list ID to create the view in"),
      name: z.string().min(1).describe("Name for the new view"),
      type: z.enum(['list', 'board', 'calendar', 'gantt', 'timeline', 'table', 'mindmap', 'activity', 'map', 'workload'])
        .describe("Type of view to create"),
      grouping_field: z.string().optional().describe("Field to group by"),
      sorting_field: z.string().optional().describe("Field to sort by"),
      sorting_order: z.number().optional().describe("Sort order: 1 for ascending, -1 for descending")
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false
    },
    async ({ list_id, name, type, grouping_field, sorting_field, sorting_order }) => {
      try {
        const body: any = { name, type };

        if (grouping_field) {
          body.grouping = { field: grouping_field, dir: 1, collapsed: [], ignore: false };
        }

        if (sorting_field) {
          body.sorting = { fields: [{ field: sorting_field, dir: sorting_order || -1 }] };
        }

        const response = await fetch(
          `https://api.clickup.com/api/v2/list/${list_id}/view`,
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
          throw new Error(`Error creating view: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        const view = data.view;

        return {
          content: [{
            type: "text" as const,
            text: [
              `View created successfully!`,
              `view_id: ${view?.id || 'unknown'}`,
              `name: ${name}`,
              `type: ${type}`,
              `list_id: ${list_id}`
            ].join('\n')
          }]
        };

      } catch (error) {
        console.error('Error creating view:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error creating view: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "updateView",
    [
      "Update an existing view's settings.",
      "Can modify name, grouping, sorting, and other view configuration.",
      "Use getView first to see current settings."
    ].join("\n"),
    {
      view_id: z.string().min(1).describe("The view ID to update"),
      name: z.string().optional().describe("New name for the view"),
      grouping_field: z.string().optional().describe("New grouping field"),
      sorting_field: z.string().optional().describe("New sorting field"),
      sorting_order: z.number().optional().describe("Sort order: 1 for ascending, -1 for descending")
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true
    },
    async ({ view_id, name, grouping_field, sorting_field, sorting_order }) => {
      try {
        const body: any = {};

        if (name) body.name = name;

        if (grouping_field) {
          body.grouping = { field: grouping_field, dir: 1, collapsed: [], ignore: false };
        }

        if (sorting_field) {
          body.sorting = { fields: [{ field: sorting_field, dir: sorting_order || -1 }] };
        }

        if (Object.keys(body).length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: "No updates specified. Please provide at least one field to update."
            }]
          };
        }

        const response = await fetch(
          `https://api.clickup.com/api/v2/view/${view_id}`,
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
          throw new Error(`Error updating view: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        return {
          content: [{
            type: "text" as const,
            text: [
              `View updated successfully!`,
              `view_id: ${view_id}`,
              name ? `name: ${name}` : ''
            ].filter(Boolean).join('\n')
          }]
        };

      } catch (error) {
        console.error('Error updating view:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error updating view: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "deleteView",
    [
      "Delete a view permanently.",
      "WARNING: This action cannot be undone.",
      "Use getView first to verify the view before deletion."
    ].join("\n"),
    {
      view_id: z.string().min(1).describe("The view ID to delete")
    },
    {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false
    },
    async ({ view_id }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/view/${view_id}`,
          {
            method: 'DELETE',
            headers: { Authorization: CONFIG.apiKey }
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Error deleting view: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        return {
          content: [{
            type: "text" as const,
            text: `View ${view_id} deleted successfully.`
          }]
        };

      } catch (error) {
        console.error('Error deleting view:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error deleting view: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );
}
