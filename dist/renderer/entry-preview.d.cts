export { r as render, a as renderToCanvas } from '../render-BR-BGSWL.cjs';
import { t as transformSource } from '../sourceTransformer-CsgaPbY9.cjs';

/**
 * Entry preview for Storybook
 *
 * This is the entry point that Storybook loads for the preview iframe.
 * It sets up the renderer and any global configuration.
 *
 * IMPORTANT: This file MUST export `render` and `renderToCanvas` for Storybook to work.
 */

declare const parameters: {
    renderer: string;
    docs: {
        story: {
            inline: boolean;
        };
        source: {
            language: string;
            transform: typeof transformSource;
        };
    };
};

export { parameters };
