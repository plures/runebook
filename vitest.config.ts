import { defineConfig } from 'vitest/config';
import { compile, compileModule } from 'svelte/compiler';

// Minimal svelte transform plugin for vitest (avoids hot-update issues in vite 5)
const svelteTransformPlugin = {
  name: 'vitest-svelte-transform',
  transform(code: string, id: string) {
    // Handle .svelte component files
    if (id.endsWith('.svelte')) {
      const result = compile(code, {
        filename: id,
        generate: 'client',
        dev: false,
      });
      return {
        code: result.js.code,
        map: result.js.map,
      };
    }
    // Handle .svelte.js and .svelte.ts module files (runes outside components)
    if (id.endsWith('.svelte.js') || id.endsWith('.svelte.ts')) {
      const result = compileModule(code, {
        filename: id,
        generate: 'client',
        dev: false,
      });
      return {
        code: result.js.code,
        map: result.js.map,
      };
    }
    return undefined;
  },
};

export default defineConfig({
  plugins: [svelteTransformPlugin],
  resolve: {
    conditions: ['browser', 'module', 'import', 'default'],
  },
  test: {
    globals: true,
    environment: 'node',
    // Use happy-dom for component tests (provides browser APIs for Svelte rendering)
    // All other tests use the default node environment
    environmentMatchGlobs: [
      ['**/components/__tests__/**', 'happy-dom'],
    ],
    include: ['src/**/*.{test,spec}.{js,ts}'],
    server: {
      deps: {
        inline: [
          '@testing-library/svelte',
          '@testing-library/svelte-core',
        ],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src-tauri/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/__tests__/**',
      ],
    },
  },
});

