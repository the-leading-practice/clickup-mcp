import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CONFIG } from "../shared/config";

const CHAT_BASE = `https://api.clickup.com/api/v3/workspaces/${CONFIG.teamId}/chat`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatChannel(channel: any): string {
  const lines = [
    `**${channel.name}** (channel_id: ${channel.id})`,
    channel.type ? `Type: ${channel.type}` : null,
    channel.description ? `Description: ${channel.description}` : null,
    channel.member_count !== undefined ? `Members: ${channel.member_count}` : null,
    channel.created_at ? `Created: ${new Date(channel.created_at).toLocaleString()}` : null,
  ].filter(Boolean);

  return lines.join("\n");
}

function formatMessage(message: any): string {
  const author =
    message.user?.username ||
    message.user?.email ||
    `user_id: ${message.user?.id}` ||
    "Unknown";
  const date = message.date
    ? new Date(parseInt(message.date)).toLocaleString()
    : message.created_at
    ? new Date(message.created_at).toLocaleString()
    : "unknown date";

  const lines = [
    `**${author}** (message_id: ${message.id}) — ${date}`,
    message.content || message.comment_text || "(no content)",
    message.subtype_id ? `Subtype: ${message.subtype_id}` : null,
    message.reaction_count ? `Reactions: ${message.reaction_count}` : null,
    message.reply_count ? `Replies: ${message.reply_count}` : null,
  ].filter(Boolean);

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// READ tools
// ---------------------------------------------------------------------------

export function registerChatToolsRead(server: McpServer) {
  // 1. getChatChannels
  server.tool(
    "getChatChannels",
    "List chat channels in the workspace. Can filter by type (public, private, direct) and location.",
    {
      type: z
        .enum(["public", "private", "direct"])
        .optional()
        .describe("Filter channels by type: public, private, or direct"),
      space_id: z.string().optional().describe("Filter channels attached to this space ID"),
      folder_id: z.string().optional().describe("Filter channels attached to this folder ID"),
      list_id: z.string().optional().describe("Filter channels attached to this list ID"),
    },
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    async ({ type, space_id, folder_id, list_id }) => {
      try {
        const params = new URLSearchParams();
        if (type) params.append("type", type);
        if (space_id) params.append("space_id", space_id);
        if (folder_id) params.append("folder_id", folder_id);
        if (list_id) params.append("list_id", list_id);

        const url = `${CHAT_BASE}/channels${params.toString() ? "?" + params.toString() : ""}`;
        const response = await fetch(url, {
          headers: { Authorization: CONFIG.apiKey },
        });

        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: [
              {
                type: "text" as const,
                text: `Error fetching chat channels: ${response.status} - ${errorText}`,
              },
            ],
            isError: true,
          };
        }

        const data = await response.json();
        const channels: any[] = data.channels || data.data || data || [];

        if (!Array.isArray(channels) || channels.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "No chat channels found matching the given filters.",
              },
            ],
          };
        }

        const formatted = channels.map(formatChannel).join("\n\n---\n\n");
        return {
          content: [
            {
              type: "text" as const,
              text: `# Chat Channels (${channels.length})\n\n${formatted}`,
            },
          ],
        };
      } catch (error) {
        console.error("Error fetching chat channels:", error);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // 2. getChatChannel
  server.tool(
    "getChatChannel",
    "Get details about a specific chat channel.",
    {
      channel_id: z.string().min(1).describe("The channel ID to retrieve details for"),
    },
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    async ({ channel_id }) => {
      try {
        const response = await fetch(`${CHAT_BASE}/channels/${channel_id}`, {
          headers: { Authorization: CONFIG.apiKey },
        });

        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: [
              {
                type: "text" as const,
                text: `Error fetching channel: ${response.status} - ${errorText}`,
              },
            ],
            isError: true,
          };
        }

        const data = await response.json();
        const channel = data.channel || data;

        return {
          content: [
            {
              type: "text" as const,
              text: `# Chat Channel\n\n${formatChannel(channel)}`,
            },
          ],
        };
      } catch (error) {
        console.error("Error fetching chat channel:", error);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // 3. getChatChannelMembers
  server.tool(
    "getChatChannelMembers",
    "Get members of a chat channel.",
    {
      channel_id: z.string().min(1).describe("The channel ID to get members for"),
    },
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    async ({ channel_id }) => {
      try {
        const response = await fetch(
          `${CHAT_BASE}/channels/${channel_id}/members`,
          { headers: { Authorization: CONFIG.apiKey } }
        );

        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: [
              {
                type: "text" as const,
                text: `Error fetching channel members: ${response.status} - ${errorText}`,
              },
            ],
            isError: true,
          };
        }

        const data = await response.json();
        const members: any[] = data.members || data.data || data || [];

        if (!Array.isArray(members) || members.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No members found for channel ${channel_id}.`,
              },
            ],
          };
        }

        const lines = members.map((m: any) => {
          const name = m.username || m.email || "Unknown";
          return `- ${name} (user_id: ${m.id})`;
        });

        return {
          content: [
            {
              type: "text" as const,
              text: `# Channel Members (${members.length}) — channel_id: ${channel_id}\n\n${lines.join("\n")}`,
            },
          ],
        };
      } catch (error) {
        console.error("Error fetching channel members:", error);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // 4. getChatChannelFollowers
  server.tool(
    "getChatChannelFollowers",
    "Get followers of a chat channel.",
    {
      channel_id: z.string().min(1).describe("The channel ID to get followers for"),
    },
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    async ({ channel_id }) => {
      try {
        const response = await fetch(
          `${CHAT_BASE}/channels/${channel_id}/followers`,
          { headers: { Authorization: CONFIG.apiKey } }
        );

        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: [
              {
                type: "text" as const,
                text: `Error fetching channel followers: ${response.status} - ${errorText}`,
              },
            ],
            isError: true,
          };
        }

        const data = await response.json();
        const followers: any[] = data.followers || data.data || data || [];

        if (!Array.isArray(followers) || followers.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No followers found for channel ${channel_id}.`,
              },
            ],
          };
        }

        const lines = followers.map((f: any) => {
          const name = f.username || f.email || "Unknown";
          return `- ${name} (user_id: ${f.id})`;
        });

        return {
          content: [
            {
              type: "text" as const,
              text: `# Channel Followers (${followers.length}) — channel_id: ${channel_id}\n\n${lines.join("\n")}`,
            },
          ],
        };
      } catch (error) {
        console.error("Error fetching channel followers:", error);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // 5. getChatMessages
  server.tool(
    "getChatMessages",
    "Get messages from a chat channel. Supports pagination via cursors.",
    {
      channel_id: z.string().min(1).describe("The channel ID to get messages from"),
      limit: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Maximum number of messages to return"),
      start: z
        .string()
        .optional()
        .describe("Cursor for pagination — returns messages after this cursor"),
      end: z
        .string()
        .optional()
        .describe("Cursor for pagination — returns messages before this cursor"),
    },
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    async ({ channel_id, limit, start, end }) => {
      try {
        const params = new URLSearchParams();
        if (limit !== undefined) params.append("limit", limit.toString());
        if (start) params.append("start", start);
        if (end) params.append("end", end);

        const url = `${CHAT_BASE}/channels/${channel_id}/messages${
          params.toString() ? "?" + params.toString() : ""
        }`;
        const response = await fetch(url, {
          headers: { Authorization: CONFIG.apiKey },
        });

        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: [
              {
                type: "text" as const,
                text: `Error fetching messages: ${response.status} - ${errorText}`,
              },
            ],
            isError: true,
          };
        }

        const data = await response.json();
        const messages: any[] = data.messages || data.data || data || [];

        if (!Array.isArray(messages) || messages.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No messages found in channel ${channel_id}.`,
              },
            ],
          };
        }

        const formatted = messages.map(formatMessage).join("\n\n---\n\n");
        const nextCursor = data.next_cursor || data.cursor || null;

        const header = `# Messages in Channel ${channel_id} (${messages.length} returned)${
          nextCursor ? `\nNext cursor: ${nextCursor}` : ""
        }`;

        return {
          content: [
            {
              type: "text" as const,
              text: `${header}\n\n${formatted}`,
            },
          ],
        };
      } catch (error) {
        console.error("Error fetching chat messages:", error);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // 6. getChatMessageReactions
  server.tool(
    "getChatMessageReactions",
    "Get reactions on a specific chat message.",
    {
      channel_id: z.string().min(1).describe("The channel ID containing the message"),
      message_id: z.string().min(1).describe("The message ID to get reactions for"),
    },
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    async ({ channel_id, message_id }) => {
      try {
        const response = await fetch(
          `${CHAT_BASE}/channels/${channel_id}/messages/${message_id}/reactions`,
          { headers: { Authorization: CONFIG.apiKey } }
        );

        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: [
              {
                type: "text" as const,
                text: `Error fetching reactions: ${response.status} - ${errorText}`,
              },
            ],
            isError: true,
          };
        }

        const data = await response.json();
        const reactions: any[] = data.reactions || data.data || data || [];

        if (!Array.isArray(reactions) || reactions.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No reactions found on message ${message_id}.`,
              },
            ],
          };
        }

        const lines = reactions.map((r: any) => {
          const users = Array.isArray(r.users)
            ? r.users.map((u: any) => u.username || u.email || `user_id: ${u.id}`).join(", ")
            : "";
          return `${r.emoji || r.reaction} — ${r.count || (Array.isArray(r.users) ? r.users.length : 1)} reaction(s)${users ? ` from: ${users}` : ""}`;
        });

        return {
          content: [
            {
              type: "text" as const,
              text: `# Reactions on Message ${message_id}\n\n${lines.join("\n")}`,
            },
          ],
        };
      } catch (error) {
        console.error("Error fetching message reactions:", error);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // 7. getChatMessageReplies
  server.tool(
    "getChatMessageReplies",
    "Get replies to a specific chat message (thread).",
    {
      channel_id: z.string().min(1).describe("The channel ID containing the message"),
      message_id: z.string().min(1).describe("The message ID to get replies for"),
      limit: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Maximum number of replies to return"),
      start: z
        .string()
        .optional()
        .describe("Cursor for pagination — returns replies after this cursor"),
    },
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    async ({ channel_id, message_id, limit, start }) => {
      try {
        const params = new URLSearchParams();
        if (limit !== undefined) params.append("limit", limit.toString());
        if (start) params.append("start", start);

        const url = `${CHAT_BASE}/channels/${channel_id}/messages/${message_id}/replies${
          params.toString() ? "?" + params.toString() : ""
        }`;
        const response = await fetch(url, {
          headers: { Authorization: CONFIG.apiKey },
        });

        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: [
              {
                type: "text" as const,
                text: `Error fetching replies: ${response.status} - ${errorText}`,
              },
            ],
            isError: true,
          };
        }

        const data = await response.json();
        const replies: any[] = data.replies || data.messages || data.data || data || [];

        if (!Array.isArray(replies) || replies.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No replies found for message ${message_id}.`,
              },
            ],
          };
        }

        const formatted = replies.map(formatMessage).join("\n\n---\n\n");
        const nextCursor = data.next_cursor || data.cursor || null;

        const header = `# Replies to Message ${message_id} (${replies.length} returned)${
          nextCursor ? `\nNext cursor: ${nextCursor}` : ""
        }`;

        return {
          content: [
            {
              type: "text" as const,
              text: `${header}\n\n${formatted}`,
            },
          ],
        };
      } catch (error) {
        console.error("Error fetching message replies:", error);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // 8. getChatMessageTaggedUsers
  server.tool(
    "getChatMessageTaggedUsers",
    "Get users tagged/mentioned in a chat message.",
    {
      channel_id: z.string().min(1).describe("The channel ID containing the message"),
      message_id: z.string().min(1).describe("The message ID to get tagged users for"),
    },
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    async ({ channel_id, message_id }) => {
      try {
        const response = await fetch(
          `${CHAT_BASE}/channels/${channel_id}/messages/${message_id}/tagged_users`,
          { headers: { Authorization: CONFIG.apiKey } }
        );

        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: [
              {
                type: "text" as const,
                text: `Error fetching tagged users: ${response.status} - ${errorText}`,
              },
            ],
            isError: true,
          };
        }

        const data = await response.json();
        const users: any[] = data.users || data.tagged_users || data.data || data || [];

        if (!Array.isArray(users) || users.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No tagged users found in message ${message_id}.`,
              },
            ],
          };
        }

        const lines = users.map((u: any) => {
          const name = u.username || u.email || "Unknown";
          return `- ${name} (user_id: ${u.id})`;
        });

        return {
          content: [
            {
              type: "text" as const,
              text: `# Tagged Users in Message ${message_id} (${users.length})\n\n${lines.join("\n")}`,
            },
          ],
        };
      } catch (error) {
        console.error("Error fetching tagged users:", error);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // 9. getChatPostSubtypes
  server.tool(
    "getChatPostSubtypes",
    "Get available post subtype IDs for structured chat posts (announcements, discussions, ideas, updates).",
    {
      comment_type: z
        .enum(["announcement", "discussion", "idea", "update"])
        .describe("The post type to get subtypes for"),
    },
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    async ({ comment_type }) => {
      try {
        const url = `https://api.clickup.com/api/v3/workspaces/${CONFIG.teamId}/comments/types/${comment_type}/subtypes`;
        const response = await fetch(url, {
          headers: { Authorization: CONFIG.apiKey },
        });

        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: [
              {
                type: "text" as const,
                text: `Error fetching post subtypes: ${response.status} - ${errorText}`,
              },
            ],
            isError: true,
          };
        }

        const data = await response.json();
        const subtypes: any[] = data.subtypes || data.data || data || [];

        if (!Array.isArray(subtypes) || subtypes.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No subtypes found for comment type "${comment_type}".`,
              },
            ],
          };
        }

        const lines = subtypes.map((s: any) => {
          return `- **${s.name || s.label || s.id}** (subtype_id: ${s.id})${
            s.description ? ` — ${s.description}` : ""
          }`;
        });

        return {
          content: [
            {
              type: "text" as const,
              text: `# Post Subtypes for "${comment_type}" (${subtypes.length})\n\n${lines.join("\n")}`,
            },
          ],
        };
      } catch (error) {
        console.error("Error fetching post subtypes:", error);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}

