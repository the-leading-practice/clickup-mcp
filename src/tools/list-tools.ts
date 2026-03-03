import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CONFIG } from "../shared/config";
import { generateListUrl, generateSpaceUrl, generateFolderUrl, generateTaskUrl } from "../shared/utils";

export function registerListToolsRead(server: McpServer) {
  // getLists - Get lists in a folder
  server.tool(
    "getLists",
    [
      "Get all lists in a folder.",
      "Returns list names, IDs, task counts, and statuses.",
      "Use this to explore lists within a specific folder.",
      "For folderless lists (directly in a space), use getFolderlessLists instead."
    ].join("\n"),
    {
      folder_id: z.string().min(1).describe("The folder ID to get lists from"),
      archived: z.boolean().optional().describe("Include archived lists (default: false)")
    },
    {
      readOnlyHint: true
    },
    async ({ folder_id, archived = false }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/folder/${folder_id}/list?archived=${archived}`,
          { headers: { Authorization: CONFIG.apiKey } }
        );

        if (!response.ok) {
          throw new Error(`Error fetching lists: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const lists = data.lists || [];

        if (lists.length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: `No lists found in folder ${folder_id}${archived ? ' (including archived)' : ''}.`
            }]
          };
        }

        const lines: string[] = [
          `Found ${lists.length} list(s) in folder:`,
          ''
        ];

        lists.forEach((list: any) => {
          const listInfo = [
            list.task_count ? `${list.task_count} tasks` : '',
            list.archived ? 'archived' : ''
          ].filter(Boolean).join(', ');

          lines.push(`📝 ${list.name} (list_id: ${list.id}${listInfo ? `, ${listInfo}` : ''})`);
          lines.push(`   URL: ${generateListUrl(list.id)}`);

          if (list.statuses && list.statuses.length > 0) {
            const statusNames = list.statuses.map((s: any) => s.status).join(', ');
            lines.push(`   Statuses: ${statusNames}`);
          }
        });

        return {
          content: [{
            type: "text" as const,
            text: lines.join('\n')
          }]
        };

      } catch (error) {
        console.error('Error getting lists:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error getting lists: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  // getFolderlessLists - Get lists directly in a space (not in any folder)
  server.tool(
    "getFolderlessLists",
    [
      "Get all folderless lists in a space (lists not inside any folder).",
      "Returns list names, IDs, task counts, and statuses.",
      "These are lists created directly in the space without being organized into folders.",
      "For lists inside folders, use getLists with the folder_id."
    ].join("\n"),
    {
      space_id: z.string().min(1).describe("The space ID to get folderless lists from"),
      archived: z.boolean().optional().describe("Include archived lists (default: false)")
    },
    {
      readOnlyHint: true
    },
    async ({ space_id, archived = false }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/space/${space_id}/list?archived=${archived}`,
          { headers: { Authorization: CONFIG.apiKey } }
        );

        if (!response.ok) {
          throw new Error(`Error fetching folderless lists: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const lists = data.lists || [];

        if (lists.length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: `No folderless lists found in space ${space_id}${archived ? ' (including archived)' : ''}. Lists may be organized into folders - use getFolders to explore.`
            }]
          };
        }

        const lines: string[] = [
          `Found ${lists.length} folderless list(s) in space:`,
          ''
        ];

        lists.forEach((list: any) => {
          const listInfo = [
            list.task_count ? `${list.task_count} tasks` : '',
            list.archived ? 'archived' : ''
          ].filter(Boolean).join(', ');

          lines.push(`📝 ${list.name} (list_id: ${list.id}${listInfo ? `, ${listInfo}` : ''})`);
          lines.push(`   URL: ${generateListUrl(list.id)}`);

          if (list.statuses && list.statuses.length > 0) {
            const statusNames = list.statuses.map((s: any) => s.status).join(', ');
            lines.push(`   Statuses: ${statusNames}`);
          }
        });

        return {
          content: [{
            type: "text" as const,
            text: lines.join('\n')
          }]
        };

      } catch (error) {
        console.error('Error getting folderless lists:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error getting folderless lists: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  // getListInfo - existing tool
  server.tool(
    "getListInfo",
    [
      "Gets comprehensive information about a list including description and available statuses.",
      "ALWAYS use the list URL (https://app.clickup.com/v/l/LIST_ID) when referencing lists.",
      "Use this before creating tasks to understand the list context and available statuses for new tasks.",
      "IMPORTANT: The list description often contains valuable project context, requirements, or guidelines - read and consider this information when creating or updating tasks in this list.",
      "Share the clickable list URL when suggesting list-related actions."
    ].join("\n"),
    {
      list_id: z.string().min(1).describe("The list ID to get information for")
    },
    {
      readOnlyHint: true
    },
    async ({ list_id }) => {
      try {
        // Get list details including statuses (try to get markdown content)
        const listResponse = await fetch(`https://api.clickup.com/api/v2/list/${list_id}?include_markdown_description=true`, {
          headers: { Authorization: CONFIG.apiKey },
        });

        if (!listResponse.ok) {
          throw new Error(`Error fetching list details: ${listResponse.status} ${listResponse.statusText}`);
        }

        const listData = await listResponse.json();

        // Fetch space tags in parallel (don't let this fail the main request)
        let spaceTags: any[] = [];
        if (listData.space?.id) {
          try {
            const spaceTagsResponse = await fetch(`https://api.clickup.com/api/v2/space/${listData.space.id}/tag`, {
              headers: { Authorization: CONFIG.apiKey },
            });
            if (spaceTagsResponse.ok) {
              const spaceTagsData = await spaceTagsResponse.json();
              spaceTags = spaceTagsData.tags || [];
            }
          } catch (error) {
            console.error(`Error fetching space tags for space ${listData.space.id}:`, error);
          }
        }

        const responseLines = [
          `List Information:`,
          `list_id: ${list_id}`,
          `list_url: ${generateListUrl(list_id)}`,
          `name: ${listData.name}`,
          `folder: ${listData.folder?.name || 'No folder'}`,
          `space: ${listData.space?.name || 'Unknown'} (${listData.space?.id || 'N/A'})`,
          `space_url: ${generateSpaceUrl(listData.space?.id || '')}`,
          `archived: ${listData.archived || false}`,
          `task_count: ${listData.task_count || 0}`,
        ];

        // Add description if available (check both content and markdown fields)
        const description = listData.markdown_description || listData.markdown_content || listData.content;
        if (description) {
          responseLines.push(`description: ${description}`);
        }

        // Add available statuses
        if (listData.statuses && Array.isArray(listData.statuses)) {
          const statuses = listData.statuses.map((status: any) => ({
            name: status.status,
            color: status.color || 'none',
            type: status.type || 'custom'
          }));

          responseLines.push(`Available statuses (${statuses.length} total):`);

          statuses.forEach((status: any) => {
            responseLines.push(`  - ${status.name} (${status.type})`);
          });

          responseLines.push(`Valid status names for createTask/updateTask: ${statuses.map((s: any) => s.name).join(', ')}`);
        } else {
          responseLines.push('No statuses found for this list.');
        }

        // Add space tags information
        if (spaceTags.length > 0) {
          const tagNames = spaceTags.map((tag: any) => tag.name).filter(Boolean).sort();
          if (tagNames.length > 0) {
            responseLines.push(`Available tags in space (shared across all lists): ${tagNames.join(', ')}`);
          }
        } else if (listData.space?.id) {
          responseLines.push('No tags found in this space.');
        }

        return {
          content: [
            {
              type: "text" as const,
              text: responseLines.join('\n')
            }
          ],
        };

      } catch (error) {
        console.error('Error getting list info:', error);
        return {
          content: [
            {
              type: "text",
              text: `Error getting list info: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );
}

export function registerListToolsWrite(server: McpServer) {
  // createList - Create a list in a folder
  server.tool(
    "createList",
    [
      "Create a new list in a folder.",
      "Lists contain tasks and have their own statuses.",
      "Use getFolder first to find the folder_id where you want to create the list.",
      "For lists directly in a space (not in a folder), use createFolderlessList instead."
    ].join("\n"),
    {
      folder_id: z.string().min(1).describe("The folder ID to create the list in"),
      name: z.string().min(1).describe("Name for the new list"),
      content: z.string().optional().describe("Optional description/content for the list (markdown supported)"),
      due_date: z.string().optional().describe("Optional due date for the list (Unix timestamp in milliseconds)"),
      priority: z.number().optional().describe("Optional priority (1=urgent, 2=high, 3=normal, 4=low)"),
      status: z.string().optional().describe("Optional default status for tasks")
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false
    },
    async ({ folder_id, name, content, due_date, priority, status }) => {
      try {
        const body: any = { name };
        if (content) body.content = content;
        if (due_date) body.due_date = due_date;
        if (priority) body.priority = priority;
        if (status) body.status = status;

        const response = await fetch(
          `https://api.clickup.com/api/v2/folder/${folder_id}/list`,
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
          throw new Error(`Error creating list: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const list = await response.json();

        return {
          content: [{
            type: "text" as const,
            text: [
              `List created successfully!`,
              `list_id: ${list.id}`,
              `name: ${list.name}`,
              `url: ${generateListUrl(list.id)}`,
              `folder_id: ${folder_id}`,
              ``,
              `You can now create tasks in this list using createTask with list_id: ${list.id}`
            ].join('\n')
          }]
        };

      } catch (error) {
        console.error('Error creating list:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error creating list: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  // createFolderlessList - Create a list directly in a space
  server.tool(
    "createFolderlessList",
    [
      "Create a new folderless list directly in a space.",
      "Folderless lists exist at the space level without being in a folder.",
      "Use getSpaces or searchSpaces first to find the space_id.",
      "For lists inside folders, use createList instead."
    ].join("\n"),
    {
      space_id: z.string().min(1).describe("The space ID to create the list in"),
      name: z.string().min(1).describe("Name for the new list"),
      content: z.string().optional().describe("Optional description/content for the list (markdown supported)"),
      due_date: z.string().optional().describe("Optional due date for the list (Unix timestamp in milliseconds)"),
      priority: z.number().optional().describe("Optional priority (1=urgent, 2=high, 3=normal, 4=low)"),
      status: z.string().optional().describe("Optional default status for tasks")
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false
    },
    async ({ space_id, name, content, due_date, priority, status }) => {
      try {
        const body: any = { name };
        if (content) body.content = content;
        if (due_date) body.due_date = due_date;
        if (priority) body.priority = priority;
        if (status) body.status = status;

        const response = await fetch(
          `https://api.clickup.com/api/v2/space/${space_id}/list`,
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
          throw new Error(`Error creating folderless list: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const list = await response.json();

        return {
          content: [{
            type: "text" as const,
            text: [
              `Folderless list created successfully!`,
              `list_id: ${list.id}`,
              `name: ${list.name}`,
              `url: ${generateListUrl(list.id)}`,
              `space_id: ${space_id}`,
              ``,
              `You can now create tasks in this list using createTask with list_id: ${list.id}`
            ].join('\n')
          }]
        };

      } catch (error) {
        console.error('Error creating folderless list:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error creating folderless list: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  // addTaskToList - Add a task to an additional list
  server.tool(
    "addTaskToList",
    [
      "Add an existing task to an additional list.",
      "Tasks can exist in multiple lists simultaneously.",
      "The task will appear in both its original list and the new list.",
      "Use this for cross-functional tasks that belong in multiple project lists."
    ].join("\n"),
    {
      task_id: z.string().min(6).max(9).describe("The task ID to add to the list"),
      list_id: z.string().min(1).describe("The list ID to add the task to")
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true
    },
    async ({ task_id, list_id }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/list/${list_id}/task/${task_id}`,
          {
            method: 'POST',
            headers: { Authorization: CONFIG.apiKey }
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Error adding task to list: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        return {
          content: [{
            type: "text" as const,
            text: [
              `Task added to list successfully!`,
              `task_id: ${task_id}`,
              `task_url: ${generateTaskUrl(task_id)}`,
              `list_id: ${list_id}`,
              `list_url: ${generateListUrl(list_id)}`,
              ``,
              `The task now appears in this list in addition to its original location.`
            ].join('\n')
          }]
        };

      } catch (error) {
        console.error('Error adding task to list:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error adding task to list: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  // removeTaskFromList - Remove a task from a list
  server.tool(
    "removeTaskFromList",
    [
      "Remove a task from a specific list.",
      "If the task exists in multiple lists, it will be removed only from the specified list.",
      "The task will remain in its other lists.",
      "WARNING: If the task is only in one list, this will delete the task. Use with caution."
    ].join("\n"),
    {
      task_id: z.string().min(6).max(9).describe("The task ID to remove from the list"),
      list_id: z.string().min(1).describe("The list ID to remove the task from")
    },
    {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true
    },
    async ({ task_id, list_id }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/list/${list_id}/task/${task_id}`,
          {
            method: 'DELETE',
            headers: { Authorization: CONFIG.apiKey }
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Error removing task from list: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        return {
          content: [{
            type: "text" as const,
            text: [
              `Task removed from list successfully!`,
              `task_id: ${task_id}`,
              `list_id: ${list_id}`,
              ``,
              `The task has been removed from this list. If it exists in other lists, it remains there.`
            ].join('\n')
          }]
        };

      } catch (error) {
        console.error('Error removing task from list:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error removing task from list: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  // updateListInfo - existing tool
  server.tool(
    "updateListInfo",
    [
      "Appends documentation or context to a list's description.",
      "ALWAYS reference the list URL (https://app.clickup.com/v/l/LIST_ID) when updating or discussing lists.",
      "SAFETY FEATURE: Description updates are APPEND-ONLY to prevent data loss - existing content is preserved.",
      "Use this to add project context, requirements, or guidelines that LLMs should consider when working with tasks in this list.",
      "Include links to related tasks, spaces, or external resources in the appended content.",
      "Content is appended in markdown format with timestamp for tracking changes."
    ].join("\n"),
    {
      list_id: z.string().min(1).describe("The list ID to update"),
      append_description: z.string().min(1).describe("Markdown content to APPEND to existing list description (preserves existing content for safety)")
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
    },
    async ({ list_id, append_description }) => {
      try {
        // Get current list info including description (try to get markdown content)
        const listResponse = await fetch(`https://api.clickup.com/api/v2/list/${list_id}?include_markdown_description=true`, {
          headers: { Authorization: CONFIG.apiKey },
        });

        if (!listResponse.ok) {
          throw new Error(`Error fetching list: ${listResponse.status} ${listResponse.statusText}`);
        }

        const listData = await listResponse.json();

        // Handle append-only description update with markdown support
        const currentDescription = listData.markdown_description || listData.markdown_content || listData.content || "";
        const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        const separator = currentDescription.trim() ? "\n\n---\n" : "";
        const finalDescription = currentDescription + separator + `**Edit (${timestamp}):** ${append_description}`;

        // Update the list description using markdown_content
        const updateResponse = await fetch(`https://api.clickup.com/api/v2/list/${list_id}`, {
          method: 'PUT',
          headers: {
            Authorization: CONFIG.apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            markdown_content: finalDescription
          })
        });

        if (!updateResponse.ok) {
          const errorData = await updateResponse.json().catch(() => ({}));
          throw new Error(`Error updating list: ${updateResponse.status} ${updateResponse.statusText} - ${JSON.stringify(errorData)}`);
        }

        return {
          content: [
            {
              type: "text",
              text: `Successfully appended content to list "${listData.name}". The new content has been added with timestamp (${timestamp}) while preserving existing description.`,
            },
          ],
        };

      } catch (error) {
        console.error('Error updating list info:', error);
        return {
          content: [
            {
              type: "text",
              text: `Error updating list info: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    "deleteList",
    [
      "Moves a list to the trash in ClickUp (soft delete).",
      "WARNING: This is a DESTRUCTIVE operation. The list and all its tasks will be moved to trash.",
      "CRITICAL: You MUST obtain explicit user approval before calling this tool.",
      "Before deletion:",
      "1. Use getListInfo to retrieve and show the list details to the user",
      "2. Clearly present the list name, ID, URL, and task count to the user",
      "3. Warn the user that ALL tasks in this list will also be moved to trash",
      "4. Ask the user to explicitly confirm deletion with a clear yes/no question",
      "5. Only proceed with deletion after receiving explicit confirmation",
      "The list can be restored from trash in ClickUp.",
      "ALWAYS verify the list_id and get user approval before deletion."
    ].join("\n"),
    {
      list_id: z.string().min(1).describe("The list ID to delete (move to trash)"),
      user_confirmed: z.boolean().describe("REQUIRED: Must be true, indicating explicit user confirmation was obtained before calling this tool")
    },
    {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
    },
    async ({ list_id, user_confirmed }) => {
      try {
        // Enforce user confirmation requirement
        if (!user_confirmed) {
          return {
            content: [
              {
                type: "text",
                text: "Error: User confirmation required before deleting lists. You must obtain explicit user approval and set user_confirmed=true before calling this tool."
              }
            ],
          };
        }

        // First, get the list details to confirm it exists and show what's being deleted
        const listResponse = await fetch(`https://api.clickup.com/api/v2/list/${list_id}`, {
          headers: { Authorization: CONFIG.apiKey },
        });

        if (!listResponse.ok) {
          throw new Error(`Error fetching list before deletion: ${listResponse.status} ${listResponse.statusText}`);
        }

        const listData = await listResponse.json();
        const listName = listData.name;
        const listUrl = generateListUrl(list_id);
        const taskCount = listData.task_count || 0;

        // Delete the list (moves to trash)
        const deleteResponse = await fetch(`https://api.clickup.com/api/v2/list/${list_id}`, {
          method: 'DELETE',
          headers: { Authorization: CONFIG.apiKey }
        });

        if (!deleteResponse.ok) {
          const errorData = await deleteResponse.json().catch(() => ({}));
          throw new Error(`Error deleting list: ${deleteResponse.status} ${deleteResponse.statusText} - ${JSON.stringify(errorData)}`);
        }

        return {
          content: [
            {
              type: "text",
              text: [
                `List moved to trash successfully!`,
                `list_id: ${list_id}`,
                `list_name: ${listName}`,
                `previous_url: ${listUrl}`,
                `tasks_affected: ${taskCount}`,
                `The list and all ${taskCount} task(s) have been moved to trash and can be restored from the ClickUp trash if needed.`
              ].join('\n')
            }
          ],
        };

      } catch (error) {
        console.error('Error deleting list:', error);
        return {
          content: [
            {
              type: "text",
              text: `Error deleting list: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );
}