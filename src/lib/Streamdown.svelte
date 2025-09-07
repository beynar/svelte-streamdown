<script lang="ts" module>
	import { getContext, setContext } from 'svelte';

	export interface StreamdownContext
		extends Omit<StreamdownProps, keyof Snippets | 'class' | 'theme' | 'shikiTheme'> {
		snippets: Snippets;
		shikiTheme: [BundledTheme, BundledTheme];
		// make it non optional
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
	import { mergeTheme, type Theme } from './theme.js';
	import type { BundledTheme } from 'shiki';

	let {
		content,
		class: className,
		shikiTheme,
		parseIncompleteMarkdown,
		defaultOrigin,
		allowedLinkPrefixes,
		allowedImagePrefixes,
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
			return shikiTheme || ['github-light', 'github-dark'];
		},
		get snippets() {
			return snippets;
		},
		get theme() {
			return mergeTheme(theme);
		},
		get mermaidConfig() {
			return mermaidConfig;
		}
	});
	const id = $props.id();

	const blocks = $derived(parseMarkdownIntoBlocks(content));
</script>

{#each blocks as block, index (`${id}-block-${index}`)}
	<Block content={block} id={`${id}-block-${index}`} />
{/each}
