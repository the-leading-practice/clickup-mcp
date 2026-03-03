import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CONFIG } from "../shared/config";
import { getAllTeamMembers } from "../shared/utils";

/**
 * Converts ISO date string to Unix timestamp in milliseconds
 */
function isoToTimestamp(isoString: string): number {
  return new Date(isoString).getTime();
}

/**
 * Formats timestamp to ISO string with local timezone (not UTC)
 */
function timestampToIso(timestamp: number): string {
  const date = new Date(timestamp);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  // Calculate timezone offset
  const offset = date.getTimezoneOffset();
  const offsetHours = Math.floor(Math.abs(offset) / 60);
  const offsetMinutes = Math.abs(offset) % 60;
  const sign = offset <= 0 ? '+' : '-';
  const timezoneOffset = sign + String(offsetHours).padStart(2, '0') + ':' + String(offsetMinutes).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${timezoneOffset}`;
}

/**
 * Formats duration in milliseconds to human readable format
 */
function formatDuration(durationMs: number): string {
  const hours = durationMs / (1000 * 60 * 60);
  const displayHours = Math.floor(hours);
  const displayMinutes = Math.round((hours - displayHours) * 60);
  return displayHours > 0 ? `${displayHours}h ${displayMinutes}m` : `${displayMinutes}m`;
}

/**
 * Formats timestamp to simple date and time for entry display
 */
function formatEntryTime(timestamp: number): string {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day} ${hours}:${minutes}`;
}

