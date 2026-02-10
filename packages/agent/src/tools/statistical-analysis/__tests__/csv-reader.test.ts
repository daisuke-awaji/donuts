/**
 * CSV Reader Unit Tests
 */

import { readCSV, extractNumericValues, validateColumns } from '../utils/csv-reader.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const TEST_DIR = join(tmpdir(), 'stat-analysis-test-csv');

beforeAll(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

afterAll(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

function writeTestCSV(filename: string, content: string): string {
  const filePath = join(TEST_DIR, filename);
  writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

describe('readCSV', () => {
  it('should parse a basic CSV file with numeric and categorical columns', () => {
    const filePath = writeTestCSV(
      'basic.csv',
      'name,age,score\nAlice,25,85.5\nBob,30,90.0\nCharlie,35,78.2'
    );

    const result = readCSV(filePath);

    expect(result.headers).toEqual(['name', 'age', 'score']);
    expect(result.rows).toHaveLength(3);
    expect(result.metadata.totalRows).toBe(3);
    expect(result.metadata.numericColumns).toContain('age');
    expect(result.metadata.numericColumns).toContain('score');
    expect(result.metadata.categoricalColumns).toContain('name');
  });

  it('should handle missing values correctly', () => {
    const filePath = writeTestCSV(
      'missing.csv',
      'id,value,category\n1,10,A\n2,,B\n3,NA,C\n4,30,\n5,null,D'
    );

    const result = readCSV(filePath);

    expect(result.rows).toHaveLength(5);

    // Check missing value detection
    expect(result.rows[1]['value']).toBeNull(); // empty string
    expect(result.rows[2]['value']).toBeNull(); // NA
    expect(result.rows[3]['category']).toBeNull(); // empty string
    expect(result.rows[4]['value']).toBeNull(); // null

    // Check missing counts
    expect(result.metadata.missingValueCounts['value']).toBe(3);
  });

  it('should handle BOM character', () => {
    const filePath = writeTestCSV('bom.csv', '\uFEFFname,value\nAlice,10\nBob,20');

    const result = readCSV(filePath);

    expect(result.headers).toEqual(['name', 'value']);
    expect(result.warnings).toContain('BOM character detected and removed');
  });

  it('should throw error for non-existent file', () => {
    expect(() => readCSV('/nonexistent/path/file.csv')).toThrow('File not found');
  });

  it('should throw error for empty CSV', () => {
    const filePath = writeTestCSV('empty.csv', 'name,value');

    expect(() => readCSV(filePath)).toThrow('CSV file is empty');
  });

  it('should warn about high missing rate columns', () => {
    const filePath = writeTestCSV(
      'high-missing.csv',
      'id,sparse\n1,\n2,\n3,\n4,10\n5,\n6,\n7,\n8,\n9,\n10,'
    );

    const result = readCSV(filePath);

    const hasMissingWarning = result.warnings.some((w) => w.includes('missing values'));
    expect(hasMissingWarning).toBe(true);
  });

  it('should parse numeric values correctly', () => {
    const filePath = writeTestCSV(
      'numbers.csv',
      'int,float,negative,zero\n1,1.5,-10,0\n2,2.5,-20,0\n3,3.5,-30,0'
    );

    const result = readCSV(filePath);

    expect(result.rows[0]['int']).toBe(1);
    expect(result.rows[0]['float']).toBe(1.5);
    expect(result.rows[0]['negative']).toBe(-10);
    expect(result.rows[0]['zero']).toBe(0);
    expect(result.metadata.numericColumns).toEqual(['int', 'float', 'negative', 'zero']);
  });
});

describe('extractNumericValues', () => {
  it('should extract only numeric values from a column', () => {
    const rows = [{ col: 1 }, { col: null }, { col: 3 }, { col: 'text' }, { col: 5 }] as Record<
      string,
      string | number | null
    >[];

    const values = extractNumericValues(rows, 'col');
    expect(values).toEqual([1, 3, 5]);
  });

  it('should return empty array for all-null column', () => {
    const rows = [{ col: null }, { col: null }] as Record<string, string | number | null>[];

    const values = extractNumericValues(rows, 'col');
    expect(values).toEqual([]);
  });
});

describe('validateColumns', () => {
  it('should pass when all columns exist', () => {
    expect(() => validateColumns(['a', 'b', 'c'], ['a', 'c'])).not.toThrow();
  });

  it('should throw when columns are missing', () => {
    expect(() => validateColumns(['a', 'b'], ['a', 'x', 'y'])).toThrow(
      'Column(s) not found in CSV: "x", "y"'
    );
  });
});
