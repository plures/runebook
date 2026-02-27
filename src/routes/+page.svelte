<script lang="ts">
  import Canvas from '$lib/components/Canvas.svelte';
  import CommandBar from '$lib/components/CommandBar.svelte';
  import { canvasStore } from '$lib/stores/canvas';
  import { saveCanvas } from '$lib/utils/storage';

  const tui = false;

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

<div class="app">
  <CommandBar {tui} />
  <div class="canvas-wrapper">
    <Canvas {tui} />
  </div>
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    overflow: hidden;
  }

  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
  }

  .canvas-wrapper {
    flex: 1;
    min-height: 0;
  }
</style>
