/**
 * Backend API Client
 * Backend API との HTTP 通信クライアント
 */

import fetch from 'node-fetch';
import type { ClientConfig } from '../config/index.js';
import { getCachedJwtToken } from '../auth/cognito.js';
import { getCachedMachineUserToken } from '../auth/machine-user.js';
import type {
  Agent,
  AgentListResponse,
  AgentResponse,
  UserInfo,
  HealthCheckResponse,
  ApiInfoResponse,
  ErrorResponse,
} from '../types/backend.js';

export class BackendClient {
  private config: ClientConfig;
  private cachedToken: string | null = null;

  constructor(config: ClientConfig) {
    this.config = config;
  }

  /**
   * 認証ヘッダーを取得
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.authMode === 'machine' && this.config.machineUser) {
      const authResult = await getCachedMachineUserToken(this.config.machineUser);
      headers['Authorization'] = `Bearer ${authResult.accessToken}`;
    } else {
      const authResult = await getCachedJwtToken(this.config.cognito);
      headers['Authorization'] = `Bearer ${authResult.accessToken}`;
    }

    return headers;
  }

  /**
   * API リクエストを実行
   */
  private async request<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>,
    requireAuth: boolean = true
  ): Promise<T> {
    const url = `${this.config.backendUrl}${path}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (requireAuth) {
      const authHeaders = await this.getAuthHeaders();
      Object.assign(headers, authHeaders);
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

      try {
        const errorBody = (await response.json()) as ErrorResponse;
        errorMessage = errorBody.message || errorBody.error || errorMessage;
      } catch {
        // JSON解析に失敗した場合は元のエラーメッセージを使用
      }

      throw new Error(errorMessage);
    }

    return (await response.json()) as T;
  }

  // ============================================
  // Health & Info
  // ============================================

  /**
   * ヘルスチェック
   */
  async ping(): Promise<HealthCheckResponse> {
    return this.request<HealthCheckResponse>('GET', '/ping', undefined, false);
  }

  /**
   * API 情報取得
   */
  async getApiInfo(): Promise<ApiInfoResponse> {
    return this.request<ApiInfoResponse>('GET', '/', undefined, false);
  }

  // ============================================
  // User
  // ============================================

  /**
   * 現在のユーザー情報を取得
   */
  async getMe(): Promise<UserInfo> {
    return this.request<UserInfo>('GET', '/me');
  }

  // ============================================
  // Agents
  // ============================================

  /**
   * エージェント一覧を取得
   */
  async listAgents(): Promise<Agent[]> {
    const response = await this.request<AgentListResponse>('GET', '/agents');
    return response.agents;
  }

  /**
   * エージェント詳細を取得
   */
  async getAgent(agentId: string): Promise<Agent> {
    const response = await this.request<AgentResponse>('GET', `/agents/${agentId}`);
    return response.agent;
  }

  /**
   * エージェントを作成
   */
  async createAgent(
    agent: Omit<Agent, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>
  ): Promise<Agent> {
    const response = await this.request<AgentResponse>(
      'POST',
      '/agents',
      agent as Record<string, unknown>
    );
    return response.agent;
  }

  /**
   * エージェントを更新
   */
  async updateAgent(
    agentId: string,
    updates: Partial<Omit<Agent, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>>
  ): Promise<Agent> {
    const response = await this.request<AgentResponse>(
      'PUT',
      `/agents/${agentId}`,
      updates as Record<string, unknown>
    );
    return response.agent;
  }

  /**
   * エージェントを削除
   */
  async deleteAgent(agentId: string): Promise<void> {
    await this.request<{ success: boolean }>('DELETE', `/agents/${agentId}`);
  }

  /**
   * デフォルトエージェントを初期化
   */
  async initializeDefaultAgents(): Promise<Agent[]> {
    const response = await this.request<AgentListResponse>('POST', '/agents/initialize');
    return response.agents;
  }

  // ============================================
  // Connection Test
  // ============================================

  /**
   * 接続テスト（認証なし）
   */
  async testConnection(): Promise<{
    ping: HealthCheckResponse;
    apiInfo: ApiInfoResponse;
    connectionTime: number;
  }> {
    const startTime = Date.now();

    try {
      const [pingResult, apiInfo] = await Promise.all([this.ping(), this.getApiInfo()]);

      const connectionTime = Date.now() - startTime;

      return {
        ping: pingResult,
        apiInfo,
        connectionTime,
      };
    } catch (error) {
      const connectionTime = Date.now() - startTime;
      throw new Error(
        `Backend API 接続テストに失敗しました (${connectionTime}ms): ${
          error instanceof Error ? error.message : '不明なエラー'
        }`
      );
    }
  }

  /**
   * 認証テスト
   */
  async testAuth(): Promise<{
    user: UserInfo;
    authTime: number;
  }> {
    const startTime = Date.now();

    try {
      const user = await this.getMe();
      const authTime = Date.now() - startTime;

      return {
        user,
        authTime,
      };
    } catch (error) {
      const authTime = Date.now() - startTime;
      throw new Error(
        `認証テストに失敗しました (${authTime}ms): ${
          error instanceof Error ? error.message : '不明なエラー'
        }`
      );
    }
  }

  /**
   * 設定を取得
   */
  getConfig(): ClientConfig {
    return { ...this.config };
  }
}

/**
 * Backend クライアントインスタンス作成ヘルパー
 */
export function createBackendClient(config: ClientConfig): BackendClient {
  return new BackendClient(config);
}
