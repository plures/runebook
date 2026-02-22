<!-- Table: data table with design tokens and tui support -->
<script lang="ts">
  interface Props {
    tui?: boolean;
    data?: any[];
    class?: string;
  }

  let { tui = false, data = [], class: cls = '' }: Props = $props();

  const headers = $derived(data.length > 0 ? Object.keys(data[0]) : []);
</script>

<div class="dojo-table-wrap {tui ? 'dojo-table-wrap--tui' : ''} {cls}">
  <table class="dojo-table">
    {#if headers.length > 0}
      <thead>
        <tr>
          {#each headers as key}
            <th>{key}</th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each data as row}
          <tr>
            {#each Object.values(row) as value}
              <td>{value}</td>
            {/each}
          </tr>
        {/each}
      </tbody>
    {:else}
      <tbody>
        <tr><td>No table data</td></tr>
      </tbody>
    {/if}
  </table>
</div>

<style>
  .dojo-table-wrap {
    overflow-x: auto;
  }

  .dojo-table {
    width: 100%;
    border-collapse: collapse;
    background: var(--surface-0);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-sm);
  }

  .dojo-table :global(th),
  .dojo-table :global(td) {
    padding: var(--space-md);
    text-align: left;
    border-bottom: 1px solid var(--border-default);
    font-size: var(--font-size-sm);
    color: var(--text-primary);
  }

  .dojo-table :global(th) {
    background: var(--surface-3);
    font-weight: 600;
    color: var(--text-secondary);
  }

  .dojo-table :global(tr:last-child td) {
    border-bottom: none;
  }

  .dojo-table-wrap--tui .dojo-table {
    border-radius: 0;
    font-family: var(--font-mono);
  }
</style>
