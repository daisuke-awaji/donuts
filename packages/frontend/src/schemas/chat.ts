import { z } from 'zod';

// Message schema
export const messageSchema = z.object({
  id: z.string().min(1, 'メッセージIDは必須です'),
  type: z.enum(['user', 'assistant']),
  content: z.string().min(1, 'メッセージ内容は必須です'),
  timestamp: z.date(),
  isStreaming: z.boolean().optional(),
});

export type MessageData = z.infer<typeof messageSchema>;

// Chat prompt schema
export const chatPromptSchema = z.object({
  prompt: z
    .string()
    .min(1, 'プロンプトを入力してください')
    .max(10000, 'プロンプトは10000文字以下で入力してください')
    .trim(),
});

export type ChatPromptData = z.infer<typeof chatPromptSchema>;

// Agent config schema
export const agentConfigSchema = z.object({
  endpoint: z.string().url('有効なエンドポイントURLを入力してください'),
  cognitoConfig: z.object({
    userPoolId: z.string().min(1, 'User Pool ID は必須です'),
    clientId: z.string().min(1, 'Client ID は必須です'),
    region: z.string().min(1, 'リージョンは必須です'),
  }),
});

export type AgentConfigData = z.infer<typeof agentConfigSchema>;

// Stream event schemas
export const agentStreamEventSchema = z
  .object({
    type: z.string(),
  })
  .passthrough(); // Allow additional properties

export const modelContentBlockDeltaEventSchema = z
  .object({
    type: z.literal('modelContentBlockDeltaEvent'),
    delta: z.object({
      type: z.literal('textDelta'),
      text: z.string(),
    }),
  })
  .passthrough();

export const serverCompletionEventSchema = z
  .object({
    type: z.literal('serverCompletionEvent'),
    metadata: z.object({
      requestId: z.string(),
      duration: z.number(),
      sessionId: z.string(),
      conversationLength: z.number(),
    }),
  })
  .passthrough();

export const serverErrorEventSchema = z
  .object({
    type: z.literal('serverErrorEvent'),
    error: z.object({
      message: z.string(),
      requestId: z.string(),
    }),
  })
  .passthrough();

export type AgentStreamEventData = z.infer<typeof agentStreamEventSchema>;
export type ModelContentBlockDeltaEventData = z.infer<typeof modelContentBlockDeltaEventSchema>;
export type ServerCompletionEventData = z.infer<typeof serverCompletionEventSchema>;
export type ServerErrorEventData = z.infer<typeof serverErrorEventSchema>;
