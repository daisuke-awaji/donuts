/**
 * Type declarations for jstat library
 * Only the functions used in this project are declared.
 */
declare module 'jstat' {
  interface Distribution {
    cdf(x: number, ...params: number[]): number;
    pdf(x: number, ...params: number[]): number;
    inv(p: number, ...params: number[]): number;
  }

  const jStat: {
    studentt: Distribution;
    centralF: Distribution;
    normal: {
      cdf(x: number, mean: number, std: number): number;
      pdf(x: number, mean: number, std: number): number;
      inv(p: number, mean: number, std: number): number;
    };
    chisquare: Distribution;
  };

  export default jStat;
}
