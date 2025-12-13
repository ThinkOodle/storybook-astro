import { StorybookConfig as StorybookConfig$1 } from 'storybook/internal/types';
import { BuilderOptions } from '@storybook/builder-vite';
export { t as transformSource } from './sourceTransformer-CsgaPbY9.js';
export { StorybookToolbarOptions, default as storybookDevToolbar } from './integration/index.js';
export { default } from './preset.js';
import 'astro';
import 'vite';

/**
 * Options for the Astro Storybook framework
 */
interface FrameworkOptions {
    /**
     * Path to your Astro config file (auto-detected if not provided)
     */
    configFile?: string;
    /**
     * Global stylesheets to inject into stories
     */
    stylesheets?: string[];
    /**
     * Global scripts to inject into stories
     */
    scripts?: string[];
}
/**
 * Storybook builder options with Vite
 */
interface StorybookConfigFramework {
    name: '@anthropic/storybook-astro';
    options: FrameworkOptions;
}
/**
 * Full Storybook configuration type for Astro projects
 */
interface StorybookConfig extends Omit<StorybookConfig$1, 'framework'> {
    framework: StorybookConfigFramework;
    core?: StorybookConfig$1['core'] & {
        builder?: '@storybook/builder-vite' | BuilderOptions;
    };
}
/**
 * Render request sent from client to server via WebSocket
 */
interface RenderRequestMessage {
    type: 'astro:render:request';
    data: {
        id: string;
        component: string;
        args?: Record<string, unknown>;
        slots?: Record<string, string>;
    };
}
/**
 * Render response sent from server to client via WebSocket
 */
interface RenderResponseMessage {
    type: 'astro:render:response';
    data: {
        id: string;
        html: string;
        error?: string;
    };
}
/**
 * Story meta configuration for Astro components
 */
interface AstroMeta<TComponent = unknown> {
    title: string;
    component: TComponent;
    parameters?: Record<string, unknown>;
    argTypes?: Record<string, unknown>;
    args?: Record<string, unknown>;
    decorators?: unknown[];
    tags?: string[];
}
/**
 * Individual story configuration
 */
interface AstroStory<TArgs = Record<string, unknown>> {
    args?: TArgs;
    slots?: Record<string, string>;
    parameters?: Record<string, unknown>;
    decorators?: unknown[];
    play?: (context: unknown) => Promise<void> | void;
}

export type { AstroMeta, AstroStory, FrameworkOptions, RenderRequestMessage, RenderResponseMessage, StorybookConfig };
