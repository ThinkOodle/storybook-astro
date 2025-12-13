/**
 * Astro Storybook Renderer
 * 
 * This module is the renderer entry point for Storybook.
 * It exports the render functions that Storybook uses to display components.
 */

// Export render functions - required by Storybook
export { render, renderToCanvas } from './render.js';

// Export parameters
export const parameters = {
  renderer: 'astro',
};

// Export decorators
export { default as decorators } from './decorators.js';
