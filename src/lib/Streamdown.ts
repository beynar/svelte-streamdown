import type { BundledTheme } from 'shiki';
import type { Snippet } from 'svelte';
import type { Element, Parents } from 'hast';
import type { PluggableList } from 'unified';
import type { Options as RemarkRehypeOptions } from 'remark-rehype';
import type { Theme } from './theme.js';
import type { MermaidConfig } from 'mermaid';
import type { KatexOptions } from 'katex';
import type { ElementProps } from './Elements/element.js';

export type Snippets = {
	a?: Snippet<[ElementProps]>;
	h1?: Snippet<[ElementProps]>;
	h2?: Snippet<[ElementProps]>;
	h3?: Snippet<[ElementProps]>;
	h4?: Snippet<[ElementProps]>;
	h5?: Snippet<[ElementProps]>;
	h6?: Snippet<[ElementProps]>;
	p?: Snippet<[ElementProps]>;
	code?: Snippet<[ElementProps]>;
	inlineCode?: Snippet<[ElementProps]>;
	img?: Snippet<[ElementProps]>;
	ul?: Snippet<[ElementProps]>;
	ol?: Snippet<[ElementProps]>;
	li?: Snippet<[ElementProps]>;
	hr?: Snippet<[ElementProps]>;
	alert?: Snippet<[ElementProps]>;
	strong?: Snippet<[ElementProps]>;
	blockquote?: Snippet<[ElementProps]>;
	table?: Snippet<[ElementProps]>;
	thead?: Snippet<[ElementProps]>;
	tbody?: Snippet<[ElementProps]>;
	tr?: Snippet<[ElementProps]>;
	th?: Snippet<[ElementProps]>;
	td?: Snippet<[ElementProps]>;
	sup?: Snippet<[ElementProps]>;
	sub?: Snippet<[ElementProps]>;
	pre?: Snippet<[ElementProps]>;
	mermaid?: Snippet<[ElementProps]>;
	math?: Snippet<[ElementProps]>;
	inlineMath?: Snippet<[ElementProps]>;
	em?: Snippet<[ElementProps]>;
	del?: Snippet<[ElementProps]>;
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
	shikiTheme?: BundledTheme;
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
} & Snippets;
