<script lang="ts">
  interface Props {
    tui?: boolean;
    checked?: boolean;
    label?: string;
    class?: string;
    onchange?: (e: Event) => void;
  }

  let {
    tui = false,
    checked = $bindable(false),
    label = '',
    class: cls = '',
    onchange,
  }: Props = $props();
</script>

<label class="dd-toggle {cls}" data-tui={tui}>
  <input
    type="checkbox"
    bind:checked
    {onchange}
    class="dd-toggle__input"
  />
  {#if label}<span class="dd-toggle__label">{label}</span>{/if}
</label>

<style>
  .dd-toggle {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    cursor: pointer;
    color: var(--text-1);
  }

  .dd-toggle__input {
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: var(--brand);
  }

  .dd-toggle__label {
    font-size: var(--font-size-2);
  }
</style>
