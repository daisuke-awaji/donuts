/**
 * Data Reader - Unified file reader supporting CSV and Excel formats
 *
 * Delegates CSV parsing to csv-reader.ts and adds Excel (.xlsx, .xls) support via SheetJS.
 */

import { existsSync, statSync, readFileSync } from 'fs';
import { extname } from 'path';
import { read as xlsxRead, utils as xlsxUtils } from 'xlsx';
import type { WorkBook, WorkSheet } from 'xlsx';
import { readCSV } from './csv-reader.js';
import type { CSVReadResult } from '../types.js';
import { CSV_LIMITS } from '../types.js';

// Re-export utilities from csv-reader for convenience
export { extractNumericValues, validateColumns } from './csv-reader.js';

/** Values treated as missing/null (same as csv-reader) */
const MISSING_VALUES = new Set(['', 'NA', 'NaN', 'nan', 'null', 'NULL', 'N/A', 'n/a', '.', '-']);

/** Supported file extensions */
const SUPPORTED_EXTENSIONS = new Set(['.csv', '.tsv', '.xlsx', '.xls']);

/**
 * Read a data file (CSV or Excel) and return parsed result
 *
 * Automatically detects file format by extension and delegates to the appropriate parser.
 *
 * @param filePath - Absolute path to the data file (.csv, .tsv, .xlsx, .xls)
 * @param sheetName - Sheet name to read from Excel files (optional, defaults to first sheet)
 * @returns Parsed data with metadata (same format regardless of input file type)
 * @throws Error if file doesn't exist, format is unsupported, or parsing fails
 */
export function readDataFile(filePath: string, sheetName?: string): CSVReadResult {
  // Validate file exists
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const ext = extname(filePath).toLowerCase();

  if (!SUPPORTED_EXTENSIONS.has(ext)) {
    throw new Error(
      `Unsupported file format: "${ext}". Supported formats: ${[...SUPPORTED_EXTENSIONS].join(', ')}`
    );
  }

  // Route to appropriate reader
  switch (ext) {
    case '.csv':
    case '.tsv':
      return readCSV(filePath);
    case '.xlsx':
    case '.xls':
      return readExcel(filePath, sheetName);
    default:
      throw new Error(`Unsupported file format: "${ext}"`);
  }
}

/**
 * Read and parse an Excel file (.xlsx or .xls)
 *
 * @param filePath - Absolute path to the Excel file
 * @param sheetName - Sheet name to read (optional, defaults to first sheet)
 * @returns Parsed data in the same format as CSV reader
 * @throws Error if file can't be parsed or sheet doesn't exist
 */
function readExcel(filePath: string, sheetName?: string): CSVReadResult {
  const warnings: string[] = [];

  // Check file size
  const stats = statSync(filePath);
  if (stats.size > CSV_LIMITS.MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `File size (${(stats.size / 1024 / 1024).toFixed(1)}MB) exceeds limit of ${CSV_LIMITS.MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`
    );
  }

  // Read workbook
  let workbook: WorkBook;
  try {
    const buffer = readFileSync(filePath);
    workbook = xlsxRead(buffer, { type: 'buffer' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read Excel file: ${msg}`);
  }

  // Select sheet
  let targetSheetName: string;
  if (sheetName) {
    if (!workbook.SheetNames.includes(sheetName)) {
      throw new Error(
        `Sheet "${sheetName}" not found. Available sheets: ${workbook.SheetNames.map((s) => `"${s}"`).join(', ')}`
      );
    }
    targetSheetName = sheetName;
  } else {
    if (workbook.SheetNames.length === 0) {
      throw new Error('Excel file contains no sheets');
    }
    targetSheetName = workbook.SheetNames[0];
    if (workbook.SheetNames.length > 1) {
      warnings.push(
        `Multiple sheets found: ${workbook.SheetNames.map((s) => `"${s}"`).join(', ')}. Using first sheet: "${targetSheetName}". Specify sheetName to select a different sheet.`
      );
    }
  }

  const worksheet: WorkSheet = workbook.Sheets[targetSheetName];

  // Convert to JSON (array of objects with header row)
  let rawRecords: Record<string, unknown>[];
  try {
    rawRecords = xlsxUtils.sheet_to_json(worksheet, {
      defval: null,
      raw: true,
    }) as Record<string, unknown>[];
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse Excel sheet "${targetSheetName}": ${msg}`);
  }

  if (rawRecords.length === 0) {
    throw new Error(`Excel sheet "${targetSheetName}" is empty (no data rows found)`);
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
      const val = record[header];
      if (val === null || val === undefined) {
        row[header] = null;
      } else if (typeof val === 'number') {
        row[header] = Number.isNaN(val) ? null : val;
      } else {
        // String value — apply same missing value logic as CSV
        const strVal = String(val).trim();
        if (MISSING_VALUES.has(strVal)) {
          row[header] = null;
        } else {
          const num = Number(strVal);
          if (!Number.isNaN(num) && strVal !== '') {
            row[header] = num;
          } else {
            row[header] = strVal;
          }
        }
      }
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

    const nonNull = columnValues.filter((v) => v !== null);
    const numericCount = nonNull.filter((v) => typeof v === 'number').length;
    const isNumeric = nonNull.length > 0 && numericCount / nonNull.length > 0.5;

    if (isNumeric) {
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
