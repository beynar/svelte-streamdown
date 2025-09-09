<script lang="ts" module>
	import { getContext, setContext } from 'svelte';

	export interface StreamdownContext
		extends Omit<StreamdownProps, keyof Snippets | 'class' | 'theme' | 'shikiTheme'> {
		snippets: Snippets;
		shikiTheme: BundledTheme;
		theme: Theme;
	}
	export class StreamdownContext {
		constructor(props: Omit<StreamdownProps, keyof Snippets | 'class'> & { snippets: Snippets }) {
			bind(this, props);
			setContext('streamdown', this);
		}
	}
	export const useStreamdown = () => {
		const context = getContext<StreamdownContext>('streamdown');
		if (!context) {
			throw new Error('Streamdown context not found');
		}
		return context;
	};
</script>

<script lang="ts">
	import Block from './Block.svelte';
	import type { Snippets, StreamdownProps } from './Streamdown.js';
	import { bind } from './utils/bind.js';
	import { parseMarkdownIntoBlocks } from './utils/parse-blocks.js';
	import 'katex/dist/katex.min.css';
	import { mergeTheme, type Theme, shadcnTheme } from './theme.js';
	import type { BundledTheme } from 'shiki';
	import { highlighter } from './hightlighter.svelte.js';

	let {
		content = '',
		class: className,
		shikiTheme,
		shikiPreloadThemes,
		parseIncompleteMarkdown,
		defaultOrigin,
		allowedLinkPrefixes = ['*'],
		allowedImagePrefixes = ['*'],
		allowElement,
		allowedElements,
		disallowedElements,
		skipHtml,
		unwrapDisallowed,
		urlTransform,
		remarkPlugins,
		remarkRehypeOptions,
		rehypePlugins,
		theme,
		mermaidConfig,
		katexConfig,
		translations,
		baseTheme,
		mergeTheme: shouldMergeTheme = true,
		customElements,
		...snippets
	}: StreamdownProps = $props();

	const streamdownContext = new StreamdownContext({
		get content() {
			return content;
		},
		get parseIncompleteMarkdown() {
			return parseIncompleteMarkdown;
		},
		get defaultOrigin() {
			return defaultOrigin;
		},
		get allowedLinkPrefixes() {
			return allowedLinkPrefixes;
		},
		get allowedImagePrefixes() {
			return allowedImagePrefixes;
		},
		get allowElement() {
			return allowElement;
		},
		get allowedElements() {
			return allowedElements;
		},
		get disallowedElements() {
			return disallowedElements;
		},
		get skipHtml() {
			return skipHtml;
		},
		get unwrapDisallowed() {
			return unwrapDisallowed;
		},
		get urlTransform() {
			return urlTransform;
		},
		get remarkPlugins() {
			return remarkPlugins;
		},
		get remarkRehypeOptions() {
			return remarkRehypeOptions;
		},
		get rehypePlugins() {
			return rehypePlugins;
		},
		get shikiTheme() {
			return shikiTheme || 'github-light';
		},
		get snippets() {
			return snippets;
		},
		get theme() {
			return shouldMergeTheme
				? mergeTheme(theme, baseTheme)
				: theme || (baseTheme === 'shadcn' ? shadcnTheme : theme);
		},
		get baseTheme() {
			return baseTheme;
		},
		get mermaidConfig() {
			return mermaidConfig;
		},
		get katexConfig() {
			return katexConfig;
		},
		get translations() {
			return translations;
		},
		get customElements() {
			return customElements;
		}
	});
	const id = $props.id();

	const blocks = $derived(parseMarkdownIntoBlocks(content));

	// Preload themes if specified to avoid flickering
	$effect(() => {
		if (shikiPreloadThemes && shikiPreloadThemes.length > 0) {
			highlighter.preloadThemes(shikiPreloadThemes);
		}
	});
</script>

{#each blocks as block, index (`${id}-block-${index}`)}
	<Block {block} />
{/each}
