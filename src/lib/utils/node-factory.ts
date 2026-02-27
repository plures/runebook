// Shared factory functions for creating canvas nodes with sensible defaults.
// Used by both CommandBar.svelte (button clicks) and Canvas.svelte (keyboard shortcuts)
// to avoid duplicating default node property definitions.

import type { TerminalNode, InputNode, DisplayNode, TransformNode } from '../types/canvas';

/** Returns a random scatter offset so new nodes don't perfectly overlap. */
function scatter(base: number, range: number): number {
  return base + Math.random() * range;
}

export function createTerminalNode(): TerminalNode {
  return {
    id: `terminal-${Date.now()}`,
    type: 'terminal',
    position: { x: scatter(120, 120), y: scatter(80, 120) },
    label: 'Terminal',
    command: 'echo',
    args: ['Hello, RuneBook!'],
    autoStart: false,
    inputs: [],
    outputs: [{ id: 'stdout', name: 'stdout', type: 'output' }]
  };
}

export function createInputNode(): InputNode {
  return {
    id: `input-${Date.now()}`,
    type: 'input',
    position: { x: scatter(120, 120), y: scatter(260, 120) },
    label: 'Text Input',
    inputType: 'text',
    value: '',
    inputs: [],
    outputs: [{ id: 'value', name: 'value', type: 'output' }]
  };
}

export function createDisplayNode(): DisplayNode {
  return {
    id: `display-${Date.now()}`,
    type: 'display',
    position: { x: scatter(460, 120), y: scatter(160, 120) },
    label: 'Display',
    displayType: 'text',
    content: '',
    inputs: [{ id: 'input', name: 'input', type: 'input' }],
    outputs: []
  };
}

export function createTransformNode(): TransformNode {
  return {
    id: `transform-${Date.now()}`,
    type: 'transform',
    position: { x: scatter(280, 120), y: scatter(160, 120) },
    label: 'Transform',
    transformType: 'map',
    code: 'item',
    inputs: [{ id: 'input', name: 'input', type: 'input' }],
    outputs: [{ id: 'output', name: 'output', type: 'output' }]
  };
}
