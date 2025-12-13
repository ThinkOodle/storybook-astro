/// <reference types="vite/client" />

/**
 * Type declarations for virtual modules and Vite environment
 */

declare module 'virtual:astro-storybook/styles' {
  export const stylesheets: string[];
}

declare module 'virtual:astro-storybook/scripts' {
  export const scripts: string[];
}

declare module 'virtual:astro-storybook/components' {
  export const components: Record<string, () => Promise<{ default: unknown }>>;
}

// Augment ImportMeta for Vite HMR
interface ImportMeta {
  readonly hot?: {
    readonly data: Record<string, unknown>;
    accept(): void;
    accept(cb: (mod: unknown) => void): void;
    accept(dep: string, cb: (mod: unknown) => void): void;
    accept(deps: readonly string[], cb: (mods: unknown[]) => void): void;
    dispose(cb: (data: Record<string, unknown>) => void): void;
    decline(): void;
    invalidate(): void;
    on(event: string, cb: (...args: unknown[]) => void): void;
    send(event: string, data?: unknown): void;
  };
}
