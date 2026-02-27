<script lang="ts">
  import { canvasStore } from '../stores/canvas';
  import { saveCanvasToYAML, loadCanvasFromFile } from '../utils/yaml-loader';
  import { saveCanvas, loadCanvas, listCanvases } from '../utils/storage';
  import type { TerminalNode, InputNode, DisplayNode, TransformNode } from '../types/canvas';
  import Button from '../design-dojo/Button.svelte';

  interface Props {
    tui?: boolean;
  }

  let { tui = false }: Props = $props();

  let showSavedList = $state(false);
  let savedCanvases = $state<{ id: string; name: string; timestamp: number }[]>([]);

  function addTerminalNode() {
    const node: TerminalNode = {
      id: `terminal-${Date.now()}`,
      type: 'terminal',
      position: { x: 120 + Math.random() * 80, y: 80 + Math.random() * 80 },
      label: 'Terminal',
      command: 'echo',
      args: ['Hello, RuneBook!'],
      autoStart: false,
      inputs: [],
      outputs: [{ id: 'stdout', name: 'stdout', type: 'output' }]
    };
    canvasStore.addNode(node);
  }

  function addInputNode() {
    const node: InputNode = {
      id: `input-${Date.now()}`,
      type: 'input',
      position: { x: 120 + Math.random() * 80, y: 280 + Math.random() * 80 },
      label: 'Text Input',
      inputType: 'text',
      value: '',
      inputs: [],
      outputs: [{ id: 'value', name: 'value', type: 'output' }]
    };
    canvasStore.addNode(node);
  }

  function addDisplayNode() {
    const node: DisplayNode = {
      id: `display-${Date.now()}`,
      type: 'display',
      position: { x: 480 + Math.random() * 80, y: 180 + Math.random() * 80 },
      label: 'Display',
      displayType: 'text',
      content: '',
      inputs: [{ id: 'input', name: 'input', type: 'input' }],
      outputs: []
    };
    canvasStore.addNode(node);
  }

  function addTransformNode() {
    const node: TransformNode = {
      id: `transform-${Date.now()}`,
      type: 'transform',
      position: { x: 300 + Math.random() * 80, y: 180 + Math.random() * 80 },
      label: 'Transform',
      transformType: 'map',
      code: 'item',
      inputs: [{ id: 'input', name: 'input', type: 'input' }],
      outputs: [{ id: 'output', name: 'output', type: 'output' }]
    };
    canvasStore.addNode(node);
  }

  async function saveToStorage() {
    try {
      const canvas = $canvasStore;
      await saveCanvas(canvas);
      // Refresh list if currently shown
      if (showSavedList) {
        savedCanvases = await listCanvases();
      }
    } catch (e) {
      console.error('Save failed:', e);
    }
  }

  async function toggleSavedCanvases() {
    showSavedList = !showSavedList;
    if (showSavedList) {
      savedCanvases = await listCanvases();
    }
  }

  async function loadFromStorage(id: string) {
    try {
      const canvas = await loadCanvas(id);
      if (canvas) {
        canvasStore.loadCanvas(canvas);
        showSavedList = false;
      }
    } catch (e) {
      console.error('Load failed:', e);
    }
  }

  async function loadExample() {
    try {
      const canvas = await loadCanvasFromFile('/examples/hello-world.yaml');
      canvasStore.loadCanvas(canvas);
    } catch (e) {
      console.error('Failed to load example:', e);
    }
  }

  function exportYAML() {
    const canvas = $canvasStore;
    const yamlStr = saveCanvasToYAML(canvas);
    const blob = new Blob([yamlStr], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${canvas.name.replace(/\s+/g, '-').toLowerCase()}.yaml`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function clearCanvas() {
    if (confirm('Clear the canvas?')) {
      canvasStore.clear();
    }
  }

</script>

<header class="command-bar" data-tauri-drag-region>
  <div class="command-bar__brand" data-tauri-drag-region>
    <span class="command-bar__logo" aria-hidden="true">⚡</span>
    <span class="command-bar__name">RuneBook</span>
  </div>

  <nav class="command-bar__nodes" aria-label="Add nodes">
    <Button {tui} onclick={addTerminalNode} class="cmd-btn cmd-btn--terminal">
      + Terminal
    </Button>
    <Button {tui} onclick={addInputNode} class="cmd-btn cmd-btn--input">
      + Input
    </Button>
    <Button {tui} onclick={addDisplayNode} class="cmd-btn cmd-btn--display">
      + Display
    </Button>
    <Button {tui} onclick={addTransformNode} class="cmd-btn cmd-btn--transform">
      + Transform
    </Button>
  </nav>

  <div class="command-bar__actions">
    <Button {tui} onclick={loadExample} class="cmd-btn">
      📂 Load Example
    </Button>
    <Button {tui} onclick={saveToStorage} class="cmd-btn">
      💾 Save to Storage
    </Button>
    <div class="cmd-dropdown">
      <Button {tui} onclick={toggleSavedCanvases} class="cmd-btn">
        📚 Saved Canvases {showSavedList ? '▼' : '▶'}
      </Button>
      {#if showSavedList}
        <div class="saved-list">
          {#if savedCanvases.length === 0}
            <div class="empty-message">No saved canvases</div>
          {:else}
            {#each savedCanvases as saved}
              <Button
                {tui}
                class="saved-item"
                onclick={() => loadFromStorage(saved.id)}
              >
                <span>{saved.name}</span>
                <span class="saved-time">{new Date(saved.timestamp).toLocaleDateString()}</span>
              </Button>
            {/each}
          {/if}
        </div>
      {/if}
    </div>
    <Button {tui} onclick={exportYAML} class="cmd-btn">
      📥 Export YAML
    </Button>
    <Button {tui} variant="danger" onclick={clearCanvas} class="cmd-btn">
      🗑️ Clear
    </Button>
  </div>
</header>

<style>
  .command-bar {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: 0 var(--space-4);
    height: 44px;
    background: var(--surface-3, #0d1b2a);
    border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
    flex-shrink: 0;
    user-select: none;
  }

  .command-bar__brand {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 130px;
  }

  .command-bar__logo {
    font-size: 18px;
  }

  .command-bar__name {
    font-weight: 700;
    font-size: var(--font-size-1);
    color: var(--text-1);
    letter-spacing: 0.05em;
  }

  .command-bar__nodes {
    display: flex;
    gap: var(--space-2);
    flex: 1;
  }

  .command-bar__actions {
    display: flex;
    gap: var(--space-2);
  }

  :global(.cmd-btn) {
    font-size: var(--font-size-0) !important;
    padding: var(--space-1) var(--space-3) !important;
    height: 30px;
    white-space: nowrap;
  }

  :global(.cmd-btn--terminal) {
    border-bottom: 2px solid #4caf50 !important;
  }

  :global(.cmd-btn--input) {
    border-bottom: 2px solid #00d4ff !important;
  }

  :global(.cmd-btn--display) {
    border-bottom: 2px solid #7b2fff !important;
  }

  :global(.cmd-btn--transform) {
    border-bottom: 2px solid #ff9800 !important;
  }

  .cmd-dropdown {
    position: relative;
  }

  .saved-list {
    position: absolute;
    top: 100%;
    right: 0;
    min-width: 220px;
    max-height: 240px;
    overflow-y: auto;
    background: var(--surface-2, #16213e);
    border: 1px solid var(--border-color, rgba(255, 255, 255, 0.15));
    border-radius: var(--radius-2, 4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    z-index: 100;
    margin-top: 4px;
  }

  .empty-message {
    padding: var(--space-3);
    text-align: center;
    color: var(--text-3);
    font-size: var(--font-size-0);
  }

  .saved-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-2) var(--space-3);
    cursor: pointer;
    font-size: var(--font-size-0);
    color: var(--text-1);
    border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
    transition: background 0.1s ease;
  }

  .saved-item:last-child {
    border-bottom: none;
  }

  .saved-item:hover {
    background: var(--surface-3, #0f3460);
  }

  .saved-time {
    font-size: var(--font-size-0);
    color: var(--text-3);
    margin-left: var(--space-2);
    flex-shrink: 0;
  }
</style>
