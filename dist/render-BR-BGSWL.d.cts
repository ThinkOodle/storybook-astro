/**
 * Astro Component Renderer for Storybook
 *
 * This module handles rendering Astro components in the Storybook canvas.
 * It communicates with the server via WebSocket to use the Container API.
 */
type AnyArgs = Record<string, any>;
interface StoryContext {
    id: string;
    name: string;
    title: string;
    component?: unknown;
    args: AnyArgs;
}
interface RenderContextLike {
    storyFn: () => unknown;
    showMain: () => void;
    showError: (error: {
        title: string;
        description: string;
    }) => void;
    forceRemount: boolean;
    storyContext: StoryContext;
}
/**
 * Main render function - creates the story element
 * This is called by Storybook to get the renderable content
 */
declare function render(_args: AnyArgs, context: StoryContext): unknown;
/**
 * Render story to the canvas element
 * This is the main entry point called by Storybook
 */
declare function renderToCanvas(ctx: RenderContextLike, canvasElement: HTMLElement): Promise<void>;

export { renderToCanvas as a, render as r };
