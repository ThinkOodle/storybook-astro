import { simulatePageLoad, simulateDOMContentLoaded } from 'storybook/internal/preview-api';

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
  if (import.meta.hot) {
    import.meta.hot.on("astro:render:response", (data) => {
      const pending = pendingRequests.get(data.id);
      if (pending) {
        clearTimeout(pending.timeoutId);
        pendingRequests.delete(data.id);
        pending.resolve(data);
      }
    });
    import.meta.hot.on("astro:component:update", () => {
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
    simulatePageLoad(canvasElement);
    return;
  }
  if (element instanceof Node) {
    if (canvasElement.firstChild === element && !forceRemount) {
      return;
    }
    canvasElement.innerHTML = "";
    canvasElement.appendChild(element);
    simulateDOMContentLoaded();
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
    simulatePageLoad(canvasElement);
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
    if (import.meta.hot) {
      import.meta.hot.send("astro:render:request", { ...data, id });
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

// src/renderer/entry-preview.ts
var parameters = {
  renderer: "astro",
  docs: {
    story: {
      inline: true
      // Render inline for better sizing
    },
    source: {
      language: "astro",
      transform: transformSource
    }
  }
};
async function injectGlobalAssets() {
  try {
    const { stylesheets } = await import('virtual:astro-storybook/styles');
    stylesheets.forEach((href) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    });
  } catch {
  }
  try {
    const { scripts } = await import('virtual:astro-storybook/scripts');
    scripts.forEach((src) => {
      const script = document.createElement("script");
      script.src = src;
      document.body.appendChild(script);
    });
  } catch {
  }
}
if (typeof document !== "undefined") {
  injectGlobalAssets();
}

export { parameters, render, renderToCanvas };
//# sourceMappingURL=entry-preview.js.map
//# sourceMappingURL=entry-preview.js.map