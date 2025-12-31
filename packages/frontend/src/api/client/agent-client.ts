/**
 * Agent API Client
 * HTTP client for Agent Service (VITE_AGENT_ENDPOINT)
 */

import { createAuthHeaders } from './base-client';

/**
 * Get Agent Service endpoint URL
 */
export const getAgentEndpoint = (): string => {
  return import.meta.env.VITE_AGENT_ENDPOINT || '';
};

/**
 * Encode ARN in Agent URL for AgentCore Runtime
 * @param url - URL to encode
 * @returns Encoded URL
 */
function encodeAgentUrl(url: string): string {
  if (url.includes('bedrock-agentcore') && url.includes('/runtimes/arn:')) {
    return url.replace(/\/runtimes\/(arn:[^/]+\/[^/]+)\//, (_match: string, arn: string) => {
      return `/runtimes/${encodeURIComponent(arn)}/`;
    });
  }
  return url;
}

/**
 * Make request to Agent Service
 * @param options - Fetch options
 * @returns Response object (not JSON, for streaming support)
 */
export async function agentRequest(options: RequestInit = {}): Promise<Response> {
  const url = encodeAgentUrl(getAgentEndpoint());
  const headers = await createAuthHeaders();

  return fetch(url, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string>) },
  });
}

/**
 * Get agent configuration
 * @returns Agent endpoint configuration
 */
export function getAgentConfig() {
  return {
    endpoint: getAgentEndpoint(),
  };
}

/**
 * Test agent connection
 * @returns Connection status
 */
export async function testAgentConnection(): Promise<boolean> {
  try {
    let baseEndpoint = getAgentEndpoint()
      .replace('/invocations', '')
      .replace('?qualifier=DEFAULT', '');

    if (baseEndpoint.includes('bedrock-agentcore') && baseEndpoint.includes('/runtimes/arn:')) {
      baseEndpoint = baseEndpoint.replace(
        /\/runtimes\/(arn:[^/]+\/[^/]+)\//,
        (_match: string, arn: string) => {
          return `/runtimes/${encodeURIComponent(arn)}/`;
        }
      );
    }

    const response = await fetch(`${baseEndpoint}/ping`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.ok;
  } catch {
    return false;
  }
}
