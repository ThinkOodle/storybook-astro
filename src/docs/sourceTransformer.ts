/**
 * Source code transformer for Astro components in Storybook docs
 * 
 * Transforms story args into proper Astro component syntax for display
 * in the "Show code" panel.
 */

export interface StoryContext {
  id: string;
  name: string;
  title: string;
  component?: {
    displayName?: string;
    name?: string;
    __docgenInfo?: {
      displayName?: string;
    };
  } & ((...args: unknown[]) => unknown);
  args: Record<string, unknown>;
  parameters?: {
    docs?: {
      source?: {
        code?: string;
        language?: string;
        excludeDecorators?: boolean;
      };
    };
  };
}

/**
 * Get the component name from the story context
 */
function getComponentName(context: StoryContext): string {
  const { component, title } = context;
  
  // Try to get name from component
  if (component) {
    if (component.displayName) return component.displayName;
    if (component.name && component.name !== 'default') return component.name;
    if (component.__docgenInfo?.displayName) return component.__docgenInfo.displayName;
  }
  
  // Fall back to extracting from title (e.g., "Components/HeroSection" -> "HeroSection")
  const parts = title.split('/');
  return parts[parts.length - 1];
}

/**
 * Format a prop value for Astro template syntax
 */
function formatPropValue(value: unknown): string {
  if (typeof value === 'string') {
    // Escape quotes in strings
    const escaped = value.replace(/"/g, '\\"');
    return `"${escaped}"`;
  }
  
  if (typeof value === 'number' || typeof value === 'boolean') {
    return `{${value}}`;
  }
  
  if (value === null || value === undefined) {
    return `{${value}}`;
  }
  
  if (Array.isArray(value) || typeof value === 'object') {
    // For complex values, use JSX expression syntax
    return `{${JSON.stringify(value, null, 2)}}`;
  }
  
  return `{${String(value)}}`;
}

/**
 * Format props as Astro component attributes
 */
function formatProps(args: Record<string, unknown>, indent: string = '  '): string {
  const entries = Object.entries(args).filter(([_, value]) => value !== undefined);
  
  if (entries.length === 0) {
    return '';
  }
  
  // For single short prop, keep it inline
  if (entries.length === 1) {
    const [key, value] = entries[0];
    const formatted = formatPropValue(value);
    if (formatted.length < 40) {
      return ` ${key}=${formatted}`;
    }
  }
  
  // For multiple props or long values, format multiline
  return '\n' + entries
    .map(([key, value]) => `${indent}${key}=${formatPropValue(value)}`)
    .join('\n') + '\n';
}

/**
 * Transform story source code to Astro syntax
 * 
 * @param code - The original source code (usually just args object)
 * @param context - The story context with component and args info
 * @returns Formatted Astro component code
 */
export function transformSource(code: string, context: StoryContext): string {
  // If custom source is provided, use it
  if (context.parameters?.docs?.source?.code) {
    return context.parameters.docs.source.code;
  }
  
  const componentName = getComponentName(context);
  const { args } = context;
  
  // Handle empty args
  if (!args || Object.keys(args).length === 0) {
    return `---
import ${componentName} from '../components/${componentName}.astro';
---

<${componentName} />`;
  }
  
  const propsString = formatProps(args);
  const selfClosing = !propsString.includes('\n');
  
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

/**
 * Default export for easy importing
 */
export default transformSource;
