import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CONFIG } from "../shared/config";
import { generateTaskUrl } from "../shared/utils";
import * as fs from 'fs';
import * as path from 'path';

export function registerAttachmentToolsRead(server: McpServer) {
  // Note: Attachments are returned as part of getTaskById, so no separate read tool needed
  // This function is a placeholder for consistency with the pattern
}

export function registerAttachmentToolsWrite(server: McpServer) {
  server.tool(
    "createTaskAttachment",
    [
      "Upload a file attachment to a task.",
      "Supports uploading files from a local file path or from a URL.",
      "For URL uploads, the file will be downloaded and attached to the task.",
      "Maximum file size depends on your ClickUp plan."
    ].join("\n"),
    {
      task_id: z.string().min(6).max(9).describe("The task ID to attach the file to"),
      file_path: z.string().optional().describe("Local file path to upload"),
      file_url: z.string().optional().describe("URL of file to download and attach"),
      file_name: z.string().optional().describe("Optional custom filename (used with file_url)")
    },
    {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false
    },
    async ({ task_id, file_path, file_url, file_name }) => {
      try {
        if (!file_path && !file_url) {
          return {
            content: [{
              type: "text" as const,
              text: "Error: Either file_path or file_url must be provided."
            }]
          };
        }

        let fileBuffer: Buffer;
        let filename: string;
        let contentType: string = 'application/octet-stream';

        if (file_path) {
          // Read local file
          if (!fs.existsSync(file_path)) {
            return {
              content: [{
                type: "text" as const,
                text: `Error: File not found at path: ${file_path}`
              }]
            };
          }
          fileBuffer = fs.readFileSync(file_path);
          filename = file_name || path.basename(file_path);

          // Determine content type from extension
          const ext = path.extname(file_path).toLowerCase();
          const mimeTypes: Record<string, string> = {
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.txt': 'text/plain',
            '.csv': 'text/csv',
            '.json': 'application/json',
            '.zip': 'application/zip'
          };
          contentType = mimeTypes[ext] || 'application/octet-stream';
        } else if (file_url) {
          // Download from URL
          const urlResponse = await fetch(file_url);
          if (!urlResponse.ok) {
            throw new Error(`Error downloading file from URL: ${urlResponse.status} ${urlResponse.statusText}`);
          }

          const arrayBuffer = await urlResponse.arrayBuffer();
          fileBuffer = Buffer.from(arrayBuffer);

          // Get filename from URL or Content-Disposition header
          const contentDisposition = urlResponse.headers.get('content-disposition');
          if (file_name) {
            filename = file_name;
          } else if (contentDisposition) {
            const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            filename = match ? match[1].replace(/['"]/g, '') : path.basename(new URL(file_url).pathname) || 'attachment';
          } else {
            filename = path.basename(new URL(file_url).pathname) || 'attachment';
          }

          // Get content type from response
          contentType = urlResponse.headers.get('content-type') || 'application/octet-stream';
        } else {
          throw new Error('No file source provided');
        }

        // Create multipart form data manually
        const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
        const bodyParts: Buffer[] = [];

        // Add file part
        const fileHeader = [
          `--${boundary}`,
          `Content-Disposition: form-data; name="attachment"; filename="${filename}"`,
          `Content-Type: ${contentType}`,
          '',
          ''
        ].join('\r\n');

        bodyParts.push(Buffer.from(fileHeader));
        bodyParts.push(fileBuffer);
        bodyParts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

        const body = Buffer.concat(bodyParts);

        const response = await fetch(
          `https://api.clickup.com/api/v2/task/${task_id}/attachment`,
          {
            method: 'POST',
            headers: {
              Authorization: CONFIG.apiKey,
              'Content-Type': `multipart/form-data; boundary=${boundary}`
            },
            body: body
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Error uploading attachment: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();

        return {
          content: [{
            type: "text" as const,
            text: [
              `Attachment uploaded successfully!`,
              `task_id: ${task_id}`,
              `task_url: ${generateTaskUrl(task_id)}`,
              `filename: ${filename}`,
              `attachment_id: ${data.id || 'unknown'}`,
              data.url ? `attachment_url: ${data.url}` : ''
            ].filter(Boolean).join('\n')
          }]
        };

      } catch (error) {
        console.error('Error uploading attachment:', error);
        return {
          content: [{
            type: "text" as const,
            text: `Error uploading attachment: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        };
      }
    }
  );
}
