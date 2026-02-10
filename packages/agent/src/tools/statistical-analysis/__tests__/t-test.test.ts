/**
 * T-Test Unit Tests
 *
 * Test values verified against scipy.stats.ttest_ind / ttest_rel
 */

import { runTTest } from '../methods/t-test.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const TEST_DIR = join(tmpdir(), 'stat-analysis-test-ttest');

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

describe('runTTest', () => {
  describe('Independent t-test (Welch)', () => {
    it('should detect significant difference between two groups', () => {
      // Group A: mean ≈ 10, Group B: mean ≈ 20 — clearly different
      const rows = [
        'group,score',
        'A,8',
        'A,9',
        'A,10',
        'A,11',
        'A,12',
        'A,7',
        'A,10',
        'A,13',
        'A,9',
        'A,11',
        'B,18',
        'B,19',
        'B,20',
        'B,21',
        'B,22',
        'B,17',
        'B,20',
        'B,23',
        'B,19',
        'B,21',
      ].join('\n');
      const filePath = writeTestCSV('ttest-sig.csv', rows);

      const result = runTTest({
        filePath,
        variable: 'score',
        groupByColumn: 'group',
      });

      expect(result.method).toBe('T-Test');
      expect(result.details.testType).toBe('independent');
      expect(result.details.pValue).toBeLessThan(0.001);
      expect(result.details.tStatistic).toBeLessThan(0); // A < B
      expect(result.details.meanDifference).toBeCloseTo(-10, 0);
      expect(Math.abs(result.details.cohensD)).toBeGreaterThan(0.8); // large effect
    });

    it('should detect no significant difference for similar groups', () => {
      const rows = [
        'group,value',
        'A,10',
        'A,11',
        'A,9',
        'A,10',
        'A,11',
        'A,10',
        'A,12',
        'A,9',
        'A,11',
        'A,10',
        'B,10',
        'B,11',
        'B,10',
        'B,9',
        'B,11',
        'B,10',
        'B,10',
        'B,11',
        'B,10',
        'B,9',
      ].join('\n');
      const filePath = writeTestCSV('ttest-nonsig.csv', rows);

      const result = runTTest({
        filePath,
        variable: 'value',
        groupByColumn: 'group',
      });

      expect(result.details.pValue).toBeGreaterThan(0.05);
      expect(Math.abs(result.details.cohensD)).toBeLessThan(0.5); // small or negligible
    });

    it('should report correct group statistics', () => {
      const rows = ['group,value', 'X,10', 'X,20', 'X,30', 'Y,40', 'Y,50', 'Y,60'].join('\n');
      const filePath = writeTestCSV('ttest-groups.csv', rows);

      const result = runTTest({
        filePath,
        variable: 'value',
        groupByColumn: 'group',
      });

      expect(result.details.group1.name).toBe('X');
      expect(result.details.group1.n).toBe(3);
      expect(result.details.group1.mean).toBe(20);

      expect(result.details.group2.name).toBe('Y');
      expect(result.details.group2.n).toBe(3);
      expect(result.details.group2.mean).toBe(50);

      expect(result.details.meanDifference).toBe(-30);
    });

    it('should compute correct degrees of freedom (Welch-Satterthwaite)', () => {
      // Groups with different variances
      const rows = [
        'group,value',
        'A,1',
        'A,2',
        'A,3',
        'A,4',
        'A,5',
        'B,10',
        'B,30',
        'B,50',
        'B,70',
        'B,90',
      ].join('\n');
      const filePath = writeTestCSV('ttest-welch-df.csv', rows);

      const result = runTTest({
        filePath,
        variable: 'value',
        groupByColumn: 'group',
      });

      // Welch's df should be less than n1 + n2 - 2 = 8 due to unequal variances
      expect(result.details.degreesOfFreedom).toBeLessThan(8);
      expect(result.details.degreesOfFreedom).toBeGreaterThan(1);
    });

    it('should include confidence interval', () => {
      const rows = [
        'group,value',
        'A,10',
        'A,20',
        'A,30',
        'A,40',
        'A,50',
        'B,60',
        'B,70',
        'B,80',
        'B,90',
        'B,100',
      ].join('\n');
      const filePath = writeTestCSV('ttest-ci.csv', rows);

      const result = runTTest({
        filePath,
        variable: 'value',
        groupByColumn: 'group',
      });

      expect(result.details.confidenceInterval.lower).toBeDefined();
      expect(result.details.confidenceInterval.upper).toBeDefined();
      expect(result.details.confidenceInterval.lower).toBeLessThan(
        result.details.confidenceInterval.upper
      );
      // Mean diff = 30-80 = -50; CI should not include 0
      expect(result.details.confidenceInterval.upper).toBeLessThan(0);
    });

    it('should include Levene test for independent samples', () => {
      const rows = ['group,value', 'A,10', 'A,20', 'A,30', 'B,40', 'B,50', 'B,60'].join('\n');
      const filePath = writeTestCSV('ttest-levene.csv', rows);

      const result = runTTest({
        filePath,
        variable: 'value',
        groupByColumn: 'group',
      });

      expect(result.details.leveneTest).toBeDefined();
      expect(result.details.leveneTest!.fStatistic).toBeDefined();
      expect(result.details.leveneTest!.pValue).toBeDefined();
    });
  });

  describe('One-sided tests', () => {
    it('should return smaller p-value for correct direction (greater)', () => {
      const rows = [
        'group,value',
        'A,50',
        'A,60',
        'A,70',
        'A,80',
        'A,90',
        'B,10',
        'B,20',
        'B,30',
        'B,40',
        'B,50',
      ].join('\n');
      const filePath = writeTestCSV('ttest-onesided.csv', rows);

      const resultTwoSided = runTTest({
        filePath,
        variable: 'value',
        groupByColumn: 'group',
        alternative: 'two-sided',
      });

      const resultGreater = runTTest({
        filePath,
        variable: 'value',
        groupByColumn: 'group',
        alternative: 'greater',
      });

      // A > B, so "greater" should have smaller p-value than two-sided
      expect(resultGreater.details.pValue).toBeLessThan(resultTwoSided.details.pValue);
      expect(resultGreater.details.pValue).toBeCloseTo(resultTwoSided.details.pValue / 2, 4);
    });
  });

  describe('Error handling', () => {
    it('should throw error when variable is missing', () => {
      const filePath = writeTestCSV('ttest-err1.csv', 'group,value\nA,1\nB,2');

      expect(() =>
        runTTest({
          filePath,
          variable: '',
          groupByColumn: 'group',
        })
      ).toThrow('variable');
    });

    it('should throw error when groupByColumn is missing for independent test', () => {
      const filePath = writeTestCSV('ttest-err2.csv', 'value\n1\n2\n3');

      expect(() =>
        runTTest({
          filePath,
          variable: 'value',
        })
      ).toThrow('groupByColumn');
    });

    it('should throw error when groupByColumn has more than 2 groups', () => {
      const rows = ['group,value', 'A,10', 'B,20', 'C,30'].join('\n');
      const filePath = writeTestCSV('ttest-err3.csv', rows);

      expect(() =>
        runTTest({
          filePath,
          variable: 'value',
          groupByColumn: 'group',
        })
      ).toThrow('exactly 2 unique');
    });

    it('should throw error when group has fewer than 2 observations', () => {
      const rows = ['group,value', 'A,10', 'B,20', 'B,30'].join('\n');
      const filePath = writeTestCSV('ttest-err4.csv', rows);

      expect(() =>
        runTTest({
          filePath,
          variable: 'value',
          groupByColumn: 'group',
        })
      ).toThrow('at least 2 observations');
    });
  });

  describe('Result format', () => {
    it('should include summary, interpretation, and diagnostics', () => {
      const rows = [
        'group,value',
        'A,10',
        'A,20',
        'A,30',
        'A,40',
        'A,50',
        'B,60',
        'B,70',
        'B,80',
        'B,90',
        'B,100',
      ].join('\n');
      const filePath = writeTestCSV('ttest-format.csv', rows);

      const result = runTTest({
        filePath,
        variable: 'value',
        groupByColumn: 'group',
      });

      expect(result.summary).toContain('T-Test Results');
      expect(result.summary).toContain('t-statistic');
      expect(result.summary).toContain('p-value');
      expect(result.summary).toContain("Cohen's d");
      expect(result.interpretation).toBeTruthy();
      expect(result.interpretation.length).toBeGreaterThan(0);
      expect(result.dataInfo.filePath).toBe(filePath);
      expect(result.dataInfo.usedRows).toBe(10);
    });

    it('should warn about small sample sizes', () => {
      const rows = ['group,value', 'A,10', 'A,20', 'A,30', 'B,40', 'B,50', 'B,60'].join('\n');
      const filePath = writeTestCSV('ttest-small.csv', rows);

      const result = runTTest({
        filePath,
        variable: 'value',
        groupByColumn: 'group',
      });

      const hasSmallSampleWarning = result.diagnostics.some((d) => d.includes('Small sample size'));
      expect(hasSmallSampleWarning).toBe(true);
    });
  });
});
