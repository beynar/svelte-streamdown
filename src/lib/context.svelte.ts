import type { Component, Snippet, SvelteComponent } from 'svelte';
import type { DeepPartialTheme, Theme } from './theme.js';
import type { RenderOptions } from 'pele';
import type { KatexOptions } from 'katex';
import { getContext, onMount, setContext } from 'svelte';
import type { HighlightTheme } from '@tanstack/highlight/theme';
import type { LanguageDefinition } from '@tanstack/highlight';

/**
 * Every user-visible string the components render themselves. Nested by area,
 * like the theme; `Streamdown` merges the `translations` prop over
 * `defaultTranslations` once so components always read a complete object.
 */
export type Translations = {
	alert: {
		note: string;
		tip: string;
		warning: string;
		caution: string;
		important: string;
	};
	controls: {
		copyCode: string;
		copiedCode: string;
		downloadCode: string;
		copyTable: string;
		copiedTable: string;
		downloadTable: string;
		tableFormatMarkdown: string;
		tableFormatHtml: string;
		tableFormatCsv: string;
		tableFormatTsv: string;
		tableFullscreen: string;
		exitTableFullscreen: string;
		table: string;
		downloadDiagram: string;
		downloadDiagramPng: string;
		downloadDiagramSvg: string;
		downloadDiagramMmd: string;
		zoomIn: string;
		zoomOut: string;
		resetView: string;
		fullscreen: string;
		exitFullscreen: string;
		diagram: string;
		previousCitation: string;
		nextCitation: string;
		blockedUrl: string;
		imageBlocked: string;
		imageNoDescription: string;
		linkBlocked: string;
	};
};

// Alert titles stay lowercase: the theme capitalizes them with CSS.
export const defaultTranslations: Translations = {
	alert: {
		note: 'note',
		tip: 'tip',
		warning: 'warning',
		caution: 'caution',
		important: 'important'
	},
	controls: {
		copyCode: 'Copy code',
		copiedCode: 'Code copied',
		downloadCode: 'Download code',
		copyTable: 'Copy table',
		copiedTable: 'Table copied',
		downloadTable: 'Download table',
		tableFormatMarkdown: 'Markdown',
		tableFormatHtml: 'HTML',
		tableFormatCsv: 'CSV',
		tableFormatTsv: 'TSV',
		tableFullscreen: 'Expand table',
		exitTableFullscreen: 'Collapse table',
		table: 'Table',
		downloadDiagram: 'Download diagram',
		downloadDiagramPng: 'PNG',
		downloadDiagramSvg: 'SVG',
		downloadDiagramMmd: 'MMD',
		zoomIn: 'Zoom in',
		zoomOut: 'Zoom out',
		resetView: 'Zoom to fit',
		fullscreen: 'Expand diagram',
		exitFullscreen: 'Collapse diagram',
		diagram: 'Diagram',
		previousCitation: 'Previous citation',
		nextCitation: 'Next citation',
		blockedUrl: 'Blocked URL',
		imageBlocked: 'Image blocked',
		imageNoDescription: 'No description',
		linkBlocked: 'blocked'
	}
};

export interface StreamdownContext
	extends Omit<
		StreamdownProps,
		keyof Snippets | 'class' | 'theme' | 'highlightTheme' | 'inlineCitationsMode'
	> {
	/** `customTags` + `mdxComponents` keys compiled once; lexer and completer share it. */
	tags: TagMatchers;
	snippets: Snippets;
	highlightTheme: HighlightTheme;
	/** False while rendering a bulk update (a replacement or a paste-sized append); Block captures it per update. */
	animateUpdate: boolean;
	theme: Theme;
	translations: Translations;
	controls: ResolvedControls;
	inlineCitationsMode: 'list' | 'carousel';
	animation: {
		enabled: boolean;
	} & StreamdownProps['animation'];
}
export class StreamdownContext<Source extends Record<string, any> = Record<string, any>> {
	footnotes = {
		refs: new Map<string, FootnoteRef>(),
		footnotes: new Map<string, Footnote>()
	};

	isMounted = false;

	get animationTextStyle() {
		return getContext('POPOVER')
			? undefined
			: this.animation.enabled
				? `animation-name: sd-${this.animation.type};
animation-duration: ${this.animation.duration}ms;
animation-timing-function: ${this.animation.timingFunction};
animation-iteration-count: 1;
animation-fill-mode: forwards;
white-space: pre-wrap;
display: inline-block;
text-decoration: inherit;`
				: undefined;
	}

	get animationBlockStyle() {
		return getContext('POPOVER')
			? undefined
			: this.animation.enabled
				? `animation-name: sd-${this.animation.type};
animation-duration: ${this.animation.duration}ms;
animation-timing-function: ${this.animation.timingFunction};
animation-iteration-count: 1;
animation-fill-mode: forwards;`
				: undefined;
	}

