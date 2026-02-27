/**
 * Graph execution / reactive data-flow helpers for the RuneBook canvas.
 *
 * These utilities resolve the output value of any node by traversing
 * the edge graph upstream, applying transform code where needed, and
 * returning the final computed value to be displayed by DisplayNode.
 */

export interface NodeLike {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

export interface EdgeLike {
  source: string;
  target: string;
}

/**
 * Safely execute a transform expression against `input`.
 * `code` is expected to be a JS arrow-function expression such as
 * `x => x.toUpperCase()` or `x => x * 2`.
 * Returns `input` unchanged on any error.
 *
 * NOTE: `new Function` is used intentionally here — RuneBook is a local-first
 * Tauri desktop app and the code is authored by the current user in their own
 * canvas. There is no remote-code execution surface. Treat shared canvas YAML
 * files from untrusted sources with the same caution as running any script.
 */
export function applyTransform(code: string, input: unknown): unknown {
  if (!code?.trim()) return input;
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(
      'input',
      `"use strict"; try { return (${code})(input); } catch(e) { return input; }`
    );
    return fn(input);
  } catch {
    return input;
  }
}

/**
 * Recursively resolve the output value of a node by walking the graph.
 *
 * - `input`    nodes emit `data.value`
 * - `terminal` nodes emit `data.output`
 * - `transform` nodes apply `data.code` to the output of their upstream node
 * - `display`  nodes have no output (returns `undefined`)
 *
 * `memo` prevents infinite loops in cyclic graphs.
 */
export function resolveNodeOutput(
  nodeId: string,
  nodeMap: Map<string, NodeLike>,
  edgesByTarget: Map<string, EdgeLike[]>,
  memo: Map<string, unknown> = new Map()
): unknown {
  if (memo.has(nodeId)) return memo.get(nodeId);

  // Insert a sentinel before recursing so cycles return undefined instead of
  // overflowing the call stack.
  memo.set(nodeId, undefined);

  const node = nodeMap.get(nodeId);
  if (!node) return undefined;

  let output: unknown;
  if (node.type === 'input') {
    output = node.data.value;
  } else if (node.type === 'terminal') {
    output = node.data.output ?? '';
  } else if (node.type === 'transform') {
    const inEdges = edgesByTarget.get(nodeId) ?? [];
    const upstream =
      inEdges.length > 0
        ? resolveNodeOutput(inEdges[0].source, nodeMap, edgesByTarget, memo)
        : undefined;
    output = applyTransform(node.data.code as string, upstream);
  } else {
    output = undefined;
  }

  memo.set(nodeId, output);
  return output;
}

/**
 * Build the index maps required by `resolveNodeOutput` from raw node/edge arrays.
 */
export function buildGraphIndex(
  nodes: NodeLike[],
  edges: EdgeLike[]
): { nodeMap: Map<string, NodeLike>; edgesByTarget: Map<string, EdgeLike[]> } {
  const nodeMap = new Map<string, NodeLike>(nodes.map(n => [n.id, n]));
  const edgesByTarget = new Map<string, EdgeLike[]>();
  for (const edge of edges) {
    if (!edgesByTarget.has(edge.target)) edgesByTarget.set(edge.target, []);
    edgesByTarget.get(edge.target)!.push(edge);
  }
  return { nodeMap, edgesByTarget };
}
