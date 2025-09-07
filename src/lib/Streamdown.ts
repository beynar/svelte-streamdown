import type { BundledTheme } from 'shiki';
import type { Snippet } from 'svelte';
import type { Element, Parents } from 'hast';
import type { PluggableList } from 'unified';
import type { Options as RemarkRehypeOptions } from 'remark-rehype';
import type { Theme } from './theme.js';
import type { MermaidConfig } from 'mermaid';

type SnippetProps = {
	children: Snippet;
};
export type Snippets = {
	a?: Snippet<[SnippetProps]>;
	h1?: Snippet<[SnippetProps]>;
	inlineCode?: Snippet<[SnippetProps]>;
	h2?: Snippet<[SnippetProps]>;
	h3?: Snippet<[SnippetProps]>;
	h4?: Snippet<[SnippetProps]>;
	h5?: Snippet<[SnippetProps]>;
	h6?: Snippet<[SnippetProps]>;
	p?: Snippet<[SnippetProps]>;
	code?: Snippet<[SnippetProps]>;
	img?: Snippet<[SnippetProps]>;
	ul?: Snippet<[SnippetProps]>;
	ol?: Snippet<[SnippetProps]>;
	li?: Snippet<[SnippetProps]>;
	hr?: Snippet<[SnippetProps]>;
	strong?: Snippet<[SnippetProps]>;
	blockquote?: Snippet<[SnippetProps]>;
	table?: Snippet<[SnippetProps]>;
	thead?: Snippet<[SnippetProps]>;
	tbody?: Snippet<[SnippetProps]>;
	tr?: Snippet<[SnippetProps]>;
	th?: Snippet<[SnippetProps]>;
	td?: Snippet<[SnippetProps]>;
	sup?: Snippet<[SnippetProps]>;
	sub?: Snippet<[SnippetProps]>;
	pre?: Snippet<[SnippetProps]>;
	mermaid?: Snippet<[SnippetProps]>;
	math?: Snippet<[SnippetProps]>;
	inlineMath?: Snippet<[SnippetProps]>;
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
	shikiTheme?: [BundledTheme, BundledTheme];
	mermaidConfig?: MermaidConfig;
} & Snippets;
