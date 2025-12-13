import type { StorybookConfig as StorybookConfigBase } from 'storybook/internal/types';
import type { BuilderOptions } from '@storybook/builder-vite';

/**
 * Options for the Astro Storybook framework
 */
export interface FrameworkOptions {
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
export interface StorybookConfigFramework {
  name: '@anthropic/storybook-astro';
  options: FrameworkOptions;
}

/**
 * Full Storybook configuration type for Astro projects
 */
export interface StorybookConfig extends Omit<StorybookConfigBase, 'framework'> {
  framework: StorybookConfigFramework;
  core?: StorybookConfigBase['core'] & {
    builder?: '@storybook/builder-vite' | BuilderOptions;
  };
}

/**
 * Render request sent from client to server via WebSocket
 */
export interface RenderRequestMessage {
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
export interface RenderResponseMessage {
  type: 'astro:render:response';
  data: {
    id: string;
    html: string;
    error?: string;
  };
}

/**
 * Astro component factory type marker
 */
export interface AstroComponentFactory {
  isAstroComponentFactory: true;
  moduleId?: string;
}

/**
 * Story meta configuration for Astro components
 */
export interface AstroMeta<TComponent = unknown> {
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
export interface AstroStory<TArgs = Record<string, unknown>> {
  args?: TArgs;
  slots?: Record<string, string>;
  parameters?: Record<string, unknown>;
  decorators?: unknown[];
  play?: (context: unknown) => Promise<void> | void;
}

/**
 * Promise wrapper for render requests (used for WebSocket communication)
 */
export interface RenderPromise {
  resolve: (data: RenderResponseMessage['data']) => void;
  reject: (error: Error) => void;
  timeoutId: ReturnType<typeof setTimeout>;
}
