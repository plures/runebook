// @vitest-environment happy-dom
// Component tests for RuneBook canvas components

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';
import { canvasStore, updateNodeData } from '../../stores/canvas';
import { canvasPraxisStore } from '../../stores/canvas-praxis';

// Mock Tauri APIs
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue('mock output'),
}));
vi.mock('@tauri-apps/api/window', () => ({
  appWindow: {
    listen: vi.fn().mockResolvedValue(() => {}),
    emit: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn().mockResolvedValue(() => {}),
}));

// Mock xterm.js packages (canvas/WebGL not available in happy-dom)
const mockTerminalOpen = vi.fn();
const mockTerminalWriteln = vi.fn();
const mockTerminalClear = vi.fn();
const mockTerminalReset = vi.fn();
const mockTerminalDispose = vi.fn();
const mockTerminalLoadAddon = vi.fn();
vi.mock('@xterm/xterm', () => ({
  Terminal: vi.fn().mockImplementation(() => ({
    open: mockTerminalOpen,
    writeln: mockTerminalWriteln,
    clear: mockTerminalClear,
    reset: mockTerminalReset,
    dispose: mockTerminalDispose,
    loadAddon: mockTerminalLoadAddon,
  })),
}));
const mockFitAddonFit = vi.fn();
vi.mock('@xterm/addon-fit', () => ({
  FitAddon: vi.fn().mockImplementation(() => ({ fit: mockFitAddonFit })),
}));
vi.mock('@xterm/addon-web-links', () => ({
  WebLinksAddon: vi.fn().mockImplementation(() => ({})),
}));
vi.mock('@xterm/addon-webgl', () => ({
  WebglAddon: vi.fn().mockImplementation(() => ({})),
}));

import TextCard from '../TextCard.svelte';
import Canvas from '../Canvas.svelte';
import Toolbar from '../Toolbar.svelte';
import TerminalNode from '../TerminalNode.svelte';
import InputNode from '../InputNode.svelte';
import DisplayNode from '../DisplayNode.svelte';
import TransformNode from '../TransformNode.svelte';
import SubCanvasCard from '../SubCanvasCard.svelte';

import type {
  DisplayNode as DisplayNodeType,
  InputNode as InputNodeType,
  SubCanvasNode,
  TerminalNode as TerminalNodeType,
  TextNode,
  TransformNode as TransformNodeType,
} from '../../types/canvas';

const makeTextNode = (overrides: Partial<TextNode> = {}): TextNode => ({
  id: 'text-1',
  type: 'text',
  position: { x: 100, y: 100 },
  size: { width: 280, height: 200 },
  label: 'Note',
  content: 'Hello world',
  inputs: [{ id: 'in', name: 'in', type: 'input' }],
  outputs: [{ id: 'out', name: 'out', type: 'output' }],
  ...overrides,
});

const makeTerminalNode = (
  overrides: Partial<TerminalNodeType> = {},
): TerminalNodeType => ({
  id: 'terminal-1',
  type: 'terminal',
  position: { x: 300, y: 100 },
  label: 'Test Terminal',
  command: 'echo',
  args: ['hello'],
  inputs: [],
  outputs: [{ id: 'stdout', name: 'stdout', type: 'output' }],
  ...overrides,
});

const makeInputNode = (
  overrides: Partial<InputNodeType> = {},
): InputNodeType => ({
  id: 'input-1',
  type: 'input',
  position: { x: 100, y: 100 },
  label: 'Test Input',
  inputType: 'text',
  value: 'hello',
  inputs: [],
  outputs: [{ id: 'value', name: 'value', type: 'output' }],
  ...overrides,
});

const makeDisplayNode = (
  overrides: Partial<DisplayNodeType> = {},
): DisplayNodeType => ({
  id: 'display-1',
  type: 'display',
  position: { x: 200, y: 100 },
  label: 'Test Display',
  displayType: 'text',
  content: 'test content',
  inputs: [{ id: 'input', name: 'input', type: 'input' }],
  outputs: [],
  ...overrides,
});

const makeTransformNode = (
  overrides: Partial<TransformNodeType> = {},
): TransformNodeType => ({
  id: 'transform-1',
  type: 'transform',
  position: { x: 400, y: 100 },
  label: 'Test Transform',
  transformType: 'map',
  code: 'item * 2',
  inputs: [{ id: 'input', name: 'input', type: 'input' }],
  outputs: [{ id: 'output', name: 'output', type: 'output' }],
  ...overrides,
});

describe('TextCard', () => {
  afterEach(cleanup);

  it('renders the card title', () => {
    const { container } = render(TextCard, {
      node: makeTextNode({ label: 'My Note' }),
    });
    const titleInput = container.querySelector(
      '.card-title',
    ) as HTMLInputElement;
    expect(titleInput).toBeTruthy();
    expect(titleInput.value).toBe('My Note');
  });

  it('renders content in view mode', () => {
    const { container } = render(TextCard, {
      node: makeTextNode({ content: 'some text' }),
    });
    // No textarea in view mode
    expect(container.querySelector('textarea')).toBeNull();
  });

  it('switches to edit mode on double-click', async () => {
    const { container } = render(TextCard, { node: makeTextNode() });
    const body = container.querySelector('.card-body') as HTMLElement;
    body.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    // After double-click, textarea should appear
    await new Promise((r) => setTimeout(r, 0));
    expect(container.querySelector('textarea')).toBeTruthy();
  });

  it('renders the card body', () => {
    const { container } = render(TextCard, { node: makeTextNode() });
    expect(container.querySelector('.dd-box')).toBeTruthy();
  });
});

describe('TerminalNode', () => {
  afterEach(cleanup);

  it('should render the terminal node', () => {
    const { container } = render(TerminalNode, { node: makeTerminalNode() });
    expect(container.querySelector('.terminal-node')).toBeTruthy();
  });

  it('should show the run button', () => {
    const { container } = render(TerminalNode, { node: makeTerminalNode() });
    expect(container.querySelector('.run-btn')).toBeTruthy();
  });

  it('should show the clear button with aria-label', () => {
    const { container } = render(TerminalNode, { node: makeTerminalNode() });
    const clearBtn = container.querySelector('.clear-btn');
    expect(clearBtn).toBeTruthy();
    expect(clearBtn?.getAttribute('aria-label')).toBe('Clear');
  });

  it('should have a visually-hidden error-live region with role=alert', () => {
    const { container } = render(TerminalNode, { node: makeTerminalNode() });
    const alertRegion = container.querySelector('[role="alert"]');
    expect(alertRegion).toBeTruthy();
    expect(alertRegion?.getAttribute('aria-live')).toBe('assertive');
    expect(alertRegion?.getAttribute('aria-atomic')).toBe('true');
  });

  it('should show error line with ✗ prefix when context guard fires (non-Tauri)', async () => {
    const { container } = render(TerminalNode, { node: makeTerminalNode() });
    const runButton = container.querySelector('.run-btn') as HTMLButtonElement;
    await fireEvent.click(runButton);
    await waitFor(() => {
      const errorLine = container.querySelector('.error-line');
      expect(errorLine?.textContent).toMatch(/✗/);
    });
  });

  it('should announce guard error in the aria-live region (non-Tauri)', async () => {
    const { container } = render(TerminalNode, { node: makeTerminalNode() });
    const runButton = container.querySelector('.run-btn') as HTMLButtonElement;
    await fireEvent.click(runButton);
    await waitFor(() => {
      const alertRegion = container.querySelector('[role="alert"]');
      expect(alertRegion?.textContent).toContain('desktop app');
    });
  });

  describe('with Tauri context (simulated desktop)', () => {
    beforeEach(() => {
      (window as any).__TAURI__ = {};
    });
    afterEach(() => {
      delete (window as any).__TAURI__;
    });

    it('should show error line with ✗ prefix after a failed command', async () => {
      const { invoke } = (await import('@tauri-apps/api/core')) as any;
      invoke.mockRejectedValueOnce(new Error('Command failed'));
      const { container } = render(TerminalNode, { node: makeTerminalNode() });
      const runButton = container.querySelector(
        '.run-btn',
      ) as HTMLButtonElement;
      await fireEvent.click(runButton);
      await waitFor(() => {
        const errorLine = container.querySelector('.error-line');
        expect(errorLine?.textContent).toMatch(/✗/);
      });
    });

    it('should announce error in the aria-live region after a failed command', async () => {
      const { invoke } = (await import('@tauri-apps/api/core')) as any;
      invoke.mockRejectedValueOnce(new Error('Command failed'));
      const { container } = render(TerminalNode, { node: makeTerminalNode() });
      const runButton = container.querySelector(
        '.run-btn',
      ) as HTMLButtonElement;
      await fireEvent.click(runButton);
      await waitFor(() => {
        const alertRegion = container.querySelector('[role="alert"]');
        expect(alertRegion?.textContent).toContain('Command failed');
      });
    });
  });

  it('should render the xterm container element', () => {
    const { container } = render(TerminalNode, { node: makeTerminalNode() });
    expect(container.querySelector('.xterm-container')).toBeTruthy();
  });

  it('should open the xterm terminal in the container on mount', () => {
    render(TerminalNode, { node: makeTerminalNode() });
    expect(mockTerminalOpen).toHaveBeenCalled();
  });

  it('should write a placeholder message to the terminal in non-Tauri context', () => {
    render(TerminalNode, { node: makeTerminalNode() });
    expect(mockTerminalWriteln).toHaveBeenCalledWith(
      expect.stringContaining('desktop app'),
    );
  });

  it('should call fitAddon.fit() after opening the terminal', () => {
    render(TerminalNode, { node: makeTerminalNode() });
    expect(mockFitAddonFit).toHaveBeenCalled();
  });
});

describe('InputNode', () => {
  afterEach(cleanup);

  it('should render with text input', () => {
    const { container } = render(InputNode, { node: makeInputNode() });
    expect(container.querySelector('.input-node')).toBeTruthy();
  });

  it('should render with number input type', () => {
    const { container } = render(InputNode, {
      node: makeInputNode({
        inputType: 'number',
        value: 42,
        min: 0,
        max: 100,
        step: 1,
      }),
    });
    expect(container.querySelector('input[type="number"]')).toBeTruthy();
  });

  it('should render with checkbox input type', () => {
    const { container } = render(InputNode, {
      node: makeInputNode({ inputType: 'checkbox', value: true }),
    });
    expect(container.querySelector('input[type="checkbox"]')).toBeTruthy();
  });

  it('should render with slider input type', () => {
    const { container } = render(InputNode, {
      node: makeInputNode({
        inputType: 'slider',
        value: 50,
        min: 0,
        max: 100,
        step: 1,
      }),
    });
    expect(container.querySelector('input[type="range"]')).toBeTruthy();
  });

  it('should show the node label', () => {
    const { container } = render(InputNode, {
      node: makeInputNode({ label: 'My Input' }),
    });
    expect(container.textContent).toContain('My Input');
  });

  it('should show output port', () => {
    const { container } = render(InputNode, { node: makeInputNode() });
    expect(container.querySelector('.output-port')).toBeTruthy();
  });
});

describe('DisplayNode', () => {
  afterEach(cleanup);

  it('should render text display type', () => {
    const { container } = render(DisplayNode, { node: makeDisplayNode() });
    expect(container.querySelector('.display-node')).toBeTruthy();
  });

  it('should render json display type with object content', () => {
    const node = makeDisplayNode({
      displayType: 'json',
      content: { key: 'value' },
    });
    const { container } = render(DisplayNode, { node });
    expect(container.querySelector('.display-node')).toBeTruthy();
    expect(container.textContent).toContain('"key"');
  });

  it('should render json display type with string content', () => {
    const node = makeDisplayNode({
      displayType: 'json',
      content: '{"key":"value"}',
    });
    const { container } = render(DisplayNode, { node });
    expect(container.querySelector('.display-node')).toBeTruthy();
    expect(container.textContent).toContain('"key"');
  });

  it('should render table display type', () => {
    const node = makeDisplayNode({ displayType: 'table', content: [] });
    const { container } = render(DisplayNode, { node });
    expect(container.querySelector('.display-node')).toBeTruthy();
  });

  it('should show the node label', () => {
    const { container } = render(DisplayNode, {
      node: makeDisplayNode({ label: 'My Display' }),
    });
    expect(container.textContent).toContain('My Display');
  });

  it('should display string content', () => {
    const { container } = render(DisplayNode, {
      node: makeDisplayNode({ content: 'hello world' }),
    });
    expect(container.textContent).toContain('hello world');
  });
});

describe('TransformNode', () => {
  afterEach(cleanup);

  it('should render the transform node', () => {
    const { container } = render(TransformNode, { node: makeTransformNode() });
    expect(container.querySelector('.transform-node')).toBeTruthy();
  });

  it('should show the code textarea', () => {
    const { container } = render(TransformNode, { node: makeTransformNode() });
    expect(container.querySelector('.code-textarea')).toBeTruthy();
  });

  it('should show the transform type select', () => {
    const { container } = render(TransformNode, { node: makeTransformNode() });
    expect(container.querySelector('select')).toBeTruthy();
  });

  it('should show error message for invalid input', async () => {
    const transform = makeTransformNode({ id: 'err-transform' });
    canvasStore.addNode(makeInputNode({ id: 'err-input' }));
    canvasStore.addNode(transform);
    canvasStore.addConnection({
      from: 'err-input',
      fromPort: 'value',
      to: 'err-transform',
      toPort: 'input',
    });
    updateNodeData('err-input', 'value', 'not-an-array');

    const { container } = render(TransformNode, { node: transform });
    await waitFor(() => {
      expect(container.querySelector('.error-message')).toBeTruthy();
    });
  });

  it('should block code execution outside Tauri context (no window.__TAURI__)', async () => {
    // In the test environment (happy-dom), __TAURI__ is not present, so execution
    // should be blocked and produce the context-guard error message.
    const transform = makeTransformNode({ id: 'guard-transform' });
    canvasStore.addNode(makeInputNode({ id: 'guard-input' }));
    canvasStore.addNode(transform);
    canvasStore.addConnection({
      from: 'guard-input',
      fromPort: 'value',
      to: 'guard-transform',
      toPort: 'input',
    });
    updateNodeData('guard-input', 'value', [1, 2, 3]);

    const { container } = render(TransformNode, { node: transform });
    await waitFor(() => {
      const errorMsg = container.querySelector('.error-message');
      expect(errorMsg).toBeTruthy();
      expect(errorMsg?.textContent).toContain('desktop app');
    });
  });
});

describe('Canvas', () => {
  beforeEach(() => {
    canvasPraxisStore.clear();
  });
  afterEach(cleanup);

  it('renders without crashing', () => {
    const { container } = render(Canvas);
    expect(container.querySelector('.canvas-container')).toBeTruthy();
  });

  it('renders a zoom indicator', () => {
    const { container } = render(Canvas);
    expect(container.querySelector('.zoom-indicator')).toBeTruthy();
  });

  it('renders text cards for nodes in the store', async () => {
    canvasStore.addNode(makeTextNode());
    await new Promise((r) => setTimeout(r, 0));
    const { container } = render(Canvas);
    await new Promise((r) => setTimeout(r, 10));
    expect(container.querySelector('.node-wrapper')).toBeTruthy();
  });

  it('node-wrapper has selected class when node is clicked', async () => {
    canvasPraxisStore.clear();
    canvasStore.addNode(makeTextNode({ id: 'text-sel' }));
    await new Promise((r) => setTimeout(r, 0));
    const { container } = render(Canvas);
    await new Promise((r) => setTimeout(r, 10));
    const wrapper = container.querySelector('.node-wrapper') as HTMLElement;
    expect(wrapper).toBeTruthy();
    wrapper.dispatchEvent(
      new MouseEvent('mousedown', {
        bubbles: true,
        shiftKey: false,
        button: 0,
      }),
    );
    await new Promise((r) => setTimeout(r, 10));
    expect(wrapper.classList.contains('selected')).toBe(true);
  });

  it('shift+click selects multiple nodes', async () => {
    canvasPraxisStore.clear();
    canvasStore.addNode(makeTextNode({ id: 'text-a' }));
    canvasStore.addNode(
      makeTextNode({ id: 'text-b', position: { x: 400, y: 100 } }),
    );
    await new Promise((r) => setTimeout(r, 0));
    const { container } = render(Canvas);
    await new Promise((r) => setTimeout(r, 10));
    const wrappers = container.querySelectorAll('.node-wrapper');
    expect(wrappers.length).toBe(2);
    (wrappers[0] as HTMLElement).dispatchEvent(
      new MouseEvent('mousedown', {
        bubbles: true,
        shiftKey: false,
        button: 0,
      }),
    );
    await new Promise((r) => setTimeout(r, 10));
    expect((wrappers[0] as HTMLElement).classList.contains('selected')).toBe(
      true,
    );
    expect((wrappers[1] as HTMLElement).classList.contains('selected')).toBe(
      false,
    );
    (wrappers[1] as HTMLElement).dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, shiftKey: true, button: 0 }),
    );
    await new Promise((r) => setTimeout(r, 10));
    expect((wrappers[0] as HTMLElement).classList.contains('selected')).toBe(
      true,
    );
    expect((wrappers[1] as HTMLElement).classList.contains('selected')).toBe(
      true,
    );
  });

  it('should render all node types without crashing', () => {
    canvasPraxisStore.clear();
    canvasStore.addNode(makeTerminalNode({ id: 'term-canvas' }));
    canvasStore.addNode(makeInputNode({ id: 'input-canvas' }));
    canvasStore.addNode(makeDisplayNode({ id: 'display-canvas' }));
    canvasStore.addNode(makeTransformNode({ id: 'transform-canvas' }));
    const { container } = render(Canvas);
    expect(container.querySelector('.canvas-container')).toBeTruthy();
    expect(container.querySelectorAll('.node-wrapper').length).toBe(4);
  });
});

