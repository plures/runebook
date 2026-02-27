<script lang="ts">
  import { canvasStore } from '../stores/canvas';
  import { loadCanvasFromFile, saveCanvasToYAML } from '../utils/yaml-loader';
  import { saveCanvas, loadCanvas, listCanvases, useLocalStorage, usePluresDB, getCurrentAdapter } from '../utils/storage';
  import type { TerminalNode, InputNode, DisplayNode, TransformNode } from '../types/canvas';
  import StatusBar from '../design-dojo/StatusBar.svelte';
  import Button from '../design-dojo/Button.svelte';
  import { toast } from '../stores/toast.svelte';
  import { toolbarStore } from '../stores/toolbar.svelte';

  interface Props {
    tui?: boolean;
  }

  let { tui = false }: Props = $props();

  let savedCanvases = $state<{ id: string; name: string; timestamp: number }[]>([]);
  let showSavedList = $state(false);
  let showStorageSettings = $state(false);
  let currentStorageType = $state<'localStorage' | 'pluresdb'>('localStorage');

  const collapsed = $derived(toolbarStore.collapsed);

  // Load list of saved canvases on mount
  $effect(() => {
    listCanvases().then(list => {
      savedCanvases = list;
    });
  });

  function addTerminalNode() {
    const node: TerminalNode = {
      id: `terminal-${Date.now()}`,
      type: 'terminal',
      position: { x: 100, y: 100 },
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
      position: { x: 100, y: 300 },
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
      position: { x: 500, y: 200 },
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
      position: { x: 300, y: 200 },
      label: 'Transform',
      transformType: 'map',
      code: 'item',
      inputs: [{ id: 'input', name: 'input', type: 'input' }],
      outputs: [{ id: 'output', name: 'output', type: 'output' }]
    };
    canvasStore.addNode(node);
  }

  async function loadExample() {
    try {
      const canvas = await loadCanvasFromFile('/examples/hello-world.yaml');
      canvasStore.loadCanvas(canvas);
    } catch (error) {
      console.error('Failed to load example:', error);
      toast.error('Failed to load example canvas');
    }
  }

  async function saveCanvasToStorage() {
    try {
      const canvas = $canvasStore;
      await saveCanvas(canvas);
      // Refresh the list
      savedCanvases = await listCanvases();
      toast.success(`Canvas "${canvas.name}" saved successfully!`);
    } catch (error) {
      console.error('Failed to save canvas:', error);
      toast.error('Failed to save canvas');
    }
  }

  async function loadCanvasFromStorage(id: string) {
    try {
      const canvas = await loadCanvas(id);
      if (canvas) {
        canvasStore.loadCanvas(canvas);
        showSavedList = false;
      } else {
        toast.warning('Canvas not found');
      }
    } catch (error) {
      console.error('Failed to load canvas:', error);
      toast.error('Failed to load canvas');
    }
  }

  function toggleSavedList() {
    showSavedList = !showSavedList;
  }

  function toggleStorageSettings() {
    showStorageSettings = !showStorageSettings;
  }

  async function switchStorageType(type: 'localStorage' | 'pluresdb') {
    try {
      if (type === 'pluresdb') {
        usePluresDB();
        currentStorageType = 'pluresdb';
        toast.info('Switched to PluresDB storage. Make sure PluresDB server is running.');
      } else {
        useLocalStorage();
        currentStorageType = 'localStorage';
        toast.info('Switched to LocalStorage (browser storage).');
      }
      // Refresh the list
      savedCanvases = await listCanvases();
    } catch (error) {
      console.error('Failed to switch storage type:', error);
      toast.error('Failed to switch storage type. Using LocalStorage as fallback.');
      useLocalStorage();
      currentStorageType = 'localStorage';
    }
  }

  function saveCanvasToFile() {
    const canvas = $canvasStore;
    const yaml = saveCanvasToYAML(canvas);
    
    // Create a download link
    const blob = new Blob([yaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${canvas.name.replace(/\s+/g, '-').toLowerCase()}.yaml`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function clearCanvas() {
    if (confirm('Are you sure you want to clear the canvas?')) {
      canvasStore.clear();
    }
  }

  function toggleCollapse() {
    toolbarStore.toggle();
  }
</script>

<StatusBar {tui} width={collapsed ? '52px' : '200px'}>
  <div class="toolbar-inner" class:collapsed>
    <!-- Toggle button -->
    <button
      class="collapse-toggle"
      onclick={toggleCollapse}
      title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    >
      {collapsed ? '▶' : '◀'}
    </button>

    <!-- Canvas name -->
    {#if !collapsed}
      <div class="canvas-name">{$canvasStore.name}</div>
    {/if}

    <div class="toolbar-section">
      {#if !collapsed}<h3>Add Nodes</h3>{/if}
      <Button {tui} onclick={addTerminalNode} class="toolbar-btn" title="Add Terminal node">
        <span class="btn-icon" aria-hidden="true">⚡</span><span class="btn-text"> Terminal</span>
      </Button>
      <Button {tui} onclick={addInputNode} class="toolbar-btn" title="Add Input node">
        <span class="btn-icon" aria-hidden="true">📝</span><span class="btn-text"> Input</span>
      </Button>
      <Button {tui} onclick={addDisplayNode} class="toolbar-btn" title="Add Display node">
        <span class="btn-icon" aria-hidden="true">📊</span><span class="btn-text"> Display</span>
      </Button>
      <Button {tui} onclick={addTransformNode} class="toolbar-btn" title="Add Transform node">
        <span class="btn-icon" aria-hidden="true">🔄</span><span class="btn-text"> Transform</span>
      </Button>
    </div>
    
    <div class="toolbar-section">
      {#if !collapsed}<h3>Canvas</h3>{/if}
      <Button {tui} onclick={loadExample} class="toolbar-btn" title="Load Example canvas">
        <span class="btn-icon" aria-hidden="true">📂</span><span class="btn-text"> Load Example</span>
      </Button>
      <Button {tui} onclick={saveCanvasToStorage} class="toolbar-btn" title="Save canvas to storage">
        <span class="btn-icon" aria-hidden="true">💾</span><span class="btn-text"> Save to Storage</span>
      </Button>
      <Button {tui} onclick={toggleSavedList} class="toolbar-btn" title="Show saved canvases">
        <span class="btn-icon" aria-hidden="true">📚</span><span class="btn-text"> Saved Canvases {showSavedList ? '▼' : '▶'}</span>
      </Button>
      {#if showSavedList && !collapsed}
        <div class="saved-list">
          {#if savedCanvases.length === 0}
            <div class="empty-message">No saved canvases</div>
          {:else}
            {#each savedCanvases as saved}
              <button 
                onclick={() => loadCanvasFromStorage(saved.id)} 
                class="saved-item"
              >
                {saved.name}
                <span class="saved-time">
                  {new Date(saved.timestamp).toLocaleDateString()}
                </span>
              </button>
            {/each}
          {/if}
        </div>
      {/if}
      <Button {tui} onclick={saveCanvasToFile} class="toolbar-btn" title="Export canvas as YAML">
        <span class="btn-icon" aria-hidden="true">📥</span><span class="btn-text"> Export YAML</span>
      </Button>
      <Button {tui} onclick={toggleStorageSettings} class="toolbar-btn" title="Storage settings">
        <span class="btn-icon" aria-hidden="true">⚙️</span><span class="btn-text"> Storage Settings {showStorageSettings ? '▼' : '▶'}</span>
      </Button>
      {#if showStorageSettings && !collapsed}
        <div class="storage-settings">
          <label class="storage-option">
            <input 
              type="radio" 
              name="storage" 
              value="localStorage"
              checked={currentStorageType === 'localStorage'}
              onchange={() => switchStorageType('localStorage')}
            />
            Browser Storage
          </label>
          <label class="storage-option">
            <input 
              type="radio" 
              name="storage" 
              value="pluresdb"
              checked={currentStorageType === 'pluresdb'}
              onchange={() => switchStorageType('pluresdb')}
            />
            PluresDB (P2P)
          </label>
          <div class="storage-info">
            Current: {currentStorageType === 'pluresdb' ? 'PluresDB' : 'Browser Storage'}
          </div>
        </div>
      {/if}
      <Button {tui} variant="danger" onclick={clearCanvas} class="toolbar-btn" title="Clear canvas">
        <span class="btn-icon" aria-hidden="true">🗑️</span><span class="btn-text"> Clear</span>
      </Button>
    </div>
  </div>
</StatusBar>

<style>
  .toolbar-inner {
    padding: var(--space-2) var(--space-2);
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .collapse-toggle {
    align-self: flex-end;
    background: var(--surface-3);
    border: 1px solid var(--border-color);
    color: var(--text-2);
    cursor: pointer;
    border-radius: var(--radius-2);
    padding: 2px 6px;
    font-size: var(--font-size-0);
    margin-bottom: var(--space-2);
    transition: background var(--transition-fast), color var(--transition-fast);
    flex-shrink: 0;
  }

  .collapse-toggle:hover {
    background: var(--surface-4);
    color: var(--text-1);
  }

  .canvas-name {
    font-size: var(--font-size-1);
    font-weight: 600;
    color: var(--text-1);
    margin-bottom: var(--space-3);
    padding: 0 var(--space-1);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .toolbar-section {
    margin-bottom: var(--space-4);
  }

  .toolbar-section h3 {
    color: var(--text-2);
    font-size: var(--font-size-0);
    text-transform: uppercase;
    margin: 0 0 var(--space-3) 0;
    font-weight: 600;
    letter-spacing: 0.06em;
  }

  :global(.toolbar-btn) {
    width: 100%;
    margin-bottom: var(--space-2);
    text-align: left;
  }

  /* In collapsed mode, center the icon and hide text */
  .collapsed :global(.toolbar-btn) {
    width: 36px;
    min-width: 36px;
    padding: var(--space-2);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .collapsed .btn-text {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .collapsed .toolbar-section h3 {
    display: none;
  }

  .saved-list {
    margin-top: var(--space-2);
    margin-bottom: var(--space-2);
    max-height: 200px;
    overflow-y: auto;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-2);
    background: var(--surface-1);
  }

  .saved-item {
    width: 100%;
    padding: var(--space-2) var(--space-3);
    background: transparent;
    color: var(--text-1);
    border: none;
    border-bottom: 1px solid var(--border-color);
    cursor: pointer;
    font-size: var(--font-size-0);
    text-align: left;
    transition: background-color var(--transition-base);
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .saved-item:last-child {
    border-bottom: none;
  }

  .saved-item:hover {
    background: var(--surface-2);
  }

  .saved-time {
    font-size: var(--font-size-0);
    color: var(--text-3);
  }

  .empty-message {
    padding: var(--space-3);
    text-align: center;
    color: var(--text-3);
    font-size: var(--font-size-0);
  }

  .storage-settings {
    margin-top: var(--space-2);
    margin-bottom: var(--space-2);
    padding: var(--space-2);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-2);
    background: var(--surface-1);
  }

  .storage-option {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-1);
    color: var(--text-1);
    font-size: var(--font-size-0);
    cursor: pointer;
  }

  .storage-option input[type="radio"] {
    cursor: pointer;
  }

  .storage-info {
    margin-top: var(--space-2);
    padding-top: var(--space-2);
    border-top: 1px solid var(--border-color);
    font-size: var(--font-size-0);
    color: var(--brand);
  }

  .btn-icon {
    flex-shrink: 0;
  }
</style>

