'use strict';

var toolbar = require('astro/toolbar');

// src/integration/toolbar-app.ts
var toolbar_app_default = toolbar.defineToolbarApp({
  init(canvas) {
    fetch("/__storybook-config").then((res) => res.json()).then((config) => {
      const storybookUrl = `http://${config.host}:${config.port}`;
      const container = document.createElement("astro-dev-toolbar-window");
      const content = document.createElement("div");
      content.style.padding = "1rem";
      const title = document.createElement("h2");
      title.textContent = "Storybook";
      title.style.marginTop = "0";
      title.style.marginBottom = "0.5rem";
      title.style.fontSize = "1.1rem";
      title.style.fontWeight = "600";
      content.appendChild(title);
      const description = document.createElement("p");
      description.textContent = "View and develop your components in isolation.";
      description.style.marginTop = "0";
      description.style.marginBottom = "1rem";
      description.style.fontSize = "0.85rem";
      description.style.opacity = "0.8";
      content.appendChild(description);
      const openButton = document.createElement("astro-dev-toolbar-button");
      openButton.setAttribute("button-style", "purple");
      openButton.innerHTML = `
          <span style="display: flex; align-items: center; gap: 0.5rem;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15,3 21,3 21,9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            Open Storybook
          </span>
        `;
      openButton.addEventListener("click", () => {
        window.open(storybookUrl, "_blank");
      });
      content.appendChild(openButton);
      const statusContainer = document.createElement("div");
      statusContainer.style.marginTop = "1rem";
      statusContainer.style.fontSize = "0.75rem";
      statusContainer.style.display = "flex";
      statusContainer.style.alignItems = "center";
      statusContainer.style.gap = "0.5rem";
      const statusDot = document.createElement("span");
      statusDot.style.width = "8px";
      statusDot.style.height = "8px";
      statusDot.style.borderRadius = "50%";
      statusDot.style.backgroundColor = "#888";
      const statusText = document.createElement("span");
      statusText.textContent = "Checking...";
      statusText.style.opacity = "0.7";
      statusContainer.appendChild(statusDot);
      statusContainer.appendChild(statusText);
      content.appendChild(statusContainer);
      container.appendChild(content);
      canvas.appendChild(container);
      checkStorybookStatus(storybookUrl, statusDot, statusText);
    }).catch(() => {
      const container = document.createElement("astro-dev-toolbar-window");
      const content = document.createElement("div");
      content.style.padding = "1rem";
      content.innerHTML = `
          <h2 style="margin: 0 0 0.5rem 0; font-size: 1.1rem;">Storybook</h2>
          <p style="margin: 0; font-size: 0.85rem; opacity: 0.8;">
            Run <code style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px;">npm run storybook</code> to start Storybook.
          </p>
        `;
      container.appendChild(content);
      canvas.appendChild(container);
    });
  }
});
async function checkStorybookStatus(url, dot, text) {
  try {
    await fetch(url, { mode: "no-cors" });
    dot.style.backgroundColor = "#4ade80";
    text.textContent = `Running at ${url}`;
  } catch {
    dot.style.backgroundColor = "#f87171";
    text.textContent = "Not running";
  }
}

module.exports = toolbar_app_default;
//# sourceMappingURL=toolbar-app.cjs.map
//# sourceMappingURL=toolbar-app.cjs.map