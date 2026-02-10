/**
 * Descriptive Statistics Method
 *
 * Computes summary statistics for numeric columns in a CSV file.
 */

import { readDataFile, extractNumericValues, validateColumns } from '../utils/data-reader.js';
import type { DescriptiveStatsResult, ColumnStats, DataInfo } from '../types.js';

/**
 * Compute mean of an array
 */
function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Compute standard deviation (sample, ddof=1)
 */
function std(values: number[], avg?: number): number {
  if (values.length <= 1) return 0;
  const m = avg ?? mean(values);
  const sumSqDiff = values.reduce((sum, v) => sum + (v - m) ** 2, 0);
  return Math.sqrt(sumSqDiff / (values.length - 1));
}

/**
 * Compute a percentile using linear interpolation
 */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN;
  if (sorted.length === 1) return sorted[0];

  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const fraction = index - lower;

  if (lower === upper) return sorted[lower];
  return sorted[lower] * (1 - fraction) + sorted[upper] * fraction;
}

/**
 * Compute skewness (Fisher's definition, sample skewness)
 */
function skewness(values: number[], avg: number, sd: number): number {
  if (values.length < 3 || sd === 0) return 0;
  const n = values.length;
  const m3 = values.reduce((sum, v) => sum + ((v - avg) / sd) ** 3, 0) / n;
  // Apply bias correction factor
  return (m3 * n * n) / ((n - 1) * (n - 2));
}

/**
 * Compute excess kurtosis (Fisher's definition, sample kurtosis)
 */
function kurtosis(values: number[], avg: number, sd: number): number {
  if (values.length < 4 || sd === 0) return 0;
  const n = values.length;
  const m4 = values.reduce((sum, v) => sum + ((v - avg) / sd) ** 4, 0) / n;
  // Apply bias correction and subtract 3 for excess kurtosis
  const rawKurtosis = (m4 * n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3));
  const correction = (3 * (n - 1) ** 2) / ((n - 2) * (n - 3));
  return rawKurtosis - correction;
}

/**
 * Compute statistics for a single column's numeric values
 */
