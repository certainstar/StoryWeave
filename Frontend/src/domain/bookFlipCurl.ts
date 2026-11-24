export type SlipDir = "next" | "prev"

/** 番茄式：下角先起、中段跟、末尾收 */
export function flipEase(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  if (x < 0.42) return (x / 0.42) ** 2.1 * 0.58
  if (x < 0.78) return 0.58 + ((x - 0.42) / 0.36) ** 0.85 * 0.34
  return 0.92 + (1 - (1 - (x - 0.78) / 0.22) ** 2) * 0.08
}