import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CONFIG } from "../shared/config";
import { generateTaskUrl, generateListUrl } from "../shared/utils";
import { convertMarkdownToClickUpBlocks } from "../clickup-text";

export function registerCommentToolsRead(server: McpServer) {
  server.tool(
    "getTaskComments",
    [
      "Get all comments on a task.",
      "Returns comments with author info, timestamps, and content.",
      "Use this to view the discussion history on a task.",
      "For full task details including comments, use getTaskById instead."
    ].join("\n"),
    {
      task_id: z.string().min(6).max(9).describe("The task ID to get comments for"),
      start: z.number().optional().describe("Starting comment index for pagination (default: 0)"),
      start_id: z.string().optional().describe("Get comments starting from a specific comment ID")
    },
    {
      readOnlyHint: true
    },
    async ({ task_id, start, start_id }) => {
      try {
        const params = new URLSearchParams();
        if (start !== undefined) params.append('start', start.toString());
        if (start_id) params.append('start_id', start_id);

        const url = `https://api.clickup.com/api/v2/task/${task_id}/comment${params.toString() ? '?' + params.toString() : ''}`;
        const response = await fetch(url, {
          headers: { Authorization: CONFIG.apiKey }
        });

        if (!response.ok) {
          throw new Error(`Error fetching comments: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const comments = data.comments || [];

        if (comments.length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: `No comments found on task ${task_id}.`
            }]
          };
        }

        const lines: string[] = [
          `Found ${comments.length} comment(s) on task ${task_id}:`,
          `task_url: ${generateTaskUrl(task_id)}`,
          ''
        ];

        comments.forEach((comment: any) => {
          const date = new Date(parseInt(comment.date)).toLocaleString();
          const author = comment.user?.username || comment.user?.email || 'Unknown';
          lines.push(`💬 Comment by ${author} (comment_id: ${comment.id})`);
          lines.push(`   Date: ${date}`);
          if (comment.comment_text) {
            lines.push(`   Content: ${comment.comment_text}`);
          }
          if (comment.resolved) {
            lines.push(`   Status: Resolved`);
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
        console.error('Error getting task comments:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error getting task comments: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "getListComments",
    [
      "Get comments on a list (list-level discussions).",
      "These are comments attached to the list itself, not to individual tasks.",
      "Useful for project-level discussions and announcements."
    ].join("\n"),
    {
      list_id: z.string().min(1).describe("The list ID to get comments for"),
      start: z.number().optional().describe("Starting comment index for pagination (default: 0)"),
      start_id: z.string().optional().describe("Get comments starting from a specific comment ID")
    },
    {
      readOnlyHint: true
    },
    async ({ list_id, start, start_id }) => {
      try {
        const params = new URLSearchParams();
        if (start !== undefined) params.append('start', start.toString());
        if (start_id) params.append('start_id', start_id);

        const url = `https://api.clickup.com/api/v2/list/${list_id}/comment${params.toString() ? '?' + params.toString() : ''}`;
        const response = await fetch(url, {
          headers: { Authorization: CONFIG.apiKey }
        });

        if (!response.ok) {
          throw new Error(`Error fetching list comments: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const comments = data.comments || [];

        if (comments.length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: `No comments found on list ${list_id}.`
            }]
          };
        }

        const lines: string[] = [
          `Found ${comments.length} comment(s) on list ${list_id}:`,
          `list_url: ${generateListUrl(list_id)}`,
          ''
        ];

        comments.forEach((comment: any) => {
          const date = new Date(parseInt(comment.date)).toLocaleString();
          const author = comment.user?.username || comment.user?.email || 'Unknown';
          lines.push(`💬 Comment by ${author} (comment_id: ${comment.id})`);
          lines.push(`   Date: ${date}`);
          if (comment.comment_text) {
            lines.push(`   Content: ${comment.comment_text}`);
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
        console.error('Error getting list comments:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error getting list comments: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "getViewComments",
    [
      "Get comments on a chat view.",
      "Chat views are used for team discussions within ClickUp.",
      "Returns comments with author info and timestamps."
    ].join("\n"),
    {
      view_id: z.string().min(1).describe("The view ID to get comments for"),
      start: z.number().optional().describe("Starting comment index for pagination (default: 0)"),
      start_id: z.string().optional().describe("Get comments starting from a specific comment ID")
    },
    {
      readOnlyHint: true
    },
    async ({ view_id, start, start_id }) => {
      try {
        const params = new URLSearchParams();
        if (start !== undefined) params.append('start', start.toString());
        if (start_id) params.append('start_id', start_id);

        const url = `https://api.clickup.com/api/v2/view/${view_id}/comment${params.toString() ? '?' + params.toString() : ''}`;
        const response = await fetch(url, {
          headers: { Authorization: CONFIG.apiKey }
        });

        if (!response.ok) {
          throw new Error(`Error fetching view comments: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const comments = data.comments || [];

        if (comments.length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: `No comments found in view ${view_id}.`
            }]
          };
        }

        const lines: string[] = [
          `Found ${comments.length} comment(s) in view ${view_id}:`,
          ''
        ];

        comments.forEach((comment: any) => {
          const date = new Date(parseInt(comment.date)).toLocaleString();
          const author = comment.user?.username || comment.user?.email || 'Unknown';
          lines.push(`💬 Comment by ${author} (comment_id: ${comment.id})`);
          lines.push(`   Date: ${date}`);
          if (comment.comment_text) {
            lines.push(`   Content: ${comment.comment_text}`);
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
        console.error('Error getting view comments:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error getting view comments: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "getThreadedComments",
    [
      "Get replies to a specific comment (threaded comments).",
      "Returns all replies nested under the parent comment.",
      "Use getTaskComments or getListComments first to find the parent comment_id."
    ].join("\n"),
    {
      comment_id: z.string().min(1).describe("The parent comment ID to get replies for"),
      start: z.number().optional().describe("Starting reply index for pagination (default: 0)"),
      start_id: z.string().optional().describe("Get replies starting from a specific reply ID")
    },
    {
      readOnlyHint: true
    },
    async ({ comment_id, start, start_id }) => {
      try {
        const params = new URLSearchParams();
        if (start !== undefined) params.append('start', start.toString());
        if (start_id) params.append('start_id', start_id);

        const url = `https://api.clickup.com/api/v2/comment/${comment_id}/reply${params.toString() ? '?' + params.toString() : ''}`;
        const response = await fetch(url, {
          headers: { Authorization: CONFIG.apiKey }
        });

        if (!response.ok) {
          throw new Error(`Error fetching threaded comments: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const replies = data.comments || [];

        if (replies.length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: `No replies found for comment ${comment_id}.`
            }]
          };
        }

        const lines: string[] = [
          `Found ${replies.length} reply(ies) to comment ${comment_id}:`,
          ''
        ];

        replies.forEach((reply: any) => {
          const date = new Date(parseInt(reply.date)).toLocaleString();
          const author = reply.user?.username || reply.user?.email || 'Unknown';
          lines.push(`  ↳ Reply by ${author} (comment_id: ${reply.id})`);
          lines.push(`     Date: ${date}`);
          if (reply.comment_text) {
            lines.push(`     Content: ${reply.comment_text}`);
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
        console.error('Error getting threaded comments:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error getting threaded comments: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );
}

export function registerCommentToolsWrite(server: McpServer) {
  server.tool(
    "createListComment",
    [
      "Add a comment to a list (list-level discussion).",
      "Supports markdown formatting including bold, italic, lists, and links.",
      "Use this for project-level announcements or discussions.",
      "The comment will notify all list members."
    ].join("\n"),
    {
      list_id: z.string().min(1).describe("The list ID to add the comment to"),
      comment: z.string().min(1).describe("The comment text (supports markdown)")
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false
    },
    async ({ list_id, comment }) => {
      try {
        // Convert markdown to ClickUp blocks format
        const commentData = await convertMarkdownToClickUpBlocks(comment);

        const response = await fetch(
          `https://api.clickup.com/api/v2/list/${list_id}/comment`,
          {
            method: 'POST',
            headers: {
              Authorization: CONFIG.apiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(commentData)
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Error creating list comment: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();

        return {
          content: [{
            type: "text" as const,
            text: [
              `Comment added to list successfully!`,
              `list_id: ${list_id}`,
              `list_url: ${generateListUrl(list_id)}`,
              `comment_id: ${data.id || 'unknown'}`
            ].join('\n')
          }]
        };

      } catch (error) {
        console.error('Error creating list comment:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error creating list comment: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "createViewComment",
    [
      "Add a comment to a chat view.",
      "Chat views are used for team discussions within ClickUp.",
      "Supports markdown formatting."
    ].join("\n"),
    {
      view_id: z.string().min(1).describe("The view ID to add the comment to"),
      comment: z.string().min(1).describe("The comment text (supports markdown)")
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false
    },
    async ({ view_id, comment }) => {
      try {
        // Convert markdown to ClickUp blocks format
        const commentData = await convertMarkdownToClickUpBlocks(comment);

        const response = await fetch(
          `https://api.clickup.com/api/v2/view/${view_id}/comment`,
          {
            method: 'POST',
            headers: {
              Authorization: CONFIG.apiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(commentData)
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Error creating view comment: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();

        return {
          content: [{
            type: "text" as const,
            text: [
              `Comment added to view successfully!`,
              `view_id: ${view_id}`,
              `comment_id: ${data.id || 'unknown'}`
            ].join('\n')
          }]
        };

      } catch (error) {
        console.error('Error creating view comment:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error creating view comment: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "createThreadedComment",
    [
      "Reply to an existing comment (create a threaded comment).",
      "The reply will be nested under the parent comment.",
      "Use getTaskComments or getListComments first to find the parent comment_id."
    ].join("\n"),
    {
      comment_id: z.string().min(1).describe("The parent comment ID to reply to"),
      comment: z.string().min(1).describe("The reply text (supports markdown)")
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false
    },
    async ({ comment_id, comment }) => {
      try {
        // Convert markdown to ClickUp blocks format
        const commentData = await convertMarkdownToClickUpBlocks(comment);

        const response = await fetch(
          `https://api.clickup.com/api/v2/comment/${comment_id}/reply`,
          {
            method: 'POST',
            headers: {
              Authorization: CONFIG.apiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(commentData)
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Error creating threaded comment: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();

        return {
          content: [{
            type: "text" as const,
            text: [
              `Reply added successfully!`,
              `parent_comment_id: ${comment_id}`,
              `reply_comment_id: ${data.id || 'unknown'}`
            ].join('\n')
          }]
        };

      } catch (error) {
        console.error('Error creating threaded comment:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error creating threaded comment: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "updateComment",
    [
      "Update an existing comment's content.",
      "Can modify the comment text or resolve/unresolve the comment.",
      "Use getTaskComments or getListComments first to find the comment_id."
    ].join("\n"),
    {
      comment_id: z.string().min(1).describe("The comment ID to update"),
      comment: z.string().optional().describe("New comment text (supports markdown)"),
      resolved: z.boolean().optional().describe("Set to true to resolve the comment, false to unresolve")
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true
    },
    async ({ comment_id, comment, resolved }) => {
      try {
        const body: any = {};

        if (comment !== undefined) {
          // Convert markdown to ClickUp blocks format
          const commentData = await convertMarkdownToClickUpBlocks(comment);
          Object.assign(body, commentData);
        }

        if (resolved !== undefined) {
          body.resolved = resolved;
        }

        if (Object.keys(body).length === 0) {
          return {
            content: [{
              type: "text" as const,
              text: "No updates specified. Please provide comment text or resolved status to update."
            }]
          };
        }

        const response = await fetch(
          `https://api.clickup.com/api/v2/comment/${comment_id}`,
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
          throw new Error(`Error updating comment: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        return {
          content: [{
            type: "text" as const,
            text: [
              `Comment updated successfully!`,
              `comment_id: ${comment_id}`,
              comment !== undefined ? `content: updated` : '',
              resolved !== undefined ? `resolved: ${resolved}` : ''
            ].filter(Boolean).join('\n')
          }]
        };

      } catch (error) {
        console.error('Error updating comment:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error updating comment: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );

  server.tool(
    "deleteComment",
    [
      "Delete a comment permanently.",
      "WARNING: This action cannot be undone.",
      "Use getTaskComments or getListComments first to find the comment_id."
    ].join("\n"),
    {
      comment_id: z.string().min(1).describe("The comment ID to delete")
    },
    {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true
    },
    async ({ comment_id }) => {
      try {
        const response = await fetch(
          `https://api.clickup.com/api/v2/comment/${comment_id}`,
          {
            method: 'DELETE',
            headers: { Authorization: CONFIG.apiKey }
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Error deleting comment: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        return {
          content: [{
            type: "text" as const,
            text: [
              `Comment deleted successfully!`,
              `comment_id: ${comment_id}`
            ].join('\n')
          }]
        };

      } catch (error) {
        console.error('Error deleting comment:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error deleting comment: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );
}
