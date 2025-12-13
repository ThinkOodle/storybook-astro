/**
 * Vite plugins for Astro Storybook integration
 * 
 * Creates the necessary Vite plugins to:
 * 1. Handle Astro component imports via Astro's Vite plugin
 * 2. Set up WebSocket communication for rendering
 * 3. Inject global styles and scripts
 */

import type { Plugin, ViteDevServer, InlineConfig } from 'vite';
import type { FrameworkOptions, RenderRequestMessage, RenderResponseMessage } from '../types/index.js';

// Cache the Astro Vite config to avoid recreating it
let cachedAstroViteConfig: InlineConfig | null = null;

/**
 * Create all Vite plugins needed for Astro support in Storybook
 */
export async function createAstroVitePlugins(options: FrameworkOptions): Promise<Plugin[]> {
  // Set VITEST env to trick Astro into compiling components for client-side rendering
  // This works around the SSR check in astro:build plugin that would otherwise
  // stub out components with an error
  process.env.VITEST = 'true';
  
  // Get Astro's full Vite configuration including all plugins
  const astroViteConfig = await getAstroViteConfig();
  
  // Extract plugins from Astro's config
  const astroPlugins = extractAstroPlugins(astroViteConfig);
  
  return [
    ...astroPlugins,
    astroContainerPlugin(),
    astroStylesPlugin(options.stylesheets || []),
    astroScriptsPlugin(options.scripts || []),
    astroComponentMarkerPlugin(),
  ];
}

/**
 * Get the full Astro Vite configuration using getViteConfig
 */
async function getAstroViteConfig(): Promise<InlineConfig> {
  if (cachedAstroViteConfig) {
    return cachedAstroViteConfig;
  }
  
  try {
    const { getViteConfig } = await import('astro/config');
    
    // getViteConfig returns a function that takes { mode, command }
    const configFn = getViteConfig({}, {
      // Minimal inline Astro config - will use astro.config.mjs from project
    });
    
    cachedAstroViteConfig = await configFn({ 
      mode: 'development', 
      command: 'serve' 
    });
    
    return cachedAstroViteConfig;
  } catch (error) {
    console.warn('[storybook-astro] Could not load Astro Vite config:', error);
    return { plugins: [] };
  }
}

/**
 * Extract relevant plugins from Astro's Vite configuration
 */
function extractAstroPlugins(config: InlineConfig): Plugin[] {
  if (!config.plugins) return [];
  
  // Flatten nested plugin arrays - use explicit typing to avoid deep recursion
  const flatPlugins: unknown[] = [];
  const flatten = (arr: unknown[]): void => {
    for (const item of arr) {
      if (Array.isArray(item)) {
        flatten(item);
      } else if (item) {
        flatPlugins.push(item);
      }
    }
  };
  flatten(config.plugins as unknown[]);
  
  // Include plugins essential for .astro file compilation
  const essentialPlugins = [
    'astro:build',
    'astro:build:normal', 
    'astro:config-alias',
    'astro:load-fallback',
    'astro:postprocess',
    'astro:markdown',
    'astro:html',
    'astro:scripts',
    'astro:assets',
    'astro:head',
    'astro:container',
  ];
  
  return flatPlugins.filter((p): p is Plugin => {
    if (!p || typeof p !== 'object') return false;
    const name = 'name' in p ? String((p as { name: unknown }).name) : '';
    return essentialPlugins.some(essential => name.startsWith(essential) || name === essential);
  });
}

/**
 * Plugin that sets up the Astro Container API for server-side rendering
 * Handles WebSocket messages from the client to render components
 */
function astroContainerPlugin(): Plugin {
  let viteServer: ViteDevServer;
  
  return {
    name: 'storybook-astro:container',
    
    configureServer(server) {
      viteServer = server;
      
      // Handle render requests from the client
      server.ws.on('astro:render:request', async (data: RenderRequestMessage['data'], client) => {
        try {
          const html = await renderAstroComponent(data, viteServer);
          
          const response: RenderResponseMessage['data'] = {
            id: data.id,
            html,
          };
          
          client.send('astro:render:response', response);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error('[storybook-astro] Render error:', errorMessage);
          
          const response: RenderResponseMessage['data'] = {
            id: data.id,
            html: `<div style="color: #dc2626; background: #fef2f2; padding: 16px; border-radius: 8px; font-family: system-ui;">
              <strong>Render Error</strong>
              <pre style="margin: 8px 0 0; white-space: pre-wrap;">${escapeHtml(errorMessage)}</pre>
            </div>`,
            error: errorMessage,
          };
          
          client.send('astro:render:response', response);
        }
      });
    },
  };
}

