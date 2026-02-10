/**
 * T-Test Method
 *
 * Performs independent (Welch's) or paired t-tests on CSV data.
 * Includes effect size (Cohen's d), confidence intervals, and Levene's test.
 */

import { readDataFile, extractNumericValues, validateColumns } from '../utils/data-reader.js';
import {
  tDistributionPValue,
  tCriticalValue,
  fDistributionPValue,
} from '../utils/distributions.js';
import type { TTestResult, DataInfo } from '../types.js';

/**
 * Compute mean of an array
 */
function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Compute variance (sample, ddof=1)
 */
function variance(values: number[], avg?: number): number {
  if (values.length <= 1) return 0;
  const m = avg ?? mean(values);
  return values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1);
}

/**
 * Compute standard deviation (sample, ddof=1)
 */
function std(values: number[], avg?: number): number {
  return Math.sqrt(variance(values, avg));
}

/**
 * Levene's test for equality of variances (using medians - Brown-Forsythe variant)
 *
 * @returns F statistic and p-value
 */
function leveneTest(group1: number[], group2: number[]): { fStatistic: number; pValue: number } {
  const median1 = sortedMedian([...group1].sort((a, b) => a - b));
  const median2 = sortedMedian([...group2].sort((a, b) => a - b));

  // Absolute deviations from group medians
  const dev1 = group1.map((v) => Math.abs(v - median1));
  const dev2 = group2.map((v) => Math.abs(v - median2));

  const n1 = dev1.length;
  const n2 = dev2.length;
  const N = n1 + n2;

  const mean1 = mean(dev1);
  const mean2 = mean(dev2);
  const grandMean = (n1 * mean1 + n2 * mean2) / N;

  // Between-group sum of squares
  const ssBetween = n1 * (mean1 - grandMean) ** 2 + n2 * (mean2 - grandMean) ** 2;

  // Within-group sum of squares
  const ssWithin1 = dev1.reduce((sum, v) => sum + (v - mean1) ** 2, 0);
  const ssWithin2 = dev2.reduce((sum, v) => sum + (v - mean2) ** 2, 0);
  const ssWithin = ssWithin1 + ssWithin2;

  const df1 = 1; // k - 1 where k = 2 groups
  const df2 = N - 2;

  if (ssWithin === 0) {
    return { fStatistic: 0, pValue: 1 };
  }

  const fStatistic = ssBetween / df1 / (ssWithin / df2);
  const pValue = fDistributionPValue(fStatistic, df1, df2);

  return { fStatistic, pValue };
}

/**
 * Compute median from a sorted array
 */
