// Canvas node types for RuneBook – Phase 1 baseline (Obsidian Canvas-like)
export type NodeType = 'text' | 'sub-canvas';

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Connection {
  from: string; // Source node ID
  to: string; // Target node ID
  fromPort: string; // Output port name
  toPort: string; // Input port name
}

export interface Port {
  id: string;
  name: string;
  type: 'input' | 'output';
  dataType?: string;
}

export interface BaseNode {
  id: string;
  type: NodeType;
  position: Position;
  size?: Size;
  label: string;
  inputs: Port[];
  outputs: Port[];
}

/** Phase 1: plain text/markdown card */
export interface TextNode extends BaseNode {
  type: 'text';
  content: string;
}

export type CanvasNode = TextNode | SubCanvasNode;

/** Phase 1+: a canvas-within-a-canvas node */
export interface SubCanvasNode extends BaseNode {
  type: 'sub-canvas';
  canvas: Canvas;
}

export interface Canvas {
  id: string;
  name: string;
  description?: string;
  nodes: CanvasNode[];
  connections: Connection[];
  version: string;
}
