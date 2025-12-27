<script lang="ts">
  import type { TransformNode } from '../types/canvas';
  import { canvasStore, nodeDataStore, getNodeInputData, updateNodeData } from '../stores/canvas';

  interface Props {
    node: TransformNode;
  }

  let { node }: Props = $props();

  let output = $state<any>('');
  let error = $state<string>('');
  let isProcessing = $state(false);

  // Subscribe to node data changes and apply transformation
  $effect(() => {
    const canvas = $canvasStore;
    const nodeData = $nodeDataStore;
    
    // Get input data from connected nodes
    if (node.inputs.length > 0) {
      const inputData = getNodeInputData(node.id, node.inputs[0].id, canvas.connections, nodeData);
      if (inputData !== undefined) {
        applyTransform(inputData);
      }
    }
  });

  async function applyTransform(inputData: any) {
    if (!node.code.trim()) {
      output = inputData;
      updateNodeData(node.id, 'output', inputData);
      return;
    }

    isProcessing = true;
    error = '';

    try {
      let result: any;

      switch (node.transformType) {
        case 'map':
          // Execute JavaScript map function
          if (Array.isArray(inputData)) {
            const mapFn = new Function('item', 'index', `return ${node.code}`);
            result = inputData.map((item, index) => mapFn(item, index));
          } else {
            error = 'Map transform requires array input';
            return;
          }
          break;

        case 'filter':
          // Execute JavaScript filter function
          if (Array.isArray(inputData)) {
            const filterFn = new Function('item', 'index', `return ${node.code}`);
            result = inputData.filter((item, index) => filterFn(item, index));
          } else {
            error = 'Filter transform requires array input';
            return;
          }
          break;

        case 'reduce':
          // Execute JavaScript reduce function
          if (Array.isArray(inputData)) {
            const reduceFn = new Function('acc', 'item', 'index', `return ${node.code}`);
            result = inputData.reduce((acc, item, index) => reduceFn(acc, item, index));
          } else {
            error = 'Reduce transform requires array input';
            return;
          }
          break;

        case 'sudolang':
          // Sudolang is not implemented yet - just pass through
          result = inputData;
          error = 'Sudolang transform not yet implemented';
          break;

        default:
          result = inputData;
      }

      output = result;
      updateNodeData(node.id, 'output', result);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      output = '';
    } finally {
      isProcessing = false;
    }
  }

  function updateCode(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    canvasStore.updateNode(node.id, { code: target.value });
  }

  function updateTransformType(event: Event) {
    const target = event.target as HTMLSelectElement;
    const newType = target.value as TransformNode['transformType'];
    canvasStore.updateNode(node.id, { transformType: newType });
  }

  function getPlaceholder(type: TransformNode['transformType']): string {
    switch (type) {
      case 'map':
        return 'item * 2';
      case 'filter':
        return 'item > 10';
      case 'reduce':
        return 'acc + item';
      case 'sudolang':
        return '// Sudolang code';
      default:
        return '';
    }
  }
</script>

<div class="transform-node">
  <div class="node-header">
    <span class="node-icon">🔄</span>
    <span class="node-title">{node.label || 'Transform'}</span>
  </div>
  
  <div class="node-body">
    <div class="control-group">
      <label for="transform-type-{node.id}">Type:</label>
      <select 
        id="transform-type-{node.id}"
        value={node.transformType}
        onchange={updateTransformType}
      >
        <option value="map">Map</option>
        <option value="filter">Filter</option>
        <option value="reduce">Reduce</option>
        <option value="sudolang">Sudolang (planned)</option>
      </select>
    </div>

    <div class="control-group">
      <label for="code-{node.id}">Code:</label>
      <textarea
        id="code-{node.id}"
        value={node.code}
        oninput={updateCode}
        placeholder={getPlaceholder(node.transformType)}
        rows="4"
      ></textarea>
    </div>

    {#if error}
      <div class="error-message">{error}</div>
    {/if}

    {#if isProcessing}
      <div class="status processing">Processing...</div>
    {:else if output !== ''}
      <div class="output-preview">
        <strong>Output:</strong>
        <pre>{typeof output === 'object' ? JSON.stringify(output, null, 2) : String(output)}</pre>
      </div>
    {/if}
  </div>
  
  <!-- Input and output ports -->
  <div class="ports">
    {#each node.inputs as port}
      <div class="port input-port" data-port-id={port.id}>
        <span class="port-label">{port.name}</span>
      </div>
    {/each}
    
    {#each node.outputs as port}
      <div class="port output-port" data-port-id={port.id}>
        <span class="port-label">{port.name}</span>
      </div>
    {/each}
  </div>
</div>

<style>
  .transform-node {
    background: #2d2d2d;
    border: 2px solid #ce9178;
    border-radius: 8px;
    min-width: 320px;
    max-width: 450px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    color: #e0e0e0;
  }

  .node-header {
    background: #3a3a3a;
    padding: 8px 12px;
    border-bottom: 1px solid #4a4a4a;
    display: flex;
    align-items: center;
    gap: 8px;
    border-radius: 6px 6px 0 0;
  }

  .node-icon {
    font-size: 18px;
  }

  .node-title {
    font-weight: 600;
    font-size: 14px;
  }

  .node-body {
    padding: 12px;
  }

  .control-group {
    margin-bottom: 12px;
  }

  label {
    display: block;
    margin-bottom: 4px;
    font-size: 12px;
    color: #cccccc;
  }

  select {
    width: 100%;
    padding: 6px 8px;
    background: #1e1e1e;
    border: 1px solid #4a4a4a;
    border-radius: 4px;
    color: #e0e0e0;
    font-size: 13px;
  }

  textarea {
    width: 100%;
    padding: 8px;
    background: #1e1e1e;
    border: 1px solid #4a4a4a;
    border-radius: 4px;
    color: #e0e0e0;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    resize: vertical;
  }

  textarea::placeholder {
    color: #888;
  }

  .error-message {
    background: #5a1e1e;
    padding: 8px;
    border-radius: 4px;
    font-size: 12px;
    margin-top: 8px;
    color: #ff6b6b;
  }

  .status {
    padding: 8px;
    border-radius: 4px;
    font-size: 12px;
    margin-top: 8px;
  }

  .processing {
    background: #3a3a1e;
    color: #f0db4f;
  }

  .output-preview {
    background: #1e1e1e;
    padding: 8px;
    border-radius: 4px;
    margin-top: 8px;
    max-height: 150px;
    overflow-y: auto;
  }

  .output-preview strong {
    display: block;
    margin-bottom: 4px;
    font-size: 12px;
    color: #4ec9b0;
  }

  .output-preview pre {
    margin: 0;
    font-family: 'Courier New', monospace;
    font-size: 11px;
    color: #d4d4d4;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .ports {
    position: relative;
  }

  .port {
    position: absolute;
    width: 12px;
    height: 12px;
    background: #4ec9b0;
    border: 2px solid #2d2d2d;
    border-radius: 50%;
    cursor: crosshair;
  }

  .input-port {
    left: -8px;
    top: 50%;
    transform: translateY(-50%);
  }

  .output-port {
    right: -8px;
    top: 50%;
    transform: translateY(-50%);
  }

  .port-label {
    display: none;
  }
</style>
