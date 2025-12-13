/**
 * Entry preview for Storybook
 * 
 * This is the entry point that Storybook loads for the preview iframe.
 * It sets up the renderer and any global configuration.
 * 
 * IMPORTANT: This file MUST export `render` and `renderToCanvas` for Storybook to work.
 */

// Re-export the render functions - these are required by Storybook
export { render, renderToCanvas } from './render.js';

// Import the source transformer
import { transformSource } from '../docs/sourceTransformer.js';

// Export parameters for the renderer
export const parameters = {
  renderer: 'astro',
  docs: {
    story: {
      inline: true, // Render inline for better sizing
    },
    source: {
      language: 'astro',
      transform: transformSource,
    },
  },
};

// Import global styles if configured
async function injectGlobalAssets() {
  try {
    // Virtual module - types defined in env.d.ts
    const { stylesheets } = await import('virtual:astro-storybook/styles');
    stylesheets.forEach((href: string) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    });
  } catch {
    // No stylesheets configured
  }

  try {
    // Virtual module - types defined in env.d.ts
    const { scripts } = await import('virtual:astro-storybook/scripts');
    scripts.forEach((src: string) => {
      const script = document.createElement('script');
      script.src = src;
      document.body.appendChild(script);
    });
  } catch {
    // No scripts configured
  }
}

// Execute on load
if (typeof document !== 'undefined') {
  injectGlobalAssets();
}
