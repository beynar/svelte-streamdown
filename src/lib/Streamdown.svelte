<script lang="ts" generics="Source extends Record<string, any> = Record<string, any>">
	import Block from './Block.svelte';
	import { StreamdownContext, type StreamdownProps } from './context.svelte.js';
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
		renderHtml,
		controls,
		animation,
		element = $bindable(),
		icons,
		children,
		extensions,
		sources,
		inlineCitationsMode = 'carousel',
		...snippets
	}: StreamdownProps<Source> = $props();

	streamdown = new StreamdownContext({
		get element() {
			return element;
		},
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
		get renderHtml() {
			return renderHtml;
		},
		get translations() {
			return translations;
		},
		get shikiPreloadThemes() {
			return shikiPreloadThemes;
		},
		get sources() {
			return sources;
		},
		get inlineCitationsMode() {
			return inlineCitationsMode;
		},
		get animation() {
			if (!animation?.enabled)
				return {
					enabled: false
				};
			return {
				enabled: true,
				animateOnMount: animation.animateOnMount ?? false,
				type: animation.type || 'blur',
				duration: animation.duration || 500,
				timingFunction: animation.timingFunction || 'ease-in',
				tokenize: animation.tokenize || 'word'
			};
		},
		get controls() {
			const codeControls = controls?.code ?? true;
			const mermaidControls = controls?.mermaid ?? true;
			const tableControls = controls?.table ?? true;
			return {
				code: codeControls,
				mermaid: mermaidControls,
				table: tableControls
			};
		},
		get children() {
			return children;
		},
		get extensions() {
			return extensions;
		},
		get icons() {
			return icons;
		}
	});

	const id = $props.id();

	const blocks = $derived(parseBlocks(content, streamdown.extensions));
</script>

<div bind:this={element} class={className}>
	{#each blocks as block, index (`${id}-block-${index}`)}
		<Block {block} />
	{/each}
</div>

<style global>
	:global {
		@keyframes sd-fade {
			from {
				opacity: 0;
			}
			to {
				opacity: 1;
			}
		}

		@keyframes sd-blur {
			from {
				opacity: 0;
				filter: blur(5px);
			}
			to {
				opacity: 1;
				filter: blur(0px);
			}
		}

		@keyframes sd-slideUp {
			from {
				transform: translateY(10%);
				opacity: 0;
			}
			to {
				transform: translateY(0);
				opacity: 1;
			}
		}

		@keyframes sd-slideDown {
			from {
				transform: translateY(-10%);
				opacity: 0;
			}
			to {
				transform: translateY(0);
				opacity: 1;
			}
		}
	}
</style>
