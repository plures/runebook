<script lang="ts">
  import { canvasStore } from '../stores/canvas';
  import { saveCanvas, loadCanvas } from '../utils/storage';
  import { createSubCanvasNode } from '../utils/canvas-nodes';
  import { StatusBar, Button } from '@plures/design-dojo';
  import type { TextNode } from '../types/canvas';

  interface Props {
    tui?: boolean;
  }

  let { tui = false }: Props = $props();

  /** Must match the CANVAS_ID used for auto-save in +page.svelte */
  const CANVAS_ID = 'default';

  let saveStatus = $state<'idle' | 'saved' | 'error'>('idle');

  function addTextCard() {
    const id = `text-${Date.now()}`;
    canvasStore.addNode({
      id,
      type: 'text',
      position: { x: 80, y: 80 },
      size: { width: 280, height: 200 },
      label: 'Note',
      content: '',
      inputs: [{ id: 'in', name: 'in', type: 'input' }],
      outputs: [{ id: 'out', name: 'out', type: 'output' }],
    } satisfies TextNode);
  }

  function addSubCanvasNode() {
    const id = `sub-canvas-${Date.now()}`;
    canvasStore.addNode(createSubCanvasNode({ id, x: 80, y: 80 }));
  }

  async function handleSave() {
    try {
      const canvas = $canvasStore;
      await saveCanvas({ ...canvas, id: CANVAS_ID });
      saveStatus = 'saved';
      setTimeout(() => { saveStatus = 'idle'; }, 1500);
    } catch {
      saveStatus = 'error';
      setTimeout(() => { saveStatus = 'idle'; }, 2000);
    }
  }

  async function handleLoad() {
    const loaded = await loadCanvas(CANVAS_ID);
    if (loaded) {
      canvasStore.loadCanvas(loaded);
    }
  }

  function clearCanvas() {
    canvasStore.clear();
  }
</script>

<StatusBar position="left" width="56px" {tui} class="toolbar">
  <nav class="toolbar-nav" aria-label="Canvas toolbar">
    <Button variant="secondary" onclick={addTextCard} class="tool-btn" title="Add Text Card">
      📝
    </Button>
    <Button variant="secondary" onclick={addSubCanvasNode} class="tool-btn" title="Add Sub-Canvas">
      ⬡
    </Button>
    <Button variant="secondary" onclick={handleSave} class="tool-btn" title="Save board">
      {#if saveStatus === 'saved'}✅{:else if saveStatus === 'error'}❌{:else}💾{/if}
    </Button>
    <Button variant="secondary" onclick={handleLoad} class="tool-btn" title="Load board">
      📂
    </Button>
    <Button variant="danger" onclick={clearCanvas} class="tool-btn" title="Clear all cards">
      🗑️
    </Button>
  </nav>
</StatusBar>

<style>
  :global(.toolbar) {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--space-2, 8px) 0;
    gap: 0;
    /* Offset below the 40 px TitleBar */
    top: 40px !important;
  }

  .toolbar-nav {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2, 8px);
    width: 100%;
    padding: 0 var(--space-1, 4px);
  }

  :global(.tool-btn) {
    width: 40px !important;
    height: 40px !important;
    padding: 0 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    font-size: 1.1rem !important;
    border-radius: var(--radius-2, 6px) !important;
  }
</style>
