import { AstroIntegration } from 'astro';

/**
 * Astro Integration for Storybook Dev Toolbar App
 *
 * Adds a Storybook icon to the Astro dev toolbar that links to the running Storybook instance.
 */

interface StorybookToolbarOptions {
    /**
     * The port Storybook is running on
     * @default 6006
     */
    port?: number;
    /**
     * The host Storybook is running on
     * @default 'localhost'
     */
    host?: string;
}
/**
 * Astro integration that adds a Storybook link to the dev toolbar
 */
declare function storybookDevToolbar(options?: StorybookToolbarOptions): AstroIntegration;

export { type StorybookToolbarOptions, storybookDevToolbar as default, storybookDevToolbar };
