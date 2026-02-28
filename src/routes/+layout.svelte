<script lang="ts">
  import "@plures/design-dojo/tokens.css";
</script>

<slot />

<style>
  :global(html, body) {
    margin: 0;
    padding: 0;
    font-family: var(--font-sans);
    background: var(--surface-1);
    color: var(--text-1);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    overflow: hidden;
    height: 100%;
  }

  :global(*, *::before, *::after) {
    box-sizing: border-box;
  }

  :global(::selection) {
    background: var(--brand);
    color: var(--surface-1);
  }

  :global(::-webkit-scrollbar) {
    width: 6px;
    height: 6px;
  }

  :global(::-webkit-scrollbar-track) {
    background: transparent;
  }

  :global(::-webkit-scrollbar-thumb) {
    background: var(--text-3);
    border-radius: 3px;
  }

  :global(::-webkit-scrollbar-thumb:hover) {
    background: var(--text-2);
  }
</style>
