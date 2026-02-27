<script lang="ts">
  import Canvas from '$lib/components/Canvas.svelte';
  import CommandBar from '$lib/components/CommandBar.svelte';
  import TitleBar from '$lib/components/TitleBar.svelte';
  import SettingsPanel from '$lib/components/SettingsPanel.svelte';
  import HelpPanel from '$lib/components/HelpPanel.svelte';
  import { canvasStore } from '$lib/stores/canvas';
  import { saveCanvas } from '$lib/utils/storage';
  import { settingsStore } from '$lib/stores/settings';
  import { onMount } from 'svelte';

  const tui = false;

  let settingsOpen = $state(false);
  let helpOpen = $state(false);
  let helpView = $state<'shortcuts' | 'about'>('shortcuts');

  function openHelp(view: 'shortcuts' | 'about') {
    helpView = view;
    helpOpen = true;
  }

  onMount(() => {
    settingsStore.init();
  });

  // Auto-save to LocalStorage whenever the canvas changes (debounced 1 s)
  let autoSaveTimer: ReturnType<typeof setTimeout> | undefined;
  let hasInitializedAutoSave = false;
  $effect(() => {
    const canvas = $canvasStore;

    const cleanup = () => {
      if (autoSaveTimer !== undefined) {
        clearTimeout(autoSaveTimer);
      }
    };

    // Clear any pending auto-save timer on every effect run
    cleanup();

    // Skip scheduling auto-save on the very first effect run
    if (!hasInitializedAutoSave) {
      hasInitializedAutoSave = true;
      return cleanup;
    }

    autoSaveTimer = setTimeout(() => {
      saveCanvas(canvas).catch((e: unknown) => console.error('Auto-save failed:', e));
    }, 1000);

    return cleanup;
  });
</script>

<TitleBar {tui} />

<div class="app">
  <CommandBar
    {tui}
    onOpenSettings={() => { settingsOpen = true; }}
    onOpenHelp={openHelp}
  />
  <div class="canvas-wrapper">
    <Canvas {tui} />
  </div>
</div>

<SettingsPanel
  open={settingsOpen}
  onclose={() => { settingsOpen = false; }}
  {tui}
/>

<HelpPanel
  open={helpOpen}
  bind:view={helpView}
  onclose={() => { helpOpen = false; }}
  {tui}
/>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    overflow: hidden;
  }

  .app {
    display: flex;
    flex-direction: column;
    height: calc(100vh - 40px);
    width: 100vw;
    margin-top: 40px;
  }

  .canvas-wrapper {
    flex: 1;
    min-height: 0;
  }
</style>
