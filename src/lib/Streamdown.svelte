<script lang="ts">
	import Block from './Block.svelte';
	import { StreamdownContext, type StreamdownProps } from './Streamdown.js';
	import 'katex/dist/katex.min.css';
	import { mergeTheme, shadcnTheme } from './theme.js';
	import { parseBlocks } from './marked/index.js';

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
		streamdown = $bindable(),
		...snippets
	}: StreamdownProps = $props();

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
		get shikiPreloadThemes() {
			return shikiPreloadThemes;
		}
	});

	const id = $props.id();

	const blocks = $derived(parseBlocks(content));
</script>

<div class={className}>
	{#each blocks as block, index (`${id}-block-${index}`)}
		<Block {block} />
	{/each}
</div>
