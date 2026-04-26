import type { PraxisFact } from '@plures/praxis';

/**
 * Create a PraxisFact — a lightweight helper that works in both node and
 * browser environments. The `fact` helper from `@plures/praxis` is only
 * exported in the node bundle; this local shim fills that gap.
 */
export function fact<TPayload extends object = object>(
  tag: string,
  payload: TPayload,
): PraxisFact {
  return { tag, payload } as PraxisFact;
}
