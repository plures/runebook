/**
 * Execute a map/filter/reduce transform using a user-supplied arrow-function
 * expression (e.g. `item => item * 2`).
 *
 * Using `new Function` is intentional here: RuneBook is a local desktop app
 * and the transform code is authored by the user themselves, not supplied by
 * untrusted third parties.
 */
export function runTransform(
  transformType: string,
  code: string,
  inputData: unknown
): { result: unknown; error: string | null } {
  try {
    // eslint-disable-next-line no-new-func
    const makeFn = new Function(`return (${code})`);
    const fn = makeFn() as (...args: unknown[]) => unknown;

    if (typeof fn !== 'function') {
      return { result: null, error: 'Code must be a function expression (e.g. item => item * 2)' };
    }

    // Coerce input to an array so map/filter/reduce always work.
    const arr: unknown[] = Array.isArray(inputData)
      ? inputData
      : inputData != null
        ? [inputData]
        : [];

    let result: unknown;
    switch (transformType) {
      case 'filter':
        result = arr.filter(fn as (item: unknown) => boolean);
        break;
      case 'reduce':
        // Use the first element as the natural accumulator (standard JS behaviour).
        // Return undefined for an empty array rather than throwing.
        result = arr.length > 0
          ? arr.reduce(fn as (acc: unknown, item: unknown) => unknown)
          : undefined;
        break;
      case 'map':
      default:
        result = arr.map(fn);
    }

    return { result, error: null };
  } catch (e: unknown) {
    return { result: null, error: e instanceof Error ? e.message : String(e) };
  }
}
