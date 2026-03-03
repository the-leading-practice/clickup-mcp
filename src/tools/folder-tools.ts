import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CONFIG } from "../shared/config";
import { generateFolderUrl, generateSpaceUrl, generateListUrl } from "../shared/utils";

export function registerFolderToolsRead(server: McpServer) {
  server.tool(
    "getFolders",
    [
      "Get all folders in a space.",
      "Returns folder names, IDs, and the lists contained within each folder.",
      "Use this to explore the structure of a space before creating lists or tasks.",
      "Always reference folders by their URLs when discussing or suggesting actions."
    ].join("\n"),
    {
      space_id: z.string().min(1).describe("The space ID to get folders from"),
      archived: z.boolean().optional().describe("Include archived folders (default: false)")
    },
    {
      readOnlyHint: true
    },
    async ({ space_id, archived = false }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/space/${space_id}/folder?archived=${archived}`,
          { headers: { Authorization: CONFIG.apiKey } }
        );

        if (!response.ok) {
          throw new Error(`Error fetching folders: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const folders = data.folders || [];

        if (folders.length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: `No folders found in space ${space_id}${archived ? ' (including archived)' : ''}.`
            }]
          };
        }

        // Fetch lists for each folder in parallel
        const foldersWithLists = await Promise.all(
          folders.map(async (folder: any) => {
            try {
              const listResponse = await fetch(
                `https://api.clickup.com/api/v2/folder/${folder.id}/list`,
                { headers: { Authorization: CONFIG.apiKey } }
              );
              if (listResponse.ok) {
                const listData = await listResponse.json();
                folder.lists = listData.lists || [];
              } else {
                folder.lists = [];
              }
            } catch (error) {
              folder.lists = [];
            }
            return folder;
          })
        );

        const lines: string[] = [
          `Found ${folders.length} folder(s) in space ${space_id}:`,
          ''
        ];

        foldersWithLists.forEach((folder: any) => {
          const folderInfo = [
            folder.archived ? 'archived' : '',
            folder.hidden ? 'hidden' : '',
            folder.override_statuses ? 'custom statuses' : ''
          ].filter(Boolean).join(', ');

          lines.push(`📂 ${folder.name} (folder_id: ${folder.id}${folderInfo ? `, ${folderInfo}` : ''})`);
          lines.push(`   URL: ${generateFolderUrl(folder.id)}`);

          if (folder.lists && folder.lists.length > 0) {
            lines.push(`   Lists (${folder.lists.length}):`);
            folder.lists.forEach((list: any) => {
              const listInfo = [
                list.task_count ? `${list.task_count} tasks` : '',
                list.archived ? 'archived' : ''
              ].filter(Boolean).join(', ');
              lines.push(`   - ${list.name} (list_id: ${list.id}${listInfo ? `, ${listInfo}` : ''})`);
            });
          } else {
            lines.push(`   No lists in this folder`);
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
        console.error('Error getting folders:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error getting folders: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "getFolder",
    [
      "Get detailed information about a specific folder.",
      "Returns folder name, ID, statuses, and settings.",
      "Use this to understand folder configuration before creating lists or tasks.",
      "Always reference the folder by its URL when discussing."
    ].join("\n"),
    {
      folder_id: z.string().min(1).describe("The folder ID to get details for")
    },
    {
      readOnlyHint: true
    },
    async ({ folder_id }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/folder/${folder_id}`,
          { headers: { Authorization: CONFIG.apiKey } }
        );

        if (!response.ok) {
          throw new Error(`Error fetching folder: ${response.status} ${response.statusText}`);
        }

        const folder = await response.json();

        // Also fetch lists in this folder
        let lists: any[] = [];
        try {
          const listResponse = await fetch(
            `https://api.clickup.com/api/v2/folder/${folder_id}/list`,
            { headers: { Authorization: CONFIG.apiKey } }
          );
          if (listResponse.ok) {
            const listData = await listResponse.json();
            lists = listData.lists || [];
          }
        } catch (error) {
          console.error('Error fetching folder lists:', error);
        }

        const lines: string[] = [
          `Folder Information:`,
          `folder_id: ${folder.id}`,
          `folder_url: ${generateFolderUrl(folder.id)}`,
          `name: ${folder.name}`,
          `space: ${folder.space?.name || 'Unknown'} (space_id: ${folder.space?.id || 'N/A'})`,
          `space_url: ${generateSpaceUrl(folder.space?.id || '')}`,
          `archived: ${folder.archived || false}`,
          `hidden: ${folder.hidden || false}`,
          `override_statuses: ${folder.override_statuses || false}`,
        ];

        // Add statuses if folder has custom statuses
        if (folder.statuses && Array.isArray(folder.statuses) && folder.statuses.length > 0) {
          lines.push(`\nAvailable statuses (${folder.statuses.length} total):`);
          folder.statuses.forEach((status: any) => {
            lines.push(`  - ${status.status} (${status.type || 'custom'})`);
          });
        }

        // Add lists
        if (lists.length > 0) {
          lines.push(`\nLists in this folder (${lists.length}):`);
          lists.forEach((list: any) => {
            const listInfo = [
              list.task_count ? `${list.task_count} tasks` : '',
              list.archived ? 'archived' : ''
            ].filter(Boolean).join(', ');
            lines.push(`  - ${list.name} (list_id: ${list.id}${listInfo ? `, ${listInfo}` : ''}) ${generateListUrl(list.id)}`);
          });
        } else {
          lines.push(`\nNo lists in this folder`);
        }

        return {
          content: [{
            type: "text" as const,
            text: lines.join('\n')
          }]
        };

      } catch (error) {
        console.error('Error getting folder:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error getting folder: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );
}

export function registerFolderToolsWrite(server: McpServer) {
  server.tool(
    "createFolder",
    [
      "Create a new folder in a space.",
      "Folders are used to organize lists within a space.",
      "Returns the new folder's ID and URL.",
      "Use searchSpaces first to find the space_id where you want to create the folder."
    ].join("\n"),
    {
      space_id: z.string().min(1).describe("The space ID to create the folder in"),
      name: z.string().min(1).describe("Name for the new folder")
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false
    },
    async ({ space_id, name }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/space/${space_id}/folder`,
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
          throw new Error(`Error creating folder: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const folder = await response.json();

        return {
          content: [{
            type: "text" as const,
            text: [
              `Folder created successfully!`,
              `folder_id: ${folder.id}`,
              `name: ${folder.name}`,
              `url: ${generateFolderUrl(folder.id)}`,
              `space_id: ${space_id}`,
              ``,
              `You can now create lists in this folder using createList with folder_id: ${folder.id}`
            ].join('\n')
          }]
        };

      } catch (error) {
        console.error('Error creating folder:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error creating folder: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "updateFolder",
    [
      "Update a folder's name or settings.",
      "Can rename the folder or hide/unhide it.",
      "Use getFolder first to see current folder settings."
    ].join("\n"),
    {
      folder_id: z.string().min(1).describe("The folder ID to update"),
      name: z.string().optional().describe("New name for the folder"),
      hidden: z.boolean().optional().describe("Whether to hide the folder")
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true
    },
    async ({ folder_id, name, hidden }) => {
      try {
        const updateBody: any = {};
        if (name !== undefined) updateBody.name = name;
        if (hidden !== undefined) updateBody.hidden = hidden;

        if (Object.keys(updateBody).length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: "No updates specified. Please provide at least one field to update (name or hidden)."
            }]
          };
        }

        const response = await fetch(
          `https://api.clickup.com/api/v2/folder/${folder_id}`,
          {
            method: 'PUT',
            headers: {
              Authorization: CONFIG.apiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateBody)
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Error updating folder: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const folder = await response.json();

        return {
          content: [{
            type: "text" as const,
            text: [
              `Folder updated successfully!`,
              `folder_id: ${folder.id}`,
              `name: ${folder.name}`,
              `hidden: ${folder.hidden || false}`,
              `url: ${generateFolderUrl(folder.id)}`
            ].join('\n')
          }]
        };

      } catch (error) {
        console.error('Error updating folder:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error updating folder: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "deleteFolder",
    [
      "Moves a folder to the trash in ClickUp (soft delete).",
      "WARNING: This is a DESTRUCTIVE operation. The folder and all its lists/tasks will be moved to trash.",
      "CRITICAL: You MUST obtain explicit user approval before calling this tool.",
      "Before deletion:",
      "1. Use getFolder to retrieve and show the folder details to the user",
      "2. Clearly present the folder name, ID, URL, and list count to the user",
      "3. Warn the user that ALL lists and tasks in this folder will also be moved to trash",
      "4. Ask the user to explicitly confirm deletion with a clear yes/no question",
      "5. Only proceed with deletion after receiving explicit confirmation",
      "The folder can be restored from trash in ClickUp.",
      "ALWAYS verify the folder_id and get user approval before deletion."
    ].join("\n"),
    {
      folder_id: z.string().min(1).describe("The folder ID to delete (move to trash)"),
      user_confirmed: z.boolean().describe("REQUIRED: Must be true, indicating explicit user confirmation was obtained before calling this tool")
    },
    {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false
    },
    async ({ folder_id, user_confirmed }) => {
      try {
        // Enforce user confirmation requirement
        if (!user_confirmed) {
          return {
            content: [{
              type: "text" as const,
              text: "Error: User confirmation required before deleting folders. You must obtain explicit user approval and set user_confirmed=true before calling this tool."
            }]
          };
        }

        // First, get the folder details to confirm it exists and show what's being deleted
        const folderResponse = await fetch(
          `https://api.clickup.com/api/v2/folder/${folder_id}`,
          { headers: { Authorization: CONFIG.apiKey } }
        );

        if (!folderResponse.ok) {
          throw new Error(`Error fetching folder before deletion: ${folderResponse.status} ${folderResponse.statusText}`);
        }

        const folderData = await folderResponse.json();
        const folderName = folderData.name;
        const folderUrl = generateFolderUrl(folder_id);

        // Get list count
        let listCount = 0;
        try {
          const listResponse = await fetch(
            `https://api.clickup.com/api/v2/folder/${folder_id}/list`,
            { headers: { Authorization: CONFIG.apiKey } }
          );
          if (listResponse.ok) {
            const listData = await listResponse.json();
            listCount = (listData.lists || []).length;
          }
        } catch (error) {
          console.error('Error fetching list count:', error);
        }

        // Delete the folder (moves to trash)
        const deleteResponse = await fetch(
          `https://api.clickup.com/api/v2/folder/${folder_id}`,
          {
            method: 'DELETE',
            headers: { Authorization: CONFIG.apiKey }
          }
        );

        if (!deleteResponse.ok) {
          const errorData = await deleteResponse.json().catch(() => ({}));
          throw new Error(`Error deleting folder: ${deleteResponse.status} ${deleteResponse.statusText} - ${JSON.stringify(errorData)}`);
        }

        return {
          content: [{
            type: "text" as const,
            text: [
              `Folder moved to trash successfully!`,
              `folder_id: ${folder_id}`,
              `folder_name: ${folderName}`,
              `previous_url: ${folderUrl}`,
              `lists_affected: ${listCount}`,
              `The folder and all ${listCount} list(s) have been moved to trash and can be restored from the ClickUp trash if needed.`
            ].join('\n')
          }]
        };

      } catch (error) {
        console.error('Error deleting folder:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error deleting folder: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );
}