function computeColumnStats(column: string, values: number[], totalRowCount: number): ColumnStats {
  if (values.length === 0) {
    return {
      column,
      count: 0,
      mean: NaN,
      std: NaN,
      min: NaN,
      q1: NaN,
      median: NaN,
      q3: NaN,
      max: NaN,
      missingCount: totalRowCount,
      skewness: NaN,
      kurtosis: NaN,
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const avg = mean(values);
  const sd = std(values, avg);

  return {
    column,
    count: values.length,
    mean: avg,
    std: sd,
    min: sorted[0],
    q1: percentile(sorted, 25),
    median: percentile(sorted, 50),
    q3: percentile(sorted, 75),
    max: sorted[sorted.length - 1],
    missingCount: totalRowCount - values.length,
    skewness: skewness(values, avg, sd),
    kurtosis: kurtosis(values, avg, sd),
  };
}

/**
 * Input parameters for descriptive statistics
 */
interface DescriptiveStatsInput {
  filePath: string;
  columns?: string[];
  groupBy?: string;
  sheetName?: string;
}

/**
 * Run descriptive statistics on a CSV file
 *
 * @param input - Analysis parameters
 * @returns Structured result with column statistics
 */
export function runDescriptiveStats(input: DescriptiveStatsInput): DescriptiveStatsResult {
  const { filePath, columns, groupBy, sheetName } = input;

  // Read and parse data file (CSV or Excel)
  const csv = readDataFile(filePath, sheetName);
  const diagnostics = [...csv.warnings];

  // Determine which columns to analyze
  let targetColumns: string[];
  if (columns && columns.length > 0) {
    validateColumns(csv.headers, columns);
    targetColumns = columns;
  } else {
    targetColumns = csv.metadata.numericColumns;
    if (targetColumns.length === 0) {
      throw new Error('No numeric columns found in the CSV file');
    }
  }

  // Validate groupBy column if specified
  if (groupBy) {
    validateColumns(csv.headers, [groupBy]);
  }

  const dataInfo: DataInfo = {
    filePath,
    totalRows: csv.metadata.totalRows,
    usedRows: csv.metadata.totalRows,
    excludedRows: 0,
  };

  // Compute statistics for each column
  const columnStats: ColumnStats[] = targetColumns.map((col) => {
    const values = extractNumericValues(csv.rows, col);
    return computeColumnStats(col, values, csv.metadata.totalRows);
  });

  // Handle groupBy if specified
  let groups: Record<string, ColumnStats[]> | undefined;
  if (groupBy) {
    groups = {};
    const groupValues = new Set(csv.rows.map((row) => row[groupBy]).filter((v) => v !== null));

    for (const groupValue of groupValues) {
      const groupName = String(groupValue);
      const groupRows = csv.rows.filter((row) => String(row[groupBy]) === groupName);

      groups[groupName] = targetColumns.map((col) => {
        const values = extractNumericValues(groupRows, col);
        return computeColumnStats(col, values, groupRows.length);
      });
    }

    // Add diagnostic for group sizes
    const groupSizes = Object.entries(groups).map(([name, stats]) => ({
      name,
      n: stats[0]?.count ?? 0,
    }));
    diagnostics.push(
      `Groups (${groupBy}): ${groupSizes.map((g) => `${g.name} (n=${g.n})`).join(', ')}`
    );

    // Warn about small groups
    const smallGroups = groupSizes.filter((g) => g.n < 30);
    if (smallGroups.length > 0) {
      diagnostics.push(
        `⚠️ Small sample size in groups: ${smallGroups.map((g) => `${g.name} (n=${g.n})`).join(', ')}. Results may be unreliable.`
      );
    }
  }

  // Warn about small overall sample
  if (csv.metadata.totalRows < 30) {
    diagnostics.push(
      `⚠️ Small sample size (n=${csv.metadata.totalRows}). Summary statistics may not be representative.`
    );
  }

  // Build summary text
  const summaryLines = ['📊 Descriptive Statistics Results', '━'.repeat(40)];
  summaryLines.push(
    `Data: ${filePath} (${csv.metadata.totalRows} rows, ${targetColumns.length} columns analyzed)`
  );
  summaryLines.push('');
  summaryLines.push(formatStatsTable(columnStats));

  if (groups) {
    summaryLines.push('');
    summaryLines.push(`\nGrouped by: ${groupBy}`);
    for (const [groupName, stats] of Object.entries(groups)) {
      summaryLines.push(`\n--- Group: ${groupName} ---`);
      summaryLines.push(formatStatsTable(stats));
    }
  }

  // Build interpretation
  const interpretation = buildInterpretation(columnStats, groupBy, groups);

  return {
    method: 'Descriptive Statistics',
    dataInfo,
    summary: summaryLines.join('\n'),
    details: {
      columns: columnStats,
      groupBy,
      groups,
    },
    diagnostics,
    interpretation,
  };
}

/**
 * Format column statistics as an aligned text table
 */
function formatStatsTable(stats: ColumnStats[]): string {
  const header =
    'Column         |  Count |       Mean |      Std |      Min |   Median |      Max | Missing';
  const separator = '-'.repeat(header.length);

  const rows = stats.map((s) => {
    const col = s.column.padEnd(14).slice(0, 14);
    const count = String(s.count).padStart(6);
    const avg = formatNum(s.mean, 10);
    const sd = formatNum(s.std, 8);
    const min = formatNum(s.min, 8);
    const med = formatNum(s.median, 8);
    const max = formatNum(s.max, 8);
    const missing = String(s.missingCount).padStart(7);
    return `${col} | ${count} | ${avg} | ${sd} | ${min} | ${med} | ${max} | ${missing}`;
  });

  return [header, separator, ...rows].join('\n');
}

/**
 * Format a number for display
 */
function formatNum(value: number, width: number): string {
  if (Number.isNaN(value)) return 'NaN'.padStart(width);
  if (Math.abs(value) >= 1e6 || (Math.abs(value) < 0.01 && value !== 0)) {
    return value.toExponential(2).padStart(width);
  }
  return value.toFixed(2).padStart(width);
}

/**
 * Build a human-readable interpretation of the descriptive statistics
 */
function buildInterpretation(
  stats: ColumnStats[],
  groupBy?: string,
  groups?: Record<string, ColumnStats[]>
): string {
  const lines: string[] = [];

  for (const s of stats) {
    if (Number.isNaN(s.mean)) continue;

    const range = s.max - s.min;
    const cv = s.std / Math.abs(s.mean); // coefficient of variation
    const iqr = s.q3 - s.q1;

    lines.push(`"${s.column}": `);
    lines.push(`  Range: ${s.min.toFixed(2)} to ${s.max.toFixed(2)} (range=${range.toFixed(2)})`);
    lines.push(`  Central tendency: mean=${s.mean.toFixed(2)}, median=${s.median.toFixed(2)}`);

    // Skewness interpretation
    if (Math.abs(s.skewness) > 1) {
      const direction = s.skewness > 0 ? 'right' : 'left';
      lines.push(
        `  Distribution is strongly skewed to the ${direction} (skewness=${s.skewness.toFixed(2)})`
      );
    } else if (Math.abs(s.skewness) > 0.5) {
      const direction = s.skewness > 0 ? 'right' : 'left';
      lines.push(
        `  Distribution is moderately skewed to the ${direction} (skewness=${s.skewness.toFixed(2)})`
      );
    } else {
      lines.push(`  Distribution is approximately symmetric (skewness=${s.skewness.toFixed(2)})`);
    }

    // Variability interpretation
    if (!Number.isNaN(cv) && Math.abs(s.mean) > 0) {
      if (cv > 1) {
        lines.push(`  High variability (CV=${(cv * 100).toFixed(1)}%, IQR=${iqr.toFixed(2)})`);
      } else if (cv > 0.5) {
        lines.push(`  Moderate variability (CV=${(cv * 100).toFixed(1)}%, IQR=${iqr.toFixed(2)})`);
      } else {
        lines.push(`  Low variability (CV=${(cv * 100).toFixed(1)}%, IQR=${iqr.toFixed(2)})`);
      }
    }

    if (s.missingCount > 0) {
      const missingPct = ((s.missingCount / (s.count + s.missingCount)) * 100).toFixed(1);
      lines.push(`  ⚠️ ${s.missingCount} missing values (${missingPct}%)`);
    }
  }

  if (groupBy && groups) {
    const groupNames = Object.keys(groups);
    lines.push(`\nGroup comparison (${groupBy}): ${groupNames.length} groups detected.`);
    lines.push('Use t_test for formal hypothesis testing between two groups.');
  }

  return lines.join('\n');
}
