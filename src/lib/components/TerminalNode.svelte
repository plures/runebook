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

  let commandInput = $state(data.command || '');
  let output = $state<string[]>([]);
  let isRunning = $state(false);
  let error = $state<string | null>(null);
  let outputEl: HTMLDivElement | undefined = $state();

  async function executeCommand() {
    if (isRunning || !commandInput.trim()) return;
    isRunning = true;
    error = null;

    // Parse command + args from the input
    const parts = commandInput.trim().split(/\s+/);
    const cmd = parts[0];
    const args = parts.slice(1);

    // Show the command in output like a real terminal
    output = [...output, `$ ${commandInput}`];

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
      output = [...output, `✗ ${errorMsg}`];
    } finally {
      isRunning = false;
      commandInput = '';
      // Scroll to bottom
      requestAnimationFrame(() => {
        if (outputEl) outputEl.scrollTop = outputEl.scrollHeight;
      });
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeCommand();
    }
  }

  function clear() {
    output = [];
    error = null;
  }
</script>

<Handle type="target" position={Position.Left} />

<div class="node-shell terminal-shell">
  <div class="title-bar">
    <div class="dots">
      <span class="dot dot-red"></span>
      <span class="dot dot-yellow"></span>
      <span class="dot dot-green"></span>
    </div>
    <span class="title">{data.label || 'Terminal'}</span>
    <button class="clear-btn" type="button" aria-label="Clear" onclick={clear} title="Clear">⌫</button>
  </div>

  <div
    class="error-live"
    role="alert"
    aria-live="assertive"
    aria-atomic="true"
  >{error ?? ''}</div>

  <div class="terminal-body" bind:this={outputEl}>
    {#each output as line}
      <pre class="output-line" class:error-line={line.startsWith('✗ ')}>{line}</pre>
    {/each}

    <div class="prompt-line">
      <span class="prompt">$</span>
      <input
        class="command-input"
        type="text"
        bind:value={commandInput}
        onkeydown={handleKeydown}
        placeholder={isRunning ? 'running...' : 'type a command...'}
        disabled={isRunning}
        spellcheck="false"
        autocomplete="off"
      />
    </div>
  </div>
</div>

<Handle type="source" position={Position.Right} />

<style>
  .node-shell {
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

  .title {
    flex: 1;
    text-align: center;
    font-size: 11px;
    color: #606070;
    font-weight: 500;
  }

  .clear-btn {
    background: none;
    border: none;
    color: #606070;
    cursor: pointer;
    font-size: 14px;
    padding: 2px 4px;
    border-radius: 3px;
  }

  .clear-btn:hover {
    color: #e0e0e0;
    background: rgba(255,255,255,0.06);
  }

  .terminal-body {
    padding: 8px 10px;
    min-height: 120px;
    max-height: 400px;
    overflow-y: auto;
    background: #0d1117;
    font-size: 12px;
    line-height: 1.5;
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

  .prompt-line {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 2px;
  }

  .prompt {
    color: #28c840;
    font-weight: 600;
    flex-shrink: 0;
  }

  .command-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: #e0e0e0;
    font-family: inherit;
    font-size: inherit;
    caret-color: #00d4ff;
    padding: 0;
  }

  .command-input::placeholder {
    color: #3a3a4a;
  }

  .command-input:disabled {
    opacity: 0.5;
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

  .error-live {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }

  .error-line {
    color: #ff5f57;
  }
</style>
