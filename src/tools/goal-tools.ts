import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CONFIG } from "../shared/config";

export function registerGoalToolsRead(server: McpServer) {
  server.tool(
    "getGoals",
    [
      "Get all goals in the workspace.",
      "Goals are high-level objectives that can contain key results.",
      "Returns goal details including progress, due dates, and key results."
    ].join("\n"),
    {
      include_completed: z.boolean().optional().describe("Include completed goals (default: false)")
    },
    {
      readOnlyHint: true
    },
    async ({ include_completed }) => {
      try {
        const params = new URLSearchParams();
        if (include_completed) params.append('include_completed', 'true');

        const url = `https://api.clickup.com/api/v2/team/${CONFIG.teamId}/goal${params.toString() ? '?' + params.toString() : ''}`;
        const response = await fetch(url, {
          headers: { Authorization: CONFIG.apiKey }
        });

        if (!response.ok) {
          throw new Error(`Error fetching goals: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const goals = data.goals || [];

        if (goals.length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: `No goals found in the workspace.`
            }]
          };
        }

        const lines: string[] = [
          `Found ${goals.length} goal(s):`,
          ''
        ];

        goals.forEach((goal: any) => {
          const progress = goal.percent_completed ? `${Math.round(goal.percent_completed)}%` : '0%';
          const dueDate = goal.due_date ? new Date(parseInt(goal.due_date)).toLocaleDateString() : 'No due date';

          lines.push(`🎯 ${goal.name} (goal_id: ${goal.id})`);
          lines.push(`   Progress: ${progress}`);
          lines.push(`   Due: ${dueDate}`);
          lines.push(`   Color: ${goal.color || 'none'}`);

          if (goal.key_results && goal.key_results.length > 0) {
            lines.push(`   Key Results: ${goal.key_results.length}`);
          }

          if (goal.owner) {
            lines.push(`   Owner: ${goal.owner.username || goal.owner.email} (user_id: ${goal.owner.id})`);
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
        console.error('Error getting goals:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error getting goals: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "getGoal",
    [
      "Get detailed information about a specific goal.",
      "Returns goal details including all key results with their targets and progress.",
      "Use getGoals first to find the goal_id."
    ].join("\n"),
    {
      goal_id: z.string().min(1).describe("The goal ID to retrieve")
    },
    {
      readOnlyHint: true
    },
    async ({ goal_id }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/goal/${goal_id}`,
          {
            headers: { Authorization: CONFIG.apiKey }
          }
        );

        if (!response.ok) {
          throw new Error(`Error fetching goal: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const goal = data.goal;

        if (!goal) {
          return {
            content: [{
              type: "text" as const,
              text: `Goal ${goal_id} not found.`
            }]
          };
        }

        const progress = goal.percent_completed ? `${Math.round(goal.percent_completed)}%` : '0%';
        const dueDate = goal.due_date ? new Date(parseInt(goal.due_date)).toLocaleDateString() : 'No due date';
        const startDate = goal.start_date ? new Date(parseInt(goal.start_date)).toLocaleDateString() : 'No start date';

        const lines: string[] = [
          `Goal Details:`,
          `name: ${goal.name}`,
          `goal_id: ${goal.id}`,
          `progress: ${progress}`,
          `start_date: ${startDate}`,
          `due_date: ${dueDate}`,
          `color: ${goal.color || 'none'}`,
          goal.description ? `description: ${goal.description}` : '',
          goal.owner ? `owner: ${goal.owner.username || goal.owner.email} (user_id: ${goal.owner.id})` : '',
          goal.folder_id ? `folder_id: ${goal.folder_id}` : '',
          ''
        ].filter(Boolean);

        // Add key results
        if (goal.key_results && goal.key_results.length > 0) {
          lines.push(`Key Results (${goal.key_results.length}):`);
          goal.key_results.forEach((kr: any, index: number) => {
            const krProgress = kr.percent_completed ? `${Math.round(kr.percent_completed)}%` : '0%';
            lines.push(`  ${index + 1}. ${kr.name} (key_result_id: ${kr.id})`);
            lines.push(`     Type: ${kr.type || 'unknown'}`);
            lines.push(`     Progress: ${krProgress}`);
            if (kr.steps_current !== undefined && kr.steps_end !== undefined) {
              lines.push(`     Steps: ${kr.steps_current}/${kr.steps_end}`);
            }
            if (kr.unit) {
              lines.push(`     Unit: ${kr.unit}`);
            }
            lines.push('');
          });
        }

        // Add members
        if (goal.members && goal.members.length > 0) {
          lines.push(`Members: ${goal.members.map((m: any) => m.username || m.email).join(', ')}`);
        }

        return {
          content: [{
            type: "text" as const,
            text: lines.join('\n')
          }]
        };

      } catch (error) {
        console.error('Error getting goal:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error getting goal: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );
}

export function registerGoalToolsWrite(server: McpServer) {
  server.tool(
    "createGoal",
    [
      "Create a new goal in the workspace.",
      "Goals are high-level objectives that can be tracked with key results.",
      "You can specify due dates, colors, assignees, and descriptions."
    ].join("\n"),
    {
      name: z.string().min(1).describe("Name of the goal"),
      due_date: z.number().optional().describe("Due date as Unix timestamp in milliseconds"),
      description: z.string().optional().describe("Description of the goal"),
      multiple_owners: z.boolean().optional().describe("Allow multiple owners (default: false)"),
      owners: z.array(z.number()).optional().describe("Array of user IDs to assign as owners"),
      color: z.string().optional().describe("Goal color (hex code like #ff0000)")
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false
    },
    async ({ name, due_date, description, multiple_owners, owners, color }) => {
      try {
        const body: any = { name };
        if (due_date) body.due_date = due_date;
        if (description) body.description = description;
        if (multiple_owners !== undefined) body.multiple_owners = multiple_owners;
        if (owners && owners.length > 0) body.owners = owners;
        if (color) body.color = color;

        const response = await fetch(
          `https://api.clickup.com/api/v2/team/${CONFIG.teamId}/goal`,
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
          throw new Error(`Error creating goal: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        const goal = data.goal;

        return {
          content: [{
            type: "text" as const,
            text: [
              `Goal created successfully!`,
              `goal_id: ${goal?.id || 'unknown'}`,
              `name: ${name}`,
              due_date ? `due_date: ${new Date(due_date).toLocaleDateString()}` : '',
              color ? `color: ${color}` : ''
            ].filter(Boolean).join('\n')
          }]
        };

      } catch (error) {
        console.error('Error creating goal:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error creating goal: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "updateGoal",
    [
      "Update an existing goal.",
      "Can modify name, due date, description, color, and owners.",
      "Use getGoal first to see current values."
    ].join("\n"),
    {
      goal_id: z.string().min(1).describe("The goal ID to update"),
      name: z.string().optional().describe("New name for the goal"),
      due_date: z.number().optional().describe("New due date as Unix timestamp in milliseconds"),
      description: z.string().optional().describe("New description"),
      color: z.string().optional().describe("New color (hex code)"),
      rem_owners: z.array(z.number()).optional().describe("User IDs to remove as owners"),
      add_owners: z.array(z.number()).optional().describe("User IDs to add as owners")
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true
    },
    async ({ goal_id, name, due_date, description, color, rem_owners, add_owners }) => {
      try {
        const body: any = {};
        if (name) body.name = name;
        if (due_date) body.due_date = due_date;
        if (description !== undefined) body.description = description;
        if (color) body.color = color;
        if (rem_owners && rem_owners.length > 0) body.rem_owners = rem_owners;
        if (add_owners && add_owners.length > 0) body.add_owners = add_owners;

        if (Object.keys(body).length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: "No updates specified. Please provide at least one field to update."
            }]
          };
        }

        const response = await fetch(
          `https://api.clickup.com/api/v2/goal/${goal_id}`,
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
          throw new Error(`Error updating goal: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        return {
          content: [{
            type: "text" as const,
            text: [
              `Goal updated successfully!`,
              `goal_id: ${goal_id}`,
              name ? `name: ${name}` : '',
              due_date ? `due_date: ${new Date(due_date).toLocaleDateString()}` : '',
              color ? `color: ${color}` : ''
            ].filter(Boolean).join('\n')
          }]
        };

      } catch (error) {
        console.error('Error updating goal:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error updating goal: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "deleteGoal",
    [
      "Delete a goal permanently.",
      "WARNING: This will also delete all key results associated with the goal.",
      "This action cannot be undone."
    ].join("\n"),
    {
      goal_id: z.string().min(1).describe("The goal ID to delete")
    },
    {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false
    },
    async ({ goal_id }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/goal/${goal_id}`,
          {
            method: 'DELETE',
            headers: { Authorization: CONFIG.apiKey }
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Error deleting goal: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        return {
          content: [{
            type: "text" as const,
            text: `Goal ${goal_id} deleted successfully.`
          }]
        };

      } catch (error) {
        console.error('Error deleting goal:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error deleting goal: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "createKeyResult",
    [
      "Create a key result under a goal.",
      "Key results are measurable targets that track progress toward a goal.",
      "Types: number, currency, boolean, percentage, automatic, task_list."
    ].join("\n"),
    {
      goal_id: z.string().min(1).describe("The goal ID to add the key result to"),
      name: z.string().min(1).describe("Name of the key result"),
      type: z.enum(['number', 'currency', 'boolean', 'percentage', 'automatic', 'task_list'])
        .describe("Type of key result tracking"),
      steps_start: z.number().optional().describe("Starting value (for number/currency types)"),
      steps_end: z.number().optional().describe("Target value (for number/currency types)"),
      unit: z.string().optional().describe("Unit of measurement (e.g., 'dollars', 'items')"),
      owners: z.array(z.number()).optional().describe("Array of user IDs to assign as owners"),
      task_ids: z.array(z.string()).optional().describe("Task IDs (for task_list type)")
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false
    },
    async ({ goal_id, name, type, steps_start, steps_end, unit, owners, task_ids }) => {
      try {
        const body: any = { name, type };
        if (steps_start !== undefined) body.steps_start = steps_start;
        if (steps_end !== undefined) body.steps_end = steps_end;
        if (unit) body.unit = unit;
        if (owners && owners.length > 0) body.owners = owners;
        if (task_ids && task_ids.length > 0) body.task_ids = task_ids;

        const response = await fetch(
          `https://api.clickup.com/api/v2/goal/${goal_id}/key_result`,
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
          throw new Error(`Error creating key result: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        const keyResult = data.key_result;

        return {
          content: [{
            type: "text" as const,
            text: [
              `Key result created successfully!`,
              `key_result_id: ${keyResult?.id || 'unknown'}`,
              `goal_id: ${goal_id}`,
              `name: ${name}`,
              `type: ${type}`,
              steps_end !== undefined ? `target: ${steps_end}${unit ? ' ' + unit : ''}` : ''
            ].filter(Boolean).join('\n')
          }]
        };

      } catch (error) {
        console.error('Error creating key result:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error creating key result: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "updateKeyResult",
    [
      "Update a key result's progress or settings.",
      "Can modify current steps (progress), targets, name, and note.",
      "Use getGoal first to see current key result values."
    ].join("\n"),
    {
      key_result_id: z.string().min(1).describe("The key result ID to update"),
      steps_current: z.number().optional().describe("Current progress value"),
      steps_start: z.number().optional().describe("New starting value"),
      steps_end: z.number().optional().describe("New target value"),
      note: z.string().optional().describe("Note to add with the update")
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true
    },
    async ({ key_result_id, steps_current, steps_start, steps_end, note }) => {
      try {
        const body: any = {};
        if (steps_current !== undefined) body.steps_current = steps_current;
        if (steps_start !== undefined) body.steps_start = steps_start;
        if (steps_end !== undefined) body.steps_end = steps_end;
        if (note) body.note = note;

        if (Object.keys(body).length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: "No updates specified. Please provide at least one field to update."
            }]
          };
        }

        const response = await fetch(
          `https://api.clickup.com/api/v2/key_result/${key_result_id}`,
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
          throw new Error(`Error updating key result: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        return {
          content: [{
            type: "text" as const,
            text: [
              `Key result updated successfully!`,
              `key_result_id: ${key_result_id}`,
              steps_current !== undefined ? `current_progress: ${steps_current}` : '',
              steps_end !== undefined ? `target: ${steps_end}` : '',
              note ? `note: ${note}` : ''
            ].filter(Boolean).join('\n')
          }]
        };

      } catch (error) {
        console.error('Error updating key result:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error updating key result: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "deleteKeyResult",
    [
      "Delete a key result from a goal.",
      "WARNING: This action cannot be undone.",
      "Use getGoal first to see key results and their IDs."
    ].join("\n"),
    {
      key_result_id: z.string().min(1).describe("The key result ID to delete")
    },
    {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false
    },
    async ({ key_result_id }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/key_result/${key_result_id}`,
          {
            method: 'DELETE',
            headers: { Authorization: CONFIG.apiKey }
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Error deleting key result: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        return {
          content: [{
            type: "text" as const,
            text: `Key result ${key_result_id} deleted successfully.`
          }]
        };

      } catch (error) {
        console.error('Error deleting key result:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error deleting key result: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );
}
