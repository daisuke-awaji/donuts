import { z } from 'zod';

/**
 * JSON Schema format tool definition (for MCP/Backend)
 */
export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * Tool definition supporting both Zod and JSON Schema
 * @template TSchema - Zod schema type for input validation
 * @template TName - Literal type for tool name (for type safety)
 */
export interface ToolDefinition<
  TSchema extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>,
  TName extends string = string,
> {
  name: TName;
  description: string;
  zodSchema: TSchema;
  jsonSchema: MCPToolDefinition['inputSchema'];
}

/**
 * Extract tool name from a ToolDefinition
 */
export type ExtractToolName<T> =
  T extends ToolDefinition<z.ZodObject<z.ZodRawShape>, infer N> ? N : never;
