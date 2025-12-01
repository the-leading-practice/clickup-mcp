import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CONFIG } from "../shared/config";
import { generateListUrl, generateSpaceUrl } from "../shared/utils";

export function registerListToolsRead(server: McpServer) {
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