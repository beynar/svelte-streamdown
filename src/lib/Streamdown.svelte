<script lang="ts" generics="Source extends Record<string, any> = Record<string, any>">
	import Block from './Block.svelte';
	import {
		StreamdownContext,
		defaultTranslations,
		type StreamdownProps
	} from './context.svelte.js';
	import { mergeTheme, shadcnTheme } from './theme.js';
	import { parseBlocks, createParseBlocksCache } from './marked/index.js';
	import { hasUnclosedFence } from './utils/fence.js';

	let {
		content = '',
		class: className,
		highlightTheme,
		highlightLanguages,
		highlightThemes,
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
		codeBlockMaxHeight,
		tableMaxHeight,
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
	import { resolveHighlightTheme } from '$lib/utils/highlightThemes.js';

	const darkMode = useDarkMode();

	const resolvedHighlightTheme = $derived(
		resolveHighlightTheme(highlightTheme, highlightThemes, darkMode.current)
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
		get highlightTheme() {
			return resolvedHighlightTheme;
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
			// Resolved once, like the theme, so components never fall back themselves.
			return {
				alert: { ...defaultTranslations.alert, ...translations?.alert },
				controls: { ...defaultTranslations.controls, ...translations?.controls }
			};
		},
		get highlightLanguages() {
			return highlightLanguages;
		},
		get highlightThemes() {
			return highlightThemes;
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
			// `controls` is sugar: `false` turns every control off, `true`/undefined
			// turns them all on, and each section is a boolean or an object of the
			// same shape. Flatten it once here so components stay boolean lookups.
			const sections = typeof controls === 'object' && controls !== null ? controls : {};
			const resolve = (section: boolean | Record<string, any> | undefined) => {
				const config = typeof section === 'object' && section !== null ? section : {};
				const enabled = controls === false || section === false ? false : (config.enabled ?? true);
				const download = config.download;
				return {
					enabled,
					copy: enabled && config.copy !== false,
					download: enabled && download !== false,
					filename:
						typeof download === 'object' && download !== null ? download.filename : undefined
				};
			};
			const code = resolve(sections.code);
			const table = resolve(sections.table);
			const mermaid = resolve(sections.mermaid);
			const tableSection =
				typeof sections.table === 'object' && sections.table ? sections.table : {};
			const mermaidSection =
				typeof sections.mermaid === 'object' && sections.mermaid ? sections.mermaid : {};
			return {
				code: code.enabled,
				codeCopy: code.copy,
				codeDownload: code.download,
				codeDownloadFilename: code.filename ?? 'file',
				table: table.enabled,
				tableCopy: table.copy,
				tableDownload: table.download,
				tableDownloadFilename: table.filename ?? 'table',
				tableCsvSeparator: tableSection.csvSeparator ?? ',',
				mermaid: mermaid.enabled,
				mermaidDownload: mermaid.download,
				mermaidDownloadFilename: mermaid.filename ?? 'diagram',
				// Wheel zoom is a gesture, not a button: it stays on unless it is
				// turned off explicitly or every control is.
				mermaidMouseWheelZoom: controls !== false && mermaidSection.mouseWheelZoom !== false
			};
		},
		get codeBlockMaxHeight() {
			return codeBlockMaxHeight;
		},
		get tableMaxHeight() {
			return tableMaxHeight;
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

	// Per-instance incremental state: append-only content updates re-lex only
	// the last couple of blocks instead of the whole document.
	const blocksCache = createParseBlocksCache();
	const blocks = $derived(
		isStatic ? content : parseBlocks(content, streamdown.extensions, blocksCache)
	);

	// Only the tail of a live stream can be mid-fence — a static render is finished
	// by definition. Computed once here, not per block or per token.
	const lastBlockIncomplete = $derived(
		!isStatic && blocks.length > 0 && hasUnclosedFence(blocks[blocks.length - 1])
	);
</script>

<div bind:this={element} class={className}>
	{#if isStatic}
		<Block static={isStatic} block={content} />
	{:else}
		{#each blocks as block, index (`${id}-block-${index}`)}
			<Block
				static={isStatic}
				{block}
				incomplete={lastBlockIncomplete && index === blocks.length - 1}
			/>
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
