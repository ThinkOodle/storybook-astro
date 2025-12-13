import { InlineConfig } from 'vite';

/**
 * Storybook Preset for Astro Framework
 *
 * This preset configures Storybook to work with Astro components by:
 * 1. Setting up the Vite builder with Astro-specific plugins
 * 2. Configuring the custom Astro renderer
 * 3. Adding middleware for server-side rendering via Container API
 */

/**
 * Core Storybook configuration
 */
declare const core: {
    builder: "@storybook/builder-vite";
    renderer: string;
};
/**
 * Framework name for Storybook
 */
declare const frameworkName: "@anthropic/storybook-astro";
/**
 * Preview annotations - tells Storybook where to find the render functions
 */
declare const previewAnnotations: (input?: string[]) => Promise<string[]>;
interface ViteFinalContext {
    presets: {
        apply<T>(preset: string): Promise<T>;
    };
}
/**
 * Vite configuration for Astro support
 */
declare function viteFinal(config: InlineConfig, { presets }: ViteFinalContext): Promise<InlineConfig>;
/**
 * Default export for preset auto-detection
 */
declare const _default: {
    core: {
        builder: "@storybook/builder-vite";
        renderer: string;
    };
    viteFinal: typeof viteFinal;
    frameworkName: "@anthropic/storybook-astro";
    previewAnnotations: (input?: string[]) => Promise<string[]>;
};

export { core, _default as default, frameworkName, previewAnnotations, viteFinal };
