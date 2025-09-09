import type { BundledTheme } from 'shiki';
import type { Snippet } from 'svelte';
import type { Element, Parents } from 'hast';
import type { PluggableList } from 'unified';
import type { Options as RemarkRehypeOptions } from 'remark-rehype';
import type { Theme } from './theme.js';
import type { MermaidConfig } from 'mermaid';
import type { KatexOptions } from 'katex';
import type { ElementProps } from './Elements/element.js';

type PredefinedElements =
	| 'a'
	| 'h1'
	| 'h2'
	| 'h3'
	| 'h4'
	| 'h5'
	| 'h6'
	| 'p'
	| 'code'
	| 'inlineCode'
	| 'img'
	| 'ul'
	| 'ol'
	| 'li'
	| 'hr'
	| 'alert'
	| 'strong'
	| 'blockquote'
	| 'table'
	| 'thead'
	| 'tbody'
	| 'tr'
	| 'th'
	| 'td'
	| 'sup'
	| 'sub'
	| 'pre'
	| 'mermaid'
	| 'math'
	| 'inlineMath'
	| 'em'
	| 'del';
export type Snippets = {
	[K in PredefinedElements]?: Snippet<[ElementProps]>;
};

/**
 * Filter elements callback type
 */
export type AllowElement = (
	element: Readonly<Element>,
	index: number,
	parent: Readonly<Parents> | undefined
) => boolean | null | undefined;

/**
 * URL transform callback type
 */
export type UrlTransform = (
	url: string,
	key: string,
	node: Readonly<Element>
) => string | null | undefined;

export type StreamdownProps = {
	content: string;
	class?: string;
	parseIncompleteMarkdown?: boolean;
	// Security props
	defaultOrigin?: string;
	allowedLinkPrefixes?: string[];
	allowedImagePrefixes?: string[];

	// Unified props
	remarkPlugins?: PluggableList;
	remarkRehypeOptions?: RemarkRehypeOptions;
	rehypePlugins?: PluggableList;

	// Element filtering and security (adapted from react-markdown)
	allowElement?: AllowElement | null;
	allowedElements?: readonly string[] | null;
	disallowedElements?: readonly string[] | null;
	skipHtml?: boolean;
	unwrapDisallowed?: boolean;
	urlTransform?: UrlTransform | null;

	// Theme
	theme?: Partial<Theme>;
	baseTheme?: 'tailwind' | 'shadcn';
	mergeTheme?: boolean;
	shikiTheme?: BundledTheme;
	shikiPreloadThemes?: BundledTheme[];
	mermaidConfig?: MermaidConfig;
	katexConfig?: KatexOptions | ((inline: boolean) => KatexOptions);

	translations?: {
		alert?: {
			note?: string;
			tip?: string;
			warning?: string;
			caution?: string;
			important?: string;
		};
	};
	customElements?: Record<string, Snippet<[ElementProps]>>;
} & Partial<Snippets>;