describe('Toolbar', () => {
  afterEach(cleanup);

  it('renders the toolbar', () => {
    const { container } = render(Toolbar);
    expect(container.querySelector('.toolbar-nav')).toBeTruthy();
  });

  it('has an Add Text Card button', () => {
    const { container } = render(Toolbar);
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('has buttons for all 5 core node types plus sub-canvas', () => {
    const { container } = render(Toolbar);
    const buttons = Array.from(container.querySelectorAll('button'));
    const titles = buttons.map((b) => b.getAttribute('title'));
    expect(titles).toContain('Add Text Card');
    expect(titles).toContain('Add Terminal');
    expect(titles).toContain('Add Input');
    expect(titles).toContain('Add Display');
    expect(titles).toContain('Add Transform');
    expect(titles).toContain('Add Sub-Canvas');
  });

  it('clicking Add Terminal button adds a terminal node to the canvas', async () => {
    canvasStore.clear();
    const { container } = render(Toolbar);
    const buttons = Array.from(container.querySelectorAll('button'));
    const terminalBtn = buttons.find(
      (b) => b.getAttribute('title') === 'Add Terminal',
    );
    expect(terminalBtn).toBeTruthy();
    await fireEvent.click(terminalBtn!);
    const canvas = get(canvasStore);
    expect(canvas.nodes.some((n) => n.type === 'terminal')).toBe(true);
  });

  it('clicking Add Input button adds an input node to the canvas', async () => {
    canvasStore.clear();
    const { container } = render(Toolbar);
    const buttons = Array.from(container.querySelectorAll('button'));
    const inputBtn = buttons.find(
      (b) => b.getAttribute('title') === 'Add Input',
    );
    expect(inputBtn).toBeTruthy();
    await fireEvent.click(inputBtn!);
    const canvas = get(canvasStore);
    expect(canvas.nodes.some((n) => n.type === 'input')).toBe(true);
  });

  it('clicking Add Display button adds a display node to the canvas', async () => {
    canvasStore.clear();
    const { container } = render(Toolbar);
    const buttons = Array.from(container.querySelectorAll('button'));
    const displayBtn = buttons.find(
      (b) => b.getAttribute('title') === 'Add Display',
    );
    expect(displayBtn).toBeTruthy();
    await fireEvent.click(displayBtn!);
    const canvas = get(canvasStore);
    expect(canvas.nodes.some((n) => n.type === 'display')).toBe(true);
  });

  it('clicking Add Transform button adds a transform node to the canvas', async () => {
    canvasStore.clear();
    const { container } = render(Toolbar);
    const buttons = Array.from(container.querySelectorAll('button'));
    const transformBtn = buttons.find(
      (b) => b.getAttribute('title') === 'Add Transform',
    );
    expect(transformBtn).toBeTruthy();
    await fireEvent.click(transformBtn!);
    const canvas = get(canvasStore);
    expect(canvas.nodes.some((n) => n.type === 'transform')).toBe(true);
  });
});

describe('Graph execution layer', () => {
  afterEach(() => {
    cleanup();
    canvasStore.clear();
  });

  it('should render InputNode and DisplayNode together without infinite loop', () => {
    canvasStore.clear();
    canvasStore.addNode(makeInputNode({ id: 'input-gl' }));
    canvasStore.addNode(makeDisplayNode({ id: 'display-gl' }));
    // Should not throw or loop
    const { container } = render(Canvas);
    expect(container.querySelector('.canvas-container')).toBeTruthy();
    expect(container.querySelectorAll('.node-wrapper').length).toBe(2);
  });

  it('should propagate InputNode value to connected DisplayNode after source update', async () => {
    canvasStore.clear();
    canvasStore.addNode(makeInputNode({ id: 'src', value: 'hello' }));
    canvasStore.addNode(makeDisplayNode({ id: 'dst', content: '' }));
    canvasStore.addConnection({
      from: 'src',
      fromPort: 'value',
      to: 'dst',
      toPort: 'input',
    });

    render(Canvas);

    await waitFor(() => {
      const canvas = get(canvasStore);
      const dst = canvas.nodes.find((n) => n.id === 'dst') as
        | DisplayNodeType
        | undefined;
      expect(dst?.content).toBe('hello');
    });
  });

  it('should propagate TerminalNode output to connected DisplayNode after source update', async () => {
    canvasStore.clear();
    canvasStore.addNode(
      makeTerminalNode({
        id: 'term-src',
        outputs: [{ id: 'stdout', name: 'stdout', type: 'output' }],
      }),
    );
    canvasStore.addNode(makeDisplayNode({ id: 'disp-dst', content: '' }));
    canvasStore.addConnection({
      from: 'term-src',
      fromPort: 'stdout',
      to: 'disp-dst',
      toPort: 'input',
    });

    updateNodeData('term-src', 'stdout', 'terminal output');

    render(Canvas);

    await waitFor(() => {
      const canvas = get(canvasStore);
      const dst = canvas.nodes.find((n) => n.id === 'disp-dst') as
        | DisplayNodeType
        | undefined;
      expect(dst?.content).toBe('terminal output');
    });
  });

  it('should not update DisplayNode content when no connection exists', () => {
    canvasStore.clear();
    canvasStore.addNode(makeInputNode({ id: 'isolated-input' }));
    canvasStore.addNode(
      makeDisplayNode({ id: 'isolated-display', content: 'original' }),
    );
    // No connection added

    updateNodeData('isolated-input', 'value', 'should not appear');

    render(Canvas);

    let content = '';
    const unsub = canvasStore.subscribe((c) => {
      const node = c.nodes.find((n) => n.id === 'isolated-display');
      if (node && node.type === 'display') content = node.content as string;
    });
    unsub();
    expect(content).toBe('original');
  });
});

const makeSubCanvasNode = (
  overrides: Partial<SubCanvasNode> = {},
): SubCanvasNode => ({
  id: 'sub-1',
  type: 'sub-canvas',
  position: { x: 100, y: 100 },
  size: { width: 320, height: 200 },
  label: 'My Sub-Canvas',
  inputs: [{ id: 'in', name: 'in', type: 'input' }],
  outputs: [{ id: 'out', name: 'out', type: 'output' }],
  children: {
    id: 'canvas-sub-1',
    name: 'Inner',
    description: '',
    nodes: [],
    connections: [],
    version: '1.0.0',
  },
  ...overrides,
});

describe('SubCanvasCard', () => {
  afterEach(cleanup);

  it('renders without crashing', () => {
    const { container } = render(SubCanvasCard, {
      node: makeSubCanvasNode(),
      onnavigate: () => {},
    });
    expect(container.querySelector('.sub-canvas-card')).toBeTruthy();
  });

  it('shows the sub-canvas label', () => {
    const { container } = render(SubCanvasCard, {
      node: makeSubCanvasNode({ label: 'Agent Workflow' }),
      onnavigate: () => {},
    });
    const titleInput = container.querySelector(
      '.card-title',
    ) as HTMLInputElement;
    expect(titleInput).toBeTruthy();
    expect(titleInput.value).toBe('Agent Workflow');
  });

  it('shows 0 nodes and 0 links for empty children', () => {
    const { container } = render(SubCanvasCard, {
      node: makeSubCanvasNode(),
      onnavigate: () => {},
    });
    expect(container.textContent).toContain('0 nodes');
    expect(container.textContent).toContain('0 links');
  });

  it('shows correct node and link counts', () => {
    const node = makeSubCanvasNode({
      children: {
        id: 'canvas-sub-1',
        name: 'Inner',
        description: '',
        nodes: [
          {
            id: 'n1',
            type: 'text',
            position: { x: 0, y: 0 },
            label: 'A',
            content: '',
            inputs: [],
            outputs: [],
          },
          {
            id: 'n2',
            type: 'text',
            position: { x: 100, y: 0 },
            label: 'B',
            content: '',
            inputs: [],
            outputs: [],
          },
        ],
        connections: [
          { id: 'c1', from: 'n1', to: 'n2', fromPort: 'out', toPort: 'in' },
        ],
        version: '1.0.0',
      },
    });
    const { container } = render(SubCanvasCard, { node, onnavigate: () => {} });
    expect(container.textContent).toContain('2 nodes');
    expect(container.textContent).toContain('1 link');
  });

  it('calls onnavigate with the node id when Open button is clicked', async () => {
    let navigatedTo: string | null = null;
    const { container } = render(SubCanvasCard, {
      node: makeSubCanvasNode({ id: 'sub-click' }),
      onnavigate: (id: string) => {
        navigatedTo = id;
      },
    });
    const btn = container.querySelector('.navigate-btn') as HTMLButtonElement;
    expect(btn).toBeTruthy();
    await fireEvent.click(btn);
    expect(navigatedTo).toBe('sub-click');
  });

  it('renders mini-preview nodes for children', () => {
    const node = makeSubCanvasNode({
      children: {
        id: 'canvas-sub-1',
        name: 'Inner',
        description: '',
        nodes: [
          {
            id: 'n1',
            type: 'text',
            position: { x: 0, y: 0 },
            label: 'A',
            content: '',
            inputs: [],
            outputs: [],
          },
        ],
        connections: [],
        version: '1.0.0',
      },
    });
    const { container } = render(SubCanvasCard, { node, onnavigate: () => {} });
    expect(container.querySelector('.preview-node')).toBeTruthy();
  });
});

describe('Canvas with sub-canvas node', () => {
  beforeEach(() => {
    canvasPraxisStore.clear();
  });
  afterEach(cleanup);

  it('renders sub-canvas node type without crashing', () => {
    canvasPraxisStore.clear();
    canvasStore.addNode(makeSubCanvasNode({ id: 'sub-canvas-test' }));
    const { container } = render(Canvas);
    expect(container.querySelector('.canvas-container')).toBeTruthy();
    expect(container.querySelector('.node-wrapper')).toBeTruthy();
  });
});
