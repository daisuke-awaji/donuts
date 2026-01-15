/**
 * Service for invoking Agent API
 */

import { randomUUID } from 'crypto';
import { SchedulerEventPayload } from '../types/index.js';

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
 * Agent invocation request
 */
interface AgentInvocationRequest {
  prompt: string;
  modelId?: string;
  enabledTools?: string[];
  targetUserId: string;
  sessionId?: string;
}

/**
 * Agent invocation response
 */
interface AgentInvocationResponse {
  requestId: string;
  sessionId?: string;
  success: boolean;
  error?: string;
}

/**
 * Service for invoking Agent /invocations API
 */
export class AgentInvoker {
  private readonly agentApiUrl: string;

  constructor(agentApiUrl: string) {
    // Encode ARN in URL if needed
    this.agentApiUrl = encodeAgentUrl(agentApiUrl);
    console.log('AgentInvoker initialized with URL:', this.agentApiUrl);
  }

  /**
   * Invoke Agent with Machine User authentication
   */
  async invoke(
    payload: SchedulerEventPayload,
    authToken: string
  ): Promise<AgentInvocationResponse> {
    const request: AgentInvocationRequest = {
      prompt: payload.prompt,
      targetUserId: payload.userId,
      modelId: payload.modelId,
      enabledTools: payload.enabledTools,
      sessionId: payload.sessionId,
    };

    console.log('Invoking Agent API:', {
      url: this.agentApiUrl,
      triggerId: payload.triggerId,
      userId: payload.userId,
      agentId: payload.agentId,
    });

    // Generate session ID if not provided
    const actualSessionId = payload.sessionId || `session-${randomUUID()}`;

    try {
      const response = await fetch(this.agentApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
          'X-Amzn-Bedrock-AgentCore-Runtime-Session-Id': actualSessionId,
          'X-Amzn-Trace-Id': `trigger-${Date.now()}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Agent API returned ${response.status}: ${errorText}`);
      }

      // Parse NDJSON streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let requestId = '';
      let sessionId = payload.sessionId;

      if (reader) {
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim()) continue;

            try {
              const event = JSON.parse(line);

              // Extract metadata from completion event
              if (event.type === 'serverCompletionEvent') {
                requestId = event.metadata?.requestId || '';
                sessionId = event.metadata?.sessionId || sessionId;
              }

              // Check for errors
              if (event.type === 'serverErrorEvent') {
                throw new Error(event.error?.message || 'Unknown error from Agent');
              }
            } catch (parseError) {
              console.warn('Failed to parse event line:', line, parseError);
            }
          }
        }
      }

      return {
        requestId,
        sessionId,
        success: true,
      };
    } catch (error) {
      console.error('Failed to invoke Agent:', error);
      return {
        requestId: '',
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Create AgentInvoker from environment variables
   */
  static fromEnvironment(): AgentInvoker {
    const agentApiUrl = process.env.AGENT_API_URL;

    if (!agentApiUrl) {
      throw new Error('AGENT_API_URL environment variable is required');
    }

    return new AgentInvoker(agentApiUrl);
  }
}