	constructor(
		props: Omit<StreamdownProps, keyof Snippets | 'class' | 'highlightTheme'> & {
			snippets: Snippets<Source>;
			highlightTheme: HighlightTheme;
			animateUpdate: boolean;
			tags: TagMatchers;
		}
	) {
		bind(this, props);
		setContext('streamdown', this);
		if (this.animation.animateOnMount) {
			this.isMounted = true;
		}
		onMount(() => {
			this.isMounted = true;
		});
		$effect(() => {
			this.isMounted = this.animation.enabled;
		});
	}
}
export const useStreamdown = () => {
	const context = getContext<StreamdownContext>('streamdown');
	if (!context) {
		throw new Error('Streamdown context not found');
	}
	return context;
};

import type {
	AlertToken,
	CodeToken,
	MathToken,
	SubSupToken,
	TableToken,
	THead,
	TBody,
	TFoot,
	THeadRow,
	TRow,
	TD,
	TH,
	Extension,
	GenericToken,
	CitationToken,
	MdxToken,
	TagMatchers
} from './marked/index.js';
import type { Tokens } from 'marked';
import type { CsvSeparator } from './utils/table-export.js';
import type { ListItemToken, ListToken } from './marked/marked-list.js';
import type { Footnote, FootnoteRef, FootnoteToken } from './marked/marked-footnotes.js';
import { bind } from './utils/bind.js';
import type {
	DescriptionDetailToken,
	DescriptionListToken,
	DescriptionTermToken,
	DescriptionToken
} from './marked/marked-dl.js';

type TokenSnippet = {
	heading: Tokens.Heading;
	paragraph: Tokens.Paragraph;
	blockquote: Tokens.Blockquote;
	code: Tokens.Code;
	codespan: Tokens.Codespan;
	ul: ListToken;
	ol: ListToken;
	li: ListItemToken;
	table: TableToken;
	thead: THead;
	tbody: TBody;
	tfoot: TFoot;
	tr: THeadRow | TRow;
	td: TD;
	th: TH;
	image: Tokens.Image;
	link: Tokens.Link;
	strong: Tokens.Strong;
	em: Tokens.Em;
	del: Tokens.Del;
	hr: Tokens.Hr;
	br: Tokens.Br;
	math: MathToken;
	alert: AlertToken;
	mermaid: Tokens.Code;
	footnoteRef: FootnoteRef;
	footnotePopover: FootnoteToken;
	sup: SubSupToken;
	sub: SubSupToken;
	descriptionList: DescriptionListToken;
	description: DescriptionToken;
	descriptionTerm: DescriptionTermToken;
	descriptionDetail: DescriptionDetailToken;
	inlineCitation: CitationToken;
	inlineCitationPopover: CitationToken;
	inlineCitationContent: CitationToken;
	inlineCitationPreview: CitationToken;
	mdx: MdxToken;
};

type PredefinedElements = keyof TokenSnippet;

export type Snippets<Source extends Record<string, any> = Record<string, any>> = {
	[K in PredefinedElements]?: Snippet<
		[
			{
				children: Snippet;
				token: TokenSnippet[K];
			} & (K extends 'inlineCitationContent'
				? {
						source: Source;
						key: string;
					}
				: K extends 'mdx'
					? {
							props: Record<string, number | string | boolean | null | undefined>;
						}
					: K extends 'code' | 'mermaid'
						? {
								/** The fence is still streaming: defer expensive work. */
								incomplete: boolean;
							}
						: {})
		]
	>;
};

/** `filename` is the base name; the extension comes from the format. */
type DownloadControl<Token> = boolean | { filename?: string | ((token: Token) => string) };

export type CodeControls =
	| boolean
	| { enabled?: boolean; copy?: boolean; download?: DownloadControl<CodeToken> };

export type TableControls =
	| boolean
	| {
			enabled?: boolean;
			copy?: boolean;
			download?: DownloadControl<TableToken>;
			fullscreen?: boolean;
			csvSeparator?: CsvSeparator;
	  };

/** Mermaid's own settings object (`flowchart`, `sequence`, `gantt`…), forwarded to pele as `config`. */
export type MermaidConfig = NonNullable<RenderOptions['config']>;

/** pele's `RenderOptions`, minus what the Mermaid component sets itself. */
export type PeleOptions = Omit<RenderOptions, 'config' | 'idPrefix' | 'responsive' | 'maxWidth'>;

export type MermaidControls =
	| boolean
	| { enabled?: boolean; download?: DownloadControl<CodeToken>; mouseWheelZoom?: boolean };

export type Controls =
	| boolean
	| { code?: CodeControls; table?: TableControls; mermaid?: MermaidControls };

