<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';
  import { invoke } from '@tauri-apps/api/core';

  interface Props {
    data: {
      label: string;
      command: string;
      args: string[];
      env: Record<string, string>;
      cwd: string;
    };
  }

  let { data }: Props = $props();

  let output = $state<string[]>([]);
  let isRunning = $state(false);
  let error = $state<string | null>(null);
  let outputEl: HTMLDivElement | undefined = $state();

  async function executeCommand() {
    if (isRunning || !data.command.trim()) return;
    isRunning = true;
    error = null;

    const parts = data.command.trim().split(/\s+/);
    const cmd = parts[0];
    const args = parts.slice(1);

    output = [...output, `$ ${data.command}`];

    try {
      const result = await invoke<string>('execute_terminal_command', {
        command: cmd,
        args,
        env: data.env || {},
        cwd: data.cwd || ''
      });

      if (result) {
        output = [...output, result];
      }
    } catch (e) {
      const errorMsg = String(e);
      error = errorMsg;
      output = [...output, `Error: ${errorMsg}`];
    } finally {
      isRunning = false;
      requestAnimationFrame(() => {
        if (outputEl) outputEl.scrollTop = outputEl.scrollHeight;
      });
    }
  }

  function clear() {
    output = [];
    error = null;
  }
</script>

<Handle type="target" position={Position.Left} />

<div class="node-wrapper node-shell terminal-node">
  <div class="title-bar">
    <div class="dots">
      <span class="dot dot-red"></span>
      <span class="dot dot-yellow"></span>
      <span class="dot dot-green"></span>
    </div>
    <span class="node-title">{data.label || 'Terminal'}</span>
    <button class="clear-btn" onclick={clear} title="Clear output">Clear</button>
  </div>

  <div class="command-display">
    <code>$ {data.command}</code>
  </div>

  <div class="terminal-body" bind:this={outputEl}>
    {#if output.length === 0}
      <div class="output-placeholder">No output yet</div>
    {:else}
      {#each output as line}
        <pre class="output-line">{line}</pre>
      {/each}
    {/if}
  </div>

  <div class="action-bar">
    <button class="run-btn" onclick={executeCommand} disabled={isRunning} title="Run command">
      {isRunning ? 'Running…' : 'Run'}
    </button>
    <div class="output-port" title="Output port">
      <span class="port-label">▶</span>
      <Handle type="source" position={Position.Right} />
    </div>
  </div>
</div>

<style>
  .node-wrapper.node-shell {
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.1);
    background: #16213e;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    overflow: hidden;
    min-width: 320px;
    font-family: 'JetBrains Mono', 'Cascadia Code', 'Fira Code', ui-monospace, monospace;
  }

  .title-bar {
    display: flex;
    align-items: center;
    height: 32px;
    padding: 0 10px;
    background: #0f1729;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    user-select: none;
    gap: 8px;
  }

  .dots {
    display: flex;
    gap: 6px;
  }

  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }

  .dot-red { background: #ff5f57; }
  .dot-yellow { background: #febc2e; }
  .dot-green { background: #28c840; }

  .node-title {
    flex: 1;
    text-align: center;
    font-size: 11px;
    color: #606070;
    font-weight: 500;
  }

  .command-display {
    padding: 6px 10px;
    background: #0a0f1a;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    font-size: 12px;
  }

  .command-display code {
    color: #00d4ff;
    font-family: inherit;
  }

  .terminal-body {
    padding: 8px 10px;
    min-height: 80px;
    max-height: 300px;
    overflow-y: auto;
    background: #0d1117;
    font-size: 12px;
    line-height: 1.5;
  }

  .output-placeholder {
    color: #3a3a4a;
    font-size: 12px;
    font-style: italic;
    padding: 12px 0;
  }

  .output-line {
    margin: 0;
    padding: 0;
    color: #c9d1d9;
    white-space: pre-wrap;
    word-break: break-all;
    font-family: inherit;
    font-size: inherit;
  }

  .action-bar {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    background: #0f1729;
    border-top: 1px solid rgba(255,255,255,0.06);
  }

  .run-btn {
    padding: 4px 12px;
    background: #28c840;
    border: none;
    border-radius: 4px;
    color: #0a0f1a;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    font-family: inherit;
  }

  .run-btn:hover:not(:disabled) {
    background: #34d952;
  }

  .run-btn:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .clear-btn {
    background: none;
    border: none;
    color: #606070;
    cursor: pointer;
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 3px;
    font-family: inherit;
  }

  .clear-btn:hover {
    color: #e0e0e0;
    background: rgba(255,255,255,0.06);
  }

  .output-port {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 4px;
    position: relative;
  }

  .port-label {
    font-size: 9px;
    color: rgba(0,212,255,0.7);
    letter-spacing: 0.5px;
    line-height: 1;
  }

  /* Scrollbar */
  .terminal-body::-webkit-scrollbar {
    width: 6px;
  }
  .terminal-body::-webkit-scrollbar-track {
    background: transparent;
  }
  .terminal-body::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.1);
    border-radius: 3px;
  }
</style>
