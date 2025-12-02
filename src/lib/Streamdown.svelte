<script lang="ts" generics="Source extends Record<string, any> = Record<string, any>">
	import Block from './Block.svelte';
	import { StreamdownContext, type StreamdownProps } from './context.svelte.js';
	import { mergeTheme, shadcnTheme } from './theme.js';
	import { parseBlocks } from './marked/index.js';

	let {
		content = '',
		class: className,
		shikiTheme,
		shikiLanguages,
		shikiThemes,
		parseIncompleteMarkdown,
		defaultOrigin,
		allowedLinkPrefixes = ['*'],
		allowedImagePrefixes = ['*'],
		theme,
		mermaidConfig = {},
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
		mdxComponents,
		components,
		static: isStatic,
		...snippets
	}: StreamdownProps<Source> = $props();
	import { useDarkMode } from '$lib/utils/darkMode.svelte.js';

	const darkMode = useDarkMode();

	const shikiThemedTheme = $derived(
		shikiThemes ? Object.keys(shikiThemes)[0] : darkMode.current ? 'github-dark' : 'github-light'
	);

	const mermaidThemedTheme = $derived(
		mermaidConfig?.theme ? mermaidConfig.theme : darkMode.current ? 'dark' : 'default'
	);

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
			return shikiTheme || shikiThemedTheme;
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
			return {
				theme: mermaidThemedTheme,
				...mermaidConfig
			};
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
		get shikiLanguages() {
			return shikiLanguages;
		},
		get shikiThemes() {
			return shikiThemes;
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
		},
		get mdxComponents() {
			return mdxComponents;
		},
		get components() {
			return components;
		}
	});

	const id = $props.id();

	const blocks = $derived(isStatic ? content : parseBlocks(content, streamdown.extensions));
</script>

<div bind:this={element} class={className}>
	{#if isStatic}
		<Block static={isStatic} block={content} />
	{:else}
		{#each blocks as block, index (`${id}-block-${index}`)}
			<Block static={isStatic} {block} />
		{/each}
	{/if}
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
