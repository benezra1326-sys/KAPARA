const BUCKETS = [1, 2, 3, 5, 10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200, 300, 500];

/** Upper-bound bucket ("less than N km"). Precise distances never leave the server. */
export function distanceBucket(km: number): number {
  return BUCKETS.find((b) => km <= b) ?? Math.ceil(km / 100) * 100;
}
