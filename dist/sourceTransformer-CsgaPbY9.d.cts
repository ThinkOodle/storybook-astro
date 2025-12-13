/**
 * Source code transformer for Astro components in Storybook docs
 *
 * Transforms story args into proper Astro component syntax for display
 * in the "Show code" panel.
 */
interface StoryContext {
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
 * Transform story source code to Astro syntax
 *
 * @param code - The original source code (usually just args object)
 * @param context - The story context with component and args info
 * @returns Formatted Astro component code
 */
declare function transformSource(code: string, context: StoryContext): string;

export { transformSource as t };
