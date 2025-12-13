/**
 * Storybook Preset for Astro Framework
 * 
 * This preset configures Storybook to work with Astro components by:
 * 1. Setting up the Vite builder with Astro-specific plugins
 * 2. Configuring the custom Astro renderer
 * 3. Adding middleware for server-side rendering via Container API
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import type { FrameworkOptions } from './types/index.js';
import type { InlineConfig } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

/**
 * Get absolute path to a package
 */
function getAbsolutePath<T extends string>(input: T): T {
  return dirname(require.resolve(join(input, 'package.json'))) as T;
}

/**
 * Core Storybook configuration
 */
export const core = {
  builder: getAbsolutePath('@storybook/builder-vite'),
  renderer: join(__dirname, 'renderer'),
};

/**
 * Framework name for Storybook
 */
export const frameworkName = '@anthropic/storybook-astro' as const;

/**
 * Preview annotations - tells Storybook where to find the render functions
 */
export const previewAnnotations = async (input: string[] = []) => {
  return [
    ...input,
    join(__dirname, 'renderer', 'entry-preview.js'),
  ];
};

interface ViteFinalContext {
  presets: {
    apply<T>(preset: string): Promise<T>;
  };
}

/**
 * Vite configuration for Astro support
 */
export async function viteFinal(
  config: InlineConfig,
  { presets }: ViteFinalContext
): Promise<InlineConfig> {
  const frameworkOptions = await presets.apply<FrameworkOptions>('frameworkOptions');
  
  // Dynamic import to avoid bundling issues
  const { createAstroVitePlugins } = await import('./framework/vite-plugins.js');
  
  const astroPlugins = await createAstroVitePlugins(frameworkOptions || {});
  
  const existingPlugins = config.plugins || [];
  const existingOptimizeDeps = config.optimizeDeps || {};
  const existingSsr = config.ssr || {};
  
  return {
    ...config,
    plugins: [...existingPlugins, ...astroPlugins],
    optimizeDeps: {
      ...existingOptimizeDeps,
      include: [
        ...(existingOptimizeDeps.include || []),
        // Pre-bundle CJS modules that Astro depends on
        'cssesc',
        'string-width',
      ],
      exclude: [
        ...(existingOptimizeDeps.exclude || []),
        'astro',
        'astro/container',
      ],
    },
    ssr: {
      ...existingSsr,
      noExternal: [
        ...(Array.isArray(existingSsr.noExternal) ? existingSsr.noExternal : []),
        '@anthropic/storybook-astro',
      ],
    },
  };
}

/**
 * Default export for preset auto-detection
 */
export default {
  core,
  viteFinal,
  frameworkName,
  previewAnnotations,
};
