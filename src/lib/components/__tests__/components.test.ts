// @vitest-environment happy-dom
// Component tests for Phase 1 (Obsidian Canvas baseline)

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, cleanup } from '@testing-library/svelte';
import { canvasStore } from '../../stores/canvas';
import { canvasPraxisStore } from '../../stores/canvas-praxis';

// Mock Tauri APIs (not used in Phase 1 UI but imported transitively)
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn().mockResolvedValue('') }));
vi.mock('@tauri-apps/api/window', () => ({
  appWindow: { listen: vi.fn().mockResolvedValue(() => {}), emit: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn().mockResolvedValue(() => {}) }));

import TextCard from '../TextCard.svelte';
import SubCanvasCard from '../SubCanvasCard.svelte';
import Canvas from '../Canvas.svelte';
import Toolbar from '../Toolbar.svelte';

import type { TextNode, SubCanvasNode } from '../../types/canvas';

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

const makeSubCanvasNode = (overrides: Partial<SubCanvasNode> = {}): SubCanvasNode => ({
  id: 'sub-1',
  type: 'sub-canvas',
  position: { x: 200, y: 200 },
  size: { width: 280, height: 200 },
  label: 'My Sub-canvas',
  inputs: [],
  outputs: [],
  canvas: {
    id: 'sub-1',
    name: 'My Sub-canvas',
    nodes: [],
    connections: [],
    version: '1.0.0',
  },
  ...overrides,
});

describe('TextCard', () => {
  afterEach(cleanup);

  it('renders the card title', () => {
    const { container } = render(TextCard, { node: makeTextNode({ label: 'My Note' }) });
    const titleInput = container.querySelector('.card-title') as HTMLInputElement;
    expect(titleInput).toBeTruthy();
    expect(titleInput.value).toBe('My Note');
  });

  it('renders content in view mode', () => {
    const { container } = render(TextCard, { node: makeTextNode({ content: 'some text' }) });
    // No textarea in view mode
    expect(container.querySelector('textarea')).toBeNull();
  });

  it('switches to edit mode on double-click', async () => {
    const { container } = render(TextCard, { node: makeTextNode() });
    const body = container.querySelector('.card-body') as HTMLElement;
    body.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    // After double-click, textarea should appear
    await new Promise(r => setTimeout(r, 0));
    expect(container.querySelector('textarea')).toBeTruthy();
  });

  it('renders the card body', () => {
    const { container } = render(TextCard, { node: makeTextNode() });
    expect(container.querySelector('.dd-box')).toBeTruthy();
  });
});

describe('SubCanvasCard', () => {
  afterEach(cleanup);

  it('renders the sub-canvas name', () => {
    const { container } = render(SubCanvasCard, {
      node: makeSubCanvasNode({ label: 'Workflow A' }),
      onnavigate: vi.fn(),
    });
    const titleInput = container.querySelector('.sub-canvas-title') as HTMLInputElement;
    expect(titleInput).toBeTruthy();
    expect(titleInput.value).toBe('Workflow A');
  });

  it('shows node count in footer', () => {
    const node = makeSubCanvasNode({
      canvas: {
        id: 'sub-1',
        name: 'Sub',
        nodes: [makeTextNode(), makeTextNode({ id: 'text-2', position: { x: 50, y: 50 } })],
        connections: [],
        version: '1.0.0',
      },
    });
    const { container } = render(SubCanvasCard, { node, onnavigate: vi.fn() });
    const footer = container.querySelector('.sub-canvas-meta') as HTMLElement;
    expect(footer?.textContent).toContain('2');
    expect(footer?.textContent).toContain('node');
  });

  it('calls onnavigate when Open button is clicked', async () => {
    const onnavigate = vi.fn();
    const node = makeSubCanvasNode({ id: 'sub-abc' });
    const { container } = render(SubCanvasCard, { node, onnavigate });
    const openBtn = container.querySelector('.enter-btn-sm') as HTMLButtonElement;
    openBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise(r => setTimeout(r, 0));
    expect(onnavigate).toHaveBeenCalledWith('sub-abc');
  });

  it('renders a mini preview area', () => {
    const { container } = render(SubCanvasCard, {
      node: makeSubCanvasNode(),
      onnavigate: vi.fn(),
    });
    expect(container.querySelector('.sub-canvas-preview')).toBeTruthy();
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
    await new Promise(r => setTimeout(r, 0));
    const { container } = render(Canvas);
    // Wait for reactive update
    await new Promise(r => setTimeout(r, 10));
    expect(container.querySelector('.node-wrapper')).toBeTruthy();
  });

  it('renders sub-canvas nodes', async () => {
    canvasPraxisStore.clear();
    canvasStore.addNode(makeSubCanvasNode());
    await new Promise(r => setTimeout(r, 0));
    const { container } = render(Canvas);
    await new Promise(r => setTimeout(r, 10));
    expect(container.querySelector('.node-sub-canvas')).toBeTruthy();
  });

  it('does not show breadcrumb at root level', () => {
    const { container } = render(Canvas);
    expect(container.querySelector('.breadcrumb')).toBeNull();
  });

  it('shows breadcrumb when navigated into a sub-canvas', async () => {
    canvasPraxisStore.clear();
    const node = makeSubCanvasNode({ id: 'sub-nav-test' });
    canvasStore.addNode(node);
    canvasStore.navigateInto('sub-nav-test');
    await new Promise(r => setTimeout(r, 0));
    const { container } = render(Canvas);
    await new Promise(r => setTimeout(r, 10));
    expect(container.querySelector('.breadcrumb')).toBeTruthy();
    // Reset navigation
    canvasStore.navigateToRoot();
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

  it('has an Add Sub-Canvas button', () => {
    const { container } = render(Toolbar);
    const buttons = Array.from(container.querySelectorAll('button'));
    const subCanvasBtn = buttons.find(b => b.title === 'Add Sub-Canvas');
    expect(subCanvasBtn).toBeTruthy();
  });
});
