import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { convertMarkdownToToolCallResult, convertClickUpTextItemsToToolCallResult } from "../clickup-text";
import { ContentBlock, DatedContentEvent, ImageMetadataBlock } from "../shared/types";
import { CONFIG } from "../shared/config";
import { isTaskId, getSpaceDetails, getAllTeamMembers } from "../shared/utils";
import { downloadImages } from "../shared/image-processing";

// Read-specific utility functions

export function registerTaskToolsRead(server: McpServer, userData: any) {
  server.tool(
    "getTasks",
    [
      "Get tasks from a specific list. Returns up to 100 tasks per page with filtering options. Use this for bulk task retrieval from a known list.",
    ].join("\n"),
    {
      list_id: z.string().min(1).describe("The list ID to get tasks from"),
      page: z.number().optional().describe("Page number (0-indexed, 100 tasks per page)"),
      archived: z.boolean().optional().describe("Include archived tasks (default: false)"),
      include_closed: z.boolean().optional().describe("Include closed tasks (default: false)"),
      subtasks: z.boolean().optional().describe("Include subtasks (default: false)"),
      statuses: z.array(z.string()).optional().describe("Filter by status names"),
      assignees: z.array(z.string()).optional().describe("Filter by assignee user IDs"),
      due_date_gt: z.number().optional().describe("Filter tasks with due date greater than unix timestamp (ms)"),
      due_date_lt: z.number().optional().describe("Filter tasks with due date less than unix timestamp (ms)"),
      order_by: z.enum(['id', 'created', 'updated', 'due_date']).optional().describe("Field to order by"),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
    },
    async ({ list_id, page, archived, include_closed, subtasks, statuses, assignees, due_date_gt, due_date_lt, order_by }) => {
      try {
        const params = new URLSearchParams();

        if (page !== undefined) params.append('page', page.toString());
        if (archived !== undefined) params.append('archived', archived.toString());
        if (include_closed !== undefined) params.append('include_closed', include_closed.toString());
        if (subtasks !== undefined) params.append('subtasks', subtasks.toString());
        if (due_date_gt !== undefined) params.append('due_date_gt', due_date_gt.toString());
        if (due_date_lt !== undefined) params.append('due_date_lt', due_date_lt.toString());
        if (order_by !== undefined) params.append('order_by', order_by);

        if (statuses && statuses.length > 0) {
          statuses.forEach(status => params.append('statuses[]', status));
        }

        if (assignees && assignees.length > 0) {
          assignees.forEach(assignee => params.append('assignees[]', assignee));
        }

        const response = await fetch(
          `https://api.clickup.com/api/v2/list/${list_id}/task?${params}`,
          { headers: { Authorization: CONFIG.apiKey } }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Error fetching tasks: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        const tasks = data.tasks || [];

        if (tasks.length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: `No tasks found in list ${list_id}.`
            }]
          };
        }

        const lines: string[] = [
          `Tasks in list ${list_id} (${tasks.length} tasks${page !== undefined ? `, page ${page}` : ''}):`,
          ''
        ];

        tasks.forEach((task: any) => {
          const assigneeNames = task.assignees?.map((a: any) => `${a.username} (${a.id})`).join(', ') || 'None';
          const dueDate = task.due_date ? timestampToIso(task.due_date) : 'None';
          const priority = task.priority?.priority || 'none';

          lines.push(`task_id: ${task.id}`);
          lines.push(`  name: ${task.name}`);
          lines.push(`  status: ${task.status?.status || 'Unknown'}`);
          lines.push(`  priority: ${priority}`);
          lines.push(`  assignees: ${assigneeNames}`);
          lines.push(`  due_date: ${dueDate}`);
          lines.push(`  list: ${task.list?.name || 'Unknown'} (${task.list?.id || 'N/A'})`);
          lines.push('');
        });

        return {
          content: [{
            type: "text" as const,
            text: lines.join('\n')
          }]
        };

      } catch (error) {
        console.error('Error fetching tasks:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error fetching tasks: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "getFilteredTeamTasks",
    [
      "Search and filter tasks across the entire workspace. Powerful query endpoint with many filter options. Returns up to 100 tasks per page.",
    ].join("\n"),
    {
      page: z.number().optional().describe("Page number (0-indexed, 100 tasks per page)"),
      list_ids: z.array(z.string()).optional().describe("Filter by list IDs"),
      space_ids: z.array(z.string()).optional().describe("Filter by space IDs"),
      folder_ids: z.array(z.string()).optional().describe("Filter by folder IDs"),
      statuses: z.array(z.string()).optional().describe("Filter by status names"),
      assignees: z.array(z.string()).optional().describe("Filter by assignee user IDs"),
      tags: z.array(z.string()).optional().describe("Filter by tag names"),
      include_closed: z.boolean().optional().describe("Include closed tasks (default: false)"),
      subtasks: z.boolean().optional().describe("Include subtasks (default: false)"),
      due_date_gt: z.number().optional().describe("Filter tasks with due date greater than unix timestamp (ms)"),
      due_date_lt: z.number().optional().describe("Filter tasks with due date less than unix timestamp (ms)"),
      date_created_gt: z.number().optional().describe("Filter tasks created after unix timestamp (ms)"),
      date_created_lt: z.number().optional().describe("Filter tasks created before unix timestamp (ms)"),
      date_updated_gt: z.number().optional().describe("Filter tasks updated after unix timestamp (ms)"),
      date_updated_lt: z.number().optional().describe("Filter tasks updated before unix timestamp (ms)"),
      order_by: z.enum(['id', 'created', 'updated', 'due_date']).optional().describe("Field to order by"),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
    },
    async ({ page, list_ids, space_ids, folder_ids, statuses, assignees, tags, include_closed, subtasks, due_date_gt, due_date_lt, date_created_gt, date_created_lt, date_updated_gt, date_updated_lt, order_by }) => {
      try {
        const params = new URLSearchParams();

        if (page !== undefined) params.append('page', page.toString());
        if (include_closed !== undefined) params.append('include_closed', include_closed.toString());
        if (subtasks !== undefined) params.append('subtasks', subtasks.toString());
        if (due_date_gt !== undefined) params.append('due_date_gt', due_date_gt.toString());
        if (due_date_lt !== undefined) params.append('due_date_lt', due_date_lt.toString());
        if (date_created_gt !== undefined) params.append('date_created_gt', date_created_gt.toString());
        if (date_created_lt !== undefined) params.append('date_created_lt', date_created_lt.toString());
        if (date_updated_gt !== undefined) params.append('date_updated_gt', date_updated_gt.toString());
        if (date_updated_lt !== undefined) params.append('date_updated_lt', date_updated_lt.toString());
        if (order_by !== undefined) params.append('order_by', order_by);

        if (list_ids && list_ids.length > 0) {
          list_ids.forEach(id => params.append('list_ids[]', id));
        }

        if (space_ids && space_ids.length > 0) {
          space_ids.forEach(id => params.append('space_ids[]', id));
        }

        if (folder_ids && folder_ids.length > 0) {
          folder_ids.forEach(id => params.append('folder_ids[]', id));
        }

        if (statuses && statuses.length > 0) {
          statuses.forEach(status => params.append('statuses[]', status));
        }

        if (assignees && assignees.length > 0) {
          assignees.forEach(assignee => params.append('assignees[]', assignee));
        }

        if (tags && tags.length > 0) {
          tags.forEach(tag => params.append('tags[]', tag));
        }

        const response = await fetch(
          `https://api.clickup.com/api/v2/team/${CONFIG.teamId}/task?${params}`,
          { headers: { Authorization: CONFIG.apiKey } }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Error fetching filtered tasks: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        const tasks = data.tasks || [];

        if (tasks.length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: `No tasks found matching the specified filters.`
            }]
          };
        }

        const lines: string[] = [
          `Filtered Tasks (${tasks.length} tasks${page !== undefined ? `, page ${page}` : ''}):`,
          ''
        ];

        tasks.forEach((task: any) => {
          const assigneeNames = task.assignees?.map((a: any) => `${a.username} (${a.id})`).join(', ') || 'None';
          const dueDate = task.due_date ? timestampToIso(task.due_date) : 'None';
          const priority = task.priority?.priority || 'none';

          lines.push(`task_id: ${task.id}`);
          lines.push(`  name: ${task.name}`);
          lines.push(`  status: ${task.status?.status || 'Unknown'}`);
          lines.push(`  priority: ${priority}`);
          lines.push(`  assignees: ${assigneeNames}`);
          lines.push(`  due_date: ${dueDate}`);
          lines.push(`  list: ${task.list?.name || 'Unknown'} (${task.list?.id || 'N/A'})`);
          lines.push('');
        });

        return {
          content: [{
            type: "text" as const,
            text: lines.join('\n')
          }]
        };

      } catch (error) {
        console.error('Error fetching filtered team tasks:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error fetching filtered team tasks: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "getCustomTaskTypes",
    [
      "Get custom task types available in the workspace. Custom task types define different categories of tasks with their own icons and names.",
    ].join("\n"),
    {},
    {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
    },
    async () => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/team/${CONFIG.teamId}/custom_item`,
          { headers: { Authorization: CONFIG.apiKey } }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Error fetching custom task types: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        const customItems = data.custom_items || [];

        if (customItems.length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: `No custom task types found in workspace.`
            }]
          };
        }

        const lines: string[] = [
          `Custom Task Types (${customItems.length} total):`,
          ''
        ];

        customItems.forEach((item: any) => {
          lines.push(`id: ${item.id}`);
          lines.push(`  name: ${item.name}`);
          if (item.description) {
            lines.push(`  description: ${item.description}`);
          }
          if (item.avatar) {
            const iconInfo = item.avatar.src
              ? `src: ${item.avatar.src}`
              : item.avatar.color
              ? `color: ${item.avatar.color}`
              : 'custom icon';
            lines.push(`  icon: ${iconInfo}`);
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
        console.error('Error fetching custom task types:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error fetching custom task types: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "getBulkTasksTimeInStatus",
    [
      "Get time in status data for multiple tasks at once. More efficient than fetching individually for each task.",
    ].join("\n"),
    {
      task_ids: z.array(z.string()).min(1).max(100).describe("Array of task IDs (max 100)"),
    },
    {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
    },
    async ({ task_ids }) => {
      try {
        const params = new URLSearchParams();
        task_ids.forEach(id => params.append('task_ids', id));

        const response = await fetch(
          `https://api.clickup.com/api/v2/task/bulk_time_in_status/task_ids?${params}`,
          { headers: { Authorization: CONFIG.apiKey } }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Error fetching bulk time in status: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();

        if (!data || Object.keys(data).length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: `No time in status data found for the provided task IDs.`
            }]
          };
        }

        const lines: string[] = [
          `Bulk Time In Status (${task_ids.length} tasks requested):`,
          ''
        ];

        for (const taskId of task_ids) {
          const taskData = data[taskId];
          if (!taskData) {
            lines.push(`task_id: ${taskId}`);
            lines.push(`  No data available`);
            lines.push('');
            continue;
          }

          lines.push(`task_id: ${taskId}`);

          if (taskData.current_status) {
            const cs = taskData.current_status;
            const totalMs = cs.total_time?.by_minute ? cs.total_time.by_minute * 60 * 1000 : 0;
            const since = cs.total_time?.since ? timestampToIso(cs.total_time.since) : 'Unknown';
            lines.push(`  current_status: ${cs.status}`);
            lines.push(`    since: ${since}`);
            if (totalMs > 0) {
              const hours = Math.floor(totalMs / 3600000);
              const minutes = Math.floor((totalMs % 3600000) / 60000);
              lines.push(`    time_in_status: ${hours}h ${minutes}m`);
            }
          }

          if (taskData.status_history && Array.isArray(taskData.status_history) && taskData.status_history.length > 0) {
            lines.push(`  status_history:`);
            taskData.status_history.forEach((entry: any) => {
              const totalMs = entry.total_time?.by_minute ? entry.total_time.by_minute * 60 * 1000 : 0;
              const since = entry.total_time?.since ? timestampToIso(entry.total_time.since) : 'Unknown';
              const hours = Math.floor(totalMs / 3600000);
              const minutes = Math.floor((totalMs % 3600000) / 60000);
              lines.push(`    - status: ${entry.status}`);
              lines.push(`      since: ${since}`);
              lines.push(`      time_in_status: ${hours}h ${minutes}m`);
            });
          }

          lines.push('');
        }

        return {
          content: [{
            type: "text" as const,
            text: lines.join('\n')
          }]
        };

      } catch (error) {
        console.error('Error fetching bulk tasks time in status:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error fetching bulk tasks time in status: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "getTaskById",
    [
      "Get a ClickUp task with images and comments by ID.",
      "Always use this URL when referencing tasks in conversations or sharing with others.",
      "The response provides complete context including task details, comments, and status history."
    ].join("\n"),
    {
      id: z
        .string()
        .min(6)
        .max(9)
        .refine(val => isTaskId(val), {
          message: "Task ID must be 6-9 alphanumeric characters only"
        })
        .describe(
          `The 6-9 character ID of the task to get without a prefix like "#", "CU-" or "https://app.clickup.com/t/"`
        ),
    },
    {
      readOnlyHint: true
    },
    async ({ id }) => {
      // 1. Load base task content, comment events, and status change events in parallel
      const [taskDetailContentBlocks, commentEvents, statusChangeEvents] = await Promise.all([
        loadTaskContent(id), // Returns Promise<ContentBlock[]>
        loadTaskComments(id), // Returns Promise<DatedContentEvent[]>
        loadTimeInStatusHistory(id), // Returns Promise<DatedContentEvent[]>
      ]);

      // 2. Combine comment and status change events
      const allDatedEvents: DatedContentEvent[] = [...commentEvents, ...statusChangeEvents];

      // 3. Sort all dated events chronologically
      allDatedEvents.sort((a, b) => {
        const dateA = a.date ? parseInt(a.date) : 0;
        const dateB = b.date ? parseInt(b.date) : 0;
        return dateA - dateB;
      });

      // 4. Flatten sorted events into a single ContentBlock stream
      let processedEventBlocks: (ContentBlock | ImageMetadataBlock)[] = [];
      for (const event of allDatedEvents) {
        processedEventBlocks.push(...event.contentBlocks);
      }

      // 5. Combine task details with processed event blocks
      const allContentBlocks: (ContentBlock | ImageMetadataBlock)[] = [...taskDetailContentBlocks, ...processedEventBlocks];

      // 6. Download images with smart size limiting
      const limitedContent: ContentBlock[] = await downloadImages(allContentBlocks);

      return {
        content: limitedContent,
      };
    }
  );

}

