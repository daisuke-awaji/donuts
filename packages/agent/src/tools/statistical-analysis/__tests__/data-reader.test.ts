/**
 * Data Reader Unit Tests - Excel support
 */

import { readDataFile, extractNumericValues, validateColumns } from '../utils/data-reader.js';
import { runDescriptiveStats } from '../methods/descriptive-stats.js';
import { runTTest } from '../methods/t-test.js';
import { utils as xlsxUtils, write as xlsxWrite } from 'xlsx';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const TEST_DIR = join(tmpdir(), 'stat-analysis-test-data-reader');

beforeAll(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

afterAll(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

/**
 * Helper: create an Excel file from an array of objects
 */
function writeTestExcel(
  filename: string,
  data: Record<string, unknown>[],
  sheetName: string = 'Sheet1'
): string {
  const filePath = join(TEST_DIR, filename);
  const workbook = xlsxUtils.book_new();
  const worksheet = xlsxUtils.json_to_sheet(data);
  xlsxUtils.book_append_sheet(workbook, worksheet, sheetName);
  const buffer = xlsxWrite(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  writeFileSync(filePath, buffer);
  return filePath;
}

/**
 * Helper: create an Excel file with multiple sheets
 */
function writeTestExcelMultiSheet(
  filename: string,
  sheets: { name: string; data: Record<string, unknown>[] }[]
): string {
  const filePath = join(TEST_DIR, filename);
  const workbook = xlsxUtils.book_new();
  for (const sheet of sheets) {
    const worksheet = xlsxUtils.json_to_sheet(sheet.data);
    xlsxUtils.book_append_sheet(workbook, worksheet, sheet.name);
  }
  const buffer = xlsxWrite(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  writeFileSync(filePath, buffer);
  return filePath;
}

function writeTestCSV(filename: string, content: string): string {
  const filePath = join(TEST_DIR, filename);
  writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

describe('readDataFile - CSV (backward compatibility)', () => {
  it('should read CSV files via data-reader', () => {
    const filePath = writeTestCSV('compat.csv', 'name,age\nAlice,25\nBob,30');

    const result = readDataFile(filePath);

    expect(result.headers).toEqual(['name', 'age']);
    expect(result.rows).toHaveLength(2);
    expect(result.metadata.numericColumns).toContain('age');
  });
});

describe('readDataFile - Excel', () => {
  it('should read a basic Excel file with numeric and categorical columns', () => {
    const data = [
      { name: 'Alice', age: 25, score: 85.5 },
      { name: 'Bob', age: 30, score: 90.0 },
      { name: 'Charlie', age: 35, score: 78.2 },
    ];
    const filePath = writeTestExcel('basic.xlsx', data);

    const result = readDataFile(filePath);

    expect(result.headers).toEqual(['name', 'age', 'score']);
    expect(result.rows).toHaveLength(3);
    expect(result.metadata.totalRows).toBe(3);
    expect(result.metadata.numericColumns).toContain('age');
    expect(result.metadata.numericColumns).toContain('score');
    expect(result.metadata.categoricalColumns).toContain('name');
  });

  it('should read numeric values correctly from Excel', () => {
    const data = [
      { int: 1, float: 1.5, negative: -10, zero: 0 },
      { int: 2, float: 2.5, negative: -20, zero: 0 },
      { int: 3, float: 3.5, negative: -30, zero: 0 },
    ];
    const filePath = writeTestExcel('numbers.xlsx', data);

    const result = readDataFile(filePath);

    expect(result.rows[0]['int']).toBe(1);
    expect(result.rows[0]['float']).toBe(1.5);
    expect(result.rows[0]['negative']).toBe(-10);
    expect(result.rows[0]['zero']).toBe(0);
    expect(result.metadata.numericColumns).toEqual(['int', 'float', 'negative', 'zero']);
  });

  it('should handle null/missing values in Excel', () => {
    const data = [
      { id: 1, value: 10 },
      { id: 2, value: null },
      { id: 3, value: 30 },
    ];
    const filePath = writeTestExcel('missing.xlsx', data);

    const result = readDataFile(filePath);

    expect(result.rows).toHaveLength(3);
    expect(result.rows[1]['value']).toBeNull();
    expect(result.metadata.missingValueCounts['value']).toBe(1);
  });

  it('should select the first sheet by default', () => {
    const filePath = writeTestExcelMultiSheet('multi.xlsx', [
      { name: 'First', data: [{ a: 1, b: 2 }] },
      { name: 'Second', data: [{ x: 10, y: 20 }] },
    ]);

    const result = readDataFile(filePath);

    expect(result.headers).toEqual(['a', 'b']);
    expect(result.rows).toHaveLength(1);
    // Should have a warning about multiple sheets
    const hasMultiSheetWarning = result.warnings.some((w) => w.includes('Multiple sheets'));
    expect(hasMultiSheetWarning).toBe(true);
  });

  it('should read a specific sheet by name', () => {
    const filePath = writeTestExcelMultiSheet('multi-select.xlsx', [
      { name: 'Sales', data: [{ product: 'A', revenue: 100 }] },
      { name: 'Costs', data: [{ item: 'X', cost: 50 }] },
    ]);

    const result = readDataFile(filePath, 'Costs');

    expect(result.headers).toEqual(['item', 'cost']);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]['cost']).toBe(50);
  });

  it('should throw error for non-existent sheet name', () => {
    const filePath = writeTestExcelMultiSheet('multi-err.xlsx', [
      { name: 'Sheet1', data: [{ a: 1 }] },
    ]);

    expect(() => readDataFile(filePath, 'NonExistent')).toThrow('Sheet "NonExistent" not found');
  });

  it('should throw error for unsupported file format', () => {
    const filePath = join(TEST_DIR, 'data.json');
    writeFileSync(filePath, '{"key": "value"}', 'utf-8');

    expect(() => readDataFile(filePath)).toThrow('Unsupported file format');
  });

  it('should throw error for non-existent file', () => {
    expect(() => readDataFile('/nonexistent/path/file.xlsx')).toThrow('File not found');
  });
});

describe('readDataFile - Excel with statistical analysis', () => {
  it('should work with descriptive stats on Excel data', () => {
    const data = [
      { group: 'A', value: 10 },
      { group: 'A', value: 20 },
      { group: 'A', value: 30 },
      { group: 'B', value: 40 },
      { group: 'B', value: 50 },
      { group: 'B', value: 60 },
    ];
    const filePath = writeTestExcel('stats-excel.xlsx', data);

    const result = runDescriptiveStats({
      filePath,
      columns: ['value'],
      groupBy: 'group',
    });

    expect(result.method).toBe('Descriptive Statistics');
    expect(result.details.groups).toBeDefined();
    expect(result.details.groups!['A'][0].mean).toBe(20);
    expect(result.details.groups!['B'][0].mean).toBe(50);
  });

  it('should work with t-test on Excel data', () => {
    const data = [
      { group: 'A', score: 10 },
      { group: 'A', score: 20 },
      { group: 'A', score: 30 },
      { group: 'B', score: 40 },
      { group: 'B', score: 50 },
      { group: 'B', score: 60 },
    ];
    const filePath = writeTestExcel('ttest-excel.xlsx', data);

    const result = runTTest({
      filePath,
      variable: 'score',
      groupByColumn: 'group',
    });

    expect(result.method).toBe('T-Test');
    expect(result.details.group1.name).toBe('A');
    expect(result.details.group2.name).toBe('B');
    expect(result.details.pValue).toBeLessThan(0.05);
  });
});

describe('extractNumericValues and validateColumns (re-exported)', () => {
  it('should re-export extractNumericValues correctly', () => {
    const rows = [{ col: 1 }, { col: 2 }, { col: 3 }] as Record<string, string | number | null>[];
    expect(extractNumericValues(rows, 'col')).toEqual([1, 2, 3]);
  });

  it('should re-export validateColumns correctly', () => {
    expect(() => validateColumns(['a', 'b'], ['a', 'x'])).toThrow('Column(s) not found');
  });
});
