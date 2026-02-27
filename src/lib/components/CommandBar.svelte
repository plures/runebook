<script lang="ts">
  import type { Node, Edge } from '@xyflow/svelte';

  interface SavedCanvas {
    id: string;
    name: string;
    nodes: Node[];
    edges: Edge[];
    savedAt: number;
  }

  interface Props {
    onAddNode: (type: string) => void;
    nodes: Node[];
    edges: Edge[];
    onLoad: (nodes: Node[], edges: Edge[]) => void;
    onClear: () => void;
  }

  let { onAddNode, nodes, edges, onLoad, onClear }: Props = $props();

  let showSavedList = $state(false);
  let showStorageSettings = $state(false);
  let savedCanvases = $state<SavedCanvas[]>([]);

  const STORAGE_KEY = 'runebook-canvases';

  const EXAMPLE_CANVAS: { nodes: Node[]; edges: Edge[] } = {
    nodes: [
      {
        id: 'ex-terminal',
        type: 'terminal',
        position: { x: 80, y: 120 },
        data: { label: 'Terminal', command: 'echo Hello, RuneBook!', args: [], env: {}, cwd: '' },
        style: 'width: 480px;'
      },
      {
        id: 'ex-input',
        type: 'input',
        position: { x: 80, y: 320 },
        data: { label: 'User Input', inputType: 'text', value: 'Type something here...' },
        style: 'width: 280px;'
      },
      {
        id: 'ex-display1',
        type: 'display',
        position: { x: 640, y: 120 },
        data: { label: 'Output', displayType: 'text', content: '' },
        style: 'width: 360px;'
      },
      {
        id: 'ex-display2',
        type: 'display',
        position: { x: 640, y: 320 },
        data: { label: 'Echo Display', displayType: 'text', content: '' },
        style: 'width: 360px;'
      }
    ] as Node[],
    edges: []
  };

  function loadSavedCanvases() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      savedCanvases = raw ? JSON.parse(raw) : [];
    } catch {
      savedCanvases = [];
    }
  }

  function saveCanvas() {
    loadSavedCanvases();
    const canvas: SavedCanvas = {
      id: crypto.randomUUID(),
      name: 'Untitled Canvas',
      nodes: nodes,
      edges: edges,
      savedAt: Date.now()
    };
    savedCanvases = [...savedCanvases, canvas];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedCanvases));
    alert('Canvas saved!');
  }

  function loadCanvas(canvas: SavedCanvas) {
    onLoad(canvas.nodes, canvas.edges);
    showSavedList = false;
  }

  function loadExample() {
    if (nodes.length > 0) {
      if (!confirm('Replace current canvas with the example?')) return;
    }
    onLoad(EXAMPLE_CANVAS.nodes, EXAMPLE_CANVAS.edges);
  }

  function exportYAML() {
    const yaml = nodes
      .map(n => `- id: ${n.id}\n  type: ${n.type}`)
      .join('\n');
    const blob = new Blob([yaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'canvas.yaml';
    a.click();
    URL.revokeObjectURL(url);
  }

  function toggleSavedList() {
    if (!showSavedList) loadSavedCanvases();
    showSavedList = !showSavedList;
    if (showSavedList) showStorageSettings = false;
  }

  function toggleStorageSettings() {
    showStorageSettings = !showStorageSettings;
    if (showStorageSettings) showSavedList = false;
  }
</script>

<div class="command-bar">
  <div class="bar-left">
    <span class="logo">◇ RuneBook</span>
  </div>
  <div class="bar-center">
    <button class="toolbar-btn" onclick={() => onAddNode('terminal')} title="Add Terminal (Ctrl+T)">
      <span class="btn-icon">⚡</span> Terminal
    </button>
    <button class="toolbar-btn" onclick={() => onAddNode('input')} title="Add Input">
      <span class="btn-icon">📝</span> Input
    </button>
    <button class="toolbar-btn" onclick={() => onAddNode('transform')} title="Add Transform">
      <span class="btn-icon">🔄</span> Transform
    </button>
    <button class="toolbar-btn" onclick={() => onAddNode('display')} title="Add Display">
      <span class="btn-icon">📊</span> Display
    </button>

    <div class="bar-sep"></div>

    <button class="toolbar-btn" onclick={loadExample} title="Load Example Canvas">
      Load Example
    </button>
    <button class="toolbar-btn" onclick={saveCanvas} title="Save canvas to browser storage">
      Save to Storage
    </button>

    <div class="saved-canvases-wrap">
      <button class="toolbar-btn" onclick={toggleSavedList} title="Saved Canvases">
        Saved Canvases
      </button>
      {#if showSavedList}
        <div class="saved-list">
          {#if savedCanvases.length === 0}
            <div class="empty-message">No saved canvases</div>
          {:else}
            {#each savedCanvases as canvas (canvas.id)}
              <button class="saved-item" onclick={() => loadCanvas(canvas)}>
                {canvas.name}
              </button>
            {/each}
          {/if}
        </div>
      {/if}
    </div>

    <button class="toolbar-btn" onclick={exportYAML} title="Export as YAML">
      Export YAML
    </button>
    <button class="toolbar-btn" onclick={toggleStorageSettings} title="Storage Settings">
      Storage Settings
    </button>
    <button class="toolbar-btn dd-btn--danger" onclick={onClear} title="Clear all nodes">
      Clear
    </button>
  </div>
</div>

{#if showStorageSettings}
  <div class="storage-settings">
    <div class="settings-header">
      <span>Storage Settings</span>
      <button class="close-btn" onclick={toggleStorageSettings}>✕</button>
    </div>
    <div class="settings-body">
      <p>Canvases are saved in browser <code>localStorage</code>.</p>
      <p>Key: <code>{STORAGE_KEY}</code></p>
    </div>
  </div>
{/if}

<style>
  .command-bar {
    display: flex;
    align-items: center;
    height: 44px;
    padding: 0 12px;
    background: #16213e;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    gap: 4px;
    flex-shrink: 0;
    z-index: 100;
    -webkit-app-region: drag;
  }

  .bar-left {
    display: flex;
    align-items: center;
    margin-right: 8px;
  }

  .logo {
    font-weight: 700;
    font-size: 14px;
    color: #00d4ff;
    letter-spacing: 0.5px;
    -webkit-app-region: drag;
  }

  .bar-center {
    display: flex;
    align-items: center;
    gap: 4px;
    -webkit-app-region: no-drag;
    flex-wrap: wrap;
  }

  .bar-sep {
    width: 1px;
    height: 20px;
    background: rgba(255,255,255,0.12);
    margin: 0 4px;
  }

  .toolbar-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    background: transparent;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 6px;
    color: #a0a0b0;
    font-size: 12px;
    cursor: pointer;
    transition: all 150ms ease;
    font-family: inherit;
    white-space: nowrap;
  }

  .toolbar-btn:hover {
    background: rgba(255,255,255,0.06);
    color: #e0e0e0;
    border-color: rgba(255,255,255,0.15);
  }

  .toolbar-btn.dd-btn--danger {
    border-color: rgba(255,80,80,0.25);
    color: #ff6060;
  }

  .toolbar-btn.dd-btn--danger:hover {
    background: rgba(255,80,80,0.1);
    border-color: #ff6060;
  }

  .btn-icon {
    font-size: 13px;
  }

  /* Saved Canvases dropdown */
  .saved-canvases-wrap {
    position: relative;
  }

  .saved-list {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    min-width: 200px;
    background: #16213e;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 6px;
    padding: 4px;
    z-index: 200;
    box-shadow: 0 4px 16px rgba(0,0,0,0.5);
  }

  .saved-item {
    display: block;
    width: 100%;
    padding: 6px 10px;
    background: none;
    border: none;
    border-radius: 4px;
    color: #c0c0d0;
    font-size: 12px;
    text-align: left;
    cursor: pointer;
    font-family: inherit;
  }

  .saved-item:hover {
    background: rgba(255,255,255,0.06);
    color: #e0e0e0;
  }

  .empty-message {
    padding: 8px 10px;
    color: #606070;
    font-size: 12px;
    font-style: italic;
  }

  /* Storage Settings panel */
  .storage-settings {
    background: #16213e;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    padding: 12px 16px;
    font-size: 12px;
    color: #a0a0b0;
    flex-shrink: 0;
  }

  .settings-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    font-weight: 600;
    color: #e0e0e0;
  }

  .settings-body p {
    margin: 4px 0;
  }

  .settings-body code {
    background: rgba(255,255,255,0.06);
    padding: 1px 4px;
    border-radius: 3px;
    font-family: ui-monospace, monospace;
  }

  .close-btn {
    background: none;
    border: none;
    color: #606070;
    cursor: pointer;
    font-size: 14px;
    padding: 2px 4px;
    border-radius: 3px;
    line-height: 1;
  }

  .close-btn:hover {
    color: #e0e0e0;
    background: rgba(255,255,255,0.06);
  }
</style>
