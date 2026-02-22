<script lang="ts">
  import { canvasStore } from '../stores/canvas';
  import { loadCanvasFromFile, saveCanvasToYAML } from '../utils/yaml-loader';
  import { saveCanvas, loadCanvas, listCanvases, useLocalStorage, usePluresDB, getCurrentAdapter } from '../utils/storage';
  import type { TerminalNode, InputNode, DisplayNode, TransformNode } from '../types/canvas';
  import StatusBar from '../design-dojo/StatusBar.svelte';
  import Button from '../design-dojo/Button.svelte';

  interface Props {
    tui?: boolean;
  }

  let { tui = false }: Props = $props();

  let savedCanvases = $state<{ id: string; name: string; timestamp: number }[]>([]);
  let showSavedList = $state(false);
  let showStorageSettings = $state(false);
  let currentStorageType = $state<'localStorage' | 'pluresdb'>('localStorage');

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
      alert('Failed to load example canvas');
    }
  }

  async function saveCanvasToStorage() {
    try {
      const canvas = $canvasStore;
      await saveCanvas(canvas);
      // Refresh the list
      savedCanvases = await listCanvases();
      alert(`Canvas "${canvas.name}" saved successfully!`);
    } catch (error) {
      console.error('Failed to save canvas:', error);
      alert('Failed to save canvas');
    }
  }

  async function loadCanvasFromStorage(id: string) {
    try {
      const canvas = await loadCanvas(id);
      if (canvas) {
        canvasStore.loadCanvas(canvas);
        showSavedList = false;
      } else {
        alert('Canvas not found');
      }
    } catch (error) {
      console.error('Failed to load canvas:', error);
      alert('Failed to load canvas');
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
        alert('Switched to PluresDB storage. Make sure PluresDB server is running.');
      } else {
        useLocalStorage();
        currentStorageType = 'localStorage';
        alert('Switched to LocalStorage (browser storage).');
      }
      // Refresh the list
      savedCanvases = await listCanvases();
    } catch (error) {
      console.error('Failed to switch storage type:', error);
      alert('Failed to switch storage type. Using LocalStorage as fallback.');
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
</script>

<StatusBar {tui}>
  <div class="toolbar-section">
    <h3>Add Nodes</h3>
    <Button variant="secondary" onclick={addTerminalNode} {tui} class="toolbar-btn">
      ⚡ Terminal
    </Button>
    <Button variant="secondary" onclick={addInputNode} {tui} class="toolbar-btn">
      📝 Input
    </Button>
    <Button variant="secondary" onclick={addDisplayNode} {tui} class="toolbar-btn">
      📊 Display
    </Button>
    <Button variant="secondary" onclick={addTransformNode} {tui} class="toolbar-btn">
      🔄 Transform
    </Button>
  </div>
  
  <div class="toolbar-section">
    <h3>Canvas</h3>
    <Button variant="secondary" onclick={loadExample} {tui} class="toolbar-btn">
      📂 Load Example
    </Button>
    <Button variant="secondary" onclick={saveCanvasToStorage} {tui} class="toolbar-btn">
      💾 Save to Storage
    </Button>
    <Button variant="secondary" onclick={toggleSavedList} {tui} class="toolbar-btn">
      📚 Saved Canvases {showSavedList ? '▼' : '▶'}
    </Button>
    {#if showSavedList}
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
    <Button variant="secondary" onclick={saveCanvasToFile} {tui} class="toolbar-btn">
      📥 Export YAML
    </Button>
    <Button variant="secondary" onclick={toggleStorageSettings} {tui} class="toolbar-btn">
      ⚙️ Storage Settings {showStorageSettings ? '▼' : '▶'}
    </Button>
    {#if showStorageSettings}
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
    <Button variant="danger" onclick={clearCanvas} {tui} class="toolbar-btn">
      🗑️ Clear
    </Button>
  </div>
</StatusBar>

<style>
  .toolbar-section {
    margin-bottom: 24px;
  }

  .toolbar-section h3 {
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
    text-transform: uppercase;
    margin: 0 0 var(--space-lg) 0;
    font-weight: 600;
  }

  :global(.toolbar-btn) {
    width: 100%;
    margin-bottom: var(--space-md);
    text-align: left;
  }

  .saved-list {
    margin-top: var(--space-md);
    margin-bottom: var(--space-md);
    max-height: 200px;
    overflow-y: auto;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    background: var(--surface-0);
  }

  .saved-item {
    width: 100%;
    padding: var(--space-md) 10px;
    background: transparent;
    color: var(--text-primary);
    border: none;
    border-bottom: 1px solid var(--border-subtle);
    cursor: pointer;
    font-size: var(--font-size-sm);
    text-align: left;
    transition: background-color 0.2s;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .saved-item:last-child {
    border-bottom: none;
  }

  .saved-item:hover {
    background: var(--surface-2);
  }

  .saved-time {
    font-size: 10px;
    color: var(--text-dim);
  }

  .empty-message {
    padding: var(--space-lg);
    text-align: center;
    color: var(--text-dim);
    font-size: var(--font-size-sm);
  }

  .storage-settings {
    margin-top: var(--space-md);
    margin-bottom: var(--space-md);
    padding: var(--space-md);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-sm);
    background: var(--surface-0);
  }

  .storage-option {
    display: flex;
    align-items: center;
    gap: var(--space-md);
    padding: var(--space-sm) var(--space-xs);
    color: var(--text-primary);
    font-size: var(--font-size-sm);
    cursor: pointer;
  }

  .storage-option input[type="radio"] {
    cursor: pointer;
  }

  .storage-info {
    margin-top: var(--space-md);
    padding-top: var(--space-md);
    border-top: 1px solid var(--border-subtle);
    font-size: var(--font-size-xs);
    color: var(--text-accent);
  }
</style>
