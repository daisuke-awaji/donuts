/**
 * CSV Reader - Parse and validate CSV files for statistical analysis
 */

import { readFileSync, statSync, existsSync } from 'fs';
import { parse } from 'csv-parse/sync';
import type { CSVReadResult } from '../types.js';
import { CSV_LIMITS } from '../types.js';

/** Values treated as missing/null */
const MISSING_VALUES = new Set(['', 'NA', 'NaN', 'nan', 'null', 'NULL', 'N/A', 'n/a', '.', '-']);

/**
 * Try to parse a string value as a number
 * Returns the number if parseable, null if it's a missing value, or the original string
 */
function parseValue(value: string): string | number | null {
  const trimmed = value.trim();

  if (MISSING_VALUES.has(trimmed)) {
    return null;
  }

  const num = Number(trimmed);
  if (!Number.isNaN(num) && trimmed !== '') {
    return num;
  }

  return trimmed;
}

/**
 * Determine if a column is numeric based on its values
 * A column is numeric if >50% of non-null values are numbers
 */
function isNumericColumn(values: (string | number | null)[]): boolean {
  const nonNull = values.filter((v) => v !== null);
  if (nonNull.length === 0) return false;

  const numericCount = nonNull.filter((v) => typeof v === 'number').length;
  return numericCount / nonNull.length > 0.5;
}

/**
 * Read and parse a CSV file
 *
 * @param filePath - Absolute path to the CSV file
 * @returns Parsed CSV data with metadata
 * @throws Error if file doesn't exist, is too large, or can't be parsed
 */
export function readCSV(filePath: string): CSVReadResult {
  const warnings: string[] = [];

  // Validate file exists
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  // Check file size
  const stats = statSync(filePath);
  if (stats.size > CSV_LIMITS.MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `File size (${(stats.size / 1024 / 1024).toFixed(1)}MB) exceeds limit of ${CSV_LIMITS.MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`
    );
  }

  // Read file content (handle BOM)
  let content = readFileSync(filePath, 'utf-8');
  if (content.charCodeAt(0) === 0xfeff) {
    content = content.slice(1);
    warnings.push('BOM character detected and removed');
  }

  // Parse CSV
  let rawRecords: Record<string, string>[];
  try {
    rawRecords = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    }) as Record<string, string>[];
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse CSV: ${msg}`);
  }

  if (rawRecords.length === 0) {
    throw new Error('CSV file is empty (no data rows found)');
  }

  // Check row limit
  if (rawRecords.length > CSV_LIMITS.MAX_ROWS) {
    warnings.push(
      `Row count (${rawRecords.length}) exceeds limit of ${CSV_LIMITS.MAX_ROWS}. Only first ${CSV_LIMITS.MAX_ROWS} rows will be used.`
    );
    rawRecords = rawRecords.slice(0, CSV_LIMITS.MAX_ROWS);
  }

  // Extract headers
  const headers = Object.keys(rawRecords[0]);

  // Parse values and build rows
  const rows: Record<string, string | number | null>[] = rawRecords.map((record) => {
    const row: Record<string, string | number | null> = {};
    for (const header of headers) {
      row[header] = parseValue(record[header] ?? '');
    }
    return row;
  });

  // Classify columns and count missing values
  const missingValueCounts: Record<string, number> = {};
  const numericColumns: string[] = [];
  const categoricalColumns: string[] = [];

  for (const header of headers) {
    const columnValues = rows.map((row) => row[header]);
    missingValueCounts[header] = columnValues.filter((v) => v === null).length;

    if (isNumericColumn(columnValues)) {
      numericColumns.push(header);
    } else {
      categoricalColumns.push(header);
    }
  }

  // Add warnings for high missing rates
  for (const header of headers) {
    const missingRate = missingValueCounts[header] / rows.length;
    if (missingRate > 0.3) {
      warnings.push(
        `Column "${header}" has ${(missingRate * 100).toFixed(1)}% missing values (${missingValueCounts[header]}/${rows.length})`
      );
    }
  }

  return {
    headers,
    rows,
    metadata: {
      totalRows: rows.length,
      numericColumns,
      categoricalColumns,
      missingValueCounts,
    },
    warnings,
  };
}

/**
 * Extract numeric values from a column, filtering out nulls and non-numeric values
 *
 * @param rows - Data rows
 * @param column - Column name
 * @returns Array of numeric values (nulls/non-numeric excluded)
 */
export function extractNumericValues(
  rows: Record<string, string | number | null>[],
  column: string
): number[] {
  return rows
    .map((row) => row[column])
    .filter((v): v is number => typeof v === 'number' && !Number.isNaN(v));
}

/**
 * Validate that specified columns exist in the CSV headers
 *
 * @param headers - Available column names
 * @param requestedColumns - Columns requested by the user
 * @throws Error if any requested column doesn't exist
 */
export function validateColumns(headers: string[], requestedColumns: string[]): void {
  const missing = requestedColumns.filter((col) => !headers.includes(col));
  if (missing.length > 0) {
    throw new Error(
      `Column(s) not found in CSV: ${missing.map((c) => `"${c}"`).join(', ')}. Available columns: ${headers.map((h) => `"${h}"`).join(', ')}`
    );
  }
}
