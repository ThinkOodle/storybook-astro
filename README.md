# storybook-astro

Storybook framework for Astro components. Render `.astro` files directly in Storybook with full support for props, controls, and automatic source code generation.

## Features

- **Native Astro Support** - Render `.astro` components directly in Storybook
- **Storybook 10** - Built for the latest Storybook version
- **Controls Panel** - Interactive props editing with auto-detected controls
- **Auto Source Code** - Automatically generates Astro component code snippets in docs
- **Global Styles** - Import your global CSS into all stories
- **Inline Docs** - Components render at their natural size in docs mode

## Installation

```bash
npm install -D storybook-astro storybook @storybook/addon-docs @storybook/builder-vite
```

## Quick Start

### 1. Create `.storybook/main.ts`

```typescript
const config = {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx)'],
  
  addons: ['@storybook/addon-docs'],
  
  framework: {
    name: 'storybook-astro',
    options: {},
  },
  
  core: {
    builder: '@storybook/builder-vite',
  },
};

export default config;
```

### 2. Create `.storybook/preview.ts`

```typescript
// Import your global styles
import '../src/styles/global.css';

const preview = {
  parameters: {
    layout: 'padded',
    backgrounds: {
      options: {
        light: { name: 'Light', value: '#ffffff' },
        dark: { name: 'Dark', value: '#1a1a2e' },
      },
    },
  },
};

export default preview;
```

### 3. Write Stories

```typescript
// src/stories/Button.stories.ts
import Button from '../components/Button.astro';

const meta = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary'],
      description: 'Visual style of the button',
    },
    label: {
      control: 'text',
      description: 'Button text',
    },
  },
};

export default meta;

export const Primary = {
  args: {
    variant: 'primary',
    label: 'Click me',
  },
};

export const Secondary = {
  args: {
    variant: 'secondary',
    label: 'Click me',
  },
};
```

### 4. Add Scripts to `package.json`

```json
{
  "scripts": {
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build"
  }
}
```

### 5. Run Storybook

```bash
npm run storybook
```

## Astro Dev Toolbar Integration

Add a Storybook link to the Astro dev toolbar for quick access:

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';

const isDev = import.meta.env?.DEV ?? process.env.NODE_ENV !== 'production';

export default defineConfig({
  integrations: [
    // Only load in development
    ...(isDev
      ? [(await import('storybook-astro')).storybookDevToolbar({ port: 6006 })]
      : []),
  ],
});
```

### Toolbar Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `port` | `number` | `6006` | The port Storybook is running on |
| `host` | `string` | `localhost` | The host Storybook is running on |

## Running Alongside Astro Dev Server

For the best development experience, run both Astro and Storybook together using `concurrently`:

```bash
npm install -D concurrently
```

Update your `package.json` scripts:

```json
{
  "scripts": {
    "dev": "concurrently -n astro,storybook -c blue,magenta \"astro dev\" \"storybook dev -p 6006 --no-open\"",
    "dev:astro": "astro dev",
    "dev:storybook": "storybook dev -p 6006",
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build"
  }
}
```

Now `npm run dev` starts both servers:
- **Astro**: http://localhost:4321
- **Storybook**: http://localhost:6006

## Story Format

### Basic Story

```typescript
import MyComponent from '../components/MyComponent.astro';

export default {
  title: 'Components/MyComponent',
  component: MyComponent,
};

export const Default = {
  args: {
    title: 'Hello World',
    count: 42,
  },
};
```

### Full-Width Components

For components like heroes that need full width:

```typescript
export default {
  title: 'Components/HeroSection',
  component: HeroSection,
  parameters: {
    layout: 'fullscreen',
    docs: {
      story: {
        inline: true, // Renders at natural size in docs
      },
    },
  },
};
```

### With ArgTypes Documentation

```typescript
export default {
  title: 'Components/Card',
  component: Card,
  tags: ['autodocs'], // Auto-generate docs page
  argTypes: {
    title: {
      control: 'text',
      description: 'Card heading',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'Untitled' },
      },
    },
    variant: {
      control: 'select',
      options: ['default', 'outlined', 'elevated'],
      description: 'Visual variant',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the card is interactive',
    },
  },
};
```

### Custom Source Code

By default, the "Show code" panel auto-generates Astro syntax. To customize:

```typescript
export const CustomExample = {
  args: {
    title: 'Example',
  },
  parameters: {
    docs: {
      source: {
        code: `---
import Card from '../components/Card.astro';
---

<Card title="Example">
  <p>Custom slot content</p>
</Card>`,
        language: 'astro',
      },
    },
  },
};
```

## Configuration Options

### Framework Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `stylesheets` | `string[]` | `[]` | Global stylesheets to inject into stories |
| `scripts` | `string[]` | `[]` | Global scripts to inject into stories |

### Example with Options

```typescript
// .storybook/main.ts
const config = {
  framework: {
    name: 'storybook-astro',
    options: {
      stylesheets: [
        '/src/styles/global.css',
        '/src/styles/components.css',
      ],
      scripts: [
        '/src/scripts/analytics.js',
      ],
    },
  },
};
```

## TypeScript Support

For TypeScript support with `.astro` imports, add to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["astro/client"]
  }
}
```

Note: TypeScript may show errors for `.astro` imports in story files. These are safe to ignore - the components will work correctly at runtime.

## How It Works

1. **Astro Vite Plugins** - The framework loads Astro's Vite plugins to compile `.astro` files
2. **Component Compilation** - `.astro` files are compiled to JavaScript component factories
3. **Direct Rendering** - Components render directly in the Storybook canvas
4. **Source Transform** - Args are automatically transformed to Astro template syntax for docs

## Requirements

- **Astro** 5.x
- **Storybook** 10.x
- **Node.js** 20+

## Troubleshooting

### Component not rendering

1. Ensure the component path is correct
2. Check the browser console for errors
3. Verify your component works in Astro first

### Styles not applying

1. Import global styles in `.storybook/preview.ts`
2. Component-scoped styles should work automatically
3. Check that CSS file paths are correct

### "Cannot find module" TypeScript errors

This is expected for `.astro` imports in TypeScript files. The components will still work - this is just a TypeScript limitation.

### Build errors

Run `npm run build-storybook` to see detailed error messages. Common issues:
- Missing dependencies
- Invalid component syntax
- Circular imports

## Disclaimer

This project is not affiliated with, endorsed by, or sponsored by [Astro](https://astro.build) or [Storybook](https://storybook.js.org). All trademarks belong to their respective owners.

## License

MIT
