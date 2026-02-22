<!-- Select: styled select element with design tokens and tui support -->
<script lang="ts">
  interface Option {
    value: string;
    label: string;
  }

  interface Props {
    tui?: boolean;
    value?: string;
    options?: Option[];
    id?: string;
    class?: string;
    onchange?: (e: Event) => void;
  }

  let { tui = false, value = $bindable(''), options = [], id, class: cls = '', onchange, ...rest }: Props = $props();
</script>

<select
  class="dojo-select {tui ? 'dojo-select--tui' : ''} {cls}"
  bind:value
  {id}
  {onchange}
  {...rest}
>
  {#each options as opt}
    <option value={opt.value}>{opt.label}</option>
  {/each}
</select>

<style>
  .dojo-select {
    width: 100%;
    padding: var(--space-sm) var(--space-md);
    background: var(--surface-0);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-size: var(--font-size-md);
    cursor: pointer;
  }

  .dojo-select:focus {
    outline: none;
    border-color: var(--interactive-primary);
  }

  .dojo-select--tui {
    border-radius: 0;
    font-family: var(--font-mono);
  }
</style>
