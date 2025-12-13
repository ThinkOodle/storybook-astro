'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var module$1 = require('module');
var path = require('path');
var url = require('url');

var _documentCurrentScript = typeof document !== 'undefined' ? document.currentScript : null;
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

// src/docs/sourceTransformer.ts
function getComponentName(context) {
  const { component, title } = context;
  if (component) {
    if (component.displayName) return component.displayName;
    if (component.name && component.name !== "default") return component.name;
    if (component.__docgenInfo?.displayName) return component.__docgenInfo.displayName;
  }
  const parts = title.split("/");
  return parts[parts.length - 1];
}
function formatPropValue(value) {
  if (typeof value === "string") {
    const escaped = value.replace(/"/g, '\\"');
    return `"${escaped}"`;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return `{${value}}`;
  }
  if (value === null || value === void 0) {
    return `{${value}}`;
  }
  if (Array.isArray(value) || typeof value === "object") {
    return `{${JSON.stringify(value, null, 2)}}`;
  }
  return `{${String(value)}}`;
}
function formatProps(args, indent = "  ") {
  const entries = Object.entries(args).filter(([_, value]) => value !== void 0);
  if (entries.length === 0) {
    return "";
  }
  if (entries.length === 1) {
    const [key, value] = entries[0];
    const formatted = formatPropValue(value);
    if (formatted.length < 40) {
      return ` ${key}=${formatted}`;
    }
  }
  return "\n" + entries.map(([key, value]) => `${indent}${key}=${formatPropValue(value)}`).join("\n") + "\n";
}
function transformSource(code, context) {
  if (context.parameters?.docs?.source?.code) {
    return context.parameters.docs.source.code;
  }
  const componentName = getComponentName(context);
  const { args } = context;
  if (!args || Object.keys(args).length === 0) {
    return `---
import ${componentName} from '../components/${componentName}.astro';
---

<${componentName} />`;
  }
  const propsString = formatProps(args);
  const selfClosing = !propsString.includes("\n");
  if (selfClosing) {
    return `---
import ${componentName} from '../components/${componentName}.astro';
---

<${componentName}${propsString} />`;
  }
  return `---
import ${componentName} from '../components/${componentName}.astro';
---

<${componentName}${propsString}/>`;
}
var require2 = module$1.createRequire((typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('index.cjs', document.baseURI).href)));
function getToolbarEntrypoint() {
  const packageJsonPath = require2.resolve("@anthropic/storybook-astro/package.json");
  const packageRoot = path.dirname(packageJsonPath);
  return path.join(packageRoot, "dist", "integration", "toolbar-app.js");
}
function storybookDevToolbar(options = {}) {
  const { port = 6006, host = "localhost" } = options;
  return {
    name: "@anthropic/storybook-astro/toolbar",
    hooks: {
      "astro:config:setup": ({ addDevToolbarApp, command }) => {
        if (command !== "dev") return;
        const entrypointPath = getToolbarEntrypoint();
        addDevToolbarApp({
          id: "storybook-toolbar-app",
          name: "Storybook",
          // Official Storybook icon from https://github.com/storybookjs/brand
          icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 64" fill="none"><path fill="#FF4785" d="M50.273 2.923a3.12 3.12 0 0 1 .006.194v55.766a3.117 3.117 0 0 1-3.15 3.117l-42.14-1.869a3.108 3.108 0 0 1-3.006-2.997L.002 5.955A3.108 3.108 0 0 1 2.953 2.727L37.427.594l-.3 7.027a.466.466 0 0 0 .753.396l2.758-2.07 2.329 1.816a.467.467 0 0 0 .76-.381l-.26-7.155 3.466-.221a3.108 3.108 0 0 1 3.34 2.917Z"/><path fill="#fff" d="M29.403 23.369c0 1.213 8.254.636 9.362-.215 0-8.259-4.477-12.599-12.676-12.599-8.199 0-12.793 4.408-12.793 11.019 0 11.514 15.7 11.734 15.7 18.015 0 1.763-.872 2.81-2.791 2.81-2.5 0-3.489-1.264-3.373-5.561 0-.932-9.536-1.223-9.827 0-.74 10.414 5.815 13.417 13.316 13.417 7.269 0 12.967-3.834 12.967-10.776 0-12.34-15.933-12.01-15.933-18.125 0-2.48 1.861-2.81 2.966-2.81 1.163 0 3.256.203 3.082 4.825Z"/></svg>`,
          entrypoint: entrypointPath
        });
      },
      "astro:server:setup": ({ server }) => {
        server.middlewares.use((req, res, next) => {
          if (req.url === "/__storybook-config") {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ port, host }));
            return;
          }
          next();
        });
      }
    }
  };
}
var __dirname$1 = path.dirname(url.fileURLToPath((typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('index.cjs', document.baseURI).href))));
var require3 = module$1.createRequire((typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('index.cjs', document.baseURI).href)));
function getAbsolutePath(input) {
  return path.dirname(require3.resolve(path.join(input, "package.json")));
}
var core = {
  builder: getAbsolutePath("@storybook/builder-vite"),
  renderer: path.join(__dirname$1, "renderer")
};
var frameworkName = "@anthropic/storybook-astro";
var previewAnnotations = async (input = []) => {
  return [
    ...input,
    path.join(__dirname$1, "renderer", "entry-preview.js")
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

exports.default = preset_default;
exports.storybookDevToolbar = storybookDevToolbar;
exports.transformSource = transformSource;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map