<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  import { onMount } from 'svelte';
  import type { TerminalNode } from '../types/canvas';
  import { updateNodeData } from '../stores/canvas';
  import { captureCommandStart, captureCommandResult, isAgentEnabled } from '../agent/integration';
  import type { TerminalEvent } from '../types/agent';
  import Box from '../design-dojo/Box.svelte';
  import Button from '../design-dojo/Button.svelte';
  import Text from '../design-dojo/Text.svelte';

  interface Props {
    node: TerminalNode;
    tui?: boolean;
  }

  let { node, tui = false }: Props = $props();

  let output = $state<string[]>([]);
  let isRunning = $state(false);
  let error = $state<string | null>(null);

  const MAX_HISTORY = 50;

  // Interactive command input with history
  let commandInput = $state(
    node.command ? `${node.command}${node.args?.length ? ' ' + node.args.join(' ') : ''}` : ''
  );
  let commandHistory = $state<string[]>([]);
  let historyIndex = $state(-1);

  let outputEl: HTMLElement | undefined;

  async function executeCommand() {
    const raw = commandInput.trim();
    if (!raw || isRunning) return;

    // Push to history (deduplicate adjacent duplicates)
    if (commandHistory[0] !== raw) {
      commandHistory = [raw, ...commandHistory].slice(0, MAX_HISTORY);
    }
    historyIndex = -1;

    isRunning = true;
    error = null;

    // Parse command + args from the input string.
    // Note: simple whitespace split — quoted arguments (e.g. echo "hello world")
    // are not supported; the backend receives each token as a separate argument.
    const [cmd, ...args] = raw.split(/\s+/);

    // Capture command start for agent
    let agentEvent: TerminalEvent | null = null;
    if (isAgentEnabled()) {
      agentEvent = await captureCommandStart(cmd, args, node.env || {}, node.cwd || '');
    }

    try {
      const result = await invoke<string>('execute_terminal_command', {
        command: cmd,
        args,
        env: node.env || {},
        cwd: node.cwd || ''
      });

      output = [...output, result];

      if (agentEvent) {
        await captureCommandResult(agentEvent, result, '', 0);
      }

      if (node.outputs.length > 0) {
        updateNodeData(node.id, node.outputs[0].id, result);
      }
    } catch (e) {
      const errorMsg = String(e);
      error = errorMsg;
      if (agentEvent) {
        await captureCommandResult(agentEvent, '', errorMsg, 1);
      }
      console.error('Terminal command error:', e);
    } finally {
      isRunning = false;
      // Auto-scroll output
      if (outputEl) {
        outputEl.scrollTop = outputEl.scrollHeight;
      }
    }
  }

  function handleInputKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      executeCommand();
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (commandHistory.length === 0) return;
      historyIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
      commandInput = commandHistory[historyIndex];
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (historyIndex <= 0) {
        historyIndex = -1;
        commandInput = '';
        return;
      }
      historyIndex -= 1;
      commandInput = commandHistory[historyIndex];
    }
  }

  function clearOutput() {
    output = [];
    error = null;
  }

  onMount(() => {
    if (node.autoStart && node.command) {
      executeCommand();
    }
  });
</script>

