// Canvas node types for RuneBook
export type NodeType = 'terminal' | 'input' | 'display' | 'transform';

export interface Position {
  x: number;
  y: number;
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
  label: string;
  inputs: Port[];
  outputs: Port[];
}

export interface TerminalNode extends BaseNode {
  type: 'terminal';
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  autoStart?: boolean;
}

export interface InputNode extends BaseNode {
  type: 'input';
  inputType: 'text' | 'number' | 'checkbox' | 'slider';
  value: any;
  min?: number;
  max?: number;
  step?: number;
}

export interface DisplayNode extends BaseNode {
  type: 'display';
  displayType: 'text' | 'json' | 'table' | 'chart';
  content: any;
}

export interface TransformNode extends BaseNode {
  type: 'transform';
  transformType: 'map' | 'filter' | 'reduce' | 'sudolang';
  code: string;
}

export type CanvasNode = TerminalNode | InputNode | DisplayNode | TransformNode;

export interface Canvas {
  id: string;
  name: string;
  description?: string;
  nodes: CanvasNode[];
  connections: Connection[];
  version: string;
}
