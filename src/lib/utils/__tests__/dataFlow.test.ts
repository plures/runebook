import { describe, it, expect } from 'vitest';
import {
  applyTransform,
  resolveNodeOutput,
  buildGraphIndex,
  type NodeLike,
  type EdgeLike,
} from '../dataFlow';

// ── applyTransform ─────────────────────────────────────────────────────────

describe('applyTransform', () => {
  it('returns input unchanged when code is empty', () => {
    expect(applyTransform('', 'hello')).toBe('hello');
    expect(applyTransform('   ', 42)).toBe(42);
  });

  it('applies a simple arrow-function expression', () => {
    expect(applyTransform('x => x * 2', 5)).toBe(10);
    expect(applyTransform('x => x.toUpperCase()', 'hello')).toBe('HELLO');
  });

  it('returns input unchanged when the expression throws', () => {
    expect(applyTransform('x => x.nonExistentMethod()', 'hello')).toBe('hello');
  });

  it('returns input unchanged when code is syntactically invalid', () => {
    expect(applyTransform('not valid JS !!!', 'data')).toBe('data');
  });

  it('passes undefined input through', () => {
    expect(applyTransform('', undefined)).toBeUndefined();
  });
});

// ── resolveNodeOutput ──────────────────────────────────────────────────────

describe('resolveNodeOutput', () => {
  function makeNodes(defs: Array<{ id: string; type: string; data: Record<string, unknown> }>): NodeLike[] {
    return defs;
  }
  function makeEdges(defs: Array<{ source: string; target: string }>): EdgeLike[] {
    return defs;
  }

  it('returns data.value for input nodes', () => {
    const nodes = makeNodes([{ id: 'n1', type: 'input', data: { value: 'hello' } }]);
    const edges: EdgeLike[] = [];
    const { nodeMap, edgesByTarget } = buildGraphIndex(nodes, edges);
    expect(resolveNodeOutput('n1', nodeMap, edgesByTarget)).toBe('hello');
  });

  it('returns data.output for terminal nodes', () => {
    const nodes = makeNodes([{ id: 't1', type: 'terminal', data: { output: 'ls result' } }]);
    const { nodeMap, edgesByTarget } = buildGraphIndex(nodes, []);
    expect(resolveNodeOutput('t1', nodeMap, edgesByTarget)).toBe('ls result');
  });

  it('returns empty string for terminal nodes with no output', () => {
    const nodes = makeNodes([{ id: 't1', type: 'terminal', data: {} }]);
    const { nodeMap, edgesByTarget } = buildGraphIndex(nodes, []);
    expect(resolveNodeOutput('t1', nodeMap, edgesByTarget)).toBe('');
  });

  it('returns undefined for unknown node ids', () => {
    const { nodeMap, edgesByTarget } = buildGraphIndex([], []);
    expect(resolveNodeOutput('ghost', nodeMap, edgesByTarget)).toBeUndefined();
  });

  it('applies transform code to upstream input value', () => {
    const nodes = makeNodes([
      { id: 'n1', type: 'input', data: { value: 'hello' } },
      { id: 'n2', type: 'transform', data: { code: 'x => x.toUpperCase()' } },
    ]);
    const edges = makeEdges([{ source: 'n1', target: 'n2' }]);
    const { nodeMap, edgesByTarget } = buildGraphIndex(nodes, edges);
    expect(resolveNodeOutput('n2', nodeMap, edgesByTarget)).toBe('HELLO');
  });

  it('propagates through a chain: input → transform → display', () => {
    const nodes = makeNodes([
      { id: 'n1', type: 'input', data: { value: 5 } },
      { id: 'n2', type: 'transform', data: { code: 'x => x * 3' } },
      { id: 'n3', type: 'display', data: { content: '' } },
    ]);
    const edges = makeEdges([
      { source: 'n1', target: 'n2' },
      { source: 'n2', target: 'n3' },
    ]);
    const { nodeMap, edgesByTarget } = buildGraphIndex(nodes, edges);
    // resolve the source of n3 (which is n2)
    const inEdge = edgesByTarget.get('n3')![0];
    const value = resolveNodeOutput(inEdge.source, nodeMap, edgesByTarget);
    expect(value).toBe(15);
  });

  it('does not loop infinitely in a cyclic graph (memo guard)', () => {
    const nodes = makeNodes([
      { id: 'a', type: 'transform', data: { code: 'x => x' } },
      { id: 'b', type: 'transform', data: { code: 'x => x' } },
    ]);
    const edges = makeEdges([
      { source: 'a', target: 'b' },
      { source: 'b', target: 'a' }, // cycle
    ]);
    const { nodeMap, edgesByTarget } = buildGraphIndex(nodes, edges);
    // Should return without throwing
    expect(() => resolveNodeOutput('a', nodeMap, edgesByTarget)).not.toThrow();
  });
});

// ── buildGraphIndex ────────────────────────────────────────────────────────

describe('buildGraphIndex', () => {
  it('creates nodeMap keyed by node id', () => {
    const nodes: NodeLike[] = [
      { id: 'x', type: 'input', data: {} },
      { id: 'y', type: 'display', data: {} },
    ];
    const { nodeMap } = buildGraphIndex(nodes, []);
    expect(nodeMap.get('x')).toBe(nodes[0]);
    expect(nodeMap.get('y')).toBe(nodes[1]);
  });

  it('groups edges by target', () => {
    const edges: EdgeLike[] = [
      { source: 'a', target: 'c' },
      { source: 'b', target: 'c' },
    ];
    const { edgesByTarget } = buildGraphIndex([], edges);
    expect(edgesByTarget.get('c')).toHaveLength(2);
  });
});
