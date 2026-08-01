/** PDF.js modern builds expect Math.sumPrecise (not in all Node versions yet). */
declare global {
  interface Math {
    sumPrecise?(values: Iterable<number>): number;
  }
}

if (typeof Math.sumPrecise !== "function") {
  Math.sumPrecise = (values: Iterable<number>) => {
    let sum = 0;
    for (const value of values) sum += Number(value) || 0;
    return sum;
  };
}

export {};
