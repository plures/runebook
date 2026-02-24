<script lang="ts">
  import Canvas from '$lib/components/Canvas.svelte';
  import Toolbar from '$lib/components/Toolbar.svelte';
  import ToastContainer from '$lib/components/ToastContainer.svelte';
  import { toolbarCollapsed } from '$lib/stores/toolbar';

  const tui = false;
  const marginLeft = $derived($toolbarCollapsed ? '52px' : '200px');
</script>

<div class="app">
  <Toolbar {tui} />
  <div class="canvas-wrapper" style:margin-left={marginLeft}>
    <Canvas {tui} />
  </div>
</div>
<ToastContainer />

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    overflow: hidden;
  }

  .app {
    display: flex;
    height: 100vh;
    width: 100vw;
  }

  .canvas-wrapper {
    flex: 1;
    transition: margin-left var(--transition-base);
  }
</style>

