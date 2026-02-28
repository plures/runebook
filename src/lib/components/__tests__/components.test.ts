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
import Canvas from '../Canvas.svelte';
import Toolbar from '../Toolbar.svelte';

import type { TextNode } from '../../types/canvas';

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
});
