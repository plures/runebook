<script lang="ts">
  import { canvasStore } from '../stores/canvas';
  import { loadCanvasFromFile, saveCanvasToYAML } from '../utils/yaml-loader';
  import { saveCanvas, loadCanvas, listCanvases, useLocalStorage, usePluresDB, getCurrentAdapter } from '../utils/storage';
  import type { TerminalNode, InputNode, DisplayNode, TransformNode } from '../types/canvas';

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

<div class="toolbar">
  <div class="toolbar-section">
    <h3>Add Nodes</h3>
    <button onclick={addTerminalNode} class="toolbar-btn">
      ⚡ Terminal
    </button>
    <button onclick={addInputNode} class="toolbar-btn">
      📝 Input
    </button>
    <button onclick={addDisplayNode} class="toolbar-btn">
      📊 Display
    </button>
    <button onclick={addTransformNode} class="toolbar-btn">
      🔄 Transform
    </button>
  </div>
  
  <div class="toolbar-section">
    <h3>Canvas</h3>
    <button onclick={loadExample} class="toolbar-btn">
      📂 Load Example
    </button>
    <button onclick={saveCanvasToStorage} class="toolbar-btn">
      💾 Save to Storage
    </button>
    <button onclick={toggleSavedList} class="toolbar-btn">
      📚 Saved Canvases {showSavedList ? '▼' : '▶'}
    </button>
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
    <button onclick={saveCanvasToFile} class="toolbar-btn">
      📥 Export YAML
    </button>
    <button onclick={toggleStorageSettings} class="toolbar-btn">
      ⚙️ Storage Settings {showStorageSettings ? '▼' : '▶'}
    </button>
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
    <button onclick={clearCanvas} class="toolbar-btn danger">
      🗑️ Clear
    </button>
  </div>
</div>

<style>
  .toolbar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    width: 200px;
    background: #252526;
    border-right: 1px solid #3e3e42;
    padding: 16px;
    overflow-y: auto;
    z-index: 1000;
  }

  .toolbar-section {
    margin-bottom: 24px;
  }

  .toolbar-section h3 {
    color: #cccccc;
    font-size: 12px;
    text-transform: uppercase;
    margin: 0 0 12px 0;
    font-weight: 600;
  }

  .toolbar-btn {
    width: 100%;
    padding: 10px;
    margin-bottom: 8px;
    background: #3a3a3a;
    color: #e0e0e0;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    text-align: left;
    transition: background-color 0.2s;
  }

  .toolbar-btn:hover {
    background: #4a4a4a;
  }

  .toolbar-btn.danger {
    background: #5a1e1e;
  }

  .toolbar-btn.danger:hover {
    background: #7a2e2e;
  }

  .saved-list {
    margin-top: 8px;
    margin-bottom: 8px;
    max-height: 200px;
    overflow-y: auto;
    border: 1px solid #3e3e42;
    border-radius: 4px;
    background: #1e1e1e;
  }

  .saved-item {
    width: 100%;
    padding: 8px 10px;
    background: transparent;
    color: #e0e0e0;
    border: none;
    border-bottom: 1px solid #3e3e42;
    cursor: pointer;
    font-size: 12px;
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
    background: #2a2a2a;
  }

  .saved-time {
    font-size: 10px;
    color: #888;
  }

  .empty-message {
    padding: 12px;
    text-align: center;
    color: #888;
    font-size: 12px;
  }

  .storage-settings {
    margin-top: 8px;
    margin-bottom: 8px;
    padding: 8px;
    border: 1px solid #3e3e42;
    border-radius: 4px;
    background: #1e1e1e;
  }

  .storage-option {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 4px;
    color: #e0e0e0;
    font-size: 12px;
    cursor: pointer;
  }

  .storage-option input[type="radio"] {
    cursor: pointer;
  }

  .storage-info {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid #3e3e42;
    font-size: 11px;
    color: #4ec9b0;
  }
</style>
