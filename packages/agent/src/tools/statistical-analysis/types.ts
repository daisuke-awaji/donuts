/**
 * Statistical Analysis Tool - Type Definitions
 */

/**
 * CSV read result after parsing and validation
 */
export interface CSVReadResult {
  headers: string[];
  rows: Record<string, string | number | null>[];
  metadata: {
    totalRows: number;
    numericColumns: string[];
    categoricalColumns: string[];
    missingValueCounts: Record<string, number>;
  };
  warnings: string[];
}

/**
 * Data info included in every statistical result
 */
export interface DataInfo {
  filePath: string;
  totalRows: number;
  usedRows: number;
  excludedRows: number;
}

/**
 * Base interface for all statistical analysis results
 */
export interface StatisticalResult {
  method: string;
  dataInfo: DataInfo;
  summary: string;
  details: Record<string, unknown>;
  diagnostics: string[];
  interpretation: string;
}

/**
 * Column statistics for descriptive stats
 */
export interface ColumnStats {
  column: string;
  count: number;
  mean: number;
  std: number;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  missingCount: number;
  skewness: number;
  kurtosis: number;
}

/**
 * Descriptive statistics result
 */
export interface DescriptiveStatsResult extends StatisticalResult {
  method: 'Descriptive Statistics';
  details: {
    columns: ColumnStats[];
    groupBy?: string;
    groups?: Record<string, ColumnStats[]>;
  };
}

/**
 * T-test result
 */
export interface TTestResult extends StatisticalResult {
  method: 'T-Test';
  details: {
    testType: 'independent' | 'paired';
    tStatistic: number;
    pValue: number;
    degreesOfFreedom: number;
    meanDifference: number;
    confidenceInterval: { lower: number; upper: number };
    cohensD: number;
    group1: { name: string; n: number; mean: number; std: number };
    group2: { name: string; n: number; mean: number; std: number };
    leveneTest?: { fStatistic: number; pValue: number };
    alternative: 'two-sided' | 'less' | 'greater';
  };
}

/**
 * Limits for CSV processing
 */
export const CSV_LIMITS = {
  MAX_ROWS: 100_000,
  MAX_FILE_SIZE_BYTES: 50 * 1024 * 1024, // 50MB
} as const;
