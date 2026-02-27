function createToolbarStore() {
  let _collapsed = $state(false);
  return {
    get collapsed() { return _collapsed; },
    toggle() { _collapsed = !_collapsed; }
  };
}

export const toolbarStore = createToolbarStore();
