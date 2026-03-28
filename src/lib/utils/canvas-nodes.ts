import type {
  TextNode,
  TerminalNode,
  InputNode,
  DisplayNode,
  TransformNode,
  SubCanvasNode,
} from '../types/canvas';

export interface CreateNodeOptions {
  id: string;
  x: number;
  y: number;
  label?: string;
}

/** Factory that creates a fully-initialised TextNode. */
export function createTextNode({ id, x, y, label = 'Note' }: CreateNodeOptions): TextNode {
  return {
    id,
    type: 'text',
    position: { x, y },
    size: { width: 280, height: 200 },
    label,
    content: '',
    inputs: [{ id: 'in', name: 'in', type: 'input' }],
    outputs: [{ id: 'out', name: 'out', type: 'output' }],
  };
}

/** Factory that creates a fully-initialised TerminalNode. */
export function createTerminalNode({ id, x, y, label = 'Terminal' }: CreateNodeOptions): TerminalNode {
  return {
    id,
    type: 'terminal',
    position: { x, y },
    size: { width: 320, height: 280 },
    label,
    command: 'echo',
    args: ['Hello, RuneBook!'],
    autoStart: false,
    inputs: [],
    outputs: [{ id: 'stdout', name: 'stdout', type: 'output' }],
  };
}

/** Factory that creates a fully-initialised InputNode. */
export function createInputNode({ id, x, y, label = 'Text Input' }: CreateNodeOptions): InputNode {
  return {
    id,
    type: 'input',
    position: { x, y },
    size: { width: 280, height: 160 },
    label,
    inputType: 'text',
    value: '',
    inputs: [],
    outputs: [{ id: 'value', name: 'value', type: 'output' }],
  };
}

/** Factory that creates a fully-initialised DisplayNode. */
export function createDisplayNode({ id, x, y, label = 'Display' }: CreateNodeOptions): DisplayNode {
  return {
    id,
    type: 'display',
    position: { x, y },
    size: { width: 320, height: 240 },
    label,
    displayType: 'text',
    content: '',
    inputs: [{ id: 'input', name: 'input', type: 'input' }],
    outputs: [],
  };
}

/** Factory that creates a fully-initialised TransformNode. */
export function createTransformNode({ id, x, y, label = 'Transform' }: CreateNodeOptions): TransformNode {
  return {
    id,
    type: 'transform',
    position: { x, y },
    size: { width: 320, height: 280 },
    label,
    transformType: 'map',
    code: 'item',
    inputs: [{ id: 'input', name: 'input', type: 'input' }],
    outputs: [{ id: 'output', name: 'output', type: 'output' }],
  };
}

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
