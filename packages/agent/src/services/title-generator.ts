/**
 * Session Title Generator Service
 * Generates concise session titles using LLM
 */
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { logger } from '../config/index.js';

/**
 * Default model for title generation (lightweight, fast)
 */
const DEFAULT_MODEL_ID = 'anthropic.claude-3-haiku-20240307-v1:0';

/**
 * Title Generator using Bedrock LLM
 */
export class TitleGenerator {
  private client: BedrockRuntimeClient;
  private modelId: string;

  constructor(modelId?: string, region?: string) {
    this.client = new BedrockRuntimeClient({
      region: region || process.env.AWS_REGION || 'us-east-1',
    });
    this.modelId = modelId || DEFAULT_MODEL_ID;
  }

  /**
   * Generate a session title from conversation content
   * @param userMessage First user message
   * @param assistantMessage First assistant response (optional)
   * @returns Generated title (20-30 characters)
   */
  async generateTitle(userMessage: string, assistantMessage?: string): Promise<string> {
    try {
      const prompt = this.buildPrompt(userMessage, assistantMessage);

      logger.debug('[TitleGenerator] Generating title with prompt length:', {
        userMessageLength: userMessage.length,
        assistantMessageLength: assistantMessage?.length || 0,
      });

      const response = await this.client.send(
        new InvokeModelCommand({
          modelId: this.modelId,
          contentType: 'application/json',
          accept: 'application/json',
          body: JSON.stringify({
            anthropic_version: 'bedrock-2023-05-31',
            max_tokens: 100,
            messages: [
              {
                role: 'user',
                content: prompt,
              },
            ],
          }),
        })
      );

      const title = this.parseResponse(response);

      logger.info('[TitleGenerator] Generated title:', { title });

      return title;
    } catch (error) {
      logger.error('[TitleGenerator] Failed to generate title:', { error });
      throw error;
    }
  }

  /**
   * Build the prompt for title generation
   */
  private buildPrompt(userMessage: string, assistantMessage?: string): string {
    // Truncate messages to limit token usage
    const truncatedUserMessage = userMessage.substring(0, 500);
    const truncatedAssistantMessage = assistantMessage?.substring(0, 500) || '';

    return `以下の会話内容から、簡潔なセッションタイトルを生成してください。

## 要件
- 15〜30文字程度
- 会話の主題を端的に表現
- 日本語で出力（英語の技術用語はそのまま可）
- タイトルのみを出力（説明や記号は不要）
- 「〜について」「〜の質問」などの冗長な表現は避ける

## 会話内容
ユーザー: ${truncatedUserMessage}
${truncatedAssistantMessage ? `AI: ${truncatedAssistantMessage}` : ''}

## タイトル:`;
  }

  /**
   * Parse the LLM response and extract the title
   */
  private parseResponse(response: { body?: Uint8Array }): string {
    if (!response.body) {
      throw new Error('Empty response from Bedrock');
    }

    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    // Extract text from Claude response format
    const content = responseBody.content;
    if (!content || !Array.isArray(content) || content.length === 0) {
      throw new Error('Invalid response format from Bedrock');
    }

    const textBlock = content.find(
      (block: { type: string; text?: string }) => block.type === 'text'
    );
    if (!textBlock || !textBlock.text) {
      throw new Error('No text content in response');
    }

    // Clean up the title
    let title = textBlock.text.trim();

    // Remove quotes if present
    title = title.replace(/^["'「」『』]+|["'「」『』]+$/g, '');

    // Remove common prefixes
    title = title.replace(/^(タイトル[:：]\s*)/i, '');

    // Truncate if too long
    if (title.length > 50) {
      title = title.substring(0, 47) + '...';
    }

    return title;
  }
}

// Singleton instance
let titleGeneratorInstance: TitleGenerator | null = null;

/**
 * Get or create TitleGenerator singleton
 */
export function getTitleGenerator(): TitleGenerator {
  if (!titleGeneratorInstance) {
    titleGeneratorInstance = new TitleGenerator();
  }
  return titleGeneratorInstance;
}
