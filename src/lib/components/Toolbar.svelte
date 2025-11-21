<script lang="ts">
  import { canvasStore } from '../stores/canvas';
  import { loadCanvasFromFile, saveCanvasToYAML } from '../utils/yaml-loader';
  import type { TerminalNode, InputNode, DisplayNode } from '../types/canvas';

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

  async function loadExample() {
    try {
      const canvas = await loadCanvasFromFile('/examples/hello-world.yaml');
      canvasStore.loadCanvas(canvas);
    } catch (error) {
      console.error('Failed to load example:', error);
      alert('Failed to load example canvas');
    }
  }

  function saveCanvas() {
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
  </div>
  
  <div class="toolbar-section">
    <h3>Canvas</h3>
    <button onclick={loadExample} class="toolbar-btn">
      📂 Load Example
    </button>
    <button onclick={saveCanvas} class="toolbar-btn">
      💾 Save
    </button>
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
</style>