export function registerTimeToolsRead(server: McpServer) {
  server.tool(
    "getTimeEntry",
    [
      "Get a single time entry by its ID.",
      "Returns detailed information about a specific time entry.",
      "Use getTimeEntries first to find the entry_id."
    ].join("\n"),
    {
      timer_id: z.string().min(1).describe("The time entry ID to retrieve")
    },
    {
      readOnlyHint: true
    },
    async ({ timer_id }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/team/${CONFIG.teamId}/time_entries/${timer_id}`,
          { headers: { Authorization: CONFIG.apiKey } }
        );

        if (!response.ok) {
          throw new Error(`Error fetching time entry: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const entry = data.data;

        if (!entry) {
          return {
            content: [{
              type: "text" as const,
              text: `Time entry ${timer_id} not found.`
            }]
          };
        }

        const rawDuration = parseInt(entry.duration) || 0;
        const isRunningTimer = rawDuration < 0;
        const durationMs = isRunningTimer ? Date.now() - parseInt(entry.start) : rawDuration;

        const lines: string[] = [
          `Time Entry Details:`,
          `entry_id: ${entry.id}`,
          `task_id: ${entry.task?.id || 'No task'}`,
          `task_name: ${entry.task?.name || 'No task'}`,
          `user: ${entry.user?.username || 'Unknown'} (user_id: ${entry.user?.id || 'N/A'})`,
          `start: ${timestampToIso(parseInt(entry.start))}`,
          `duration: ${formatDuration(durationMs)}${isRunningTimer ? ' (running)' : ''}`,
          entry.description ? `description: ${entry.description}` : '',
          entry.billable !== undefined ? `billable: ${entry.billable}` : '',
          entry.tags?.length > 0 ? `tags: ${entry.tags.map((t: any) => t.name).join(', ')}` : ''
        ].filter(Boolean);

        return {
          content: [{
            type: "text" as const,
            text: lines.join('\n')
          }]
        };

      } catch (error) {
        console.error('Error getting time entry:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error getting time entry: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "getRunningTimeEntry",
    [
      "Get the currently running time entry for the current user.",
      "Returns details of any active timer.",
      "Useful for checking if a timer is running before starting a new one."
    ].join("\n"),
    {},
    {
      readOnlyHint: true
    },
    async () => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/team/${CONFIG.teamId}/time_entries/current`,
          { headers: { Authorization: CONFIG.apiKey } }
        );

        if (!response.ok) {
          throw new Error(`Error fetching running time entry: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const entry = data.data;

        if (!entry) {
          return {
            content: [{
              type: "text" as const,
              text: `No timer currently running.`
            }]
          };
        }

        const startTime = parseInt(entry.start);
        const currentDuration = Date.now() - startTime;

        const lines: string[] = [
          `Running Timer:`,
          `entry_id: ${entry.id}`,
          `task_id: ${entry.task?.id || 'No task'}`,
          `task_name: ${entry.task?.name || 'No task'}`,
          `started: ${timestampToIso(startTime)}`,
          `current_duration: ${formatDuration(currentDuration)}`,
          entry.description ? `description: ${entry.description}` : ''
        ].filter(Boolean);

        return {
          content: [{
            type: "text" as const,
            text: lines.join('\n')
          }]
        };

      } catch (error) {
        console.error('Error getting running time entry:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error getting running time entry: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "getTimeEntryHistory",
    [
      "Get the change history for a time entry.",
      "Shows modifications made to the time entry over time.",
      "Useful for auditing changes to time records."
    ].join("\n"),
    {
      timer_id: z.string().min(1).describe("The time entry ID to get history for")
    },
    {
      readOnlyHint: true
    },
    async ({ timer_id }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/team/${CONFIG.teamId}/time_entries/${timer_id}/history`,
          { headers: { Authorization: CONFIG.apiKey } }
        );

        if (!response.ok) {
          throw new Error(`Error fetching time entry history: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const history = data.data || [];

        if (history.length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: `No history found for time entry ${timer_id}.`
            }]
          };
        }

        const lines: string[] = [
          `Time Entry History for ${timer_id}:`,
          ''
        ];

        history.forEach((event: any, index: number) => {
          const date = new Date(parseInt(event.date)).toLocaleString();
          lines.push(`${index + 1}. ${date}`);
          lines.push(`   Action: ${event.field || 'unknown'}`);
          if (event.before) lines.push(`   Before: ${event.before}`);
          if (event.after) lines.push(`   After: ${event.after}`);
          lines.push('');
        });

        return {
          content: [{
            type: "text" as const,
            text: lines.join('\n')
          }]
        };

      } catch (error) {
        console.error('Error getting time entry history:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error getting time entry history: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "getTimeEntryTags",
    [
      "Get all available time entry tags for the workspace.",
      "These tags can be applied to time entries for categorization.",
      "Returns tag names and colors."
    ].join("\n"),
    {},
    {
      readOnlyHint: true
    },
    async () => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/team/${CONFIG.teamId}/time_entries/tags`,
          { headers: { Authorization: CONFIG.apiKey } }
        );

        if (!response.ok) {
          throw new Error(`Error fetching time entry tags: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const tags = data.data || [];

        if (tags.length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: `No time entry tags found in workspace.`
            }]
          };
        }

        const lines: string[] = [
          `Time Entry Tags (${tags.length} total):`,
          ''
        ];

        tags.forEach((tag: any) => {
          lines.push(`🏷️ ${tag.name}${tag.tag_bg ? ` (color: ${tag.tag_bg})` : ''}`);
        });

        return {
          content: [{
            type: "text" as const,
            text: lines.join('\n')
          }]
        };

      } catch (error) {
        console.error('Error getting time entry tags:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error getting time entry tags: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "getTrackedTimeLegacy",
    [
      "Get tracked time entries on a specific task using the legacy time tracking API.",
      "For modern time tracking, use getTimeEntries instead."
    ].join("\n"),
    {
      task_id: z.string().min(6).max(9).describe("The task ID to get tracked time for")
    },
    {
      readOnlyHint: true
    },
    async ({ task_id }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/task/${task_id}/time`,
          { headers: { Authorization: CONFIG.apiKey } }
        );

        if (!response.ok) {
          throw new Error(`Error fetching tracked time: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const intervals = data.data || [];

        if (intervals.length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: `No tracked time entries found for task ${task_id}.`
            }]
          };
        }

        const lines: string[] = [
          `Tracked time for task ${task_id} (${intervals.length} interval(s)):`,
          ''
        ];

        intervals.forEach((interval: any) => {
          const durationMs = parseInt(interval.time) || 0;
          lines.push(`Interval (id: ${interval.id})`);
          lines.push(`   duration: ${formatDuration(durationMs)}`);
          if (interval.start) lines.push(`   start: ${formatEntryTime(parseInt(interval.start))}`);
          if (interval.end) lines.push(`   end: ${formatEntryTime(parseInt(interval.end))}`);
          if (interval.user) lines.push(`   user: ${interval.user.username || interval.user.email} (user_id: ${interval.user.id})`);
          lines.push('');
        });

        return {
          content: [{
            type: "text" as const,
            text: lines.join('\n')
          }]
        };

      } catch (error) {
        console.error('Error getting tracked time (legacy):', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error getting tracked time: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "getTimeEntries",
    "Gets time entries for a specific task or all user's time entries. Returns last 30 days by default if no dates specified.",
    {
      task_id: z.string().min(6).max(9).optional().describe("Optional 6-9 character task ID to filter entries. If not provided, returns all user's time entries."),
      start_date: z.string().optional().describe("Optional start date filter as ISO date string (e.g., '2024-10-06T00:00:00+02:00'). Defaults to 30 days ago."),
      end_date: z.string().optional().describe("Optional end date filter as ISO date string (e.g., '2024-10-06T23:59:59+02:00'). Defaults to current date."),
      list_id: z.string().optional().describe("Optional single list ID to filter time entries by a specific list"),
      space_id: z.string().optional().describe("Optional single space ID to filter time entries by a specific space"),
      include_all_users: z.boolean().optional().describe("Optional flag to include time entries from all team members (default: false, only current user)")
    },
    {
      readOnlyHint: true
    },
    async ({ task_id, start_date, end_date, list_id, space_id, include_all_users }) => {
      try {
        // Build query parameters
        const params = new URLSearchParams();

        if (task_id) {
          params.append('task_id', task_id);
        }

        if (start_date) {
          params.append('start_date', isoToTimestamp(start_date).toString());
        }

        if (end_date) {
          params.append('end_date', isoToTimestamp(end_date).toString());
        }

        // Add single list_id or space_id filter (not both)
        if (list_id) {
          params.append('list_id', list_id);
        } else if (space_id) {
          params.append('space_id', space_id);
        }

        // Always include location names to get list information
        params.append('include_location_names', 'true');

        // Handle include_all_users by fetching all team members and adding them as assignees filter
        // Note: This only works for Workspace Owners/Admins
        if (include_all_users) {
          try {
            const teamMembers = await getAllTeamMembers();
            if (teamMembers.length > 0) {
              params.append('assignee', teamMembers.join(','));
            }
          } catch (error) {
            console.error('Warning: Could not fetch all team members. This feature requires Workspace Owner/Admin permissions.');
            // Continue without all users - will only show current user's entries
          }
        }

        const response = await fetch(`https://api.clickup.com/api/v2/team/${CONFIG.teamId}/time_entries?${params}`, {
          headers: { Authorization: CONFIG.apiKey },
        });

        if (!response.ok) {
          throw new Error(`Error fetching time entries: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return processTimeEntriesData(data, task_id, start_date, end_date, include_all_users);

      } catch (error) {
        console.error('Error fetching time entries:', error);
        return {
          content: [
            {
              type: "text",
              text: `Error fetching time entries: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );
}

/**
 * Process the time entries data and return formatted hierarchical output
 */
function processTimeEntriesData(data: any, task_id?: string, start_date?: string, end_date?: string, include_all_users?: boolean) {
  if (!data.data || !Array.isArray(data.data)) {
    const noEntriesMsg = task_id ? 
      `No time entries found for task ${task_id}.` : 
      'No time entries found.';
    return {
      content: [{ type: "text" as const, text: noEntriesMsg }],
    };
  }

  const filteredEntries = data.data;

  // Create hierarchical structure: List → Task → User → Individual entries
  const hierarchy = new Map<string, {
    name: string;
    id: string;
    totalTime: number;
    tasks: Map<string, {
      name: string;
      id: string;
      totalTime: number;
      users: Map<string, {
        name: string;
        id: string;
        totalTime: number;
        entries: any[];
      }>;
    }>;
  }>();
  let totalTimeMs = 0;

  filteredEntries.forEach((entry: any) => {
    const taskId = entry.task?.id || 'no-task';
    
    // Use location names from include_location_names parameter
    const listId = entry.task_location?.list_id || 'no-list';
    const listName = entry.task_location?.list_name || 'No List';
    const taskName = entry.task?.name || 'No Task';
    const userId = entry.user?.id || 'no-user';
    const userName = entry.user?.username || 'Unknown User';
    
    // Handle running timers (negative duration)
    let entryDurationMs = parseInt(entry.duration) || 0;
    const isRunningTimer = entryDurationMs < 0;
    if (isRunningTimer) {
      // For running timers, calculate current duration from start time
      entryDurationMs = Date.now() - parseInt(entry.start);
    }

    totalTimeMs += entryDurationMs;

    // Initialize list level
    if (!hierarchy.has(listId)) {
      hierarchy.set(listId, {
        name: listName,
        id: listId,
        totalTime: 0,
        tasks: new Map()
      });
    }

    const listData = hierarchy.get(listId)!;
    listData.totalTime += entryDurationMs;

    // Initialize task level
    if (!listData.tasks.has(taskId)) {
      listData.tasks.set(taskId, {
        name: taskName,
        id: taskId,
        totalTime: 0,
        users: new Map()
      });
    }

    const taskData = listData.tasks.get(taskId)!;
    taskData.totalTime += entryDurationMs;

    // Initialize user level
    if (!taskData.users.has(userId)) {
      taskData.users.set(userId, {
        name: userName,
        id: userId,
        totalTime: 0,
        entries: []
      });
    }

    const userData = taskData.users.get(userId)!;
    userData.totalTime += entryDurationMs;
    userData.entries.push(entry);
  });

  // Count total tasks across all lists
  let totalTasks = 0;
  for (const [listId, listData] of hierarchy.entries()) {
    totalTasks += listData.tasks.size;
  }

  // Format the hierarchical output
  const outputLines: string[] = [];
  
  // Header with date range and total
  const dateRange = start_date && end_date ? 
    ` (${start_date.split('T')[0]} to ${end_date.split('T')[0]})` : 
    start_date ? ` (from ${start_date.split('T')[0]})` :
    end_date ? ` (until ${end_date.split('T')[0]})` : '';
  
  outputLines.push(`Time Entries Summary${dateRange}`);
  outputLines.push(`Total: ${formatDuration(totalTimeMs)}`);
  outputLines.push('');

  // Check if result is too large (>100 tasks)
  const TASK_LIMIT = 100;
  const isTruncated = totalTasks > TASK_LIMIT;

  if (isTruncated) {
    // Show only list-level summary
    outputLines.push(`⚠️  Large result detected (${totalTasks} tasks). Showing summary only.`);
    outputLines.push(`💡 Use list_id, space_id, or date filters for detailed view.`);
    outputLines.push('');
    
    for (const [listId, listData] of hierarchy.entries()) {
      const taskCount = listData.tasks.size;
      outputLines.push(`📋 ${listData.name} (List: ${listId}) - ${formatDuration(listData.totalTime)} across ${taskCount} task${taskCount === 1 ? '' : 's'}`);
    }
  } else {
    // Show full hierarchical display
    for (const [listId, listData] of hierarchy.entries()) {
      outputLines.push(`📋 ${listData.name} (List: ${listId}) - ${formatDuration(listData.totalTime)}`);
      
      for (const [taskId, taskData] of listData.tasks.entries()) {
        outputLines.push(`  ├─ 🎯 ${taskData.name} (Task: ${taskId}) - ${formatDuration(taskData.totalTime)}`);
        
        const userEntries = Array.from(taskData.users.entries());
        for (let userIndex = 0; userIndex < userEntries.length; userIndex++) {
          const [userId, userData] = userEntries[userIndex];
          const isLastUser = userIndex === userEntries.length - 1;
          const userPrefix = isLastUser ? '  └─' : '  ├─';
          outputLines.push(`${userPrefix} ${userData.name}: ${formatDuration(userData.totalTime)}`);
          
          // Add individual entries
          userData.entries.forEach((entry: any, entryIndex: number) => {
            const isLastEntry = entryIndex === userData.entries.length - 1;
            const entryPrefix = isLastUser ? 
              (isLastEntry ? '      └─' : '      ├─') :
              (isLastEntry ? '  │   └─' : '  │   ├─');
            
            const entryStart = formatEntryTime(parseInt(entry.start));
            
            // Handle running timers
            const rawDuration = parseInt(entry.duration) || 0;
            const isRunningTimer = rawDuration < 0;
            let entryDuration: string;
            
            if (isRunningTimer) {
              const currentDuration = Date.now() - parseInt(entry.start);
              entryDuration = `${formatDuration(currentDuration)} (running)`;
            } else {
              entryDuration = formatDuration(rawDuration);
            }
            
            outputLines.push(`${entryPrefix} ${entryStart} - ${entryDuration}`);
          });
        }
      }
      outputLines.push('');
    }
  }

  return {
    content: [
      {
        type: "text" as const,
        text: outputLines.join('\n')
      }
    ],
  };
}

export function registerTimeToolsWrite(server: McpServer) {
  server.tool(
    "createTimeEntry",
    [
      "Creates a time entry (books time) on a task for the current user.",
      "Use decimal hours (e.g., 0.25 for 15 minutes, 0.5 for 30 minutes, 2.5 for 2.5 hours).",
      "IMPORTANT: Before booking time, check the task's status - booking time on tasks in 'backlog', 'closed', or similar inactive states usually doesn't make sense.",
      "Suggest moving the task to an active status like 'in progress' first."
    ].join("\n"),
    {
      task_id: z.string().min(6).max(9).describe("The 6-9 character task ID to book time against"),
      hours: z.number().min(0.01).max(24).describe("Hours to book (decimal format, e.g., 0.25 = 15min, 1.5 = 1h 30min)"),
      description: z.string().optional().describe("Optional description for the time entry"),
      start_time: z.string().optional().describe("Optional start time as ISO date string (e.g., '2024-10-06T09:00:00+02:00', defaults to current time)")
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
    },
    async ({ task_id, hours, description, start_time }) => {
      try {
        // Convert hours to milliseconds (ClickUp API uses milliseconds)
        const durationMs = Math.round(hours * 60 * 60 * 1000);

        // Convert ISO date to timestamp if provided, otherwise use current time
        const startTimeMs = start_time ? isoToTimestamp(start_time) : Date.now();

        const requestBody = {
          tid: task_id,
          start: startTimeMs,
          duration: durationMs,
          ...(description && { description })
        };

        const response = await fetch(`https://api.clickup.com/api/v2/team/${CONFIG.teamId}/time_entries`, {
          method: 'POST',
          headers: { 
            Authorization: CONFIG.apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Error creating time entry: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const timeEntry = await response.json();

        // Format duration for display
        const displayHours = Math.floor(hours);
        const displayMinutes = Math.round((hours - displayHours) * 60);
        const durationDisplay = displayHours > 0 ? 
          `${displayHours}h ${displayMinutes}m` : 
          `${displayMinutes}m`;

        return {
          content: [
            {
              type: "text" as const,
              text: [
                `Time entry created successfully!`,
                `entry_id: ${timeEntry.data?.id || 'N/A'}`,
                `task_id: ${task_id}`,
                `duration: ${durationDisplay}`,
                `start_time: ${timestampToIso(startTimeMs)}`,
                ...(description ? [`description: ${description}`] : []),
                `user: ${timeEntry.data?.user?.username || 'Current user'}`
              ].join('\n')
            }
          ],
        };

      } catch (error) {
        console.error('Error creating time entry:', error);
        return {
          content: [
            {
              type: "text",
              text: `Error creating time entry: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    "updateTimeEntry",
    [
      "Update an existing time entry.",
      "Can modify description, start time, end time, tags, and billable status.",
      "Use getTimeEntry or getTimeEntries first to find the entry_id."
    ].join("\n"),
    {
      timer_id: z.string().min(1).describe("The time entry ID to update"),
      description: z.string().optional().describe("Optional new description"),
      start: z.string().optional().describe("Optional new start time as ISO date string"),
      end: z.string().optional().describe("Optional new end time as ISO date string"),
      tag_names: z.array(z.string()).optional().describe("Optional array of tag names to set on the entry"),
      billable: z.boolean().optional().describe("Optional billable status")
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true
    },
    async ({ timer_id, description, start, end, tag_names, billable }) => {
      try {
        const body: any = {};
        if (description !== undefined) body.description = description;
        if (start) body.start = isoToTimestamp(start);
        if (end) body.end = isoToTimestamp(end);
        if (tag_names !== undefined) body.tags = tag_names.map(name => ({ name }));
        if (billable !== undefined) body.billable = billable;

        const response = await fetch(
          `https://api.clickup.com/api/v2/team/${CONFIG.teamId}/time_entries/${timer_id}`,
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
          throw new Error(`Error updating time entry: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        const entry = data.data;

        return {
          content: [{
            type: "text" as const,
            text: [
              `Time entry updated successfully!`,
              `entry_id: ${timer_id}`,
              entry?.task?.id ? `task_id: ${entry.task.id}` : '',
              entry?.description ? `description: ${entry.description}` : '',
              entry?.billable !== undefined ? `billable: ${entry.billable}` : ''
            ].filter(Boolean).join('\n')
          }]
        };

      } catch (error) {
        console.error('Error updating time entry:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error updating time entry: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "deleteTimeEntry",
    [
      "Delete a time entry.",
      "This action is destructive and cannot be undone.",
      "Use getTimeEntry or getTimeEntries first to verify the entry before deletion."
    ].join("\n"),
    {
      timer_id: z.string().min(1).describe("The time entry ID to delete")
    },
    {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false
    },
    async ({ timer_id }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/team/${CONFIG.teamId}/time_entries/${timer_id}`,
          {
            method: 'DELETE',
            headers: { Authorization: CONFIG.apiKey }
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Error deleting time entry: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        return {
          content: [{
            type: "text" as const,
            text: `Time entry ${timer_id} deleted successfully.`
          }]
        };

      } catch (error) {
        console.error('Error deleting time entry:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error deleting time entry: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "startTimeEntry",
    [
      "Start a new time entry timer.",
      "Creates a running timer that can be stopped later.",
      "Only one timer can be running at a time per user.",
      "Use getRunningTimeEntry to check if a timer is already running."
    ].join("\n"),
    {
      task_id: z.string().min(6).max(9).describe("The task ID to start timing"),
      description: z.string().optional().describe("Optional description for the time entry"),
      billable: z.boolean().optional().describe("Optional billable status"),
      tag_names: z.array(z.string()).optional().describe("Optional array of tag names to apply")
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false
    },
    async ({ task_id, description, billable, tag_names }) => {
      try {
        const body: any = {
          tid: task_id
        };
        if (description) body.description = description;
        if (billable !== undefined) body.billable = billable;
        if (tag_names && tag_names.length > 0) body.tags = tag_names.map(name => ({ name }));

        const response = await fetch(
          `https://api.clickup.com/api/v2/team/${CONFIG.teamId}/time_entries/start`,
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
          throw new Error(`Error starting timer: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        const entry = data.data;

        return {
          content: [{
            type: "text" as const,
            text: [
              `Timer started successfully!`,
              `entry_id: ${entry?.id || 'N/A'}`,
              `task_id: ${task_id}`,
              `started: ${timestampToIso(Date.now())}`,
              description ? `description: ${description}` : ''
            ].filter(Boolean).join('\n')
          }]
        };

      } catch (error) {
        console.error('Error starting timer:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error starting timer: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "stopTimeEntry",
    [
      "Stop the currently running time entry timer.",
      "Finalizes the time entry with the elapsed duration.",
      "Use getRunningTimeEntry to check what timer is running."
    ].join("\n"),
    {},
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true
    },
    async () => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/team/${CONFIG.teamId}/time_entries/stop`,
          {
            method: 'POST',
            headers: { Authorization: CONFIG.apiKey }
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Error stopping timer: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        const entry = data.data;

        if (!entry) {
          return {
            content: [{
              type: "text" as const,
              text: `No timer was running.`
            }]
          };
        }

        const durationMs = parseInt(entry.duration) || 0;

        return {
          content: [{
            type: "text" as const,
            text: [
              `Timer stopped successfully!`,
              `entry_id: ${entry.id}`,
              `task_id: ${entry.task?.id || 'No task'}`,
              `task_name: ${entry.task?.name || 'No task'}`,
              `duration: ${formatDuration(durationMs)}`,
              entry.description ? `description: ${entry.description}` : ''
            ].filter(Boolean).join('\n')
          }]
        };

      } catch (error) {
        console.error('Error stopping timer:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error stopping timer: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "addTimeEntryTags",
    [
      "Add tags to a time entry.",
      "Tags must already exist in the workspace (use getTimeEntryTags to see available tags).",
      "Or new tags will be created automatically."
    ].join("\n"),
    {
      timer_id: z.string().min(1).describe("The time entry ID to add tags to"),
      tag_names: z.array(z.string()).min(1).describe("Array of tag names to add")
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true
    },
    async ({ timer_id, tag_names }) => {
      try {
        const body = {
          tags: tag_names.map(name => ({ name }))
        };

        const response = await fetch(
          `https://api.clickup.com/api/v2/team/${CONFIG.teamId}/time_entries/${timer_id}/tags`,
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
          throw new Error(`Error adding tags: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        return {
          content: [{
            type: "text" as const,
            text: [
              `Tags added successfully!`,
              `entry_id: ${timer_id}`,
              `tags_added: ${tag_names.join(', ')}`
            ].join('\n')
          }]
        };

      } catch (error) {
        console.error('Error adding tags to time entry:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error adding tags: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "removeTimeEntryTags",
    [
      "Remove tags from a time entry.",
      "Use getTimeEntry to see current tags on the entry."
    ].join("\n"),
    {
      timer_id: z.string().min(1).describe("The time entry ID to remove tags from"),
      tag_names: z.array(z.string()).min(1).describe("Array of tag names to remove")
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true
    },
    async ({ timer_id, tag_names }) => {
      try {
        const body = {
          tags: tag_names.map(name => ({ name }))
        };

        const response = await fetch(
          `https://api.clickup.com/api/v2/team/${CONFIG.teamId}/time_entries/${timer_id}/tags`,
          {
            method: 'DELETE',
            headers: {
              Authorization: CONFIG.apiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Error removing tags: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        return {
          content: [{
            type: "text" as const,
            text: [
              `Tags removed successfully!`,
              `entry_id: ${timer_id}`,
              `tags_removed: ${tag_names.join(', ')}`
            ].join('\n')
          }]
        };

      } catch (error) {
        console.error('Error removing tags from time entry:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error removing tags: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "updateTimeEntryTags",
    [
      "Rename a time entry tag across the entire workspace.",
      "This changes the tag name for all time entries that use it.",
      "Use getTimeEntryTags to see available tags and their current names."
    ].join("\n"),
    {
      old_name: z.string().min(1).describe("Current tag name to rename"),
      new_name: z.string().min(1).describe("New name for the tag"),
      tag_bg: z.string().optional().describe("Optional new background color (hex code)")
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true
    },
    async ({ old_name, new_name, tag_bg }) => {
      try {
        const body: any = {
          name: old_name,
          new_name: new_name
        };
        if (tag_bg) body.tag_bg = tag_bg;

        const response = await fetch(
          `https://api.clickup.com/api/v2/team/${CONFIG.teamId}/time_entries/tags`,
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
          throw new Error(`Error updating tag: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        return {
          content: [{
            type: "text" as const,
            text: [
              `Tag renamed successfully!`,
              `old_name: ${old_name}`,
              `new_name: ${new_name}`,
              tag_bg ? `color: ${tag_bg}` : ''
            ].filter(Boolean).join('\n')
          }]
        };

      } catch (error) {
        console.error('Error updating time entry tag:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error updating tag: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "trackTimeLegacy",
    [
      "Add a time tracked entry to a task using the legacy time tracking API.",
      "For modern time tracking, use createTimeEntry instead."
    ].join("\n"),
    {
      task_id: z.string().describe("The task ID to add tracked time to"),
      time: z.number().describe("Duration in milliseconds"),
      start: z.number().optional().describe("Start timestamp in unix milliseconds"),
      end: z.number().optional().describe("End timestamp in unix milliseconds")
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false
    },
    async ({ task_id, time, start, end }) => {
      try {
        const body: any = { time };
        if (start !== undefined) body.start = start;
        if (end !== undefined) body.end = end;

        const response = await fetch(
          `https://api.clickup.com/api/v2/task/${task_id}/time`,
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
          throw new Error(`Error tracking time: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        const interval = data.data;

        return {
          content: [{
            type: "text" as const,
            text: [
              `Time tracked successfully (legacy)!`,
              `task_id: ${task_id}`,
              interval?.id ? `interval_id: ${interval.id}` : '',
              `duration: ${formatDuration(time)}`
            ].filter(Boolean).join('\n')
          }]
        };

      } catch (error) {
        console.error('Error tracking time (legacy):', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error tracking time: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "editTimeTrackedLegacy",
    [
      "Edit a time tracked entry on a task using the legacy time tracking API."
    ].join("\n"),
    {
      task_id: z.string().describe("The task ID the time entry belongs to"),
      interval_id: z.string().describe("The time interval ID to edit"),
      time: z.number().describe("New duration in milliseconds"),
      start: z.number().optional().describe("New start timestamp in unix milliseconds"),
      end: z.number().optional().describe("New end timestamp in unix milliseconds")
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true
    },
    async ({ task_id, interval_id, time, start, end }) => {
      try {
        const body: any = { time };
        if (start !== undefined) body.start = start;
        if (end !== undefined) body.end = end;

        const response = await fetch(
          `https://api.clickup.com/api/v2/task/${task_id}/time/${interval_id}`,
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
          throw new Error(`Error editing tracked time: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        return {
          content: [{
            type: "text" as const,
            text: [
              `Time entry updated successfully (legacy)!`,
              `task_id: ${task_id}`,
              `interval_id: ${interval_id}`,
              `new_duration: ${formatDuration(time)}`
            ].join('\n')
          }]
        };

      } catch (error) {
        console.error('Error editing tracked time (legacy):', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error editing tracked time: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "deleteTimeTrackedLegacy",
    [
      "Delete a time tracked entry from a task using the legacy time tracking API."
    ].join("\n"),
    {
      task_id: z.string().describe("The task ID the time entry belongs to"),
      interval_id: z.string().describe("The time interval ID to delete")
    },
    {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true
    },
    async ({ task_id, interval_id }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/task/${task_id}/time/${interval_id}`,
          {
            method: 'DELETE',
            headers: { Authorization: CONFIG.apiKey }
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Error deleting tracked time: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        return {
          content: [{
            type: "text" as const,
            text: `Time entry (interval_id: ${interval_id}) deleted successfully from task ${task_id}.`
          }]
        };

      } catch (error) {
        console.error('Error deleting tracked time (legacy):', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error deleting tracked time: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );
}
