/**
 * Agent Management API Client
 */

import { backendGet, backendPost, backendPut, backendDelete } from './client/backend-client';
import type { Agent, CreateAgentInput } from '../types/agent';

export interface AgentResponse {
  agent: Agent;
  metadata: {
    requestId: string;
    timestamp: string;
    userId: string;
  };
}

export interface AgentsListResponse {
  agents: Agent[];
  metadata: {
    requestId: string;
    timestamp: string;
    userId: string;
    count: number;
  };
}

export interface SharedAgentsResponse {
  agents: Agent[];
  nextCursor?: string;
  hasMore: boolean;
  metadata: {
    requestId: string;
    timestamp: string;
    count: number;
  };
}

export interface InitializeAgentsResponse {
  agents: Agent[];
  skipped: boolean;
  message?: string;
  metadata: {
    requestId: string;
    timestamp: string;
    userId: string;
    count: number;
  };
}

/**
 * Parse agent dates from API response
 */
function parseAgentDates(agent: Agent): Agent {
  return {
    ...agent,
    createdAt: new Date(agent.createdAt),
    updatedAt: new Date(agent.updatedAt),
  };
}

/**
 * Get list of user's agents
 */
export async function listAgents(): Promise<Agent[]> {
  try {
    console.log('📋 Agent一覧取得開始...');

    const data = await backendGet<AgentsListResponse>('/agents');

    console.log(`✅ Agent一覧取得完了: ${data.agents.length}件`);

    return data.agents.map(parseAgentDates);
  } catch (error) {
    console.error('💥 Agent一覧取得エラー:', error);
    throw error;
  }
}

/**
 * Get a specific agent
 */
export async function getAgent(agentId: string): Promise<Agent> {
  try {
    console.log(`🔍 Agent取得開始: ${agentId}`);

    const data = await backendGet<AgentResponse>(`/agents/${agentId}`);

    console.log(`✅ Agent取得完了: ${data.agent.name}`);

    return parseAgentDates(data.agent);
  } catch (error) {
    console.error('💥 Agent取得エラー:', error);
    throw error;
  }
}

/**
 * Create a new agent
 */
export async function createAgent(input: CreateAgentInput): Promise<Agent> {
  try {
    console.log(`➕ Agent作成開始: ${input.name}`);

    const data = await backendPost<AgentResponse>('/agents', input);

    console.log(`✅ Agent作成完了: ${data.agent.id}`);

    return parseAgentDates(data.agent);
  } catch (error) {
    console.error('💥 Agent作成エラー:', error);
    throw error;
  }
}

/**
 * Update an existing agent
 */
export async function updateAgent(
  agentId: string,
  input: Partial<CreateAgentInput>
): Promise<Agent> {
  try {
    console.log(`📝 Agent更新開始: ${agentId}`);

    const data = await backendPut<AgentResponse>(`/agents/${agentId}`, input);

    console.log(`✅ Agent更新完了: ${data.agent.name}`);

    return parseAgentDates(data.agent);
  } catch (error) {
    console.error('💥 Agent更新エラー:', error);
    throw error;
  }
}

/**
 * Delete an agent
 */
export async function deleteAgent(agentId: string): Promise<void> {
  try {
    console.log(`🗑️  Agent削除開始: ${agentId}`);

    await backendDelete<void>(`/agents/${agentId}`);

    console.log(`✅ Agent削除完了: ${agentId}`);
  } catch (error) {
    console.error('💥 Agent削除エラー:', error);
    throw error;
  }
}

/**
 * Initialize default agents for new users
 */
export async function initializeDefaultAgents(): Promise<Agent[]> {
  try {
    console.log('🔧 デフォルトAgent初期化開始...');

    const data = await backendPost<InitializeAgentsResponse>('/agents/initialize');

    console.log(`✅ デフォルトAgent初期化完了: ${data.agents.length}件`);

    return data.agents.map(parseAgentDates);
  } catch (error) {
    console.error('💥 デフォルトAgent初期化エラー:', error);
    throw error;
  }
}

/**
 * Toggle agent share status
 */
export async function toggleShareAgent(agentId: string): Promise<Agent> {
  try {
    console.log(`🔄 Agent共有状態トグル開始: ${agentId}`);

    const data = await backendPut<AgentResponse>(`/agents/${agentId}/share`);

    console.log(`✅ Agent共有状態トグル完了: isShared=${data.agent.isShared}`);

    return parseAgentDates(data.agent);
  } catch (error) {
    console.error('💥 Agent共有状態トグルエラー:', error);
    throw error;
  }
}

/**
 * List shared agents (with pagination support)
 */
export async function listSharedAgents(
  searchQuery?: string,
  limit?: number,
  cursor?: string
): Promise<SharedAgentsResponse> {
  try {
    const params = new URLSearchParams();
    if (searchQuery) params.append('q', searchQuery);
    if (limit) params.append('limit', limit.toString());
    if (cursor) params.append('cursor', cursor);

    const queryString = params.toString();
    const url = `/agents/shared-agents/list${queryString ? `?${queryString}` : ''}`;

    console.log('📋 共有Agent一覧取得開始...', { searchQuery, limit, hasCursor: !!cursor });

    const data = await backendGet<SharedAgentsResponse>(url);

    console.log(`✅ 共有Agent一覧取得完了: ${data.agents.length}件 (hasMore: ${data.hasMore})`);

    return {
      ...data,
      agents: data.agents.map(parseAgentDates),
    };
  } catch (error) {
    console.error('💥 共有Agent一覧取得エラー:', error);
    throw error;
  }
}

/**
 * Get shared agent details
 */
export async function getSharedAgent(userId: string, agentId: string): Promise<Agent> {
  try {
    console.log(`🔍 共有Agent詳細取得開始: ${userId}/${agentId}`);

    const data = await backendGet<AgentResponse>(`/agents/shared-agents/${userId}/${agentId}`);

    console.log(`✅ 共有Agent詳細取得完了: ${data.agent.name}`);

    return parseAgentDates(data.agent);
  } catch (error) {
    console.error('💥 共有Agent詳細取得エラー:', error);
    throw error;
  }
}

/**
 * Clone shared agent to my agents
 */
export async function cloneSharedAgent(userId: string, agentId: string): Promise<Agent> {
  try {
    console.log(`📥 共有Agentクローン開始: ${userId}/${agentId}`);

    const data = await backendPost<AgentResponse>(
      `/agents/shared-agents/${userId}/${agentId}/clone`
    );

    console.log(`✅ 共有Agentクローン完了: ${data.agent.id}`);

    return parseAgentDates(data.agent);
  } catch (error) {
    console.error('💥 共有Agentクローンエラー:', error);
    throw error;
  }
}