/**
 * Render an Astro component using the Container API
 */
async function renderAstroComponent(
  data: RenderRequestMessage['data'],
  server: ViteDevServer
): Promise<string> {
  // Dynamic import to get fresh module on HMR
  const { experimental_AstroContainer: AstroContainer } = await import('astro/container');
  
  // Create container for rendering
  const container = await AstroContainer.create({
    // Resolve module paths for client-side scripts
    resolve: async (specifier: string) => {
      if (specifier.startsWith('astro:scripts')) {
        return `/@id/${specifier}`;
      }
      return specifier;
    },
  });
  
  // Import the component module
  const componentModule = await server.ssrLoadModule(data.component);
  const Component = componentModule.default;
  
  if (!Component) {
    throw new Error(`Component not found: ${data.component}`);
  }
  
  // Render to string
  const html = await container.renderToString(Component, {
    props: data.args || {},
    slots: data.slots || {},
  });
  
  return html;
}

/**
 * Virtual module plugin for injecting global stylesheets
 */
function astroStylesPlugin(stylesheets: string[]): Plugin {
  const virtualModuleId = 'virtual:astro-storybook/styles';
  const resolvedVirtualModuleId = '\0' + virtualModuleId;
  
  return {
    name: 'storybook-astro:styles',
    
    resolveId(id) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId;
      }
    },
    
    load(id) {
      if (id === resolvedVirtualModuleId) {
        const normalized = stylesheets.map(s => normalizeAssetPath(s));
        return `export const stylesheets = ${JSON.stringify(normalized)};`;
      }
    },
  };
}

/**
 * Virtual module plugin for injecting global scripts
 */
function astroScriptsPlugin(scripts: string[]): Plugin {
  const virtualModuleId = 'virtual:astro-storybook/scripts';
  const resolvedVirtualModuleId = '\0' + virtualModuleId;
  
  return {
    name: 'storybook-astro:scripts',
    
    resolveId(id) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId;
      }
    },
    
    load(id) {
      if (id === resolvedVirtualModuleId) {
        const normalized = scripts.map(s => normalizeAssetPath(s));
        return `export const scripts = ${JSON.stringify(normalized)};`;
      }
    },
  };
}

/**
 * Plugin to mark Astro components with their module ID for rendering
 */
function astroComponentMarkerPlugin(): Plugin {
  return {
    name: 'storybook-astro:component-marker',
    enforce: 'post',
    
    transform(code, id) {
      // Only process compiled .astro files
      if (!id.endsWith('.astro') && !id.includes('.astro?')) {
        return null;
      }
      
      // Look for the default export and add moduleId
      // Astro compiles components to have a default export
      if (code.includes('export default') || code.includes('export { $$Component as default }')) {
        const moduleIdLine = `\n;(function() { 
          if (typeof $$Component !== 'undefined') { 
            $$Component.isAstroComponentFactory = true;
            $$Component.moduleId = ${JSON.stringify(id.split('?')[0])}; 
          }
        })();\n`;
        
        return {
          code: code + moduleIdLine,
          map: null,
        };
      }
      
      return null;
    },
    
    // Handle HMR for Astro components
    handleHotUpdate({ file, server }) {
      if (file.endsWith('.astro')) {
        server.ws.send({
          type: 'custom',
          event: 'astro:component:update',
          data: { file },
        });
      }
    },
  };
}

/**
 * Normalize asset paths for injection
 */
function normalizeAssetPath(path: string): string {
  // Keep absolute URLs as-is
  if (/^https?:\/\//.test(path)) {
    return path;
  }
  
  // Remove leading ./ and ensure leading /
  path = path.replace(/^\.\//, '');
  if (!path.startsWith('/')) {
    path = '/' + path;
  }
  
  return path;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
