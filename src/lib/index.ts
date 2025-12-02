export { default as Streamdown } from './Streamdown.svelte';
export { useStreamdown, type StreamdownProps } from './context.svelte.js';
export { theme, shadcnTheme, mergeTheme, type Theme } from './theme.js';
export { type Extension, type StreamdownToken, lex, parseBlocks } from './marked/index.js';

export {
	parseIncompleteMarkdown,
	type Plugin,
	IncompleteMarkdownParser
} from './utils/parse-incomplete-markdown.js';
export {
	bundledLanguagesInfo,
	createLanguageSet,
	type LanguageInfo
} from './utils/bundledLanguages.js';
