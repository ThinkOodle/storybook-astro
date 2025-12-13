import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/framework/vite-plugins.ts
var vite_plugins_exports = {};
__export(vite_plugins_exports, {
  createAstroVitePlugins: () => createAstroVitePlugins
});
async function createAstroVitePlugins(options) {
  process.env.VITEST = "true";
  const astroViteConfig = await getAstroViteConfig();
  const astroPlugins = extractAstroPlugins(astroViteConfig);
  return [
    ...astroPlugins,
    astroContainerPlugin(),
    astroStylesPlugin(options.stylesheets || []),
    astroScriptsPlugin(options.scripts || []),
    astroComponentMarkerPlugin()
  ];
}
async function getAstroViteConfig() {
  if (cachedAstroViteConfig) {
    return cachedAstroViteConfig;
  }
  try {
    const { getViteConfig } = await import('astro/config');
    const configFn = getViteConfig({}, {
      // Minimal inline Astro config - will use astro.config.mjs from project
    });
    cachedAstroViteConfig = await configFn({
      mode: "development",
      command: "serve"
    });
    return cachedAstroViteConfig;
  } catch (error) {
    console.warn("[storybook-astro] Could not load Astro Vite config:", error);
    return { plugins: [] };
  }
}
function extractAstroPlugins(config) {
  if (!config.plugins) return [];
  const flatPlugins = [];
  const flatten = (arr) => {
    for (const item of arr) {
      if (Array.isArray(item)) {
        flatten(item);
      } else if (item) {
        flatPlugins.push(item);
      }
    }
  };
  flatten(config.plugins);
  const essentialPlugins = [
    "astro:build",
    "astro:build:normal",
    "astro:config-alias",
    "astro:load-fallback",
    "astro:postprocess",
    "astro:markdown",
    "astro:html",
    "astro:scripts",
    "astro:assets",
    "astro:head",
    "astro:container"
  ];
  return flatPlugins.filter((p) => {
    if (!p || typeof p !== "object") return false;
    const name = "name" in p ? String(p.name) : "";
    return essentialPlugins.some((essential) => name.startsWith(essential) || name === essential);
  });
}
function astroContainerPlugin() {
  let viteServer;
  return {
    name: "storybook-astro:container",
    configureServer(server) {
      viteServer = server;
      server.ws.on("astro:render:request", async (data, client) => {
        try {
          const html = await renderAstroComponent(data, viteServer);
          const response = {
            id: data.id,
            html
          };
          client.send("astro:render:response", response);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          console.error("[storybook-astro] Render error:", errorMessage);
          const response = {
            id: data.id,
            html: `<div style="color: #dc2626; background: #fef2f2; padding: 16px; border-radius: 8px; font-family: system-ui;">
              <strong>Render Error</strong>
              <pre style="margin: 8px 0 0; white-space: pre-wrap;">${escapeHtml(errorMessage)}</pre>
            </div>`,
            error: errorMessage
          };
          client.send("astro:render:response", response);
        }
      });
    }
  };
}
async function renderAstroComponent(data, server) {
  const { experimental_AstroContainer: AstroContainer } = await import('astro/container');
  const container = await AstroContainer.create({
    // Resolve module paths for client-side scripts
    resolve: async (specifier) => {
      if (specifier.startsWith("astro:scripts")) {
        return `/@id/${specifier}`;
      }
      return specifier;
    }
  });
  const componentModule = await server.ssrLoadModule(data.component);
  const Component = componentModule.default;
  if (!Component) {
    throw new Error(`Component not found: ${data.component}`);
  }
  const html = await container.renderToString(Component, {
    props: data.args || {},
    slots: data.slots || {}
  });
  return html;
}
function astroStylesPlugin(stylesheets) {
  const virtualModuleId = "virtual:astro-storybook/styles";
  const resolvedVirtualModuleId = "\0" + virtualModuleId;
  return {
    name: "storybook-astro:styles",
    resolveId(id) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId;
      }
    },
    load(id) {
      if (id === resolvedVirtualModuleId) {
        const normalized = stylesheets.map((s) => normalizeAssetPath(s));
        return `export const stylesheets = ${JSON.stringify(normalized)};`;
      }
    }
  };
}
function astroScriptsPlugin(scripts) {
  const virtualModuleId = "virtual:astro-storybook/scripts";
  const resolvedVirtualModuleId = "\0" + virtualModuleId;
  return {
    name: "storybook-astro:scripts",
    resolveId(id) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId;
      }
    },
    load(id) {
      if (id === resolvedVirtualModuleId) {
        const normalized = scripts.map((s) => normalizeAssetPath(s));
        return `export const scripts = ${JSON.stringify(normalized)};`;
      }
    }
  };
}
function astroComponentMarkerPlugin() {
  return {
    name: "storybook-astro:component-marker",
    enforce: "post",
    transform(code, id) {
      if (!id.endsWith(".astro") && !id.includes(".astro?")) {
        return null;
      }
      if (code.includes("export default") || code.includes("export { $$Component as default }")) {
        const moduleIdLine = `
;(function() { 
          if (typeof $$Component !== 'undefined') { 
            $$Component.isAstroComponentFactory = true;
            $$Component.moduleId = ${JSON.stringify(id.split("?")[0])}; 
          }
        })();
`;
        return {
          code: code + moduleIdLine,
          map: null
        };
      }
      return null;
    },
    // Handle HMR for Astro components
    handleHotUpdate({ file, server }) {
      if (file.endsWith(".astro")) {
        server.ws.send({
          type: "custom",
          event: "astro:component:update",
          data: { file }
        });
      }
    }
  };
}
function normalizeAssetPath(path) {
  if (/^https?:\/\//.test(path)) {
    return path;
  }
  path = path.replace(/^\.\//, "");
  if (!path.startsWith("/")) {
    path = "/" + path;
  }
  return path;
}
function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
var cachedAstroViteConfig;
var init_vite_plugins = __esm({
  "src/framework/vite-plugins.ts"() {
    cachedAstroViteConfig = null;
  }
});
var __dirname$1 = dirname(fileURLToPath(import.meta.url));
var require2 = createRequire(import.meta.url);
function getAbsolutePath(input) {
  return dirname(require2.resolve(join(input, "package.json")));
}
var core = {
  builder: getAbsolutePath("@storybook/builder-vite"),
  renderer: join(__dirname$1, "renderer")
};
var frameworkName = "@anthropic/storybook-astro";
var previewAnnotations = async (input = []) => {
  return [
    ...input,
    join(__dirname$1, "renderer", "entry-preview.js")
  ];
};
async function viteFinal(config, { presets }) {
  const frameworkOptions = await presets.apply("frameworkOptions");
  const { createAstroVitePlugins: createAstroVitePlugins2 } = await Promise.resolve().then(() => (init_vite_plugins(), vite_plugins_exports));
  const astroPlugins = await createAstroVitePlugins2(frameworkOptions || {});
  const existingPlugins = config.plugins || [];
  const existingOptimizeDeps = config.optimizeDeps || {};
  const existingSsr = config.ssr || {};
  return {
    ...config,
    plugins: [...existingPlugins, ...astroPlugins],
    optimizeDeps: {
      ...existingOptimizeDeps,
      include: [
        ...existingOptimizeDeps.include || [],
        // Pre-bundle CJS modules that Astro depends on
        "cssesc",
        "string-width"
      ],
      exclude: [
        ...existingOptimizeDeps.exclude || [],
        "astro",
        "astro/container"
      ]
    },
    ssr: {
      ...existingSsr,
      noExternal: [
        ...Array.isArray(existingSsr.noExternal) ? existingSsr.noExternal : [],
        "@anthropic/storybook-astro"
      ]
    }
  };
}
var preset_default = {
  core,
  viteFinal,
  frameworkName,
  previewAnnotations
};

export { core, preset_default as default, frameworkName, previewAnnotations, viteFinal };
//# sourceMappingURL=preset.js.map
//# sourceMappingURL=preset.js.map