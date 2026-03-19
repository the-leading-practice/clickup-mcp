/**
 * Gateway Credential Loader for MCP Servers
 *
 * Fetches service credentials from the Claude Gateway on startup.
 * Falls back to local environment variables if the gateway is unreachable.
 *
 * Environment variables:
 *   GATEWAY_URL      — Base URL of the Claude Gateway (e.g. https://claude-gateway.coolify.titaniumlabs.us)
 *   GATEWAY_API_KEY  — Fleet API key for authenticating with the gateway
 *
 * Usage:
 *   import { loadCredentials } from "./gateway-credentials.js";
 *   const creds = await loadCredentials("clickup", { api_key: "CLICKUP_API_KEY" });
 *   // creds.api_key is now populated from gateway or env var fallback
 */

const GATEWAY_URL = process.env.GATEWAY_URL || "";
const GATEWAY_API_KEY = process.env.GATEWAY_API_KEY || "";

export interface CredentialResult {
  [key: string]: string;
}

/**
 * Load credentials for a service from the Claude Gateway.
 *
 * @param service     - Service name as registered in the gateway (e.g. "clickup", "telnyx")
 * @param envFallback - Map of credential field names to their environment variable fallbacks.
 *                      e.g. { api_key: "CLICKUP_API_KEY", team_id: "CLICKUP_TEAM_ID" }
 * @returns Object with the credential field values populated.
 * @throws Error with actionable message if no credentials are available from either source.
 */
export async function loadCredentials(
  service: string,
  envFallback: Record<string, string>,
  options?: { gatewayToken?: string },
): Promise<CredentialResult> {
  // Try gateway first
  const apiKey = options?.gatewayToken || GATEWAY_API_KEY;
  if (GATEWAY_URL && apiKey) {
    try {
      const url = `${GATEWAY_URL}/api/credentials/service/${encodeURIComponent(service)}`;
      const resp = await fetch(url, {
        headers: { "X-API-Key": apiKey },
        signal: AbortSignal.timeout(10_000),
      });

      if (resp.ok) {
        const data = await resp.json();
        // Validate we got at least one non-empty field
        const fields = Object.keys(envFallback);
        const hasValue = fields.some((f) => data[f]?.trim());
        if (hasValue) {
          console.error(
            `[gateway] Loaded credentials for "${service}" from Claude Gateway`,
          );
          const result: CredentialResult = {};
          for (const field of fields) {
            result[field] = data[field] || "";
          }
          return result;
        }
      } else if (resp.status === 404) {
        console.error(
          `[gateway] No credentials for "${service}" in Claude Gateway — trying env vars`,
        );
      } else {
        console.error(
          `[gateway] Gateway returned ${resp.status} for "${service}" — trying env vars`,
        );
      }
    } catch (err) {
      console.error(
        `[gateway] Could not reach Claude Gateway: ${err} — trying env vars`,
      );
    }
  }

  // Fallback to environment variables
  const result: CredentialResult = {};
  let hasValue = false;
  for (const [field, envVar] of Object.entries(envFallback)) {
    result[field] = process.env[envVar] || "";
    if (result[field]) hasValue = true;
  }

  if (hasValue) {
    console.error(
      `[gateway] Using local env vars for "${service}" credentials`,
    );
    return result;
  }

  // Neither source has credentials — throw actionable error
  throw new Error(
    `No credentials configured for "${service}".\n` +
      `An admin needs to add them at the Claude Gateway dashboard → Integrations tab.\n` +
      (GATEWAY_URL
        ? `Dashboard: ${GATEWAY_URL}/dashboard\n`
        : `Set GATEWAY_URL and GATEWAY_API_KEY environment variables to enable auto-fetch.\n`) +
      `Alternatively, set these environment variables: ${Object.values(envFallback).join(", ")}`,
  );
}
