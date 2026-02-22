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

<Box variant="node" {tui} style="min-width:320px;max-width:450px;border-color:var(--interactive-accent)">
  <Box variant="header" {tui}>
    <Text variant="normal" as="span" style="font-size:var(--font-size-icon)">🔄</Text>
    <Text variant="normal" as="span" style="font-weight:600;font-size:var(--font-size-base)">{node.label || 'Transform'}</Text>
  </Box>
  
  <Box variant="body" {tui}>
    <div class="control-group">
      <Text variant="muted" as="label" style="display:block;margin-bottom:var(--space-xs)" for="transform-type-{node.id}">Type:</Text>
      <Select
        {tui}
        id="transform-type-{node.id}"
        value={node.transformType}
        options={[
          { value: 'map', label: 'Map' },
          { value: 'filter', label: 'Filter' },
          { value: 'reduce', label: 'Reduce' },
          { value: 'sudolang', label: 'Sudolang (planned)' }
        ]}
        onchange={updateTransformType}
      />
    </div>

    <div class="control-group">
      <Text variant="muted" as="label" style="display:block;margin-bottom:var(--space-xs)" for="code-{node.id}">Code:</Text>
      <textarea
        id="code-{node.id}"
        value={node.code}
        oninput={updateCode}
        placeholder={getPlaceholder(node.transformType)}
        rows="4"
        class="code-area {tui ? 'code-area--tui' : ''}"
      ></textarea>
    </div>

    {#if error}
      <Box variant="inset" {tui} style="background:var(--status-error-bg);margin-top:var(--space-md)">
        <Text variant="error" as="span">{error}</Text>
      </Box>
    {/if}

    {#if isProcessing}
      <Box variant="inset" {tui} style="background:var(--status-processing);margin-top:var(--space-md)">
        <Text variant="warning" as="span">Processing...</Text>
      </Box>
    {:else if output !== ''}
      <Box variant="inset" {tui} style="margin-top:var(--space-md);max-height:150px;overflow-y:auto">
        <Text variant="accent" as="strong" style="display:block;margin-bottom:var(--space-xs);font-size:var(--font-size-sm)">Output:</Text>
        <Text variant="code" as="pre">{typeof output === 'object' ? JSON.stringify(output, null, 2) : String(output)}</Text>
      </Box>
    {/if}
  </Box>
  
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
</Box>

<style>
  .control-group {
    margin-bottom: var(--space-lg);
  }

  .code-area {
    width: 100%;
    padding: var(--space-md);
    background: var(--surface-0);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    resize: vertical;
    box-sizing: border-box;
  }

  .code-area::placeholder {
    color: var(--text-dim);
  }

  .code-area--tui {
    border-radius: 0;
  }

  .ports {
    position: relative;
  }

  .port {
    position: absolute;
    width: var(--port-size);
    height: var(--port-size);
    background: var(--port-bg);
    border: 2px solid var(--port-border);
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
