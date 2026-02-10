/**
 * Statistical Analysis Engine
 *
 * Routes action requests to the appropriate statistical method.
 */

import { runDescriptiveStats } from './methods/descriptive-stats.js';
import { runTTest } from './methods/t-test.js';
import type { StatisticalResult } from './types.js';

/**
 * Input from the tool schema (union of all action inputs)
 */
interface StatisticalAnalysisInput {
  action: 'descriptive_stats' | 't_test';
  filePath: string;

  // descriptive_stats
  columns?: string[];
  groupBy?: string;

  // t_test
  variable?: string;
  groupByColumn?: string;
  paired?: boolean;
  alternative?: 'two-sided' | 'less' | 'greater';

  // common optional
  sheetName?: string;
}

/**
 * Execute a statistical analysis based on the action type
 *
 * @param input - Validated input from the tool schema
 * @returns Structured statistical result
 * @throws Error with descriptive message for invalid input or computation failures
 */
export function executeStatisticalAnalysis(input: StatisticalAnalysisInput): StatisticalResult {
  switch (input.action) {
    case 'descriptive_stats':
      return runDescriptiveStats({
        filePath: input.filePath,
        columns: input.columns,
        groupBy: input.groupBy,
        sheetName: input.sheetName,
      });

    case 't_test': {
      if (!input.variable) {
        throw new Error('Parameter "variable" is required for t_test action');
      }
      return runTTest({
        filePath: input.filePath,
        variable: input.variable,
        groupByColumn: input.groupByColumn,
        paired: input.paired,
        alternative: input.alternative,
        sheetName: input.sheetName,
      });
    }

    default: {
      const exhaustiveCheck: never = input.action;
      throw new Error(`Unknown action: ${exhaustiveCheck}`);
    }
  }
}
