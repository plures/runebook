<script lang="ts">
  import Canvas from '$lib/components/Canvas.svelte';
  import Toolbar from '$lib/components/Toolbar.svelte';
  import TitleBar from '$lib/components/TitleBar.svelte';
  import SettingsPanel from '$lib/components/SettingsPanel.svelte';
  import HelpPanel from '$lib/components/HelpPanel.svelte';
  import ToastContainer from '$lib/components/ToastContainer.svelte';
  import { settingsStore } from '$lib/stores/settings';
  import { toolbarStore } from '$lib/stores/toolbar';
  import { onMount } from 'svelte';

  const tui = false;
  const marginLeft = $derived(toolbarStore.collapsed ? '52px' : '200px');

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
</script>

<TitleBar {tui} />

<div class="app">
  <Toolbar
    {tui}
    onOpenSettings={() => { settingsOpen = true; }}
    onOpenHelp={openHelp}
  />
  <div class="canvas-wrapper" style:margin-left={marginLeft}>
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
    margin-top: 40px;
  }

  .canvas-wrapper {
    flex: 1;
    transition: margin-left var(--transition-base);
  }
</style>
