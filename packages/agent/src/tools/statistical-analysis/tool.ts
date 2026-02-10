/**
 * Statistical Analysis Strands Tool Definition
 */

import { tool } from '@strands-agents/sdk';
import { z } from 'zod';
import { logger } from '../../config/index.js';
import { executeStatisticalAnalysis } from './engine.js';
import { statisticalAnalysisDefinition } from '@fullstack-agentcore/tool-definitions';

/**
 * Statistical Analysis Tool
 *
 * Performs deterministic statistical analysis on CSV data files.
 */
export const statisticalAnalysisTool = tool({
  name: statisticalAnalysisDefinition.name,
  description: statisticalAnalysisDefinition.description,
  inputSchema: statisticalAnalysisDefinition.zodSchema,
  callback: async (input: z.infer<typeof statisticalAnalysisDefinition.zodSchema>) => {
    logger.info(`📊 Statistical analysis started: ${input.action} on ${input.filePath}`);

    try {
      const result = executeStatisticalAnalysis(input);

      logger.info(`✅ Statistical analysis completed: ${input.action}`);

      // Build formatted output
      const parts: string[] = [result.summary];

      if (result.diagnostics.length > 0) {
        parts.push('');
        parts.push('Diagnostics:');
        for (const diag of result.diagnostics) {
          parts.push(`  ${diag}`);
        }
      }

      parts.push('');
      parts.push('Interpretation:');
      parts.push(result.interpretation);

      return parts.join('\n');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`❌ Statistical analysis error: ${input.action}`, errorMessage);
      return `Statistical Analysis Error:\nAction: ${input.action}\nFile: ${input.filePath}\nError: ${errorMessage}`;
    }
  },
});
