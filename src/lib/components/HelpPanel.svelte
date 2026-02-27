<script lang="ts">
  import Button from '../design-dojo/Button.svelte';

  interface Props {
    open: boolean;
    view: 'shortcuts' | 'about';
    onclose: () => void;
    tui?: boolean;
  }

  let { open, view = $bindable<'shortcuts' | 'about'>('shortcuts'), onclose, tui = false }: Props = $props();

  const shortcuts = [
    { keys: 'Delete / Backspace', description: 'Remove selected node' },
    { keys: 'Ctrl + S',           description: 'Save canvas' },
    { keys: 'Ctrl + N',           description: 'New canvas' },
    { keys: 'Ctrl + Z',           description: 'Undo (coming soon)' },
    { keys: 'Ctrl + Shift + Z',   description: 'Redo (coming soon)' },
    { keys: 'Esc',                description: 'Deselect / close menu' },
    { keys: 'Right-click canvas', description: 'Add node at position' },
    { keys: 'Right-click node',   description: 'Node actions menu' },
  ];

  // __APP_VERSION__ is injected at build time by vite.config.js define
  const version = __APP_VERSION__;

  function handleKey(e: KeyboardEvent) {
    if (!open) return;
    if (e.key === 'Escape') { onclose(); return; }
  }

  function handleTabKeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      view = view === 'shortcuts' ? 'about' : 'shortcuts';
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      view = view === 'about' ? 'shortcuts' : 'about';
    }
  }
</script>

<svelte:window onkeydown={handleKey} />

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="help-backdrop" onclick={onclose}></div>

  <div class="help-dialog" role="dialog" aria-modal="true" aria-label="Help" data-tui={tui}>
    <div class="help-header">
      <div class="help-tabs" role="tablist">
        <button
          class="help-tab"
          class:help-tab--active={view === 'shortcuts'}
          role="tab"
          aria-selected={view === 'shortcuts'}
          tabindex={view === 'shortcuts' ? 0 : -1}
          onclick={() => { view = 'shortcuts'; }}
          onkeydown={handleTabKeydown}
        >⌨️ Shortcuts</button>
        <button
          class="help-tab"
          class:help-tab--active={view === 'about'}
          role="tab"
          aria-selected={view === 'about'}
          tabindex={view === 'about' ? 0 : -1}
          onclick={() => { view = 'about'; }}
          onkeydown={handleTabKeydown}
        >ℹ️ About</button>
      </div>
      <Button {tui} onclick={onclose} class="help-close">✕</Button>
    </div>

    <div class="help-body">
      {#if view === 'shortcuts'}
        <h2 class="help-title">Keyboard Shortcuts</h2>
        <table class="shortcuts-table">
          <thead>
            <tr>
              <th>Keys</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {#each shortcuts as s}
              <tr>
                <td><kbd class="kbd">{s.keys}</kbd></td>
                <td>{s.description}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      {:else}
        <div class="about-content">
          <div class="about-logo">📓</div>
          <h1 class="about-name">RuneBook</h1>
          <p class="about-version">v{version}</p>
          <p class="about-tagline">
            A reactive, canvas-native computing environment that merges
            terminals, notebooks, and web components.
          </p>
          <div class="about-stack">
            Built with <strong>Tauri</strong> + <strong>SvelteKit</strong> + <strong>PluresDB</strong>
          </div>
          <div class="about-links">
            <a
              href="https://github.com/plures/runebook"
              target="_blank"
              rel="noopener noreferrer"
              class="about-link"
            >GitHub</a>
            <a
              href="https://github.com/plures/runebook/blob/main/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
              class="about-link"
            >MIT License</a>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .help-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1200;
    background: rgba(0, 0, 0, 0.5);
  }

  .help-dialog {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 1201;
    width: min(540px, 92vw);
    max-height: 80vh;
    background: var(--surface-2);
    border: 1px solid var(--border-color-strong);
    border-radius: var(--radius-3);
    box-shadow: var(--shadow-3);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .help-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-2) var(--space-3);
    border-bottom: 1px solid var(--border-color);
    flex-shrink: 0;
  }

  .help-tabs {
    display: flex;
    gap: var(--space-2);
  }

  .help-tab {
    padding: var(--space-1) var(--space-3);
    font-size: var(--font-size-1);
    color: var(--text-2);
    border-radius: var(--radius-2);
    cursor: pointer;
    user-select: none;
    transition: background var(--transition-fast), color var(--transition-fast);
    border: none;
    background: transparent;
  }

  .help-tab:hover {
    color: var(--text-1);
    background: var(--surface-3);
  }

  .help-tab--active {
    color: var(--brand);
    background: var(--surface-3);
  }

  :global(.help-close) {
    padding: var(--space-1) var(--space-2) !important;
  }

  .help-body {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-4) var(--space-4) var(--space-5);
  }

  .help-title {
    margin: 0 0 var(--space-4) 0;
    font-size: var(--font-size-3);
    color: var(--text-1);
  }

  .shortcuts-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--font-size-1);
  }

  .shortcuts-table th {
    text-align: left;
    padding: var(--space-2) var(--space-3);
    background: var(--surface-3);
    color: var(--text-2);
    font-weight: 600;
    font-size: var(--font-size-0);
    text-transform: uppercase;
  }

  .shortcuts-table td {
    padding: var(--space-2) var(--space-3);
    border-bottom: 1px solid var(--border-color);
    color: var(--text-1);
    vertical-align: middle;
  }

  .shortcuts-table tr:last-child td {
    border-bottom: none;
  }

  .kbd {
    display: inline-block;
    padding: 1px var(--space-2);
    background: var(--surface-3);
    border: 1px solid var(--border-color-strong);
    border-radius: var(--radius-1);
    font-family: var(--font-mono);
    font-size: var(--font-size-0);
    color: var(--brand);
    white-space: nowrap;
  }

  /* About view */
  .about-content {
    text-align: center;
    padding: var(--space-3) 0;
  }

  .about-logo {
    font-size: 4rem;
    margin-bottom: var(--space-2);
  }

  .about-name {
    margin: 0;
    font-size: var(--font-size-5);
    color: var(--text-1);
  }

  .about-version {
    margin: var(--space-1) 0 var(--space-4);
    font-size: var(--font-size-1);
    color: var(--brand);
    font-family: var(--font-mono);
  }

  .about-tagline {
    max-width: 380px;
    margin: 0 auto var(--space-4);
    font-size: var(--font-size-1);
    color: var(--text-2);
    line-height: 1.6;
  }

  .about-stack {
    margin-bottom: var(--space-4);
    font-size: var(--font-size-1);
    color: var(--text-2);
  }

  .about-stack strong {
    color: var(--brand);
  }

  .about-links {
    display: flex;
    gap: var(--space-3);
    justify-content: center;
  }

  .about-link {
    font-size: var(--font-size-1);
    color: var(--brand);
    text-decoration: none;
    padding: var(--space-1) var(--space-2);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-2);
    transition: border-color var(--transition-fast);
  }

  .about-link:hover {
    border-color: var(--brand);
  }
</style>