/** What `Streamdown.svelte` flattens `controls` into, so components stay dumb. */
export type ResolvedControls = {
	code: boolean;
	codeCopy: boolean;
	codeDownload: boolean;
	codeDownloadFilename: string | ((token: CodeToken) => string);
	table: boolean;
	tableCopy: boolean;
	tableDownload: boolean;
	tableDownloadFilename: string | ((token: TableToken) => string);
	tableFullscreen: boolean;
	tableCsvSeparator: CsvSeparator;
	mermaid: boolean;
	mermaidDownload: boolean;
	mermaidDownloadFilename: string | ((token: CodeToken) => string);
	mermaidMouseWheelZoom: boolean;
};

export type StreamdownProps<Source extends Record<string, any> = Record<string, any>> = {
	streamdown?: StreamdownContext;
	static?: boolean;
	sources?: {
		[key: string]: Source;
	};
	// Default mode is carousel
	inlineCitationsMode?: 'list' | 'carousel';
	element?: HTMLElement;
	content: string;
	class?: string;
	parseIncompleteMarkdown?: boolean;
	// Security props
	defaultOrigin?: string;
	allowedLinkPrefixes?: string[];
	allowedImagePrefixes?: string[];

	// Theme
	theme?: DeepPartialTheme;
	baseTheme?: 'tailwind' | 'shadcn';
	mergeTheme?: boolean;
	highlightTheme?: string;
	highlightLanguages?: LanguageDefinition[];
	highlightThemes?: Record<string, HighlightTheme>;
	/**
	 * Mermaid settings, as in a diagram's frontmatter or `%%{init}%%` directive
	 * (which override them). Rendered by pele: `theme` and `themeVariables` do
	 * not apply, colours come from the `--pele-*` CSS variables.
	 */
	mermaidConfig?: MermaidConfig;
	/** Render options passed to pele: limits, link and image schemes, icons, fonts. */
	peleOptions?: PeleOptions;
	katexConfig?: KatexOptions | ((inline: boolean) => KatexOptions);
	/** Partial overrides; unset keys fall back to `defaultTranslations`. */
	translations?: { [K in keyof Translations]?: Partial<Translations[K]> };
	controls?: Controls;
	/**
	 * Number the lines of every code block. Default false — upstream defaults it on,
	 * but turning it on here would change every existing render. A fence can flip it
	 * either way with a `lineNumbers` / `noLineNumbers` meta word, and start at N with
	 * `startLine=N`.
	 */
	lineNumbers?: boolean;
	// CSS lengths (e.g. '24rem'). Undefined leaves the element unbounded, as before.
	codeBlockMaxHeight?: string;
	tableMaxHeight?: string;
	renderHtml?: boolean | ((token: Tokens.HTML | Tokens.Tag) => string);

	animation?: {
		animateOnMount?: boolean;
		enabled?: boolean;
		type?: 'fade' | 'blur' | 'slideUp' | 'slideDown';
		duration?: number;
		timingFunction?: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';
		tokenize?: 'word' | 'char';
	};
	icons?: {
		copy?: Snippet;
		download?: Snippet;
		fullscreen?: Snippet;
		close?: Snippet;
		zoomIn?: Snippet;
		zoomOut?: Snippet;
		fitView?: Snippet;
		note?: Snippet;
		tip?: Snippet;
		warning?: Snippet;
		caution?: Snippet;
		important?: Snippet;
		chevronLeft?: Snippet;
		chevronRight?: Snippet;
		check?: Snippet;
	};
	extensions?: Extension[];
	/**
	 * Extra tag names the MDX tokenizer accepts on top of PascalCase, so
	 * `<ai-thinking>**bold**</ai-thinking>` becomes a component with parsed
	 * children instead of a literal html block. Keys of `mdxComponents` are
	 * allowed automatically; nothing else lowercase is, so real HTML is untouched.
	 */
	customTags?: string[];
	/** Tags whose children render verbatim — no Markdown, `**` and `_` left alone. */
	literalTagContent?: string[];
	/**
	 * Dedent pretty-printed HTML before parsing, so a nested `<div>` indented four
	 * spaces after a blank line is not read as an indented code block. Off by
	 * default: dedenting is lossy, and `<pre>`/`<code>` bodies are never touched.
	 */
	normalizeHtmlIndentation?: boolean;
	children?: Snippet<[{ streamdown: StreamdownContext; token: GenericToken; children: Snippet }]>;
	mdxComponents?: Record<
		string,
		Component<
			{
				token: MdxToken;
				children: Snippet;
				props: any;
			},
			any,
			any
		>
	>;
	components?: {
		code?: Component<
			{ token: Tokens.Code; id: string; incomplete: boolean; animate: boolean },
			any,
			any
		>;
		mermaid?: Component<
			{ token: Tokens.Code; id: string; incomplete: boolean; animate: boolean },
			any,
			any
		>;
		math?: Component<{ token: MathToken; id: string }, any, any>;
	};
} & Partial<Snippets<Source>>;
