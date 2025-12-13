/**
 * Astro Component Renderer for Storybook
 * 
 * This module handles rendering Astro components in the Storybook canvas.
 * It communicates with the server via WebSocket to use the Container API.
 */

import { simulateDOMContentLoaded, simulatePageLoad } from 'storybook/internal/preview-api';
import { dedent } from 'ts-dedent';
import type { RenderResponseMessage, RenderPromise } from '../types/index.js';

// Map of pending render requests
const pendingRequests = new Map<string, RenderPromise>();

// Flag to track if we've initialized the WebSocket listeners
let isInitialized = false;

/**
 * Initialize WebSocket listeners for render responses
 */
function initialize() {
  if (isInitialized) return;
  isInitialized = true;
  
  // Listen for render responses from the server
  if (import.meta.hot) {
    import.meta.hot.on('astro:render:response', (data: RenderResponseMessage['data']) => {
      const pending = pendingRequests.get(data.id);
      if (pending) {
        clearTimeout(pending.timeoutId);
        pendingRequests.delete(data.id);
        pending.resolve(data);
      }
    });
    
    // Listen for component updates (HMR)
    import.meta.hot.on('astro:component:update', () => {
      // Trigger re-render by sending a custom event
      window.dispatchEvent(new CustomEvent('storybook-astro:hmr'));
    });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  showError: (error: { title: string; description: string }) => void;
  forceRemount: boolean;
  storyContext: StoryContext;
}

/**
 * Main render function - creates the story element
 * This is called by Storybook to get the renderable content
 */
export function render(_args: AnyArgs, context: StoryContext): unknown {
  const { id, component } = context;
  
  if (!component) {
    throw new Error(
      `Unable to render story ${id} as the component annotation is missing from the default export`
    );
  }
  
  // If component is a string (raw HTML), return it directly
  if (typeof component === 'string') {
    return component;
  }
  
  // If component is already an HTML element, clone it
  if (component instanceof HTMLElement) {
    return component.cloneNode(true) as HTMLElement;
  }
  
  // Check if this is an Astro component (has the factory marker)
  if (typeof component === 'function' && 'isAstroComponentFactory' in component) {
    return component;
  }
  
  // For other function components, try to render them
  if (typeof component === 'function') {
    return component;
  }
  
  console.warn(dedent`
    Storybook Astro renderer received an unexpected component type.
    Received: ${typeof component}
  `);
  
  return component;
}

/**
 * Render story to the canvas element
 * This is the main entry point called by Storybook
 */
export async function renderToCanvas(
  ctx: RenderContextLike,
  canvasElement: HTMLElement
): Promise<void> {
  initialize();
  
  const { storyFn, showMain, showError, forceRemount, storyContext } = ctx;
  const { name, title } = storyContext;
  
  const element = storyFn();
  
  showMain();
  
  // Check if this is an Astro component
  if (isAstroComponent(element)) {
    await renderAstroComponent(element, storyContext, canvasElement);
    return;
  }
  
  // Handle string content
  if (typeof element === 'string') {
    canvasElement.innerHTML = element;
    simulatePageLoad(canvasElement);
    return;
  }
  
  // Handle DOM nodes
  if (element instanceof Node) {
    if (canvasElement.firstChild === element && !forceRemount) {
      return;
    }
    
    canvasElement.innerHTML = '';
    canvasElement.appendChild(element);
    simulateDOMContentLoaded();
    return;
  }
  
  // Unknown element type
  showError({
    title: `Expecting an HTML snippet or DOM node from the story: "${name}" of "${title}".`,
    description: dedent`
      Did you forget to return the HTML snippet from the story?
      Use "() => <your snippet or node>" or when defining the story.
    `,
  });
}

/**
 * Check if an element is an Astro component factory
 */
function isAstroComponent(element: unknown): element is AstroComponentLike {
  return (
    element !== null &&
    typeof element === 'function' &&
    'isAstroComponentFactory' in element &&
    (element as AstroComponentLike).isAstroComponentFactory === true
  );
}

interface AstroComponentLike {
  isAstroComponentFactory: true;
  moduleId?: string;
}

/**
 * Render an Astro component by sending a request to the server
 */
async function renderAstroComponent(
  component: AstroComponentLike,
  storyContext: StoryContext,
  canvasElement: HTMLElement
): Promise<void> {
  const { args } = storyContext;
  
  // Get module ID from component
  const moduleId = component.moduleId;
  if (!moduleId) {
    throw new Error('Astro component is missing moduleId. Make sure the component was imported correctly.');
  }
  
  // Separate slots from regular args
  const { slots = {}, ...props } = args as { slots?: Record<string, string>; [key: string]: unknown };
  
  try {
    // Request render from server
    const response = await sendRenderRequest({
      component: moduleId,
      args: props,
      slots,
    });
    
    // Update canvas with rendered HTML
    canvasElement.innerHTML = response.html;
    
    // Execute any inline scripts
    executeScripts(canvasElement);
    
    // Apply styles that may have been injected
    applyDynamicStyles();
    
    // Simulate page load for any scripts that depend on it
    simulatePageLoad(canvasElement);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    canvasElement.innerHTML = `
      <div style="color: #dc2626; background: #fef2f2; padding: 16px; border-radius: 8px; font-family: system-ui;">
        <strong>Failed to render Astro component</strong>
        <pre style="margin: 8px 0 0; white-space: pre-wrap;">${escapeHtml(message)}</pre>
      </div>
    `;
  }
}

/**
 * Send a render request to the server via WebSocket
 */
async function sendRenderRequest(data: {
  component: string;
  args?: Record<string, unknown>;
  slots?: Record<string, string>;
}): Promise<RenderResponseMessage['data']> {
  const id = crypto.randomUUID();
  const timeoutMs = 10000;
  
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      pendingRequests.delete(id);
      reject(new Error(`Render request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    
    pendingRequests.set(id, { resolve, reject, timeoutId });
    
    if (import.meta.hot) {
      import.meta.hot.send('astro:render:request', { ...data, id });
    } else {
      clearTimeout(timeoutId);
      pendingRequests.delete(id);
      reject(new Error('HMR not available - cannot communicate with server'));
    }
  });
}

/**
 * Execute script tags that were rendered in the component
 */
function executeScripts(container: HTMLElement): void {
  const scripts = container.querySelectorAll('script');
  
  scripts.forEach((oldScript) => {
    const newScript = document.createElement('script');
    
    // Copy attributes
    Array.from(oldScript.attributes).forEach((attr) => {
      newScript.setAttribute(attr.name, attr.value);
    });
    
    // Copy content
    newScript.textContent = oldScript.textContent;
    
    // Replace in DOM to execute
    oldScript.parentNode?.replaceChild(newScript, oldScript);
  });
}

/**
 * Apply any dynamic styles that were added via Vite
 */
function applyDynamicStyles(): void {
  // Find style tags that need to be processed
  const styleTags = document.querySelectorAll('style[data-vite-dev-id]');
  
  styleTags.forEach((style) => {
    const content = style.textContent || '';
    
    // Check if this style needs to be executed as a module
    if (content.includes('__vite__updateStyle')) {
      const script = document.createElement('script');
      script.type = 'module';
      script.textContent = content
        .replace(/import\.meta\.hot\.accept\(/g, 'import.meta.hot?.accept(')
        .replace(/import\.meta\.hot\.prune\(/g, 'import.meta.hot?.prune(');
      
      document.head.appendChild(script);
      document.head.removeChild(script);
    }
  });
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
