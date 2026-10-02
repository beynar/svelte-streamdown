<script lang="ts" generics="Source extends Record<string, any> = Record<string, any>">
	import Block from './Block.svelte';
	import {
		StreamdownContext,
		defaultTranslations,
		type StreamdownProps
	} from './context.svelte.js';
	import { mergeTheme, shadcnTheme } from './theme.js';
	import {
		parseBlocks,
		createParseBlocksCache,
		compileTags,
		DEFAULT_TAGS
	} from './marked/index.js';
	import { normalizeHtmlIndentation as dedentHtml } from './utils/normalize-html-indentation.js';
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
		lineNumbers = false,
		animation,
		element = $bindable(),
		icons,
		children,
		extensions,
		sources,
		inlineCitationsMode = 'carousel',
		mdxComponents,
		customTags,
		literalTagContent,
		normalizeHtmlIndentation = false,
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

	// Per-instance incremental state: append-only content updates re-lex only
	// the last couple of blocks instead of the whole document.
	const blocksCache = createParseBlocksCache();

	// One compile per allowlist identity, shared by the lexer and the streaming
	// completer so the two can never disagree about what counts as a tag.
	const tags = $derived.by(() => {
		const names = [...(customTags ?? []), ...Object.keys(mdxComponents ?? {})];
		// With nothing to compile, share DEFAULT_TAGS: the lexer options cache is
		// keyed on this object, so a private copy per instance would rebuild and
		// retain its own ~20 tokenizer registrations for no reason.
		return names.length === 0 && !literalTagContent?.length
			? DEFAULT_TAGS
			: compileTags(names, literalTagContent);
	});

	const source = $derived(normalizeHtmlIndentation ? dedentHtml(content) : content);

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
		get animateUpdate() {
			// A streamed chunk keeps animating; a replacement or a bulk append (the
			// demo's "Show All" is an append of 95% of the document) renders plain.
			// The first parse stays animatable so `animateOnMount` keeps its meaning.
			return blocksCache.lastUpdate !== 'bulk';
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
				tableFullscreen: table.enabled && tableSection.fullscreen !== false,
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
		get lineNumbers() {
			return lineNumbers;
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
		get tags() {
			return tags;
		},
		get components() {
			return components;
		}
	});

	const id = $props.id();

	const blocks = $derived(
		isStatic ? source : parseBlocks(source, streamdown.extensions, blocksCache, tags)
	);

	// Only the tail of a live stream can be mid-fence — a static render is finished
	// by definition. Computed once here, not per block or per token.
	const lastBlockIncomplete = $derived(
		!isStatic && blocks.length > 0 && hasUnclosedFence(blocks[blocks.length - 1])
	);
</script>

<div bind:this={element} class={className}>
	{#if isStatic}
		<Block static={isStatic} block={source} />
	{:else}
		{#each blocks as block, index (`${id}-block-${index}`)}
			<Block
				static={isStatic}
				{block}
				live={index === blocks.length - 1}
				incomplete={lastBlockIncomplete && index === blocks.length - 1}
			/>
		{/each}
	{/if}
</div>

<style global>
	:global {
		/* Line numbers: a counter on the line span that already exists (why it is
		   here and not in the theme: see resolveLineNumbers). CSS ships as a string
		   at runtime, so keep this short. */
		[data-streamdown-code] pre[data-line-numbers] > code > span {
			counter-increment: sd-line;
		}

		[data-streamdown-code] pre[data-line-numbers] > code > span::before {
			content: counter(sd-line);
		}

		/* Lives here, not in Mermaid.svelte: the table overlay needs it on pages
		   that never render a diagram. Global, so it only matches elements Streamdown
		   marks as expandable: `data-expanded` is a common attribute name on the
		   host page. `:where` keeps the specificity of a bare attribute selector. */
		:where([data-streamdown-expandable])[data-expanded='true'] {
			position: fixed;
			top: 16px;
			left: 16px;
			width: calc(100vw - 32px);
			height: calc(100vh - 32px);
			z-index: 2147483647;
			margin: 0px;
		}

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
