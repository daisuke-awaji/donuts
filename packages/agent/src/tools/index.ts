export { executeCommandTool } from './execute-command.js';
export { tavilySearchTool } from './tavily-search.js';
export { tavilyExtractTool } from './tavily-extract.js';
export { tavilyCrawlTool } from './tavily-crawl.js';
export { createStrandsToolFromMCP, convertMCPToolsToStrands } from './mcp-converter.js';
export { codeInterpreterTool } from './code-interpreter/index.js';

// ローカルツール配列のインポート
import { executeCommandTool } from './execute-command.js';
import { tavilySearchTool } from './tavily-search.js';
import { tavilyExtractTool } from './tavily-extract.js';
import { tavilyCrawlTool } from './tavily-crawl.js';
import { codeInterpreterTool } from './code-interpreter/index.js';

/**
 * Agent に内蔵されるローカルツール一覧
 * 新しいツールを追加する場合はここに追加
 */
export const localTools = [
  executeCommandTool,
  tavilySearchTool,
  tavilyExtractTool,
  tavilyCrawlTool,
  codeInterpreterTool,
];
