export { r as render, a as renderToCanvas } from '../render-BR-BGSWL.cjs';

/**
 * Default decorators for Astro Storybook
 *
 * These decorators are automatically applied to all stories.
 */
declare const decorators: unknown[];

/**
 * Astro Storybook Renderer
 *
 * This module is the renderer entry point for Storybook.
 * It exports the render functions that Storybook uses to display components.
 */

declare const parameters: {
    renderer: string;
};

export { decorators, parameters };
