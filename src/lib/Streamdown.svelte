<script lang="ts" module>
	import { getContext, setContext } from 'svelte';

	export interface StreamdownContext
		extends Omit<StreamdownProps, keyof Snippets | 'class' | 'theme' | 'shikiTheme'> {
		snippets: Snippets;
		shikiTheme: BundledTheme;
		theme: Theme;
	}
	export class StreamdownContext {
		footnotes = {
			refs: new Map<string, FootnoteRef>(),
			footnotes: new Map<string, Footnote>()
		};
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
	import 'katex/dist/katex.min.css';
	import { mergeTheme, type Theme, shadcnTheme } from './theme.js';
	import type { BundledTheme } from 'shiki';
	import { parseBlocks } from './marked/index.js';
	import { SvelteMap } from 'svelte/reactivity';
	import type { FootnoteRef } from './marked/marked-footnotes.js';
	import type { Footnote } from './marked/marked-footnotes.js';
	let {
		content = '',
		class: className,
		shikiTheme,
		shikiPreloadThemes,
		parseIncompleteMarkdown,
		defaultOrigin,
		allowedLinkPrefixes = ['*'],
		allowedImagePrefixes = ['*'],
		theme,
		mermaidConfig,
		katexConfig,
		translations,
		baseTheme,
		mergeTheme: shouldMergeTheme = true,
		customElements,
		streamdown = $bindable(),
		...snippets
	}: StreamdownProps = $props();

	console.log('render');

	streamdown = new StreamdownContext({
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
		},
		get shikiPreloadThemes() {
			return shikiPreloadThemes;
		}
	});

	const id = $props.id();

	const blocks = $derived(parseBlocks(content));
</script>

{#each blocks as block, index (`${id}-block-${index}`)}
	<Block {block} />
{/each}