// ---------------------------------------------------------------------------
// WRITE tools
// ---------------------------------------------------------------------------

export function registerChatToolsWrite(server: McpServer) {
  // 10. createChatChannel
  server.tool(
    "createChatChannel",
    "Create a new chat channel in the workspace.",
    {
      name: z.string().min(1).describe("The name of the new channel"),
      description: z.string().optional().describe("Optional description for the channel"),
      members: z
        .array(z.number().int())
        .optional()
        .describe("Optional list of user IDs to add as members"),
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    async ({ name, description, members }) => {
      try {
        const body: any = { name };
        if (description) body.description = description;
        if (members && members.length > 0) body.members = members;

        const response = await fetch(`${CHAT_BASE}/channels`, {
          method: "POST",
          headers: {
            Authorization: CONFIG.apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: [
              {
                type: "text" as const,
                text: `Error creating chat channel: ${response.status} - ${errorText}`,
              },
            ],
            isError: true,
          };
        }

        const data = await response.json();
        const channel = data.channel || data;

        return {
          content: [
            {
              type: "text" as const,
              text: [
                `# Chat Channel Created`,
                ``,
                formatChannel(channel),
              ].join("\n"),
            },
          ],
        };
      } catch (error) {
        console.error("Error creating chat channel:", error);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // 11. createLocationChatChannel
  server.tool(
    "createLocationChatChannel",
    "Create a chat channel attached to a specific space, folder, or list.",
    {
      name: z.string().min(1).describe("The name of the new channel"),
      space_id: z
        .string()
        .optional()
        .describe("Space ID to attach the channel to"),
      folder_id: z
        .string()
        .optional()
        .describe("Folder ID to attach the channel to"),
      list_id: z
        .string()
        .optional()
        .describe("List ID to attach the channel to"),
      description: z
        .string()
        .optional()
        .describe("Optional description for the channel"),
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    async ({ name, space_id, folder_id, list_id, description }) => {
      try {
        const body: any = { name };
        if (description) body.description = description;
        if (space_id) body.space_id = space_id;
        if (folder_id) body.folder_id = folder_id;
        if (list_id) body.list_id = list_id;

        const response = await fetch(`${CHAT_BASE}/channels/location`, {
          method: "POST",
          headers: {
            Authorization: CONFIG.apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: [
              {
                type: "text" as const,
                text: `Error creating location chat channel: ${response.status} - ${errorText}`,
              },
            ],
            isError: true,
          };
        }

        const data = await response.json();
        const channel = data.channel || data;

        const locationInfo = [
          space_id ? `space_id: ${space_id}` : null,
          folder_id ? `folder_id: ${folder_id}` : null,
          list_id ? `list_id: ${list_id}` : null,
        ]
          .filter(Boolean)
          .join(", ");

        return {
          content: [
            {
              type: "text" as const,
              text: [
                `# Location Chat Channel Created`,
                locationInfo ? `Location: ${locationInfo}` : "",
                ``,
                formatChannel(channel),
              ]
                .filter((l) => l !== "")
                .join("\n"),
            },
          ],
        };
      } catch (error) {
        console.error("Error creating location chat channel:", error);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // 12. createDirectMessage
  server.tool(
    "createDirectMessage",
    "Create a direct message channel with one or more users.",
    {
      member_ids: z
        .array(z.number().int())
        .min(1)
        .describe(
          "User IDs for the DM (1 user ID for a direct message, 2 or more for a group DM)"
        ),
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    async ({ member_ids }) => {
      try {
        const response = await fetch(`${CHAT_BASE}/direct_messages`, {
          method: "POST",
          headers: {
            Authorization: CONFIG.apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ member_ids }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: [
              {
                type: "text" as const,
                text: `Error creating direct message: ${response.status} - ${errorText}`,
              },
            ],
            isError: true,
          };
        }

        const data = await response.json();
        const channel = data.channel || data;
        const dmType = member_ids.length === 1 ? "Direct Message" : "Group DM";

        return {
          content: [
            {
              type: "text" as const,
              text: [
                `# ${dmType} Channel Created`,
                `Members: ${member_ids.join(", ")}`,
                ``,
                formatChannel(channel),
              ].join("\n"),
            },
          ],
        };
      } catch (error) {
        console.error("Error creating direct message:", error);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // 13. updateChatChannel
  server.tool(
    "updateChatChannel",
    "Update a chat channel's name or description.",
    {
      channel_id: z.string().min(1).describe("The channel ID to update"),
      name: z.string().optional().describe("New name for the channel"),
      description: z.string().optional().describe("New description for the channel"),
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    async ({ channel_id, name, description }) => {
      try {
        const body: any = {};
        if (name) body.name = name;
        if (description !== undefined) body.description = description;

        if (Object.keys(body).length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "No updates specified. Provide at least one of: name, description.",
              },
            ],
            isError: true,
          };
        }

        const response = await fetch(`${CHAT_BASE}/channels/${channel_id}`, {
          method: "PATCH",
          headers: {
            Authorization: CONFIG.apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: [
              {
                type: "text" as const,
                text: `Error updating channel: ${response.status} - ${errorText}`,
              },
            ],
            isError: true,
          };
        }

        const data = await response.json();
        const channel = data.channel || data;

        return {
          content: [
            {
              type: "text" as const,
              text: `# Chat Channel Updated\n\n${formatChannel(channel)}`,
            },
          ],
        };
      } catch (error) {
        console.error("Error updating chat channel:", error);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // 14. deleteChatChannel
  server.tool(
    "deleteChatChannel",
    "Delete a chat channel. WARNING: This permanently removes the channel and all its messages.",
    {
      channel_id: z
        .string()
        .min(1)
        .describe("The channel ID to delete"),
    },
    { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    async ({ channel_id }) => {
      try {
        const response = await fetch(`${CHAT_BASE}/channels/${channel_id}`, {
          method: "DELETE",
          headers: { Authorization: CONFIG.apiKey },
        });

        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: [
              {
                type: "text" as const,
                text: `Error deleting channel: ${response.status} - ${errorText}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text" as const,
              text: `Chat channel ${channel_id} has been permanently deleted along with all its messages.`,
            },
          ],
        };
      } catch (error) {
        console.error("Error deleting chat channel:", error);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // 15. sendChatMessage
  server.tool(
    "sendChatMessage",
    "Send a message in a chat channel. Content supports markdown formatting.",
    {
      channel_id: z.string().min(1).describe("The channel ID to send the message to"),
      content: z
        .string()
        .min(1)
        .describe("The message content (supports markdown formatting)"),
      subtype_id: z
        .string()
        .optional()
        .describe(
          "Optional subtype ID for structured posts (use getChatPostSubtypes to find available IDs)"
        ),
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    async ({ channel_id, content, subtype_id }) => {
      try {
        const body: any = { content };
        if (subtype_id) body.subtype_id = subtype_id;

        const response = await fetch(
          `${CHAT_BASE}/channels/${channel_id}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: CONFIG.apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: [
              {
                type: "text" as const,
                text: `Error sending message: ${response.status} - ${errorText}`,
              },
            ],
            isError: true,
          };
        }

        const data = await response.json();
        const message = data.message || data;

        return {
          content: [
            {
              type: "text" as const,
              text: [
                `Message sent successfully!`,
                `channel_id: ${channel_id}`,
                `message_id: ${message.id || "unknown"}`,
                subtype_id ? `subtype_id: ${subtype_id}` : null,
              ]
                .filter(Boolean)
                .join("\n"),
            },
          ],
        };
      } catch (error) {
        console.error("Error sending chat message:", error);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // 16. updateChatMessage
  server.tool(
    "updateChatMessage",
    "Edit an existing chat message.",
    {
      channel_id: z.string().min(1).describe("The channel ID containing the message"),
      message_id: z.string().min(1).describe("The message ID to update"),
      content: z
        .string()
        .min(1)
        .describe("The new content for the message (supports markdown)"),
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    async ({ channel_id, message_id, content }) => {
      try {
        const response = await fetch(
          `${CHAT_BASE}/channels/${channel_id}/messages/${message_id}`,
          {
            method: "PATCH",
            headers: {
              Authorization: CONFIG.apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ content }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: [
              {
                type: "text" as const,
                text: `Error updating message: ${response.status} - ${errorText}`,
              },
            ],
            isError: true,
          };
        }

        const data = await response.json();
        const message = data.message || data;

        return {
          content: [
            {
              type: "text" as const,
              text: [
                `Message updated successfully!`,
                `channel_id: ${channel_id}`,
                `message_id: ${message.id || message_id}`,
              ].join("\n"),
            },
          ],
        };
      } catch (error) {
        console.error("Error updating chat message:", error);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // 17. deleteChatMessage
  server.tool(
    "deleteChatMessage",
    "Delete a chat message.",
    {
      channel_id: z.string().min(1).describe("The channel ID containing the message"),
      message_id: z.string().min(1).describe("The message ID to delete"),
    },
    { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    async ({ channel_id, message_id }) => {
      try {
        const response = await fetch(
          `${CHAT_BASE}/channels/${channel_id}/messages/${message_id}`,
          {
            method: "DELETE",
            headers: { Authorization: CONFIG.apiKey },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: [
              {
                type: "text" as const,
                text: `Error deleting message: ${response.status} - ${errorText}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text" as const,
              text: [
                `Message deleted successfully!`,
                `channel_id: ${channel_id}`,
                `message_id: ${message_id}`,
              ].join("\n"),
            },
          ],
        };
      } catch (error) {
        console.error("Error deleting chat message:", error);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // 18. createChatReaction
  server.tool(
    "createChatReaction",
    "Add a reaction to a chat message.",
    {
      channel_id: z.string().min(1).describe("The channel ID containing the message"),
      message_id: z.string().min(1).describe("The message ID to react to"),
      emoji: z
        .string()
        .min(1)
        .describe("The emoji to react with (e.g. '👍', '❤️', ':thumbsup:')"),
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    async ({ channel_id, message_id, emoji }) => {
      try {
        const response = await fetch(
          `${CHAT_BASE}/channels/${channel_id}/messages/${message_id}/reactions`,
          {
            method: "POST",
            headers: {
              Authorization: CONFIG.apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ emoji }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: [
              {
                type: "text" as const,
                text: `Error adding reaction: ${response.status} - ${errorText}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text" as const,
              text: [
                `Reaction added successfully!`,
                `channel_id: ${channel_id}`,
                `message_id: ${message_id}`,
                `emoji: ${emoji}`,
              ].join("\n"),
            },
          ],
        };
      } catch (error) {
        console.error("Error adding reaction:", error);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // 19. deleteChatReaction
  server.tool(
    "deleteChatReaction",
    "Remove a reaction from a chat message.",
    {
      channel_id: z.string().min(1).describe("The channel ID containing the message"),
      message_id: z.string().min(1).describe("The message ID to remove the reaction from"),
      emoji: z
        .string()
        .min(1)
        .describe("The emoji reaction to remove (e.g. '👍', '❤️', ':thumbsup:')"),
    },
    { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    async ({ channel_id, message_id, emoji }) => {
      try {
        const params = new URLSearchParams({ emoji });
        const response = await fetch(
          `${CHAT_BASE}/channels/${channel_id}/messages/${message_id}/reactions?${params.toString()}`,
          {
            method: "DELETE",
            headers: { Authorization: CONFIG.apiKey },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: [
              {
                type: "text" as const,
                text: `Error removing reaction: ${response.status} - ${errorText}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text" as const,
              text: [
                `Reaction removed successfully!`,
                `channel_id: ${channel_id}`,
                `message_id: ${message_id}`,
                `emoji: ${emoji}`,
              ].join("\n"),
            },
          ],
        };
      } catch (error) {
        console.error("Error removing reaction:", error);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // 20. createChatReply
  server.tool(
    "createChatReply",
    "Reply to a chat message in a thread.",
    {
      channel_id: z.string().min(1).describe("The channel ID containing the message"),
      message_id: z.string().min(1).describe("The message ID to reply to"),
      content: z
        .string()
        .min(1)
        .describe("The reply content (supports markdown formatting)"),
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    async ({ channel_id, message_id, content }) => {
      try {
        const response = await fetch(
          `${CHAT_BASE}/channels/${channel_id}/messages/${message_id}/replies`,
          {
            method: "POST",
            headers: {
              Authorization: CONFIG.apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ content }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          return {
            content: [
              {
                type: "text" as const,
                text: `Error creating reply: ${response.status} - ${errorText}`,
              },
            ],
            isError: true,
          };
        }

        const data = await response.json();
        const reply = data.reply || data.message || data;

        return {
          content: [
            {
              type: "text" as const,
              text: [
                `Reply sent successfully!`,
                `channel_id: ${channel_id}`,
                `parent_message_id: ${message_id}`,
                `reply_message_id: ${reply.id || "unknown"}`,
              ].join("\n"),
            },
          ],
        };
      } catch (error) {
        console.error("Error creating reply:", error);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
