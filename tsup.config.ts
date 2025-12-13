import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    preset: 'src/preset.ts',
    'renderer/index': 'src/renderer/index.ts',
    'renderer/entry-preview': 'src/renderer/entry-preview.ts',
    'integration/index': 'src/integration/index.ts',
    'integration/toolbar-app': 'src/integration/toolbar-app.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: [
    'astro',
    'astro/container',
    'astro/config',
    'astro/toolbar',
    'storybook',
    'storybook/internal/preview-api',
    'storybook/internal/types',
    'vite',
    /^@storybook\//,
    /^virtual:/,
  ],
  noExternal: ['ts-dedent'],
  treeshake: true,
});
