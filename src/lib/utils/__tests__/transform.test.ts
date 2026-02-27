import { describe, it, expect } from 'vitest';
import { runTransform } from '../transform';

describe('runTransform', () => {
  describe('map', () => {
    it('doubles each element', () => {
      const { result, error } = runTransform('map', 'x => x * 2', [1, 2, 3]);
      expect(error).toBeNull();
      expect(result).toEqual([2, 4, 6]);
    });

    it('wraps a non-array input in an array', () => {
      const { result, error } = runTransform('map', 'x => x + 1', 5);
      expect(error).toBeNull();
      expect(result).toEqual([6]);
    });

    it('handles an empty array', () => {
      const { result, error } = runTransform('map', 'x => x', []);
      expect(error).toBeNull();
      expect(result).toEqual([]);
    });

    it('handles null / undefined input as empty array', () => {
      const { result, error } = runTransform('map', 'x => x', null);
      expect(error).toBeNull();
      expect(result).toEqual([]);
    });

    it('is the default when transformType is unrecognised', () => {
      const { result, error } = runTransform('unknown', 'x => x * 3', [2]);
      expect(error).toBeNull();
      expect(result).toEqual([6]);
    });
  });

  describe('filter', () => {
    it('keeps elements matching the predicate', () => {
      const { result, error } = runTransform('filter', 'x => x > 2', [1, 2, 3, 4]);
      expect(error).toBeNull();
      expect(result).toEqual([3, 4]);
    });

    it('returns empty array when nothing matches', () => {
      const { result, error } = runTransform('filter', 'x => x > 10', [1, 2, 3]);
      expect(error).toBeNull();
      expect(result).toEqual([]);
    });
  });

  describe('reduce', () => {
    it('sums an array using the first element as the initial accumulator', () => {
      const { result, error } = runTransform('reduce', '(acc, x) => acc + x', [1, 2, 3, 4]);
      expect(error).toBeNull();
      expect(result).toBe(10);
    });

    it('returns undefined for an empty array', () => {
      const { result, error } = runTransform('reduce', '(acc, x) => acc + x', []);
      expect(error).toBeNull();
      expect(result).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('returns an error for invalid syntax', () => {
      const { result, error } = runTransform('map', 'this is not valid js |||', [1]);
      expect(result).toBeNull();
      expect(error).not.toBeNull();
    });

    it('returns an error when code is not a function', () => {
      const { result, error } = runTransform('map', '42', [1]);
      expect(result).toBeNull();
      expect(error).toContain('function');
    });

    it('returns an error when the function throws at runtime', () => {
      const { result, error } = runTransform('map', 'x => x.nonExistentMethod()', [1]);
      expect(result).toBeNull();
      expect(error).not.toBeNull();
    });
  });
});
