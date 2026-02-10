/**
 * Statistical Distribution Functions
 *
 * Wraps jstat library for computing CDF/PDF of t, F, chi-square, and normal distributions.
 * Used primarily for computing p-values from test statistics.
 */

// jstat does not provide TypeScript types, so we use require-style import

import jStat from 'jstat';

/**
 * Compute p-value from t-distribution
 *
 * @param tStatistic - The t test statistic
 * @param df - Degrees of freedom
 * @param alternative - Test direction
 * @returns p-value
 */
export function tDistributionPValue(
  tStatistic: number,
  df: number,
  alternative: 'two-sided' | 'less' | 'greater' = 'two-sided'
): number {
  // CDF gives P(T <= t)
  const cdf = jStat.studentt.cdf(tStatistic, df) as number;

  switch (alternative) {
    case 'less':
      return cdf;
    case 'greater':
      return 1 - cdf;
    case 'two-sided':
    default:
      return 2 * Math.min(cdf, 1 - cdf);
  }
}

/**
 * Compute critical value from t-distribution (for confidence intervals)
 *
 * @param alpha - Significance level (e.g., 0.05 for 95% CI)
 * @param df - Degrees of freedom
 * @returns Critical value t_{alpha/2, df}
 */
export function tCriticalValue(alpha: number, df: number): number {
  return jStat.studentt.inv(1 - alpha / 2, df) as number;
}

/**
 * Compute p-value from F-distribution (for Levene's test, ANOVA)
 *
 * @param fStatistic - The F test statistic
 * @param df1 - Numerator degrees of freedom
 * @param df2 - Denominator degrees of freedom
 * @returns p-value (right-tail)
 */
export function fDistributionPValue(fStatistic: number, df1: number, df2: number): number {
  return 1 - (jStat.centralF.cdf(fStatistic, df1, df2) as number);
}

/**
 * Compute CDF of the normal distribution
 *
 * @param x - Value
 * @param mean - Distribution mean (default: 0)
 * @param std - Distribution standard deviation (default: 1)
 * @returns P(X <= x)
 */
export function normalCDF(x: number, mean: number = 0, std: number = 1): number {
  return jStat.normal.cdf(x, mean, std) as number;
}
