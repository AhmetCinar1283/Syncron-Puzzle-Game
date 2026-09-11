/**
 * Tiny classnames joiner — no external dependency.
 * Accepts strings, numbers, falsy values (ignored), and objects of
 * `{ [className]: boolean }` (only truthy keys are included).
 */
export type ClassValue =
  | string
  | number
  | null
  | undefined
  | false
  | Record<string, boolean | null | undefined>;

export function cn(...values: ClassValue[]): string {
  const out: string[] = [];
  for (const value of values) {
    if (!value && value !== 0) continue;
    if (typeof value === 'string' || typeof value === 'number') {
      out.push(String(value));
    } else if (typeof value === 'object') {
      for (const key in value) {
        if (value[key]) out.push(key);
      }
    }
  }
  return out.join(' ');
}
