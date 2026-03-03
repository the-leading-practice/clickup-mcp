import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CONFIG } from "../shared/config";

export function registerUserToolsRead(server: McpServer) {
  server.tool(
    "getUser",
    [
      "Get information about a specific user by ID.",
      "Returns user details including name, email, and profile picture.",
      "Use searchTasks or getTaskById to find user IDs from assignees."
    ].join("\n"),
    {
      user_id: z.number().describe("The user ID to get information for")
    },
    {
      readOnlyHint: true
    },
    async ({ user_id }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/team/${CONFIG.teamId}/user/${user_id}`,
          {
            headers: { Authorization: CONFIG.apiKey }
          }
        );

        if (!response.ok) {
          throw new Error(`Error fetching user: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const user = data.user || data.member?.user;

        if (!user) {
          return {
            content: [{
              type: "text" as const,
              text: `User ${user_id} not found.`
            }]
          };
        }

        const lines: string[] = [
          `User Details:`,
          `user_id: ${user.id}`,
          `username: ${user.username || 'Not set'}`,
          `email: ${user.email}`,
          user.profilePicture ? `profile_picture: ${user.profilePicture}` : '',
          user.color ? `color: ${user.color}` : '',
          user.role !== undefined ? `role: ${user.role}` : ''
        ].filter(Boolean);

        return {
          content: [{
            type: "text" as const,
            text: lines.join('\n')
          }]
        };

      } catch (error) {
        console.error('Error getting user:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error getting user: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "getWorkspaceSeats",
    [
      "Get information about workspace seats and member usage.",
      "Shows filled seats and available seats for the workspace.",
      "Useful for understanding workspace capacity."
    ].join("\n"),
    {},
    {
      readOnlyHint: true
    },
    async () => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/team/${CONFIG.teamId}/seats`,
          {
            headers: { Authorization: CONFIG.apiKey }
          }
        );

        if (!response.ok) {
          throw new Error(`Error fetching workspace seats: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        const lines: string[] = [
          `Workspace Seats:`,
          data.filled_member_seats !== undefined ? `filled_member_seats: ${data.filled_member_seats}` : '',
          data.empty_member_seats !== undefined ? `empty_member_seats: ${data.empty_member_seats}` : '',
          data.total_member_seats !== undefined ? `total_member_seats: ${data.total_member_seats}` : '',
          data.filled_guest_seats !== undefined ? `filled_guest_seats: ${data.filled_guest_seats}` : '',
          data.empty_guest_seats !== undefined ? `empty_guest_seats: ${data.empty_guest_seats}` : '',
          data.total_guest_seats !== undefined ? `total_guest_seats: ${data.total_guest_seats}` : ''
        ].filter(Boolean);

        return {
          content: [{
            type: "text" as const,
            text: lines.join('\n')
          }]
        };

      } catch (error) {
        console.error('Error getting workspace seats:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error getting workspace seats: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "getCustomRoles",
    [
      "Get all custom roles defined in the workspace.",
      "Custom roles define specific permission sets beyond default roles.",
      "Requires workspace admin permissions."
    ].join("\n"),
    {},
    {
      readOnlyHint: true
    },
    async () => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/team/${CONFIG.teamId}/customroles`,
          {
            headers: { Authorization: CONFIG.apiKey }
          }
        );

        if (!response.ok) {
          throw new Error(`Error fetching custom roles: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const roles = data.custom_roles || [];

        if (roles.length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: `No custom roles found in workspace.`
            }]
          };
        }

        const lines: string[] = [
          `Custom Roles (${roles.length} total):`,
          ''
        ];

        roles.forEach((role: any) => {
          lines.push(`👤 ${role.name} (role_id: ${role.id})`);
          if (role.members_count !== undefined) {
            lines.push(`   Members: ${role.members_count}`);
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
        console.error('Error getting custom roles:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error getting custom roles: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "getUserGroups",
    [
      "Get all user groups (teams) in the workspace.",
      "User groups are collections of users that can be assigned to tasks.",
      "Returns group names, IDs, and member counts."
    ].join("\n"),
    {},
    {
      readOnlyHint: true
    },
    async () => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/team/${CONFIG.teamId}/group`,
          {
            headers: { Authorization: CONFIG.apiKey }
          }
        );

        if (!response.ok) {
          throw new Error(`Error fetching user groups: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const groups = data.groups || [];

        if (groups.length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: `No user groups found in workspace.`
            }]
          };
        }

        const lines: string[] = [
          `User Groups (${groups.length} total):`,
          ''
        ];

        groups.forEach((group: any) => {
          lines.push(`👥 ${group.name} (group_id: ${group.id})`);
          if (group.members && group.members.length > 0) {
            lines.push(`   Members: ${group.members.length}`);
            const memberNames = group.members.slice(0, 5).map((m: any) => m.username || m.email).join(', ');
            lines.push(`   ${memberNames}${group.members.length > 5 ? ` and ${group.members.length - 5} more` : ''}`);
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
        console.error('Error getting user groups:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error getting user groups: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "getTaskGuests",
    [
      "Get guests who have access to a specific task.",
      "Guests are external users with limited workspace access.",
      "Returns guest email, permissions, and invite status."
    ].join("\n"),
    {
      task_id: z.string().min(6).max(9).describe("The task ID to get guests for")
    },
    {
      readOnlyHint: true
    },
    async ({ task_id }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/task/${task_id}/guest`,
          {
            headers: { Authorization: CONFIG.apiKey }
          }
        );

        if (!response.ok) {
          throw new Error(`Error fetching task guests: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const guests = data.guests || [];

        if (guests.length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: `No guests found for task ${task_id}.`
            }]
          };
        }

        const lines: string[] = [
          `Task Guests (${guests.length} total):`,
          ''
        ];

        guests.forEach((guest: any) => {
          lines.push(`👤 ${guest.email} (guest_id: ${guest.id})`);
          if (guest.permission_level) lines.push(`   Permission: ${guest.permission_level}`);
          if (guest.invite_status) lines.push(`   Status: ${guest.invite_status}`);
          lines.push('');
        });

        return {
          content: [{
            type: "text" as const,
            text: lines.join('\n')
          }]
        };

      } catch (error) {
        console.error('Error getting task guests:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error getting task guests: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "getListGuests",
    [
      "Get guests who have access to a specific list.",
      "Guests are external users with limited workspace access.",
      "Returns guest email, permissions, and invite status."
    ].join("\n"),
    {
      list_id: z.string().min(1).describe("The list ID to get guests for")
    },
    {
      readOnlyHint: true
    },
    async ({ list_id }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/list/${list_id}/guest`,
          {
            headers: { Authorization: CONFIG.apiKey }
          }
        );

        if (!response.ok) {
          throw new Error(`Error fetching list guests: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const guests = data.guests || [];

        if (guests.length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: `No guests found for list ${list_id}.`
            }]
          };
        }

        const lines: string[] = [
          `List Guests (${guests.length} total):`,
          ''
        ];

        guests.forEach((guest: any) => {
          lines.push(`👤 ${guest.email} (guest_id: ${guest.id})`);
          if (guest.permission_level) lines.push(`   Permission: ${guest.permission_level}`);
          lines.push('');
        });

        return {
          content: [{
            type: "text" as const,
            text: lines.join('\n')
          }]
        };

      } catch (error) {
        console.error('Error getting list guests:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error getting list guests: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "getFolderGuests",
    [
      "Get guests who have access to a specific folder.",
      "Guests are external users with limited workspace access.",
      "Returns guest email, permissions, and invite status."
    ].join("\n"),
    {
      folder_id: z.string().min(1).describe("The folder ID to get guests for")
    },
    {
      readOnlyHint: true
    },
    async ({ folder_id }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/folder/${folder_id}/guest`,
          {
            headers: { Authorization: CONFIG.apiKey }
          }
        );

        if (!response.ok) {
          throw new Error(`Error fetching folder guests: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const guests = data.guests || [];

        if (guests.length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: `No guests found for folder ${folder_id}.`
            }]
          };
        }

        const lines: string[] = [
          `Folder Guests (${guests.length} total):`,
          ''
        ];

        guests.forEach((guest: any) => {
          lines.push(`👤 ${guest.email} (guest_id: ${guest.id})`);
          if (guest.permission_level) lines.push(`   Permission: ${guest.permission_level}`);
          lines.push('');
        });

        return {
          content: [{
            type: "text" as const,
            text: lines.join('\n')
          }]
        };

      } catch (error) {
        console.error('Error getting folder guests:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error getting folder guests: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "getGuest",
    "Get details about a specific guest in the workspace. Returns guest email, permissions, and access information.",
    {
      guest_id: z.number().describe("The guest ID to retrieve")
    },
    {
      readOnlyHint: true
    },
    async ({ guest_id }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/team/${CONFIG.teamId}/guest/${guest_id}`,
          {
            headers: { Authorization: CONFIG.apiKey }
          }
        );

        if (!response.ok) {
          throw new Error(`Error fetching guest: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const guest = data.guest || data.member?.user;

        if (!guest) {
          return {
            content: [{
              type: "text" as const,
              text: `Guest ${guest_id} not found.`
            }]
          };
        }

        const lines: string[] = [
          `Guest Details:`,
          `guest_id: ${guest.id}`,
          guest.email ? `email: ${guest.email}` : '',
          guest.username ? `username: ${guest.username}` : '',
          guest.permission_level ? `permissions: ${guest.permission_level}` : '',
          guest.invite_status ? `invite_status: ${guest.invite_status}` : '',
          guest.can_edit_tags !== undefined ? `can_edit_tags: ${guest.can_edit_tags}` : '',
          guest.can_see_time_spent !== undefined ? `can_see_time_spent: ${guest.can_see_time_spent}` : '',
          guest.can_see_time_estimated !== undefined ? `can_see_time_estimated: ${guest.can_see_time_estimated}` : ''
        ].filter(Boolean);

        return {
          content: [{
            type: "text" as const,
            text: lines.join('\n')
          }]
        };

      } catch (error) {
        console.error('Error getting guest:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error getting guest: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "getAuthorizedWorkspaces",
    "Get all workspaces (teams) that the authenticated user has access to. Returns workspace names, IDs, and member counts.",
    {},
    {
      readOnlyHint: true
    },
    async () => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/team`,
          {
            headers: { Authorization: CONFIG.apiKey }
          }
        );

        if (!response.ok) {
          throw new Error(`Error fetching workspaces: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const teams = data.teams || [];

        if (teams.length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: `No workspaces found.`
            }]
          };
        }

        const lines: string[] = [
          `Authorized Workspaces (${teams.length} total):`,
          ''
        ];

        teams.forEach((team: any) => {
          lines.push(`Workspace: ${team.name} (id: ${team.id})`);
          if (team.members && team.members.length > 0) {
            lines.push(`   member_count: ${team.members.length}`);
          }
          if (team.color) lines.push(`   color: ${team.color}`);
          lines.push('');
        });

        return {
          content: [{
            type: "text" as const,
            text: lines.join('\n')
          }]
        };

      } catch (error) {
        console.error('Error getting authorized workspaces:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error getting authorized workspaces: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "getWorkspacePlan",
    "Get the current plan information for the workspace. Shows plan tier, features, and limits.",
    {},
    {
      readOnlyHint: true
    },
    async () => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/team/${CONFIG.teamId}/plan`,
          {
            headers: { Authorization: CONFIG.apiKey }
          }
        );

        if (!response.ok) {
          throw new Error(`Error fetching workspace plan: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const plan = data.plan || data;

        const lines: string[] = [
          `Workspace Plan:`,
          plan.name ? `name: ${plan.name}` : '',
          plan.tier !== undefined ? `tier: ${plan.tier}` : '',
          plan.members_limit !== undefined ? `members_limit: ${plan.members_limit}` : '',
          plan.guests_limit !== undefined ? `guests_limit: ${plan.guests_limit}` : '',
          plan.storage !== undefined ? `storage: ${plan.storage}` : '',
          plan.max_lists_per_space !== undefined ? `max_lists_per_space: ${plan.max_lists_per_space}` : ''
        ].filter(Boolean);

        return {
          content: [{
            type: "text" as const,
            text: lines.join('\n')
          }]
        };

      } catch (error) {
        console.error('Error getting workspace plan:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error getting workspace plan: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );
}

export function registerUserToolsWrite(server: McpServer) {
  server.tool(
    "inviteUserToWorkspace",
    [
      "Invite a new user to the workspace.",
      "The user will receive an email invitation to join.",
      "Requires workspace admin permissions."
    ].join("\n"),
    {
      email: z.string().email().describe("Email address of the user to invite"),
      admin: z.boolean().optional().describe("Whether to give admin permissions (default: false)"),
      custom_role_id: z.number().optional().describe("Custom role ID to assign")
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false
    },
    async ({ email, admin, custom_role_id }) => {
      try {
        const body: any = { email };
        if (admin !== undefined) body.admin = admin;
        if (custom_role_id) body.custom_role_id = custom_role_id;

        const response = await fetch(
          `https://api.clickup.com/api/v2/team/${CONFIG.teamId}/user`,
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
          throw new Error(`Error inviting user: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        const user = data.user || data.member?.user;

        return {
          content: [{
            type: "text" as const,
            text: [
              `User invitation sent successfully!`,
              `email: ${email}`,
              user?.id ? `user_id: ${user.id}` : '',
              admin ? `admin: ${admin}` : ''
            ].filter(Boolean).join('\n')
          }]
        };

      } catch (error) {
        console.error('Error inviting user:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error inviting user: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "editUserOnWorkspace",
    [
      "Edit a user's settings on the workspace.",
      "Can modify admin status and custom role.",
      "Requires workspace admin permissions."
    ].join("\n"),
    {
      user_id: z.number().describe("The user ID to edit"),
      username: z.string().optional().describe("New username"),
      admin: z.boolean().optional().describe("Set admin status"),
      custom_role_id: z.number().optional().describe("New custom role ID")
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true
    },
    async ({ user_id, username, admin, custom_role_id }) => {
      try {
        const body: any = {};
        if (username) body.username = username;
        if (admin !== undefined) body.admin = admin;
        if (custom_role_id) body.custom_role_id = custom_role_id;

        if (Object.keys(body).length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: "No updates specified. Please provide at least one field to update."
            }]
          };
        }

        const response = await fetch(
          `https://api.clickup.com/api/v2/team/${CONFIG.teamId}/user/${user_id}`,
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
          throw new Error(`Error editing user: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        return {
          content: [{
            type: "text" as const,
            text: [
              `User updated successfully!`,
              `user_id: ${user_id}`,
              username ? `username: ${username}` : '',
              admin !== undefined ? `admin: ${admin}` : ''
            ].filter(Boolean).join('\n')
          }]
        };

      } catch (error) {
        console.error('Error editing user:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error editing user: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "removeUserFromWorkspace",
    [
      "Remove a user from the workspace.",
      "WARNING: This will revoke all their access to the workspace.",
      "Requires workspace admin permissions."
    ].join("\n"),
    {
      user_id: z.number().describe("The user ID to remove")
    },
    {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false
    },
    async ({ user_id }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/team/${CONFIG.teamId}/user/${user_id}`,
          {
            method: 'DELETE',
            headers: { Authorization: CONFIG.apiKey }
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Error removing user: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        return {
          content: [{
            type: "text" as const,
            text: `User ${user_id} removed from workspace successfully.`
          }]
        };

      } catch (error) {
        console.error('Error removing user:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error removing user: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "createUserGroup",
    [
      "Create a new user group (team) in the workspace.",
      "User groups can be assigned to tasks as a unit.",
      "Optionally add initial members when creating."
    ].join("\n"),
    {
      name: z.string().min(1).describe("Name for the user group"),
      member_ids: z.array(z.number()).optional().describe("Initial member user IDs to add")
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false
    },
    async ({ name, member_ids }) => {
      try {
        const body: any = { name };
        if (member_ids && member_ids.length > 0) {
          body.members = member_ids;
        }

        const response = await fetch(
          `https://api.clickup.com/api/v2/team/${CONFIG.teamId}/group`,
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
          throw new Error(`Error creating user group: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        const group = data.group;

        return {
          content: [{
            type: "text" as const,
            text: [
              `User group created successfully!`,
              `group_id: ${group?.id || 'unknown'}`,
              `name: ${name}`,
              member_ids && member_ids.length > 0 ? `members: ${member_ids.length}` : ''
            ].filter(Boolean).join('\n')
          }]
        };

      } catch (error) {
        console.error('Error creating user group:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error creating user group: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "updateUserGroup",
    [
      "Update a user group's name or members.",
      "Can add or remove members from the group.",
      "Use getUserGroups to find group IDs."
    ].join("\n"),
    {
      group_id: z.string().min(1).describe("The group ID to update"),
      name: z.string().optional().describe("New name for the group"),
      add_members: z.array(z.number()).optional().describe("User IDs to add to the group"),
      remove_members: z.array(z.number()).optional().describe("User IDs to remove from the group")
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true
    },
    async ({ group_id, name, add_members, remove_members }) => {
      try {
        const body: any = {};
        if (name) body.name = name;
        if (add_members && add_members.length > 0) {
          body.members = { add: add_members };
        }
        if (remove_members && remove_members.length > 0) {
          body.members = body.members || {};
          body.members.rem = remove_members;
        }

        if (Object.keys(body).length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: "No updates specified. Please provide name, add_members, or remove_members."
            }]
          };
        }

        const response = await fetch(
          `https://api.clickup.com/api/v2/group/${group_id}`,
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
          throw new Error(`Error updating user group: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        return {
          content: [{
            type: "text" as const,
            text: [
              `User group updated successfully!`,
              `group_id: ${group_id}`,
              name ? `name: ${name}` : '',
              add_members && add_members.length > 0 ? `added_members: ${add_members.length}` : '',
              remove_members && remove_members.length > 0 ? `removed_members: ${remove_members.length}` : ''
            ].filter(Boolean).join('\n')
          }]
        };

      } catch (error) {
        console.error('Error updating user group:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error updating user group: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "deleteUserGroup",
    [
      "Delete a user group from the workspace.",
      "WARNING: This cannot be undone.",
      "Use getUserGroups to find group IDs."
    ].join("\n"),
    {
      group_id: z.string().min(1).describe("The group ID to delete")
    },
    {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false
    },
    async ({ group_id }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/group/${group_id}`,
          {
            method: 'DELETE',
            headers: { Authorization: CONFIG.apiKey }
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Error deleting user group: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        return {
          content: [{
            type: "text" as const,
            text: `User group ${group_id} deleted successfully.`
          }]
        };

      } catch (error) {
        console.error('Error deleting user group:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error deleting user group: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "addGuestToTask",
    [
      "Add a guest to a task with specific permission level.",
      "Guests are external users with limited access.",
      "Permission levels: read, comment, edit, create."
    ].join("\n"),
    {
      task_id: z.string().min(6).max(9).describe("The task ID to add the guest to"),
      guest_id: z.number().describe("The guest's user ID"),
      permission_level: z.enum(['read', 'comment', 'edit', 'create']).describe("Permission level for the guest")
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true
    },
    async ({ task_id, guest_id, permission_level }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/task/${task_id}/guest/${guest_id}`,
          {
            method: 'POST',
            headers: {
              Authorization: CONFIG.apiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ permission_level })
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Error adding guest to task: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        return {
          content: [{
            type: "text" as const,
            text: [
              `Guest added to task successfully!`,
              `task_id: ${task_id}`,
              `guest_id: ${guest_id}`,
              `permission_level: ${permission_level}`
            ].join('\n')
          }]
        };

      } catch (error) {
        console.error('Error adding guest to task:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error adding guest to task: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "removeGuestFromTask",
    [
      "Remove a guest's access to a task.",
      "Use getTaskGuests to find guest IDs."
    ].join("\n"),
    {
      task_id: z.string().min(6).max(9).describe("The task ID to remove the guest from"),
      guest_id: z.number().describe("The guest's user ID to remove")
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true
    },
    async ({ task_id, guest_id }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/task/${task_id}/guest/${guest_id}`,
          {
            method: 'DELETE',
            headers: { Authorization: CONFIG.apiKey }
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Error removing guest from task: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        return {
          content: [{
            type: "text" as const,
            text: `Guest ${guest_id} removed from task ${task_id} successfully.`
          }]
        };

      } catch (error) {
        console.error('Error removing guest from task:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error removing guest from task: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "addGuestToList",
    [
      "Add a guest to a list with specific permission level.",
      "Guests are external users with limited access."
    ].join("\n"),
    {
      list_id: z.string().min(1).describe("The list ID to add the guest to"),
      guest_id: z.number().describe("The guest's user ID"),
      permission_level: z.enum(['read', 'comment', 'edit', 'create']).describe("Permission level for the guest")
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true
    },
    async ({ list_id, guest_id, permission_level }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/list/${list_id}/guest/${guest_id}`,
          {
            method: 'POST',
            headers: {
              Authorization: CONFIG.apiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ permission_level })
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Error adding guest to list: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        return {
          content: [{
            type: "text" as const,
            text: [
              `Guest added to list successfully!`,
              `list_id: ${list_id}`,
              `guest_id: ${guest_id}`,
              `permission_level: ${permission_level}`
            ].join('\n')
          }]
        };

      } catch (error) {
        console.error('Error adding guest to list:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error adding guest to list: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "removeGuestFromList",
    [
      "Remove a guest's access to a list.",
      "Use getListGuests to find guest IDs."
    ].join("\n"),
    {
      list_id: z.string().min(1).describe("The list ID to remove the guest from"),
      guest_id: z.number().describe("The guest's user ID to remove")
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true
    },
    async ({ list_id, guest_id }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/list/${list_id}/guest/${guest_id}`,
          {
            method: 'DELETE',
            headers: { Authorization: CONFIG.apiKey }
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Error removing guest from list: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        return {
          content: [{
            type: "text" as const,
            text: `Guest ${guest_id} removed from list ${list_id} successfully.`
          }]
        };

      } catch (error) {
        console.error('Error removing guest from list:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error removing guest from list: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "addGuestToFolder",
    [
      "Add a guest to a folder with specific permission level.",
      "Guests are external users with limited access."
    ].join("\n"),
    {
      folder_id: z.string().min(1).describe("The folder ID to add the guest to"),
      guest_id: z.number().describe("The guest's user ID"),
      permission_level: z.enum(['read', 'comment', 'edit', 'create']).describe("Permission level for the guest")
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true
    },
    async ({ folder_id, guest_id, permission_level }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/folder/${folder_id}/guest/${guest_id}`,
          {
            method: 'POST',
            headers: {
              Authorization: CONFIG.apiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ permission_level })
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Error adding guest to folder: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        return {
          content: [{
            type: "text" as const,
            text: [
              `Guest added to folder successfully!`,
              `folder_id: ${folder_id}`,
              `guest_id: ${guest_id}`,
              `permission_level: ${permission_level}`
            ].join('\n')
          }]
        };

      } catch (error) {
        console.error('Error adding guest to folder:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error adding guest to folder: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "removeGuestFromFolder",
    [
      "Remove a guest's access to a folder.",
      "Use getFolderGuests to find guest IDs."
    ].join("\n"),
    {
      folder_id: z.string().min(1).describe("The folder ID to remove the guest from"),
      guest_id: z.number().describe("The guest's user ID to remove")
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true
    },
    async ({ folder_id, guest_id }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/folder/${folder_id}/guest/${guest_id}`,
          {
            method: 'DELETE',
            headers: { Authorization: CONFIG.apiKey }
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Error removing guest from folder: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        return {
          content: [{
            type: "text" as const,
            text: `Guest ${guest_id} removed from folder ${folder_id} successfully.`
          }]
        };

      } catch (error) {
        console.error('Error removing guest from folder:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error removing guest from folder: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "inviteGuestToWorkspace",
    "Invite an external guest to the workspace. Guests have limited access and can only see items explicitly shared with them.",
    {
      email: z.string().email().describe("Email address of the guest to invite"),
      can_edit_tags: z.boolean().optional().describe("Whether the guest can edit tags"),
      can_see_time_spent: z.boolean().optional().describe("Whether the guest can see time tracking data"),
      can_see_time_estimated: z.boolean().optional().describe("Whether the guest can see time estimates")
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false
    },
    async ({ email, can_edit_tags, can_see_time_spent, can_see_time_estimated }) => {
      try {
        const body: any = { email };
        if (can_edit_tags !== undefined) body.can_edit_tags = can_edit_tags;
        if (can_see_time_spent !== undefined) body.can_see_time_spent = can_see_time_spent;
        if (can_see_time_estimated !== undefined) body.can_see_time_estimated = can_see_time_estimated;

        const response = await fetch(
          `https://api.clickup.com/api/v2/team/${CONFIG.teamId}/guest`,
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
          throw new Error(`Error inviting guest: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        const guest = data.guest || data.member?.user;

        return {
          content: [{
            type: "text" as const,
            text: [
              `Guest invitation sent successfully!`,
              `email: ${email}`,
              guest?.id ? `guest_id: ${guest.id}` : '',
              can_edit_tags !== undefined ? `can_edit_tags: ${can_edit_tags}` : '',
              can_see_time_spent !== undefined ? `can_see_time_spent: ${can_see_time_spent}` : '',
              can_see_time_estimated !== undefined ? `can_see_time_estimated: ${can_see_time_estimated}` : ''
            ].filter(Boolean).join('\n')
          }]
        };

      } catch (error) {
        console.error('Error inviting guest:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error inviting guest: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "editGuestOnWorkspace",
    "Edit a guest's permissions and settings on the workspace.",
    {
      guest_id: z.number().describe("The guest ID to edit"),
      can_edit_tags: z.boolean().optional().describe("Whether the guest can edit tags"),
      can_see_time_spent: z.boolean().optional().describe("Whether the guest can see time tracking data"),
      can_see_time_estimated: z.boolean().optional().describe("Whether the guest can see time estimates")
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true
    },
    async ({ guest_id, can_edit_tags, can_see_time_spent, can_see_time_estimated }) => {
      try {
        const body: any = {};
        if (can_edit_tags !== undefined) body.can_edit_tags = can_edit_tags;
        if (can_see_time_spent !== undefined) body.can_see_time_spent = can_see_time_spent;
        if (can_see_time_estimated !== undefined) body.can_see_time_estimated = can_see_time_estimated;

        if (Object.keys(body).length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: "No updates specified. Please provide at least one field to update."
            }]
          };
        }

        const response = await fetch(
          `https://api.clickup.com/api/v2/team/${CONFIG.teamId}/guest/${guest_id}`,
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
          throw new Error(`Error editing guest: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        return {
          content: [{
            type: "text" as const,
            text: [
              `Guest updated successfully!`,
              `guest_id: ${guest_id}`,
              can_edit_tags !== undefined ? `can_edit_tags: ${can_edit_tags}` : '',
              can_see_time_spent !== undefined ? `can_see_time_spent: ${can_see_time_spent}` : '',
              can_see_time_estimated !== undefined ? `can_see_time_estimated: ${can_see_time_estimated}` : ''
            ].filter(Boolean).join('\n')
          }]
        };

      } catch (error) {
        console.error('Error editing guest:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error editing guest: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "removeGuestFromWorkspace",
    "Remove a guest from the workspace entirely. WARNING: This revokes all their access to shared items.",
    {
      guest_id: z.number().describe("The guest ID to remove")
    },
    {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false
    },
    async ({ guest_id }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/team/${CONFIG.teamId}/guest/${guest_id}`,
          {
            method: 'DELETE',
            headers: { Authorization: CONFIG.apiKey }
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Error removing guest: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        return {
          content: [{
            type: "text" as const,
            text: `Guest ${guest_id} removed from workspace successfully.`
          }]
        };

      } catch (error) {
        console.error('Error removing guest from workspace:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error removing guest from workspace: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );
}
