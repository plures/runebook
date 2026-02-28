<script lang="ts">
  interface Props {
    tui?: boolean;
    type?: string;
    value?: any;
    placeholder?: string;
    min?: number;
    max?: number;
    step?: number;
    class?: string;
    oninput?: (e: Event) => void;
    onchange?: (e: Event) => void;
  }

  let {
    tui = false,
    type = 'text',
    value = $bindable(''),
    placeholder = '',
    min,
    max,
    step,
    class: cls = '',
    oninput,
    onchange,
  }: Props = $props();
</script>

<input
  class="dd-input {cls}"
  {type}
  bind:value
  {placeholder}
  {min}
  {max}
  {step}
  {oninput}
  {onchange}
  data-tui={tui}
/>

<style>
  .dd-input {
    width: 100%;
    padding: var(--space-2);
    background: var(--surface-1);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-2);
    color: var(--text-1);
    font-size: var(--font-size-2);
    box-sizing: border-box;
  }

  .dd-input:focus {
    outline: none;
    border-color: var(--brand);
  }

  .dd-input[type='range'] {
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;
  }
</style>
