<script lang="ts">
  import { onMount } from 'svelte';
  import type { Node, Edge } from '@xyflow/svelte';
  import yaml from 'js-yaml';

  interface Props {
    onAddNode: (type: string) => void;
    nodes?: Node[];
    edges?: Edge[];
    onLoad?: (nodes: Node[], edges: Edge[]) => void;
    onClear?: () => void;
  }

  let { onAddNode, nodes = [], edges = [], onLoad, onClear }: Props = $props();

  const CANVAS_NAME = 'Untitled Canvas';
  const STORAGE_PREFIX = 'runebook_sf_canvas_';

  let savedCanvases = $state<{ id: string; name: string; timestamp: number }[]>([]);
  let showSavedList = $state(false);
  let showStorageSettings = $state(false);

  onMount(() => {
    refreshSavedList();
  });

  function refreshSavedList() {
    const canvases: { id: string; name: string; timestamp: number }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        try {
          const item = localStorage.getItem(key);
          if (item) {
            const data = JSON.parse(item);
            canvases.push({ id: data.id, name: data.name, timestamp: data.timestamp });
          }
        } catch { /* skip malformed entries */ }
      }
    }
    savedCanvases = canvases.sort((a, b) => b.timestamp - a.timestamp);
  }

  function saveCanvasToStorage() {
    const id = `canvas-${Date.now()}`;
    const data = { id, name: CANVAS_NAME, nodes, edges, timestamp: Date.now() };
    localStorage.setItem(STORAGE_PREFIX + id, JSON.stringify(data));
    refreshSavedList();
    alert(`Canvas "${CANVAS_NAME}" saved successfully!`);
  }

  function loadCanvasFromStorage(id: string) {
    const item = localStorage.getItem(STORAGE_PREFIX + id);
    if (item) {
      try {
        const data = JSON.parse(item);
        onLoad?.(data.nodes || [], data.edges || []);
        showSavedList = false;
      } catch (e) {
        alert(`Failed to load canvas: ${e instanceof Error ? e.message : 'invalid data'}`);
      }
    } else {
      alert('Canvas not found');
    }
  }

  async function loadExample() {
    const exampleNodes: Node[] = [
      { id: 'terminal-1', type: 'terminal', position: { x: 100, y: 100 }, data: { label: 'Echo Command', command: 'echo', args: ['Hello from RuneBook!'], env: {}, cwd: '' }, style: 'width: 480px;' },
      { id: 'input-1', type: 'input', position: { x: 100, y: 320 }, data: { label: 'User Input', inputType: 'text', value: 'Type something here...' }, style: 'width: 280px;' },
      { id: 'display-1', type: 'display', position: { x: 650, y: 100 }, data: { label: 'Terminal Output', displayType: 'text', content: '' }, style: 'width: 360px;' },
      { id: 'display-2', type: 'display', position: { x: 650, y: 320 }, data: { label: 'Input Display', displayType: 'text', content: '' }, style: 'width: 360px;' }
    ];
    const exampleEdges: Edge[] = [
      { id: 'e-t1-d1', source: 'terminal-1', target: 'display-1', animated: true, style: 'stroke: #00d4ff; stroke-width: 2px;' },
      { id: 'e-i1-d2', source: 'input-1', target: 'display-2', animated: true, style: 'stroke: #00d4ff; stroke-width: 2px;' }
    ];
    onLoad?.(exampleNodes, exampleEdges);
  }

  function saveCanvasToFile() {
    const data = { name: CANVAS_NAME, nodes, edges };
    const yamlContent = yaml.dump(data, { indent: 2, lineWidth: 120 });
    const blob = new Blob([yamlContent], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${CANVAS_NAME.replace(/\s+/g, '-').toLowerCase()}.yaml`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function clearCanvas() {
    if (confirm('Are you sure you want to clear the canvas?')) {
      onClear?.();
    }
  }

  function toggleSavedList() {
    showSavedList = !showSavedList;
    if (showSavedList) {
      showStorageSettings = false;
      refreshSavedList();
    }
  }

  function toggleStorageSettings() {
    showStorageSettings = !showStorageSettings;
    if (showStorageSettings) showSavedList = false;
  }
</script>

<div class="command-bar-wrapper">
  <div class="command-bar">
    <div class="bar-left">
      <span class="logo">◇ RuneBook</span>
    </div>
    <div class="bar-center">
      <button class="toolbar-btn add-btn" onclick={() => onAddNode('terminal')} title="Add Terminal">
        <span class="btn-icon">⚡</span> Terminal
      </button>
      <button class="toolbar-btn add-btn" onclick={() => onAddNode('input')} title="Add Input">
        <span class="btn-icon">📝</span> Input
      </button>
      <button class="toolbar-btn add-btn" onclick={() => onAddNode('transform')} title="Add Transform">
        <span class="btn-icon">🔄</span> Transform
      </button>
      <button class="toolbar-btn add-btn" onclick={() => onAddNode('display')} title="Add Display">
        <span class="btn-icon">📊</span> Display
      </button>
      <span class="hint">Drag handles to connect · Scroll to zoom</span>
    </div>
    <div class="bar-right">
      <button class="toolbar-btn" onclick={loadExample} title="Load Example Canvas">
        📂 Load Example
      </button>
      <button class="toolbar-btn" onclick={saveCanvasToStorage} title="Save to Storage">
        💾 Save to Storage
      </button>
      <button class="toolbar-btn" onclick={toggleSavedList} title="Browse Saved Canvases">
        📚 Saved Canvases {showSavedList ? '▼' : '▶'}
      </button>
      <button class="toolbar-btn" onclick={saveCanvasToFile} title="Export Canvas as JSON">
        📥 Export YAML
      </button>
      <button class="toolbar-btn" onclick={toggleStorageSettings} title="Storage Settings">
        ⚙️ Storage Settings {showStorageSettings ? '▼' : '▶'}
      </button>
      <button class="toolbar-btn dd-btn--danger" onclick={clearCanvas} title="Clear Canvas">
        🗑️ Clear
      </button>
    </div>
  </div>

  {#if showSavedList}
    <div class="saved-list">
      {#if savedCanvases.length === 0}
        <div class="empty-message">No saved canvases</div>
      {:else}
        {#each savedCanvases as saved}
          <button class="saved-item" onclick={() => loadCanvasFromStorage(saved.id)}>
            {saved.name}
            <span class="saved-time">{new Date(saved.timestamp).toLocaleDateString()}</span>
          </button>
        {/each}
      {/if}
    </div>
  {/if}

  {#if showStorageSettings}
    <div class="storage-settings">
      <span class="storage-info">Storage: Browser (localStorage)</span>
    </div>
  {/if}
</div>

<style>
  .command-bar-wrapper {
    position: relative;
    flex-shrink: 0;
    z-index: 100;
  }

  .command-bar {
    display: flex;
    align-items: center;
    height: 40px;
    padding: 0 12px;
    background: #16213e;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    gap: 8px;
    -webkit-app-region: drag;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .command-bar::-webkit-scrollbar {
    display: none;
  }

  .bar-left {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    -webkit-app-region: drag;
  }

  .logo {
    font-weight: 700;
    font-size: 14px;
    color: #00d4ff;
    letter-spacing: 0.5px;
    white-space: nowrap;
    margin-right: 8px;
  }

  .bar-center {
    display: flex;
    gap: 4px;
    align-items: center;
    -webkit-app-region: no-drag;
    flex-shrink: 0;
  }

  .hint {
    font-size: 11px;
    color: rgba(160, 160, 176, 0.5);
    margin-left: 8px;
    white-space: nowrap;
    pointer-events: none;
  }

  .bar-right {
    display: flex;
    gap: 4px;
    margin-left: auto;
    -webkit-app-region: no-drag;
    flex-shrink: 0;
  }

  .toolbar-btn {
    display: flex;
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

  .toolbar-btn:active {
    background: rgba(0,212,255,0.1);
    border-color: #00d4ff;
    color: #00d4ff;
  }

  .dd-btn--danger {
    border-color: rgba(255, 80, 80, 0.3);
    color: #ff6060;
  }

  .dd-btn--danger:hover {
    background: rgba(255, 80, 80, 0.15);
    border-color: rgba(255, 80, 80, 0.6);
    color: #ff8080;
  }

  .btn-icon {
    font-size: 13px;
  }

  .saved-list {
    position: absolute;
    right: 0;
    top: 40px;
    min-width: 240px;
    max-height: 240px;
    overflow-y: auto;
    background: #16213e;
    border: 1px solid rgba(255,255,255,0.12);
    border-top: none;
    border-radius: 0 0 8px 8px;
    z-index: 200;
    box-shadow: 0 8px 24px rgba(0,0,0,0.4);
  }

  .saved-item {
    width: 100%;
    padding: 8px 12px;
    background: transparent;
    color: #c0c0d0;
    border: none;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    cursor: pointer;
    font-size: 12px;
    text-align: left;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-family: inherit;
    transition: background 120ms ease;
  }

  .saved-item:last-child {
    border-bottom: none;
  }

  .saved-item:hover {
    background: rgba(255,255,255,0.06);
  }

  .saved-time {
    font-size: 10px;
    color: #606070;
    margin-left: 8px;
  }

  .empty-message {
    padding: 12px;
    text-align: center;
    color: #606070;
    font-size: 12px;
  }

  .storage-settings {
    position: absolute;
    right: 0;
    top: 40px;
    min-width: 200px;
    padding: 10px 14px;
    background: #16213e;
    border: 1px solid rgba(255,255,255,0.12);
    border-top: none;
    border-radius: 0 0 8px 8px;
    z-index: 200;
    box-shadow: 0 8px 24px rgba(0,0,0,0.4);
  }

  .storage-info {
    font-size: 12px;
    color: #a0a0b0;
  }
</style>
