<script lang="ts">
  import type { TransformNode } from '../types/canvas';
  import { canvasStore, nodeDataStore, getNodeInputData, updateNodeData } from '../stores/canvas';
  import Box from '../design-dojo/Box.svelte';
  import Select from '../design-dojo/Select.svelte';
  import Text from '../design-dojo/Text.svelte';

  interface Props {
    node: TransformNode;
    tui?: boolean;
  }

  let { node, tui = false }: Props = $props();

  let output = $state<any>('');
  let error = $state<string>('');
  let isProcessing = $state(false);

  // Subscribe to node data changes and apply transformation
  $effect(() => {
    const canvas = $canvasStore;
    const nodeData = $nodeDataStore;
    
    // Get input data from connected nodes
    if (node.inputs && node.inputs.length > 0) {
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
            // Note: Using Function constructor allows user-defined transformations
            // This is intended for local use only. Do not use with untrusted input.
            const mapFn = new Function('item', 'index', `"use strict"; return (${node.code})`);
            result = inputData.map((item, index) => mapFn(item, index));
          } else {
            error = 'Map transform requires array input';
            return;
          }
          break;

        case 'filter':
          // Execute JavaScript filter function
          if (Array.isArray(inputData)) {
            const filterFn = new Function('item', 'index', `"use strict"; return (${node.code})`);
            result = inputData.filter((item, index) => filterFn(item, index));
          } else {
            error = 'Filter transform requires array input';
            return;
          }
          break;

        case 'reduce':
          // Execute JavaScript reduce function
          if (Array.isArray(inputData)) {
            if (inputData.length === 0) {
              error = 'Reduce transform requires non-empty array';
              return;
            }
            const reduceFn = new Function('acc', 'item', 'index', `"use strict"; return (${node.code})`);
            // Provide initial value of 0 for safety
            result = inputData.reduce((acc, item, index) => reduceFn(acc, item, index), 0);
          } else {
            error = 'Reduce transform requires array input';
            return;
          }
          break;

        case 'sudolang':
          // Sudolang is not implemented yet - just pass through
          result = inputData;
          error = 'Sudolang transform not yet implemented - passing through data';
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

<Box class="transform-node" surface={2} border radius={3} shadow={2} style="border-color: var(--accent)" {tui}>
  <Box class="node-header" surface={3} {tui}>
    <span class="node-icon">🔄</span>
    <Text class="node-title">{node.label || 'Transform'}</Text>
  </Box>
  
  <Box class="node-body" pad={3}>
    <div class="control-group">
      <label for="transform-type-{node.id}">Type:</label>
      <Select
        {tui}
        id="transform-type-{node.id}"
        value={node.transformType}
        onchange={updateTransformType}
      >
        <option value="map">Map</option>
        <option value="filter">Filter</option>
        <option value="reduce">Reduce</option>
        <option value="sudolang">Sudolang (planned)</option>
      </Select>
    </div>

    <div class="control-group">
      <label for="code-{node.id}">Code:</label>
      <textarea
        id="code-{node.id}"
        value={node.code}
        oninput={updateCode}
        placeholder={getPlaceholder(node.transformType)}
        rows="4"
        class="code-textarea"
      ></textarea>
    </div>

    {#if error}
      <Box class="error-message" surface={1} pad={2} radius={2}>
        <Text class="error-text">{error}</Text>
      </Box>
    {/if}

    {#if isProcessing}
      <Box class="status-processing" surface={1} pad={2} radius={2}>
        <Text variant={2}>Processing...</Text>
      </Box>
    {:else if output !== ''}
      <Box class="output-preview" surface={1} pad={2} radius={2}>
        <Text class="output-label">Output:</Text>
        <Text mono variant={1} class="output-pre">{typeof output === 'object' ? JSON.stringify(output, null, 2) : String(output)}</Text>
      </Box>
    {/if}
  </Box>
  
</Box>

<style>
  :global(.transform-node) {
    width: 100%;
    height: 100%;
  }

  :global(.transform-node .node-header) {
    padding: var(--space-2) var(--space-3);
    border-bottom: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    gap: var(--space-2);
    border-radius: var(--radius-3) var(--radius-3) 0 0;
  }

  .node-icon {
    font-size: 18px;
  }

  :global(.transform-node .node-title) {
    font-weight: 600;
    font-size: var(--font-size-1);
  }

  :global(.transform-node .node-body) {
    padding: var(--space-3);
  }

  .control-group {
    margin-bottom: var(--space-3);
  }

  label {
    display: block;
    margin-bottom: var(--space-1);
    font-size: var(--font-size-0);
    color: var(--text-2);
  }

  .code-textarea {
    width: 100%;
    padding: var(--space-2);
    background: var(--surface-1);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-2);
    color: var(--text-1);
    font-family: var(--font-mono);
    font-size: var(--font-size-0);
    resize: vertical;
    box-sizing: border-box;
  }

  .code-textarea::placeholder {
    color: var(--text-3);
  }

  .code-textarea:focus {
    outline: none;
    border-color: var(--brand);
  }

  :global(.transform-node .error-message) {
    margin-top: var(--space-2);
    border: 1px solid var(--error);
  }

  :global(.transform-node .error-text) {
    font-size: var(--font-size-0);
    color: var(--error);
  }

  :global(.transform-node .status-processing) {
    margin-top: var(--space-2);
  }

  :global(.transform-node .output-preview) {
    margin-top: var(--space-2);
    max-height: 150px;
    overflow-y: auto;
  }

  :global(.transform-node .output-label) {
    display: block;
    margin-bottom: var(--space-1);
    font-size: var(--font-size-0);
    font-weight: 600;
    color: var(--brand);
  }

  :global(.transform-node .output-pre) {
    display: block;
    font-size: var(--font-size-0);
    white-space: pre-wrap;
    word-break: break-word;
  }


</style>