function sortedMedian(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/**
 * Cohen's d effect size
 *
 * For independent samples: d = (M1 - M2) / s_pooled
 * For paired samples: d = M_diff / s_diff
 */
function cohensD(group1: number[], group2: number[], paired: boolean): number {
  if (paired) {
    const diffs = group1.map((v, i) => v - group2[i]);
    const diffMean = mean(diffs);
    const diffStd = std(diffs);
    return diffStd === 0 ? 0 : diffMean / diffStd;
  }

  const m1 = mean(group1);
  const m2 = mean(group2);
  const var1 = variance(group1);
  const var2 = variance(group2);
  const n1 = group1.length;
  const n2 = group2.length;

  // Pooled standard deviation
  const pooledVar = ((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2);
  const pooledStd = Math.sqrt(pooledVar);

  return pooledStd === 0 ? 0 : (m1 - m2) / pooledStd;
}

/**
 * Input parameters for t-test
 */
interface TTestInput {
  filePath: string;
  variable: string;
  groupByColumn?: string;
  paired?: boolean;
  alternative?: 'two-sided' | 'less' | 'greater';
  sheetName?: string;
}

/**
 * Run t-test on a CSV file
 *
 * @param input - Analysis parameters
 * @returns Structured t-test result
 */
export function runTTest(input: TTestInput): TTestResult {
  const {
    filePath,
    variable,
    groupByColumn,
    paired = false,
    alternative = 'two-sided',
    sheetName,
  } = input;

  // Validate required parameters
  if (!variable) {
    throw new Error('Parameter "variable" is required for t_test');
  }
  if (!paired && !groupByColumn) {
    throw new Error(
      'Parameter "groupByColumn" is required for independent t_test. Set paired=true for paired test.'
    );
  }

  // Read and parse data file (CSV or Excel)
  const csv = readDataFile(filePath, sheetName);
  const diagnostics = [...csv.warnings];

  // Validate columns
  const requiredCols = [variable];
  if (groupByColumn) requiredCols.push(groupByColumn);
  validateColumns(csv.headers, requiredCols);

  // Split data into two groups
  let group1Values: number[];
  let group2Values: number[];
  let group1Name: string;
  let group2Name: string;

  if (groupByColumn) {
    // Independent: split by group column
    const uniqueGroups = [
      ...new Set(
        csv.rows
          .map((row) => row[groupByColumn])
          .filter((v) => v !== null)
          .map(String)
      ),
    ];

    if (uniqueGroups.length !== 2) {
      throw new Error(
        `groupByColumn "${groupByColumn}" must have exactly 2 unique non-missing values, but found ${uniqueGroups.length}: ${uniqueGroups.join(', ')}`
      );
    }

    group1Name = uniqueGroups[0];
    group2Name = uniqueGroups[1];

    const group1Rows = csv.rows.filter((row) => String(row[groupByColumn]) === group1Name);
    const group2Rows = csv.rows.filter((row) => String(row[groupByColumn]) === group2Name);

    group1Values = extractNumericValues(group1Rows, variable);
    group2Values = extractNumericValues(group2Rows, variable);
  } else {
    // Paired: assume first half vs second half, or require even row count
    // For simplicity, we split the data in half
    const allValues = extractNumericValues(csv.rows, variable);
    if (allValues.length % 2 !== 0) {
      throw new Error(
        `For paired t-test without groupByColumn, the number of observations must be even. Got ${allValues.length}.`
      );
    }
    const halfLen = allValues.length / 2;
    group1Values = allValues.slice(0, halfLen);
    group2Values = allValues.slice(halfLen);
    group1Name = 'First half';
    group2Name = 'Second half';
  }

  // Validate sample sizes
  if (group1Values.length < 2 || group2Values.length < 2) {
    throw new Error(
      `Each group must have at least 2 observations. Group "${group1Name}": ${group1Values.length}, Group "${group2Name}": ${group2Values.length}`
    );
  }

  if (paired && group1Values.length !== group2Values.length) {
    throw new Error(
      `For paired t-test, groups must have equal sizes. Group "${group1Name}": ${group1Values.length}, Group "${group2Name}": ${group2Values.length}`
    );
  }

  // Compute group statistics
  const n1 = group1Values.length;
  const n2 = group2Values.length;
  const mean1 = mean(group1Values);
  const mean2 = mean(group2Values);
  const std1 = std(group1Values);
  const std2 = std(group2Values);
  const var1 = variance(group1Values);
  const var2 = variance(group2Values);

  let tStatistic: number;
  let df: number;
  let se: number; // standard error of the mean difference

  if (paired) {
    // Paired t-test
    const diffs = group1Values.map((v, i) => v - group2Values[i]);
    const diffMean = mean(diffs);
    const diffStd = std(diffs);
    se = diffStd / Math.sqrt(n1);
    tStatistic = se === 0 ? 0 : diffMean / se;
    df = n1 - 1;
  } else {
    // Welch's t-test (does not assume equal variances)
    se = Math.sqrt(var1 / n1 + var2 / n2);
    tStatistic = se === 0 ? 0 : (mean1 - mean2) / se;

    // Welch-Satterthwaite degrees of freedom
    const num = (var1 / n1 + var2 / n2) ** 2;
    const denom = (var1 / n1) ** 2 / (n1 - 1) + (var2 / n2) ** 2 / (n2 - 1);
    df = denom === 0 ? n1 + n2 - 2 : num / denom;
  }

  // Compute p-value
  const pValue = tDistributionPValue(tStatistic, df, alternative);

  // Compute confidence interval for mean difference
  const tCrit = tCriticalValue(0.05, df);
  const meanDiff = mean1 - mean2;
  const ci = {
    lower: meanDiff - tCrit * se,
    upper: meanDiff + tCrit * se,
  };

  // Effect size
  const d = cohensD(group1Values, group2Values, paired);

  // Levene's test (only for independent samples)
  let leveneResult: { fStatistic: number; pValue: number } | undefined;
  if (!paired) {
    leveneResult = leveneTest(group1Values, group2Values);
    if (leveneResult.pValue < 0.05) {
      diagnostics.push(
        `⚠️ Levene's test is significant (p=${leveneResult.pValue.toFixed(4)}), suggesting unequal variances. Welch's t-test is appropriate.`
      );
    }
  }

  // Data info
  const totalUsed = n1 + n2;
  const dataInfo: DataInfo = {
    filePath,
    totalRows: csv.metadata.totalRows,
    usedRows: totalUsed,
    excludedRows: csv.metadata.totalRows - totalUsed,
  };

  // Diagnostics
  if (n1 < 30 || n2 < 30) {
    diagnostics.push(
      `⚠️ Small sample size: "${group1Name}" (n=${n1}), "${group2Name}" (n=${n2}). Consider non-parametric alternatives if normality is violated.`
    );
  }

  // Build summary
  const testType = paired ? 'Paired' : "Welch's Independent";
  const altText =
    alternative === 'two-sided'
      ? 'two-sided'
      : alternative === 'less'
        ? `one-sided (${group1Name} < ${group2Name})`
        : `one-sided (${group1Name} > ${group2Name})`;

  const summaryLines = [
    `📊 ${testType} T-Test Results`,
    '━'.repeat(40),
    `Data: ${filePath} (${totalUsed} observations used)`,
    `Variable: ${variable}`,
    `Alternative hypothesis: ${altText}`,
    '',
    'Group Statistics:',
    `  ${group1Name}: n=${n1}, mean=${mean1.toFixed(4)}, std=${std1.toFixed(4)}`,
    `  ${group2Name}: n=${n2}, mean=${mean2.toFixed(4)}, std=${std2.toFixed(4)}`,
    '',
    'Test Results:',
    `  t-statistic = ${tStatistic.toFixed(4)}`,
    `  degrees of freedom = ${df.toFixed(2)}`,
    `  p-value = ${formatPValue(pValue)}`,
    '',
    `  Mean difference = ${meanDiff.toFixed(4)}`,
    `  95% CI: [${ci.lower.toFixed(4)}, ${ci.upper.toFixed(4)}]`,
    `  Cohen's d = ${d.toFixed(4)} (${interpretCohensD(d)})`,
  ];

  if (leveneResult) {
    summaryLines.push('');
    summaryLines.push("Levene's Test for Equality of Variances:");
    summaryLines.push(
      `  F = ${leveneResult.fStatistic.toFixed(4)}, p = ${formatPValue(leveneResult.pValue)}`
    );
  }

  // Build interpretation
  const interpretation = buildTTestInterpretation(
    pValue,
    meanDiff,
    d,
    ci,
    group1Name,
    group2Name,
    variable,
    alternative
  );

  return {
    method: 'T-Test',
    dataInfo,
    summary: summaryLines.join('\n'),
    details: {
      testType: paired ? 'paired' : 'independent',
      tStatistic,
      pValue,
      degreesOfFreedom: df,
      meanDifference: meanDiff,
      confidenceInterval: ci,
      cohensD: d,
      group1: { name: group1Name, n: n1, mean: mean1, std: std1 },
      group2: { name: group2Name, n: n2, mean: mean2, std: std2 },
      leveneTest: leveneResult,
      alternative,
    },
    diagnostics,
    interpretation,
  };
}

/**
 * Format p-value for display
 */
function formatPValue(p: number): string {
  if (p < 0.001) return '< 0.001';
  return p.toFixed(4);
}

/**
 * Interpret Cohen's d effect size
 */
function interpretCohensD(d: number): string {
  const abs = Math.abs(d);
  if (abs < 0.2) return 'negligible';
  if (abs < 0.5) return 'small';
  if (abs < 0.8) return 'medium';
  return 'large';
}

/**
 * Build human-readable interpretation of t-test results
 */
function buildTTestInterpretation(
  pValue: number,
  meanDiff: number,
  cohensD: number,
  ci: { lower: number; upper: number },
  group1Name: string,
  group2Name: string,
  variable: string,
  _alternative: 'two-sided' | 'less' | 'greater'
): string {
  const lines: string[] = [];
  const alpha = 0.05;
  const significant = pValue < alpha;

  if (significant) {
    lines.push(
      `The difference in "${variable}" between "${group1Name}" and "${group2Name}" is statistically significant at α=${alpha} (p=${formatPValue(pValue)}).`
    );

    if (meanDiff > 0) {
      lines.push(
        `"${group1Name}" has a higher mean than "${group2Name}" by ${Math.abs(meanDiff).toFixed(4)}.`
      );
    } else {
      lines.push(
        `"${group2Name}" has a higher mean than "${group1Name}" by ${Math.abs(meanDiff).toFixed(4)}.`
      );
    }
  } else {
    lines.push(
      `No statistically significant difference was found in "${variable}" between "${group1Name}" and "${group2Name}" at α=${alpha} (p=${formatPValue(pValue)}).`
    );
  }

  // Effect size interpretation
  const effectSize = interpretCohensD(cohensD);
  lines.push(`The effect size is ${effectSize} (Cohen's d = ${cohensD.toFixed(4)}).`);

  // CI interpretation
  lines.push(
    `The 95% confidence interval for the mean difference is [${ci.lower.toFixed(4)}, ${ci.upper.toFixed(4)}].`
  );

  if (ci.lower <= 0 && ci.upper >= 0) {
    lines.push(
      'The confidence interval includes zero, consistent with the non-significant result.'
    );
  } else {
    lines.push(
      'The confidence interval does not include zero, consistent with the significant result.'
    );
  }

  return lines.join('\n');
}
