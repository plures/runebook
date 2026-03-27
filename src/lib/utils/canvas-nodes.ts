import type { SubCanvasNode } from '../types/canvas';

export interface CreateSubCanvasNodeOptions {
  id: string;
  x: number;
  y: number;
  label?: string;
}

/** Factory that creates a fully-initialised SubCanvasNode with default ports and an empty child canvas. */
export function createSubCanvasNode({ id, x, y, label = 'Sub-Canvas' }: CreateSubCanvasNodeOptions): SubCanvasNode {
  return {
    id,
    type: 'sub-canvas',
    position: { x, y },
    size: { width: 320, height: 200 },
    label,
    inputs: [{ id: 'in', name: 'in', type: 'input' }],
    outputs: [{ id: 'out', name: 'out', type: 'output' }],
    children: {
      id: `canvas-${id}`,
      name: label,
      description: '',
      nodes: [],
      connections: [],
      version: '1.0.0',
    },
  };
}
