import { MCPToolDefinition } from '../schemas/types.js';
import { s3ListFilesDefinition, type ToolName } from '@fullstack-agentcore/tool-definitions';

const WORKSPACE_DIR = '/tmp/ws';

/**
 * S3 storage related tool names (type-safe)
 * Only includes tools that actually exist in the codebase.
 */
const S3_TOOL_NAMES: readonly ToolName[] = [s3ListFilesDefinition.name] as const;

/**
 * デフォルトコンテキストを生成
 * @param tools 有効なツール一覧
 * @param _mcpTools MCP ツール定義一覧
 */
export function generateDefaultContext(
  tools: Array<{ name: string; description?: string }>,
  _mcpTools: MCPToolDefinition[]
): string {
  // 現在時刻を年月日時まで取得（プロンプトキャッシュ最適化のため分秒を除外）
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const hour = String(now.getUTCHours()).padStart(2, '0');
  const currentTime = `${year}-${month}-${day}T${hour}:00:00Z`;

  // Markdown 描画ルールを英語で定義
  const markdownRules = `    This system supports the following Markdown formats:
    - Mermaid diagram notation (\`\`\`mermaid ... \`\`\`)
    - LaTeX math notation (inline: $...$, block: $$...$$)
    - Image: ![alt](https://xxx.s3.us-east-1.amazonaws.com/<presignedUrl>)`;

  // S3関連ツールが有効かどうかをチェック
  const enabledS3Tools = tools.filter((tool) => S3_TOOL_NAMES.includes(tool.name as ToolName));
  const hasS3Tools = enabledS3Tools.length > 0;

  // S3ストレージツールが有効な場合のみセクションを追加
  let userStorageSection = '';
  if (hasS3Tools) {
    const enabledToolsList = enabledS3Tools.map((t) => `    - ${t.name}`).join('\n');
    userStorageSection = `

  ## About File Output
  - You are running on AWS Bedrock AgentCore. Therefore, when writing files, always write them under ${WORKSPACE_DIR}.
  - Similarly, if you need a workspace, please use the ${WORKSPACE_DIR} directory. Do not ask the user about their current workspace. It's always ${WORKSPACE_DIR}.

  <user_storage>
    <description>
      You have access to a dedicated personal S3 storage space for this user.
      This storage is isolated per user and persists across conversations.
    </description>
    <enabled_tools>
${enabledToolsList}
    </enabled_tools>
    <usage_guidelines>
      - Use s3_list_files to browse and list files in the user's S3 storage
      - All paths are relative to user's root (e.g., "/code/app.py", "/docs/report.md")
      - Presigned URLs are valid for 1 hour by default and can be shared externally
      - For large files or binary content, prefer presigned URLs over inline content
    </usage_guidelines>
  </user_storage>`;
  }

  return `
<context>
  <current_time>${currentTime}</current_time>
  <markdown_rules>
${markdownRules}
  </markdown_rules>${userStorageSection}
</context>`;
}
