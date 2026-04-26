// Canvas node types for RuneBook
export type NodeType =
  | "text"
  | "terminal"
  | "input"
  | "display"
  | "transform"
  | "sub-canvas";

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Connection {
  id?: string; // Handle-based ID: `e-${from}-${fromPort}-${to}-${toPort}`
  from: string; // Source node ID
  to: string; // Target node ID
  fromPort: string; // Output port name
  toPort: string; // Input port name
}

export interface Port {
  id: string;
  name: string;
  type: "input" | "output";
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
  type: "text";
  content: string;
}

export interface TerminalNode extends BaseNode {
  type: "terminal";
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  autoStart?: boolean;
}

export interface InputNode extends BaseNode {
  type: "input";
  inputType: "text" | "number" | "checkbox" | "slider";
  value: any;
  min?: number;
  max?: number;
  step?: number;
}

export interface DisplayNode extends BaseNode {
  type: "display";
  displayType: "text" | "json" | "table" | "chart";
  content: any;
}

export interface TransformNode extends BaseNode {
  type: "transform";
  transformType: "map" | "filter" | "reduce" | "sudolang";
  code: string;
}

export interface SubCanvasNode extends BaseNode {
  type: "sub-canvas";
  children: Canvas;
}

export type CanvasNode =
  | TextNode
  | TerminalNode
  | InputNode
  | DisplayNode
  | TransformNode
  | SubCanvasNode;

export interface Canvas {
  id: string;
  name: string;
  description?: string;
  nodes: CanvasNode[];
  connections: Connection[];
  version: string;
}

/** Context menu item used by the Canvas context menu */
export interface ContextMenuItem {
  label: string;
  action?: () => void;
  disabled?: boolean;
  danger?: boolean;
  separator?: boolean;
}
