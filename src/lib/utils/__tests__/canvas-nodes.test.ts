// Tests for utils/canvas-nodes factory functions

import { describe, it, expect } from 'vitest';
import {
  createTextNode,
  createTerminalNode,
  createInputNode,
  createDisplayNode,
  createTransformNode,
  createSubCanvasNode,
} from '../canvas-nodes';

describe('createTextNode', () => {
  it('returns a TextNode with correct type and defaults', () => {
    const node = createTextNode({ id: 'text-1', x: 10, y: 20 });
    expect(node.type).toBe('text');
    expect(node.id).toBe('text-1');
    expect(node.position).toEqual({ x: 10, y: 20 });
    expect(node.label).toBe('Note');
    expect(node.content).toBe('');
    expect(node.inputs).toHaveLength(1);
    expect(node.outputs).toHaveLength(1);
  });

  it('accepts a custom label', () => {
    const node = createTextNode({ id: 'text-2', x: 0, y: 0, label: 'My Note' });
    expect(node.label).toBe('My Note');
  });
});

describe('createTerminalNode', () => {
  it('returns a TerminalNode with correct type and defaults', () => {
    const node = createTerminalNode({ id: 'terminal-1', x: 50, y: 60 });
    expect(node.type).toBe('terminal');
    expect(node.id).toBe('terminal-1');
    expect(node.position).toEqual({ x: 50, y: 60 });
    expect(node.label).toBe('Terminal');
    expect(node.command).toBe('echo');
    expect(node.args).toEqual(['Hello, RuneBook!']);
    expect(node.autoStart).toBe(false);
    expect(node.inputs).toHaveLength(0);
    expect(node.outputs).toHaveLength(1);
    expect(node.outputs[0].id).toBe('stdout');
  });

  it('accepts a custom label', () => {
    const node = createTerminalNode({ id: 'terminal-2', x: 0, y: 0, label: 'My Terminal' });
    expect(node.label).toBe('My Terminal');
  });
});

describe('createInputNode', () => {
  it('returns an InputNode with correct type and defaults', () => {
    const node = createInputNode({ id: 'input-1', x: 30, y: 40 });
    expect(node.type).toBe('input');
    expect(node.id).toBe('input-1');
    expect(node.position).toEqual({ x: 30, y: 40 });
    expect(node.label).toBe('Text Input');
    expect(node.inputType).toBe('text');
    expect(node.value).toBe('');
    expect(node.inputs).toHaveLength(0);
    expect(node.outputs).toHaveLength(1);
    expect(node.outputs[0].id).toBe('value');
  });

  it('accepts a custom label', () => {
    const node = createInputNode({ id: 'input-2', x: 0, y: 0, label: 'My Input' });
    expect(node.label).toBe('My Input');
  });
});

describe('createDisplayNode', () => {
  it('returns a DisplayNode with correct type and defaults', () => {
    const node = createDisplayNode({ id: 'display-1', x: 100, y: 200 });
    expect(node.type).toBe('display');
    expect(node.id).toBe('display-1');
    expect(node.position).toEqual({ x: 100, y: 200 });
    expect(node.label).toBe('Display');
    expect(node.displayType).toBe('text');
    expect(node.content).toBe('');
    expect(node.inputs).toHaveLength(1);
    expect(node.inputs[0].id).toBe('input');
    expect(node.outputs).toHaveLength(0);
  });

  it('accepts a custom label', () => {
    const node = createDisplayNode({ id: 'display-2', x: 0, y: 0, label: 'My Display' });
    expect(node.label).toBe('My Display');
  });
});

describe('createTransformNode', () => {
  it('returns a TransformNode with correct type and defaults', () => {
    const node = createTransformNode({ id: 'transform-1', x: 150, y: 250 });
    expect(node.type).toBe('transform');
    expect(node.id).toBe('transform-1');
    expect(node.position).toEqual({ x: 150, y: 250 });
    expect(node.label).toBe('Transform');
    expect(node.transformType).toBe('map');
    expect(node.code).toBe('item');
    expect(node.inputs).toHaveLength(1);
    expect(node.outputs).toHaveLength(1);
  });

  it('accepts a custom label', () => {
    const node = createTransformNode({ id: 'transform-2', x: 0, y: 0, label: 'My Transform' });
    expect(node.label).toBe('My Transform');
  });
});

describe('createSubCanvasNode', () => {
  it('returns a SubCanvasNode with correct type and defaults', () => {
    const node = createSubCanvasNode({ id: 'sub-1', x: 10, y: 10 });
    expect(node.type).toBe('sub-canvas');
    expect(node.id).toBe('sub-1');
    expect(node.position).toEqual({ x: 10, y: 10 });
    expect(node.label).toBe('Sub-Canvas');
    expect(node.inputs).toHaveLength(1);
    expect(node.outputs).toHaveLength(1);
    expect(node.children.nodes).toHaveLength(0);
    expect(node.children.connections).toHaveLength(0);
    expect(node.children.id).toBe('canvas-sub-1');
  });

  it('accepts a custom label', () => {
    const node = createSubCanvasNode({ id: 'sub-2', x: 0, y: 0, label: 'Nested Canvas' });
    expect(node.label).toBe('Nested Canvas');
    expect(node.children.name).toBe('Nested Canvas');
  });
});
