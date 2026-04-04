// Tests for canvas-nodes utility

import { describe, it, expect } from 'vitest';
import { resolvePortIndex } from '../canvas-nodes';
import type { Port } from '../../types/canvas';

const makePorts = (...ids: string[]): Port[] =>
  ids.map(id => ({ id, name: id, type: 'output' as const }));

describe('resolvePortIndex', () => {
  it('returns 0 for the first port', () => {
    const ports = makePorts('alpha', 'beta', 'gamma');
    expect(resolvePortIndex(ports, 'alpha')).toBe(0);
  });

  it('returns the correct index for a middle port', () => {
    const ports = makePorts('alpha', 'beta', 'gamma');
    expect(resolvePortIndex(ports, 'beta')).toBe(1);
  });

  it('returns the correct index for the last port', () => {
    const ports = makePorts('alpha', 'beta', 'gamma');
    expect(resolvePortIndex(ports, 'gamma')).toBe(2);
  });

  it('falls back to 0 when port id is not found', () => {
    const ports = makePorts('alpha', 'beta');
    expect(resolvePortIndex(ports, 'missing')).toBe(0);
  });

  it('falls back to 0 for an empty port array', () => {
    expect(resolvePortIndex([], 'any')).toBe(0);
  });

  it('works with a single-port array', () => {
    const ports = makePorts('out');
    expect(resolvePortIndex(ports, 'out')).toBe(0);
  });
});
