// User types
export interface User {
  username: string;
  email?: string;
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
}

// Message types
export interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

// Chat types
export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  sessionId: string | null;
}

// Auth types
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// API types
export interface AgentStreamEvent {
  type: string;
  [key: string]: unknown;
}

export interface ModelContentBlockDeltaEvent extends AgentStreamEvent {
  type: 'modelContentBlockDeltaEvent';
  delta: {
    type: 'textDelta';
    text: string;
  };
}

export interface ModelContentBlockStartEvent extends AgentStreamEvent {
  type: 'modelContentBlockStartEvent';
  start?: {
    type: string;
    name?: string;
  };
}

export interface AfterToolsEvent extends AgentStreamEvent {
  type: 'afterToolsEvent';
  [key: string]: unknown;
}

export interface ServerCompletionEvent extends AgentStreamEvent {
  type: 'serverCompletionEvent';
  metadata: {
    requestId: string;
    duration: number;
    sessionId: string;
    conversationLength: number;
  };
}

export interface ServerErrorEvent extends AgentStreamEvent {
  type: 'serverErrorEvent';
  error: {
    message: string;
    requestId: string;
  };
}

// Config types
export interface AgentConfig {
  endpoint: string;
  cognitoConfig: {
    userPoolId: string;
    clientId: string;
    region: string;
  };
}
