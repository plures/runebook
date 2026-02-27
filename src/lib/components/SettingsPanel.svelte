<script lang="ts">
  import { settingsStore, FONT_FAMILIES } from '../stores/settings';
  import { useLocalStorage, usePluresDB } from '../utils/storage';
  import Button from '../design-dojo/Button.svelte';
  import Toggle from '../design-dojo/Toggle.svelte';

  interface Props {
    open: boolean;
    onclose: () => void;
    tui?: boolean;
  }

  let { open, onclose, tui = false }: Props = $props();

  let s = $derived($settingsStore);

  function setFont(e: Event) {
    settingsStore.patch({ fontFamily: (e.target as HTMLSelectElement).value });
  }

  function setFontSize(e: Event) {
    settingsStore.patch({ fontSize: Number((e.target as HTMLInputElement).value) });
  }

  function setTheme(e: Event) {
    settingsStore.patch({ theme: (e.target as HTMLSelectElement).value as 'dark' | 'light' | 'auto' });
  }

  function setGridSize(e: Event) {
    settingsStore.patch({ gridSize: Number((e.target as HTMLInputElement).value) });
  }

  async function switchStorage(type: 'localStorage' | 'pluresdb') {
    try {
      if (type === 'pluresdb') {
        usePluresDB();
      } else {
        useLocalStorage();
      }
      settingsStore.patch({ storageType: type });
    } catch {
      useLocalStorage();
      settingsStore.patch({ storageType: 'localStorage' });
    }
  }

  function handleBackdropKey(e: KeyboardEvent) {
    if (open && e.key === 'Escape') onclose();
  }
</script>

<svelte:window onkeydown={handleBackdropKey} />

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="settings-backdrop" onclick={onclose}></div>

  <aside class="settings-panel" aria-label="Settings" data-tui={tui}>
    <div class="settings-header">
      <h2 class="settings-title">Settings</h2>
      <Button {tui} onclick={onclose} class="settings-close">✕</Button>
    </div>

    <div class="settings-body">
      <!-- Font -->
      <section class="settings-section">
        <h3 class="settings-section-title">Font</h3>

        <label class="settings-label" for="font-family">Font Family</label>
        <select
          id="font-family"
          class="settings-select"
          value={s.fontFamily}
          onchange={setFont}
        >
          {#each FONT_FAMILIES as f}
            <option value={f.value}>{f.label}</option>
          {/each}
        </select>

        <label class="settings-label" for="font-size">
          Font Size <span class="settings-value">{s.fontSize}px</span>
        </label>
        <input
          id="font-size"
          class="settings-range"
          type="range"
          min="10"
          max="20"
          value={s.fontSize}
          oninput={setFontSize}
        />
      </section>

      <!-- Theme -->
      <section class="settings-section">
        <h3 class="settings-section-title">Theme</h3>
        <label class="settings-label" for="theme">Color Theme</label>
        <select
          id="theme"
          class="settings-select"
          value={s.theme}
          onchange={setTheme}
        >
          <option value="dark">Dark</option>
          <option value="light" disabled>Light (coming soon)</option>
          <option value="auto" disabled>Auto (coming soon)</option>
        </select>
      </section>

      <!-- Grid -->
      <section class="settings-section">
        <h3 class="settings-section-title">Canvas Grid</h3>

        <Toggle
          {tui}
          checked={s.showGrid}
          label="Show dot grid"
          onchange={(e) => settingsStore.patch({ showGrid: (e.target as HTMLInputElement).checked })}
        />

        {#if s.showGrid}
          <label class="settings-label" for="grid-size">
            Grid Size <span class="settings-value">{s.gridSize}px</span>
          </label>
          <input
            id="grid-size"
            class="settings-range"
            type="range"
            min="8"
            max="64"
            step="4"
            value={s.gridSize}
            oninput={setGridSize}
          />
        {/if}

        <Toggle
          {tui}
          checked={s.snapToGrid}
          label="Snap to grid"
          onchange={(e) => settingsStore.patch({ snapToGrid: (e.target as HTMLInputElement).checked })}
        />
      </section>

      <!-- Storage -->
      <section class="settings-section">
        <h3 class="settings-section-title">Storage</h3>
        <label class="storage-option">
          <input
            type="radio"
            name="settings-storage"
            value="localStorage"
            checked={s.storageType === 'localStorage'}
            onchange={() => switchStorage('localStorage')}
          />
          Browser Storage
        </label>
        <label class="storage-option">
          <input
            type="radio"
            name="settings-storage"
            value="pluresdb"
            checked={s.storageType === 'pluresdb'}
            onchange={() => switchStorage('pluresdb')}
          />
          PluresDB (P2P)
        </label>
        <div class="storage-current">
          Current: {s.storageType === 'pluresdb' ? 'PluresDB' : 'Browser Storage'}
        </div>
      </section>
    </div>
  </aside>
{/if}

<style>
  .settings-backdrop {
    position: fixed;
    inset: 0;
    z-index: 800;
    background: rgba(0, 0, 0, 0.4);
  }

  .settings-panel {
    position: fixed;
    top: 40px;
    right: 0;
    bottom: 0;
    width: 300px;
    z-index: 801;
    background: var(--surface-2);
    border-left: 1px solid var(--border-color-strong);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .settings-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-3) var(--space-2);
    border-bottom: 1px solid var(--border-color);
    flex-shrink: 0;
  }

  .settings-title {
    margin: 0;
    font-size: var(--font-size-3);
    color: var(--text-1);
  }

  :global(.settings-close) {
    padding: var(--space-1) var(--space-2) !important;
  }

  .settings-body {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-3);
  }

  .settings-section {
    margin-bottom: var(--space-5);
  }

  .settings-section-title {
    margin: 0 0 var(--space-3) 0;
    font-size: var(--font-size-0);
    text-transform: uppercase;
    color: var(--text-2);
    font-weight: 600;
    letter-spacing: 0.05em;
  }

  .settings-label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: var(--font-size-1);
    color: var(--text-1);
    margin-bottom: var(--space-1);
    margin-top: var(--space-3);
  }

  .settings-label:first-of-type {
    margin-top: 0;
  }

  .settings-value {
    color: var(--brand);
    font-size: var(--font-size-0);
    font-family: var(--font-mono);
  }

  .settings-select {
    width: 100%;
    padding: var(--space-2);
    background: var(--surface-1);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-2);
    color: var(--text-1);
    font-size: var(--font-size-1);
  }

  .settings-select:focus {
    outline: none;
    border-color: var(--brand);
  }

  .settings-range {
    width: 100%;
    accent-color: var(--brand);
    cursor: pointer;
    margin-bottom: var(--space-2);
  }

  .storage-option {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-1);
    color: var(--text-1);
    font-size: var(--font-size-1);
    cursor: pointer;
  }

  .storage-option input[type='radio'] {
    cursor: pointer;
    accent-color: var(--brand);
  }

  .storage-current {
    margin-top: var(--space-2);
    padding-top: var(--space-2);
    border-top: 1px solid var(--border-color);
    font-size: var(--font-size-0);
    color: var(--brand);
  }
</style>