/**
 * Fetch time entries for a specific task (all time, not date-limited for detail view)
 */
async function fetchTaskTimeEntries(taskId: string): Promise<any[]> {
  try {
    // Get all team members for assignee filter
    const teamMembers = await getAllTeamMembers();
    const params = new URLSearchParams({
      task_id: taskId,
      include_location_names: 'true',
      start_date: '0', // overwrite the default 30 days
    });

    if (teamMembers.length > 0) {
      params.append('assignee', teamMembers.join(','));
    }

    const response = await fetch(`https://api.clickup.com/api/v2/team/${CONFIG.teamId}/time_entries?${params}`, {
      headers: { Authorization: CONFIG.apiKey },
    });

    if (!response.ok) {
      console.error(`Error fetching time entries for task ${taskId}: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching task time entries:', error);
    return [];
  }
}

async function loadTaskContent(taskId: string): Promise<(ContentBlock | ImageMetadataBlock)[]> {
  const response = await fetch(
    `https://api.clickup.com/api/v2/task/${taskId}?include_markdown_description=true&include_subtasks=true`,
    { headers: { Authorization: CONFIG.apiKey } }
  );
  const task = await response.json();

  const [taskMetadata, content] = await Promise.all([
    // Create the task metadata block using the helper functions
    (async () => {
      const timeEntries = await fetchTaskTimeEntries(task.id);
      return await generateTaskMetadata(task, timeEntries, true);
    })(),
    // process markdown and download images
    convertMarkdownToToolCallResult(
      task.markdown_description || "",
      task.attachments || []
    ),
  ]);

  return [taskMetadata, ...content];
}

async function loadTaskComments(id: string): Promise<DatedContentEvent[]> {
  const response = await fetch(
    `https://api.clickup.com/api/v2/task/${id}/comment?start_date=0`, // Ensure all comments are fetched
    { headers: { Authorization: CONFIG.apiKey } }
  );
  if (!response.ok) {
    console.error(`Error fetching comments for task ${id}: ${response.status} ${response.statusText}`);
    return [];
  }
  const commentsData = await response.json();
  if (!commentsData.comments || !Array.isArray(commentsData.comments)) {
    console.error(`Unexpected comment data structure for task ${id}`);
    return [];
  }
  const commentEvents: DatedContentEvent[] = await Promise.all(
    commentsData.comments.map(async (comment: any) => {
      const headerBlock: ContentBlock = {
        type: "text",
        text: `Comment by ${comment.user.username} on ${timestampToIso(comment.date)}:`,
      };

      const commentBodyBlocks: (ContentBlock | ImageMetadataBlock)[] = await convertClickUpTextItemsToToolCallResult(comment.comment);

      return {
        date: comment.date, // String timestamp from ClickUp for sorting
        contentBlocks: [headerBlock, ...commentBodyBlocks],
      };
    })
  );
  return commentEvents;
}

async function loadTimeInStatusHistory(taskId: string): Promise<DatedContentEvent[]> {
  const url = `https://api.clickup.com/api/v2/task/${taskId}/time_in_status`;
  try {
    const response = await fetch(url, { headers: { Authorization: CONFIG.apiKey } });
    if (!response.ok) {
      console.error(`Error fetching time in status for task ${taskId}: ${response.status} ${response.statusText}`);
      return [];
    }
    // Using 'any' for less strict typing as per user preference, but keeping structure for clarity
    const data: any = await response.json(); 
    const events: DatedContentEvent[] = [];

    const processStatusEntry = (entry: any): DatedContentEvent | null => {
      if (!entry || !entry.total_time || !entry.total_time.since || !entry.status) return null;
      return {
        date: entry.total_time.since,
        contentBlocks: [{
          type: "text",
          text: `Status set to '${entry.status}' on ${timestampToIso(entry.total_time.since)}`,
        }],
      };
    };

    if (data.status_history && Array.isArray(data.status_history)) {
      data.status_history.forEach((historyEntry: any) => {
        const event = processStatusEntry(historyEntry);
        if (event) events.push(event);
      });
    }

    if (data.current_status) {
      const event = processStatusEntry(data.current_status);
      // Ensure current_status is only added if it's distinct or more recent than the last history item.
      // The deduplication logic below handles if it's the same as the last history entry.
      if (event) events.push(event);
    }

    // Deduplicate events based on date and status name to avoid adding current_status if it's identical to the last history entry
    const uniqueEvents = Array.from(new Map(events.map(event => {
      const firstBlock = event.contentBlocks[0];
      const textKey = firstBlock && 'text' in firstBlock ? firstBlock.text : 'unknown';
      return [`${event.date}-${textKey}`, event];
    })).values());

    return uniqueEvents;
  } catch (error) {
    console.error(`Exception fetching time in status for task ${taskId}:`, error);
    return [];
  }
}


/**
 * Formats timestamp to ISO string with local timezone (not UTC)
 */
function timestampToIso(timestamp: number | string): string {
  const date = new Date(+timestamp);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  // Calculate timezone offset
  const offset = date.getTimezoneOffset();
  const offsetHours = Math.floor(Math.abs(offset) / 60);
  const offsetMinutes = Math.abs(offset) % 60;
  const sign = offset <= 0 ? '+' : '-';
  const timezoneOffset = sign + String(offsetHours).padStart(2, '0') + ':' + String(offsetMinutes).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}${timezoneOffset}`;
}

/**
 * Helper function to filter and format time entries for a specific task
 */
function filterTaskTimeEntries(taskId: string, timeEntries: any[]): string | null {
  if (!timeEntries || timeEntries.length === 0) {
    return null;
  }

  // Filter entries for this specific task
  const taskEntries = timeEntries.filter((entry: any) => entry.task?.id === taskId);

  if (taskEntries.length === 0) {
    return null;
  }

  // Group time entries by user (same logic as original getTaskTimeEntries)
  const timeByUser = new Map<string, number>();

  taskEntries.forEach((entry: any) => {
    const username = entry.user?.username || 'Unknown User';
    const currentTime = timeByUser.get(username) || 0;
    const entryDurationMs = parseInt(entry.duration) || 0;
    timeByUser.set(username, currentTime + entryDurationMs);
  });

  // Format results (same logic as original)
  const userTimeEntries: string[] = [];

  for (const [username, totalMs] of timeByUser.entries()) {
    const hours = totalMs / (1000 * 60 * 60);
    const displayHours = Math.floor(hours);
    const displayMinutes = Math.round((hours - displayHours) * 60);
    const timeDisplay = displayHours > 0 ? 
      `${displayHours}h ${displayMinutes}m` : 
      `${displayMinutes}m`;

    userTimeEntries.push(`${username}: ${timeDisplay}`);
  }

  return userTimeEntries.length > 0 ? userTimeEntries.join(', ') : null;
}

/**
 * Helper function to generate consistent task metadata
 */
export async function generateTaskMetadata(task: any, timeEntries?: any[], isDetailView: boolean = false): Promise<ContentBlock> {
  let spaceName = task.space?.name || 'Unknown Space';
  let spaceIdForDisplay = task.space?.id || 'N/A';

  if (spaceName === 'Unknown Space' && task.space?.id) {
    const spaceDetails = await getSpaceDetails(task.space.id);
    if (spaceDetails && spaceDetails.name) {
      spaceName = spaceDetails.name;
    }
  }

  const metadataLines = [
    `task_id: ${task.id}`,
    `task_url: ${task.url}`,
    `name: ${task.name}`,
    `status: ${task.status.status}`,
    `date_created: ${timestampToIso(task.date_created)}`,
    `date_updated: ${timestampToIso(task.date_updated)}`,
    `creator: ${task.creator.username} (${task.creator.id})`,
    `assignee: ${task.assignees.map((a: any) => `${a.username} (${a.id})`).join(', ')}`,
    `list: ${task.list.name} (${task.list.id})`,
    `space: ${spaceName} (${spaceIdForDisplay})`,
  ];

  // Add priority if it exists
  if (task.priority !== undefined && task.priority !== null) {
    const priorityName = task.priority.priority || 'none';
    metadataLines.push(`priority: ${priorityName}`);
  }

  // Add due date if it exists
  if (task.due_date) {
    metadataLines.push(`due_date: ${timestampToIso(task.due_date)}`);
  }

  // Add start date if it exists
  if (task.start_date) {
    metadataLines.push(`start_date: ${timestampToIso(task.start_date)}`);
  }

  // Add time estimate if it exists
  if (task.time_estimate) {
    const hours = Math.floor(task.time_estimate / 3600000);
    const minutes = Math.floor((task.time_estimate % 3600000) / 60000);
    metadataLines.push(`time_estimate: ${hours}h ${minutes}m`);
  }

  // Add time booked (tracked time entries) - only if timeEntries provided
  if (timeEntries) {
    const timeBooked = filterTaskTimeEntries(task.id, timeEntries);
    if (timeBooked) {
      const disclaimer = isDetailView ? "" : " (last 30 days)";
      metadataLines.push(`time_booked${disclaimer}: ${timeBooked}`);
    }
  }

  // Add tags if they exist
  if (task.tags && task.tags.length > 0) {
    metadataLines.push(`tags: ${task.tags.map((t: any) => t.name).join(', ')}`);
  }

  // Add watchers if they exist
  if (task.watchers && task.watchers.length > 0) {
    metadataLines.push(`watchers: ${task.watchers.map((w: any) => w.username).join(', ')}`);
  }

  // Add parent task information if it exists
  if (typeof task.parent === "string") {
    metadataLines.push(`parent_task_id: ${task.parent}`);
  }

  // Add child task information if it exists
  if (task.subtasks && task.subtasks.length > 0) {
    metadataLines.push(`child_task_ids: ${task.subtasks.map((st: any) => st.id).join(', ')}`);
  }


  // Add archived status if true
  if (task.archived) {
    metadataLines.push(`archived: true`);
  }

  // Add custom fields if they exist
  if (task.custom_fields && task.custom_fields.length > 0) {
    task.custom_fields.forEach((field: any) => {
      if (field.value !== undefined && field.value !== null && field.value !== '') {
        const fieldName = field.name.toLowerCase().replace(/\s+/g, '_');
        let fieldValue = field.value;

        // Handle different custom field types
        if (field.type === 'drop_down' && typeof field.value === 'number') {
          // For dropdown fields, find the selected option
          const selectedOption = field.type_config?.options?.find((opt: any) => opt.orderindex === field.value);
          fieldValue = selectedOption?.name || field.value;
        } else if (Array.isArray(field.value)) {
          // For multi-select or array values
          fieldValue = field.value.map((v: any) => v.name || v).join(', ');
        } else if (typeof field.value === 'object') {
          // For object values (like users), extract meaningful data
          fieldValue = field.value.username || field.value.name || JSON.stringify(field.value);
        }

        metadataLines.push(`custom_${fieldName}: ${fieldValue}`);
      }
    });
  }

  return {
    type: "text" as const,
    text: metadataLines.join("\n"),
  };
}
