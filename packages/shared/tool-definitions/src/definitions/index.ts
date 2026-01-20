export * from './execute-command.js';
export * from './file-editor.js';
export * from './tavily-search.js';
export * from './tavily-extract.js';
export * from './tavily-crawl.js';
export * from './s3-list-files.js';
export * from './code-interpreter.js';
export * from './nova-canvas.js';
export * from './image-to-text.js';
export * from './call-agent.js';
export * from './nova-reel.js';

import { executeCommandDefinition } from './execute-command.js';
import { fileEditorDefinition } from './file-editor.js';
import { tavilySearchDefinition } from './tavily-search.js';
import { tavilyExtractDefinition } from './tavily-extract.js';
import { tavilyCrawlDefinition } from './tavily-crawl.js';
import { s3ListFilesDefinition } from './s3-list-files.js';
import { codeInterpreterDefinition } from './code-interpreter.js';
import { novaCanvasDefinition } from './nova-canvas.js';
import { imageToTextDefinition } from './image-to-text.js';
import { callAgentDefinition } from './call-agent.js';
import { novaReelDefinition } from './nova-reel.js';
import type { ExtractToolName } from '../types.js';

/**
 * All tool definitions array
 */
export const allToolDefinitions = [
  executeCommandDefinition,
  fileEditorDefinition,
  tavilySearchDefinition,
  tavilyExtractDefinition,
  tavilyCrawlDefinition,
  s3ListFilesDefinition,
  codeInterpreterDefinition,
  novaCanvasDefinition,
  imageToTextDefinition,
  callAgentDefinition,
  novaReelDefinition,
] as const;

/**
 * Valid tool name union type (auto-generated from allToolDefinitions)
 * This type ensures type safety when referencing tool names throughout the codebase.
 *
 * @example
 * // TypeScript will catch invalid tool names at compile time
 * const toolName: ToolName = 's3_list_files'; // OK
 * const invalid: ToolName = 's3_upload_file'; // Error: Type '"s3_upload_file"' is not assignable to type 'ToolName'
 */
export type ToolName = ExtractToolName<(typeof allToolDefinitions)[number]>;

/**
 * Type guard to check if a string is a valid tool name
 */
export function isValidToolName(name: string): name is ToolName {
  return allToolDefinitions.some((def) => def.name === name);
}

/**
 * MCP format (JSON Schema) tool definitions
 */
export const allMCPToolDefinitions = allToolDefinitions.map((def) => ({
  name: def.name,
  description: def.description,
  inputSchema: def.jsonSchema,
}));
