export { executeCommandTool } from './execute-command.js';
export { tavilySearchTool } from './tavily-search.js';
export { createStrandsToolFromMCP, convertMCPToolsToStrands } from './mcp-converter.js';

// ローカルツール配列のインポート
import { executeCommandTool } from './execute-command.js';
import { tavilySearchTool } from './tavily-search.js';

/**
 * Agent に内蔵されるローカルツール一覧
 * 新しいツールを追加する場合はここに追加
 */
export const localTools = [executeCommandTool, tavilySearchTool];
