/**
 * Descriptive Statistics Unit Tests
 */

import { runDescriptiveStats } from '../methods/descriptive-stats.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const TEST_DIR = join(tmpdir(), 'stat-analysis-test-desc');

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

describe('runDescriptiveStats', () => {
  it('should compute basic statistics for all numeric columns', () => {
    const filePath = writeTestCSV(
      'stats-basic.csv',
      'name,age,score\nAlice,20,80\nBob,30,90\nCharlie,40,70\nDiana,50,100\nEve,60,60'
    );

    const result = runDescriptiveStats({ filePath });

    expect(result.method).toBe('Descriptive Statistics');
    expect(result.dataInfo.totalRows).toBe(5);
    expect(result.details.columns).toHaveLength(2); // age and score

    // Check age column
    const ageStats = result.details.columns.find((c) => c.column === 'age');
    expect(ageStats).toBeDefined();
    expect(ageStats!.count).toBe(5);
    expect(ageStats!.mean).toBe(40); // (20+30+40+50+60)/5
    expect(ageStats!.min).toBe(20);
    expect(ageStats!.max).toBe(60);
    expect(ageStats!.median).toBe(40);
    expect(ageStats!.missingCount).toBe(0);

    // Check score column
    const scoreStats = result.details.columns.find((c) => c.column === 'score');
    expect(scoreStats).toBeDefined();
    expect(scoreStats!.count).toBe(5);
    expect(scoreStats!.mean).toBe(80); // (80+90+70+100+60)/5
    expect(scoreStats!.min).toBe(60);
    expect(scoreStats!.max).toBe(100);
    expect(scoreStats!.median).toBe(80);
  });

  it('should compute statistics for specified columns only', () => {
    const filePath = writeTestCSV('stats-cols.csv', 'a,b,c\n1,10,100\n2,20,200\n3,30,300');

    const result = runDescriptiveStats({ filePath, columns: ['a', 'c'] });

    expect(result.details.columns).toHaveLength(2);
    expect(result.details.columns.map((c) => c.column)).toEqual(['a', 'c']);
  });

  it('should compute grouped statistics when groupBy is specified', () => {
    const filePath = writeTestCSV(
      'stats-grouped.csv',
      'group,value\nA,10\nA,20\nA,30\nB,40\nB,50\nB,60'
    );

    const result = runDescriptiveStats({ filePath, columns: ['value'], groupBy: 'group' });

    expect(result.details.groupBy).toBe('group');
    expect(result.details.groups).toBeDefined();
    expect(Object.keys(result.details.groups!)).toHaveLength(2);

    const groupA = result.details.groups!['A'];
    expect(groupA).toBeDefined();
    expect(groupA[0].mean).toBe(20); // (10+20+30)/3
    expect(groupA[0].count).toBe(3);

    const groupB = result.details.groups!['B'];
    expect(groupB).toBeDefined();
    expect(groupB[0].mean).toBe(50); // (40+50+60)/3
    expect(groupB[0].count).toBe(3);
  });

  it('should handle missing values in statistics', () => {
    // Empty line is skipped by csv-parse; "NA" in a field is treated as null
    const filePath = writeTestCSV(
      'stats-missing.csv',
      'id,value\n1,10\n2,20\n3,\n4,30\n5,NA\n6,40'
    );

    const result = runDescriptiveStats({ filePath, columns: ['value'] });

    const stats = result.details.columns[0];
    expect(stats.count).toBe(4); // 10, 20, 30, 40 (2 missing: empty and NA)
    expect(stats.missingCount).toBe(2);
    expect(stats.mean).toBe(25); // (10+20+30+40)/4
  });

  it('should compute standard deviation correctly', () => {
    // Known values: [2, 4, 4, 4, 5, 5, 7, 9]
    // Mean = 5, Sample std = sqrt(32/7) ≈ 2.1381
    const filePath = writeTestCSV('stats-std.csv', 'value\n2\n4\n4\n4\n5\n5\n7\n9');

    const result = runDescriptiveStats({ filePath, columns: ['value'] });

    const stats = result.details.columns[0];
    expect(stats.mean).toBe(5);
    expect(stats.std).toBeCloseTo(2.1381, 3);
  });

  it('should compute quartiles correctly', () => {
    // Values 1..10, median=5.5, Q1=3.25, Q3=7.75
    const rows = Array.from({ length: 10 }, (_, i) => i + 1).join('\n');
    const filePath = writeTestCSV('stats-quartiles.csv', `value\n${rows}`);

    const result = runDescriptiveStats({ filePath, columns: ['value'] });

    const stats = result.details.columns[0];
    expect(stats.min).toBe(1);
    expect(stats.max).toBe(10);
    expect(stats.median).toBeCloseTo(5.5, 5);
    expect(stats.q1).toBeCloseTo(3.25, 5);
    expect(stats.q3).toBeCloseTo(7.75, 5);
  });

  it('should throw error for non-existent column', () => {
    const filePath = writeTestCSV('stats-bad-col.csv', 'a,b\n1,2\n3,4');

    expect(() => runDescriptiveStats({ filePath, columns: ['nonexistent'] })).toThrow(
      'Column(s) not found'
    );
  });

  it('should throw error when no numeric columns found', () => {
    const filePath = writeTestCSV('stats-no-num.csv', 'name,city\nAlice,NYC\nBob,LA');

    expect(() => runDescriptiveStats({ filePath })).toThrow('No numeric columns');
  });

  it('should include summary and interpretation in result', () => {
    const filePath = writeTestCSV('stats-summary.csv', 'value\n10\n20\n30\n40\n50');

    const result = runDescriptiveStats({ filePath });

    expect(result.summary).toContain('Descriptive Statistics Results');
    expect(result.interpretation).toBeTruthy();
    expect(result.interpretation.length).toBeGreaterThan(0);
  });

  it('should warn about small sample size', () => {
    const filePath = writeTestCSV('stats-small.csv', 'value\n10\n20\n30');

    const result = runDescriptiveStats({ filePath });

    const hasSmallSampleWarning = result.diagnostics.some((d) => d.includes('Small sample size'));
    expect(hasSmallSampleWarning).toBe(true);
  });
});
