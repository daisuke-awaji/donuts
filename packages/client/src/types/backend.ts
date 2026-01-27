/**
 * Backend API Type Definitions
 * OpenAPI仕様に基づく型定義
 */

// ============================================
// Agent Types
// ============================================

export interface Scenario {
  title: string;
  prompt: string;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  icon?: string;
  systemPrompt: string;
  enabledTools: string[];
  scenarios?: Scenario[];
  isShared?: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface SharedAgent extends Agent {
  userId: string;
}

// ============================================
// Session Types
// ============================================

export interface Session {
  sessionId: string;
  actorId: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface SessionEvent {
  eventId: string;
  sessionId: string;
  timestamp: string;
  role: 'user' | 'assistant' | 'system';
  content: Array<{
    type: string;
    text?: string;
    [key: string]: unknown;
  }>;
}

// ============================================
// User Types
// ============================================

export interface UserInfo {
  authenticated: boolean;
  user: {
    id: string;
    username: string;
    email?: string;
    groups?: string[];
  };
  jwt?: {
    tokenUse: 'access' | 'id';
    issuer: string;
    audience: string;
    issuedAt: string;
    expiresAt: string;
    clientId?: string;
    authTime?: string;
  };
  request?: {
    id: string;
    timestamp: string;
    ip?: string;
    userAgent?: string;
  };
}

// ============================================
// Response Types
// ============================================

export interface ResponseMetadata {
  requestId: string;
  timestamp: string;
  userId?: string;
}

export interface AgentResponse {
  agent: Agent;
  metadata: ResponseMetadata;
}

export interface AgentListResponse {
  agents: Agent[];
  skipped?: boolean;
  message?: string;
  metadata: ResponseMetadata & {
    count: number;
  };
}

export interface SharedAgentResponse {
  agent: SharedAgent;
  metadata: ResponseMetadata;
}

export interface SharedAgentListResponse {
  agents: SharedAgent[];
  nextCursor?: string | null;
  hasMore?: boolean;
  metadata: ResponseMetadata & {
    count: number;
  };
}

export interface SessionListResponse {
  sessions: Session[];
  metadata: ResponseMetadata & {
    actorId: string;
    count: number;
  };
}

export interface SessionEventsResponse {
  events: SessionEvent[];
  metadata: ResponseMetadata & {
    actorId: string;
    sessionId: string;
    count: number;
  };
}

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime?: number;
  service: string;
  version: string;
  environment?: string;
  jwks?: {
    configured: boolean;
    uri?: string | null;
  };
}

export interface ApiInfoResponse {
  service: string;
  version: string;
  environment?: 'development' | 'production';
  endpoints?: Record<string, string>;
  documentation?: {
    authentication: string;
    format: string;
  };
  timestamp?: string;
}

// ============================================
// Error Types
// ============================================

export interface ErrorResponse {
  error: string;
  message?: string;
  requestId?: string;
  timestamp?: string;
}
