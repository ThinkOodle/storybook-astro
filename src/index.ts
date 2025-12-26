/**
 * storybook-astro
 * 
 * Storybook framework for rendering Astro components directly in Storybook.
 * Uses Astro's Container API to server-side render .astro files.
 * 
 * @example
 * ```ts
 * // .storybook/main.ts
 * import type { StorybookConfig } from 'storybook-astro';
 * 
 * const config: StorybookConfig = {
 *   stories: ['../src/**\/*.stories.@(ts|tsx|js|jsx)'],
 *   framework: {
 *     name: 'storybook-astro',
 *     options: {
 *       stylesheets: ['/src/styles/global.css'],
 *     },
 *   },
 * };
 * 
 * export default config;
 * ```
 */

export type {
  StorybookConfig,
  FrameworkOptions,
  AstroMeta,
  AstroStory,
  RenderRequestMessage,
  RenderResponseMessage,
} from './types/index.js';

// Export source transformer for docs
export { transformSource } from './docs/sourceTransformer.js';

// Export Astro integration for dev toolbar
export { storybookDevToolbar } from './integration/index.js';
export type { StorybookToolbarOptions } from './integration/index.js';

// Re-export preset for framework auto-detection
export { default } from './preset.js';