<Box class="terminal-node" surface={2} border radius={3} shadow={2} {tui}>
  <Box class="node-header" surface={3} {tui}>
    <span class="node-icon" aria-hidden="true">⚡</span>
    <Text class="node-title">{node.label || 'Terminal'}</Text>
    {#if node.cwd}
      <span class="node-cwd" title="Working directory">{node.cwd}</span>
    {/if}
    <Button
      {tui}
      onclick={clearOutput}
      class="clear-btn-sm"
      aria-label="Clear terminal output"
    >
      ✕
    </Button>
  </Box>

  <div class="output-container" bind:this={outputEl}>
    {#if output.length > 0}
      {#each output as line}
        <pre class="output-line">{line}</pre>
      {/each}
    {:else if !isRunning}
      <Text variant={2} class="output-placeholder">No output yet — type a command below</Text>
    {/if}

    {#if error}
      <pre class="error-line">{error}</pre>
    {/if}

    {#if isRunning}
      <span class="running-cursor" aria-label="Running">▋</span>
    {/if}
  </div>

  <Box class="prompt-bar" surface={3} {tui}>
    <span class="prompt-symbol" aria-hidden="true">$</span>
    <input
      class="command-input"
      type="text"
      bind:value={commandInput}
      onkeydown={handleInputKeydown}
      placeholder="command args…"
      disabled={isRunning}
      autocomplete="off"
      spellcheck={false}
      aria-label="Terminal command input"
    />
    <Button
      {tui}
      variant="primary"
      onclick={executeCommand}
      disabled={isRunning}
      class="run-btn-sm"
      aria-label={isRunning ? 'Command running' : 'Run command'}
    >
      {isRunning ? '⏳' : '▶'}
    </Button>
  </Box>
</Box>

<style>
  :global(.terminal-node) {
    width: 100%;
    height: 100%;
    font-family: var(--font-mono);
    display: flex;
    flex-direction: column;
  }

  :global(.terminal-node .node-header) {
    padding: var(--space-1) var(--space-3);
    border-bottom: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    gap: var(--space-2);
    border-radius: var(--radius-3) var(--radius-3) 0 0;
    flex-shrink: 0;
  }

  .node-icon {
    font-size: 16px;
  }

  :global(.terminal-node .node-title) {
    font-weight: 600;
    font-size: var(--font-size-1);
  }

  .node-cwd {
    font-size: var(--font-size-0);
    color: #4caf50;
    font-family: var(--font-mono);
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  :global(.terminal-node .clear-btn-sm) {
    margin-left: auto;
    padding: 0 var(--space-2) !important;
    height: 22px;
    font-size: 11px !important;
    opacity: 0.5;
  }

  :global(.terminal-node .clear-btn-sm:hover) {
    opacity: 1;
  }

  .output-container {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-2) var(--space-3);
    min-height: 60px;
    background: var(--surface-1, #111827);
  }

  .output-line {
    margin: 0;
    font-size: var(--font-size-0);
    font-family: var(--font-mono);
    white-space: pre-wrap;
    word-break: break-word;
    color: var(--text-1);
    line-height: 1.5;
  }

  .error-line {
    margin: 0;
    font-size: var(--font-size-0);
    font-family: var(--font-mono);
    white-space: pre-wrap;
    word-break: break-word;
    color: var(--error, #f44336);
    line-height: 1.5;
  }

  :global(.terminal-node .output-placeholder) {
    font-style: italic;
    font-size: var(--font-size-0);
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }

  .running-cursor {
    display: inline-block;
    color: #4caf50;
    animation: blink 1s step-start infinite;
    font-size: var(--font-size-0);
    font-family: var(--font-mono);
  }

  :global(.terminal-node .prompt-bar) {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    border-top: 1px solid var(--border-color);
    border-radius: 0 0 var(--radius-3) var(--radius-3);
    flex-shrink: 0;
  }

  .prompt-symbol {
    color: #4caf50;
    font-family: var(--font-mono);
    font-size: var(--font-size-1);
    font-weight: 700;
    flex-shrink: 0;
  }

  .command-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: var(--text-1);
    font-family: var(--font-mono);
    font-size: var(--font-size-0);
    caret-color: #4caf50;
    min-width: 0;
  }

  .command-input::placeholder {
    color: var(--text-3);
  }

  .command-input:disabled {
    opacity: 0.5;
  }

  :global(.terminal-node .run-btn-sm) {
    padding: 0 var(--space-2) !important;
    height: 26px;
    font-size: var(--font-size-0) !important;
    flex-shrink: 0;
  }
</style>
