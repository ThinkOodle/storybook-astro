import { createRequire } from 'module';
import { dirname, join } from 'path';

// src/integration/index.ts
var require2 = createRequire(import.meta.url);
function getToolbarEntrypoint() {
  const packageJsonPath = require2.resolve("@anthropic/storybook-astro/package.json");
  const packageRoot = dirname(packageJsonPath);
  return join(packageRoot, "dist", "integration", "toolbar-app.js");
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
var integration_default = storybookDevToolbar;

export { integration_default as default, storybookDevToolbar };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map