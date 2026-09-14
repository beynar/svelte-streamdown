export { default as Streamdown } from './Streamdown.svelte';
export { useStreamdown, type StreamdownProps } from './context.svelte.js';
export { theme, shadcnTheme, mergeTheme, type Theme } from './theme.js';
export {
	type CodeToken,
	type Extension,
	type StreamdownToken,
	lex,
	parseBlocks
} from './marked/index.js';

export {
	parseIncompleteMarkdown,
	type Plugin,
	IncompleteMarkdownParser
} from './utils/parse-incomplete-markdown.js';
export { defineLanguage, type LanguageDefinition } from '@tanstack/highlight';
export type { HighlightTheme } from '@tanstack/highlight/theme';
