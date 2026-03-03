import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ContentBlock } from "../shared/types";
import { CONFIG } from "../shared/config";
import { getSpaceSearchIndex, getSpaceContent, performMultiTermSearch, formatSpaceTree, generateSpaceUrl } from "../shared/utils";

export function registerSpaceToolsRead(server: McpServer) {
  // getSpaces - List all spaces in workspace
  server.tool(
    "getSpaces",
    [
      "List all spaces (projects) in the workspace.",
      "Returns space names, IDs, and basic info.",
      "Use this to discover available spaces before working with folders, lists, or tasks.",
      "For detailed space info with lists and folders, use searchSpaces with specific terms."
    ].join("\n"),
    {
      archived: z.boolean().optional().describe("Include archived spaces (default: false)")
    },
    {
      readOnlyHint: true
    },
    async ({ archived = false }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/team/${CONFIG.teamId}/space?archived=${archived}`,
          { headers: { Authorization: CONFIG.apiKey } }
        );

        if (!response.ok) {
          throw new Error(`Error fetching spaces: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const spaces = data.spaces || [];

        if (spaces.length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: `No spaces found in workspace${archived ? ' (including archived)' : ''}.`
            }]
          };
        }

        const lines: string[] = [
          `Found ${spaces.length} space(s) in workspace:`,
          ''
        ];

        spaces.forEach((space: any) => {
          const spaceInfo = [
            space.private ? 'private' : '',
            space.archived ? 'archived' : '',
            space.multiple_assignees ? 'multi-assignees' : ''
          ].filter(Boolean).join(', ');

          lines.push(`🏢 ${space.name} (space_id: ${space.id}${spaceInfo ? `, ${spaceInfo}` : ''})`);
          lines.push(`   URL: ${generateSpaceUrl(space.id)}`);
        });

        return {
          content: [{
            type: "text" as const,
            text: lines.join('\n')
          }]
        };

      } catch (error) {
        console.error('Error getting spaces:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error getting spaces: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  // getSpace - Get detailed space info
  server.tool(
    "getSpace",
    [
      "Get detailed information about a specific space.",
      "Returns space settings, features, and statuses.",
      "Use this to understand space configuration before creating folders or lists."
    ].join("\n"),
    {
      space_id: z.string().min(1).describe("The space ID to get details for")
    },
    {
      readOnlyHint: true
    },
    async ({ space_id }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/space/${space_id}`,
          { headers: { Authorization: CONFIG.apiKey } }
        );

        if (!response.ok) {
          throw new Error(`Error fetching space: ${response.status} ${response.statusText}`);
        }

        const space = await response.json();

        const lines: string[] = [
          `Space Information:`,
          `space_id: ${space.id}`,
          `space_url: ${generateSpaceUrl(space.id)}`,
          `name: ${space.name}`,
          `private: ${space.private || false}`,
          `archived: ${space.archived || false}`,
          `multiple_assignees: ${space.multiple_assignees || false}`,
        ];

        // Features
        if (space.features) {
          lines.push(`\nEnabled Features:`);
          Object.entries(space.features).forEach(([feature, config]: [string, any]) => {
            if (config && config.enabled) {
              lines.push(`  - ${feature}`);
            }
          });
        }

        // Statuses
        if (space.statuses && Array.isArray(space.statuses) && space.statuses.length > 0) {
          lines.push(`\nDefault Statuses (${space.statuses.length} total):`);
          space.statuses.forEach((status: any) => {
            lines.push(`  - ${status.status} (${status.type || 'custom'})`);
          });
        }

        // Members count
        if (space.members && Array.isArray(space.members)) {
          lines.push(`\nMembers: ${space.members.length}`);
        }

        return {
          content: [{
            type: "text" as const,
            text: lines.join('\n')
          }]
        };

      } catch (error) {
        console.error('Error getting space:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error getting space: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  // searchSpaces - existing tool
  server.tool(
    "searchSpaces",
    [
      "Searches spaces (sometimes called projects) by name or ID with fuzzy matching.",
      "If 5 or fewer spaces match, automatically fetches all lists (sometimes called boards) and folders within those spaces to provide a complete tree structure.",
      "If more than 5 spaces match, returns only space information with guidance to search more precisely.",
      "You can search by space name (fuzzy matching) or provide an exact space ID.",
      "Always reference spaces by their URLs when discussing projects or suggesting actions."
    ].join("\n"),
    {
      terms: z
        .array(z.string())
        .optional()
        .describe("Array of search terms to match against space names or IDs. If not provided, returns all spaces."),
      archived: z.boolean().optional().describe("Include archived spaces (default: false)")
    },
    {
      readOnlyHint: true
    },
    async ({ terms, archived = false }) => {
      try {
        const searchIndex = await getSpaceSearchIndex();
        if (!searchIndex) {
          return {
            content: [{ type: "text", text: "Error: Could not build space search index." }],
          };
        }

        let matchingSpaces: any[] = [];

        if (!terms || terms.length === 0) {
          // Return all spaces if no search terms
          matchingSpaces = (searchIndex as any)._docs || [];
        } else {
          // Perform multi-term search with aggressive boosting
          matchingSpaces = await performMultiTermSearch(
            searchIndex,
            terms
            // No ID matcher or direct fetcher for spaces - they don't have direct API endpoints
          );
        }

        // Filter by archived status
        if (!archived) {
          matchingSpaces = matchingSpaces.filter((space: any) => !space.archived);
        }

        if (matchingSpaces.length === 0) {
          return {
            content: [{ type: "text", text: "No spaces found matching the search criteria." }],
          };
        }

        // Conditionally fetch detailed content based on result count
        const spaceContentPromises = matchingSpaces.map(async (space: any) => {
          try {
            if (matchingSpaces.length <= 5) {
              // Detailed mode: fetch lists and folders for this space
              const { lists, folders, documents } = await getSpaceContent(space.id);
              return { space, lists, folders, documents };
            } else {
              // Summary mode: just return space without content
              return { space, lists: [], folders: [], documents: [] };
            }
          } catch (error) {
            console.error(`Error fetching content for space ${space.id}:`, error);
            return { space, lists: [], folders: [], documents: [] };
          }
        });

        const spacesWithContent = await Promise.all(spaceContentPromises);
        const contentBlocks: ContentBlock[] = [];
        const isDetailedMode = matchingSpaces.length <= 5;

        if (isDetailedMode) {
          // Detailed mode: create separate blocks for each space
          spacesWithContent.forEach(({ space, lists, folders, documents }) => {
            // Use shared tree formatting function
            const spaceTreeText = formatSpaceTree(space, lists, folders, documents);
            
            // Add the complete space as a single content block
            contentBlocks.push({
              type: "text" as const,
              text: spaceTreeText
            });
          });
        } else {
          // Summary mode: create a single combined block with all spaces
          const allSpaceLines: string[] = [];
          spacesWithContent.forEach(({ space }) => {
            allSpaceLines.push(
              `🏢 SPACE: ${space.name} (space_id: ${space.id}${space.private ? ', private' : ''}${space.archived ? ', archived' : ''})`
            );
          });

          contentBlocks.push({
            type: "text" as const,
            text: allSpaceLines.join('\n')
          });
        }

        // Add tip message for summary mode (when there are too many spaces)
        if (matchingSpaces.length > 5) {
          contentBlocks.push({
            type: "text" as const,
            text: `\n💡 Tip: Use more specific search terms to get detailed list information (≤5 spaces will show complete structure)`
          });
        }

        return {
          content: [
            {
              type: "text" as const,
              text: matchingSpaces.length <= 5 
                ? (() => {
                    const totalLists = spacesWithContent.reduce((sum, { lists, folders }) => 
                      sum + lists.length + folders.reduce((folderSum, f) => folderSum + (f.lists?.length || 0), 0), 0);
                    const totalDocuments = spacesWithContent.reduce((sum, { documents }) => sum + documents.length, 0);
                    return `Found ${matchingSpaces.length} space(s) with complete tree structure (${totalLists} total lists, ${totalDocuments} total documents):`;
                  })()
                : `Found ${matchingSpaces.length} space(s) - showing names and IDs only. Use more specific search terms to get detailed information:`
            },
            ...contentBlocks
          ],
        };


      } catch (error) {
        console.error('Error searching spaces:', error);
        return {
          content: [
            {
              type: "text",
              text: `Error searching spaces: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    "getSharedHierarchy",
    [
      "Get all tasks, lists, and folders that have been shared with the authenticated user.",
      "Shows items shared from across the workspace."
    ].join("\n"),
    {},
    {
      readOnlyHint: true
    },
    async () => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/team/${CONFIG.teamId}/shared`,
          { headers: { Authorization: CONFIG.apiKey } }
        );

        if (!response.ok) {
          throw new Error(`Error fetching shared hierarchy: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const shared = data.shared || {};

        const tasks: any[] = shared.tasks || [];
        const lists: any[] = shared.lists || [];
        const folders: any[] = shared.folders || [];

        if (tasks.length === 0 && lists.length === 0 && folders.length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: `No shared items found for the authenticated user.`
            }]
          };
        }

        const lines: string[] = [
          `Shared Hierarchy:`,
          `Tasks: ${tasks.length} | Lists: ${lists.length} | Folders: ${folders.length}`,
          ''
        ];

        if (folders.length > 0) {
          lines.push(`Shared Folders (${folders.length}):`);
          folders.forEach((folder: any) => {
            lines.push(`  📁 ${folder.name} (folder_id: ${folder.id})`);
            if (folder.space) lines.push(`     Space: ${folder.space.name} (space_id: ${folder.space.id})`);
          });
          lines.push('');
        }

        if (lists.length > 0) {
          lines.push(`Shared Lists (${lists.length}):`);
          lists.forEach((list: any) => {
            lines.push(`  📋 ${list.name} (list_id: ${list.id})`);
            if (list.folder) lines.push(`     Folder: ${list.folder.name} (folder_id: ${list.folder.id})`);
            if (list.space) lines.push(`     Space: ${list.space.name} (space_id: ${list.space.id})`);
          });
          lines.push('');
        }

        if (tasks.length > 0) {
          lines.push(`Shared Tasks (${tasks.length}):`);
          tasks.forEach((task: any) => {
            const status = task.status?.status || 'unknown';
            lines.push(`  🎯 ${task.name} (task_id: ${task.id})`);
            lines.push(`     Status: ${status}`);
            if (task.list) lines.push(`     List: ${task.list.name} (list_id: ${task.list.id})`);
          });
          lines.push('');
        }

        return {
          content: [{
            type: "text" as const,
            text: lines.join('\n')
          }]
        };

      } catch (error) {
        console.error('Error getting shared hierarchy:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error getting shared hierarchy: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );
}

export function registerSpaceToolsWrite(server: McpServer) {
  server.tool(
    "createSpace",
    [
      "Create a new space (project) in the workspace.",
      "Spaces are top-level containers for organizing work.",
      "Returns the new space's ID and URL.",
      "After creating, you can add folders and lists to organize tasks."
    ].join("\n"),
    {
      name: z.string().min(1).describe("Name for the new space"),
      multiple_assignees: z.boolean().optional().describe("Allow multiple assignees per task (default: false)"),
      private: z.boolean().optional().describe("Make space private (default: false)")
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false
    },
    async ({ name, multiple_assignees = false, private: isPrivate = false }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/team/${CONFIG.teamId}/space`,
          {
            method: 'POST',
            headers: {
              Authorization: CONFIG.apiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              name,
              multiple_assignees,
              features: {
                due_dates: { enabled: true, start_date: true, remap_due_dates: true, remap_closed_due_date: false },
                time_tracking: { enabled: true },
                tags: { enabled: true },
                time_estimates: { enabled: true },
                checklists: { enabled: true },
                custom_fields: { enabled: true },
                remap_dependencies: { enabled: true },
                dependency_warning: { enabled: true },
                portfolios: { enabled: true }
              }
            })
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Error creating space: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const space = await response.json();

        return {
          content: [{
            type: "text" as const,
            text: [
              `Space created successfully!`,
              `space_id: ${space.id}`,
              `name: ${space.name}`,
              `url: ${generateSpaceUrl(space.id)}`,
              `private: ${space.private || false}`,
              `multiple_assignees: ${space.multiple_assignees || false}`,
              ``,
              `You can now create folders and lists in this space.`
            ].join('\n')
          }]
        };

      } catch (error) {
        console.error('Error creating space:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error creating space: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "updateSpace",
    [
      "Update a space's name or settings.",
      "Can rename the space, change privacy, or modify assignee settings.",
      "Use getSpace first to see current space settings."
    ].join("\n"),
    {
      space_id: z.string().min(1).describe("The space ID to update"),
      name: z.string().optional().describe("New name for the space"),
      private: z.boolean().optional().describe("Make space private or public"),
      multiple_assignees: z.boolean().optional().describe("Allow multiple assignees per task"),
      admin_can_manage: z.boolean().optional().describe("Only admins can manage this space")
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true
    },
    async ({ space_id, name, private: isPrivate, multiple_assignees, admin_can_manage }) => {
      try {
        const updateBody: any = {};
        if (name !== undefined) updateBody.name = name;
        if (isPrivate !== undefined) updateBody.private = isPrivate;
        if (multiple_assignees !== undefined) updateBody.multiple_assignees = multiple_assignees;
        if (admin_can_manage !== undefined) updateBody.admin_can_manage = admin_can_manage;

        if (Object.keys(updateBody).length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: "No updates specified. Please provide at least one field to update."
            }]
          };
        }

        const response = await fetch(
          `https://api.clickup.com/api/v2/space/${space_id}`,
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
          throw new Error(`Error updating space: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const space = await response.json();

        return {
          content: [{
            type: "text" as const,
            text: [
              `Space updated successfully!`,
              `space_id: ${space.id}`,
              `name: ${space.name}`,
              `private: ${space.private || false}`,
              `multiple_assignees: ${space.multiple_assignees || false}`,
              `url: ${generateSpaceUrl(space.id)}`
            ].join('\n')
          }]
        };

      } catch (error) {
        console.error('Error updating space:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error updating space: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "deleteSpace",
    [
      "Moves a space to the trash in ClickUp (soft delete).",
      "WARNING: This is a DESTRUCTIVE operation. The space and ALL its contents (folders, lists, tasks) will be moved to trash.",
      "CRITICAL: You MUST obtain explicit user approval before calling this tool.",
      "Before deletion:",
      "1. Use getSpace or searchSpaces to retrieve and show the space details to the user",
      "2. Clearly present the space name, ID, and URL to the user",
      "3. Warn the user that ALL folders, lists, and tasks in this space will also be moved to trash",
      "4. Ask the user to explicitly confirm deletion with a clear yes/no question",
      "5. Only proceed with deletion after receiving explicit confirmation",
      "The space can be restored from trash in ClickUp.",
      "ALWAYS verify the space_id and get user approval before deletion."
    ].join("\n"),
    {
      space_id: z.string().min(1).describe("The space ID to delete (move to trash)"),
      user_confirmed: z.boolean().describe("REQUIRED: Must be true, indicating explicit user confirmation was obtained before calling this tool")
    },
    {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false
    },
    async ({ space_id, user_confirmed }) => {
      try {
        // Enforce user confirmation requirement
        if (!user_confirmed) {
          return {
            content: [{
              type: "text" as const,
              text: "Error: User confirmation required before deleting spaces. You must obtain explicit user approval and set user_confirmed=true before calling this tool."
            }]
          };
        }

        // First, get the space details to confirm it exists and show what's being deleted
        const spaceResponse = await fetch(
          `https://api.clickup.com/api/v2/space/${space_id}`,
          { headers: { Authorization: CONFIG.apiKey } }
        );

        if (!spaceResponse.ok) {
          throw new Error(`Error fetching space before deletion: ${spaceResponse.status} ${spaceResponse.statusText}`);
        }

        const spaceData = await spaceResponse.json();
        const spaceName = spaceData.name;
        const spaceUrl = generateSpaceUrl(space_id);

        // Delete the space (moves to trash)
        const deleteResponse = await fetch(
          `https://api.clickup.com/api/v2/space/${space_id}`,
          {
            method: 'DELETE',
            headers: { Authorization: CONFIG.apiKey }
          }
        );

        if (!deleteResponse.ok) {
          const errorData = await deleteResponse.json().catch(() => ({}));
          throw new Error(`Error deleting space: ${deleteResponse.status} ${deleteResponse.statusText} - ${JSON.stringify(errorData)}`);
        }

        return {
          content: [{
            type: "text" as const,
            text: [
              `Space moved to trash successfully!`,
              `space_id: ${space_id}`,
              `space_name: ${spaceName}`,
              `previous_url: ${spaceUrl}`,
              `The space and all its contents have been moved to trash and can be restored from the ClickUp trash if needed.`
            ].join('\n')
          }]
        };

      } catch (error) {
        console.error('Error deleting space:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error deleting space: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );
}

// Backward compatibility export - registers all space tools including searchSpaces
export function registerSpaceTools(server: McpServer) {
  registerSpaceToolsRead(server);
}