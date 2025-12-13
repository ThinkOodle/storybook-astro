'use strict';

var previewApi = require('storybook/internal/preview-api');

// src/renderer/render.ts

// ../../node_modules/ts-dedent/esm/index.js
function dedent(templ) {
  var values = [];
  for (var _i = 1; _i < arguments.length; _i++) {
    values[_i - 1] = arguments[_i];
  }
  var strings = Array.from(typeof templ === "string" ? [templ] : templ);
  strings[strings.length - 1] = strings[strings.length - 1].replace(/\r?\n([\t ]*)$/, "");
  var indentLengths = strings.reduce(function(arr, str) {
    var matches = str.match(/\n([\t ]+|(?!\s).)/g);
    if (matches) {
      return arr.concat(matches.map(function(match) {
        var _a, _b;
        return (_b = (_a = match.match(/[\t ]/g)) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0;
      }));
    }
    return arr;
  }, []);
  if (indentLengths.length) {
    var pattern_1 = new RegExp("\n[	 ]{" + Math.min.apply(Math, indentLengths) + "}", "g");
    strings = strings.map(function(str) {
      return str.replace(pattern_1, "\n");
    });
  }
  strings[0] = strings[0].replace(/^\r?\n/, "");
  var string = strings[0];
  values.forEach(function(value, i) {
    var endentations = string.match(/(?:^|\n)( *)$/);
    var endentation = endentations ? endentations[1] : "";
    var indentedValue = value;
    if (typeof value === "string" && value.includes("\n")) {
      indentedValue = String(value).split("\n").map(function(str, i2) {
        return i2 === 0 ? str : "" + endentation + str;
      }).join("\n");
    }
    string += indentedValue + strings[i + 1];
  });
  return string;
}

// src/renderer/render.ts
var pendingRequests = /* @__PURE__ */ new Map();
var isInitialized = false;
function initialize() {
  if (isInitialized) return;
  isInitialized = true;
  if (undefined) {
    undefined.on("astro:render:response", (data) => {
      const pending = pendingRequests.get(data.id);
      if (pending) {
        clearTimeout(pending.timeoutId);
        pendingRequests.delete(data.id);
        pending.resolve(data);
      }
    });
    undefined.on("astro:component:update", () => {
      window.dispatchEvent(new CustomEvent("storybook-astro:hmr"));
    });
  }
}
function render(_args, context) {
  const { id, component } = context;
  if (!component) {
    throw new Error(
      `Unable to render story ${id} as the component annotation is missing from the default export`
    );
  }
  if (typeof component === "string") {
    return component;
  }
  if (component instanceof HTMLElement) {
    return component.cloneNode(true);
  }
  if (typeof component === "function" && "isAstroComponentFactory" in component) {
    return component;
  }
  if (typeof component === "function") {
    return component;
  }
  console.warn(dedent`
    Storybook Astro renderer received an unexpected component type.
    Received: ${typeof component}
  `);
  return component;
}
async function renderToCanvas(ctx, canvasElement) {
  initialize();
  const { storyFn, showMain, showError, forceRemount, storyContext } = ctx;
  const { name, title } = storyContext;
  const element = storyFn();
  showMain();
  if (isAstroComponent(element)) {
    await renderAstroComponent(element, storyContext, canvasElement);
    return;
  }
  if (typeof element === "string") {
    canvasElement.innerHTML = element;
    previewApi.simulatePageLoad(canvasElement);
    return;
  }
  if (element instanceof Node) {
    if (canvasElement.firstChild === element && !forceRemount) {
      return;
    }
    canvasElement.innerHTML = "";
    canvasElement.appendChild(element);
    previewApi.simulateDOMContentLoaded();
    return;
  }
  showError({
    title: `Expecting an HTML snippet or DOM node from the story: "${name}" of "${title}".`,
    description: dedent`
      Did you forget to return the HTML snippet from the story?
      Use "() => <your snippet or node>" or when defining the story.
    `
  });
}
function isAstroComponent(element) {
  return element !== null && typeof element === "function" && "isAstroComponentFactory" in element && element.isAstroComponentFactory === true;
}
async function renderAstroComponent(component, storyContext, canvasElement) {
  const { args } = storyContext;
  const moduleId = component.moduleId;
  if (!moduleId) {
    throw new Error("Astro component is missing moduleId. Make sure the component was imported correctly.");
  }
  const { slots = {}, ...props } = args;
  try {
    const response = await sendRenderRequest({
      component: moduleId,
      args: props,
      slots
    });
    canvasElement.innerHTML = response.html;
    executeScripts(canvasElement);
    applyDynamicStyles();
    previewApi.simulatePageLoad(canvasElement);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    canvasElement.innerHTML = `
      <div style="color: #dc2626; background: #fef2f2; padding: 16px; border-radius: 8px; font-family: system-ui;">
        <strong>Failed to render Astro component</strong>
        <pre style="margin: 8px 0 0; white-space: pre-wrap;">${escapeHtml(message)}</pre>
      </div>
    `;
  }
}
async function sendRenderRequest(data) {
  const id = crypto.randomUUID();
  const timeoutMs = 1e4;
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      pendingRequests.delete(id);
      reject(new Error(`Render request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    pendingRequests.set(id, { resolve, reject, timeoutId });
    if (undefined) {
      undefined.send("astro:render:request", { ...data, id });
    } else {
      clearTimeout(timeoutId);
      pendingRequests.delete(id);
      reject(new Error("HMR not available - cannot communicate with server"));
    }
  });
}
function executeScripts(container) {
  const scripts = container.querySelectorAll("script");
  scripts.forEach((oldScript) => {
    const newScript = document.createElement("script");
    Array.from(oldScript.attributes).forEach((attr) => {
      newScript.setAttribute(attr.name, attr.value);
    });
    newScript.textContent = oldScript.textContent;
    oldScript.parentNode?.replaceChild(newScript, oldScript);
  });
}
function applyDynamicStyles() {
  const styleTags = document.querySelectorAll("style[data-vite-dev-id]");
  styleTags.forEach((style) => {
    const content = style.textContent || "";
    if (content.includes("__vite__updateStyle")) {
      const script = document.createElement("script");
      script.type = "module";
      script.textContent = content.replace(/import\.meta\.hot\.accept\(/g, "import.meta.hot?.accept(").replace(/import\.meta\.hot\.prune\(/g, "import.meta.hot?.prune(");
      document.head.appendChild(script);
      document.head.removeChild(script);
    }
  });
}
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// src/renderer/decorators.ts
var decorators = [];
var decorators_default = decorators;

// src/renderer/index.ts
var parameters = {
  renderer: "astro"
};

exports.decorators = decorators_default;
exports.parameters = parameters;
exports.render = render;
exports.renderToCanvas = renderToCanvas;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map