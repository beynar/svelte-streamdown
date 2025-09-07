import type { Snippet } from 'svelte';

import type { Element as HastElement } from 'hast';

export type ElementProps<T = {}> = {
	children: Snippet;
	node: HastElement;
} & T &
	Record<string, any>;

export type AnchorProps = ElementProps & {
	href: string;
};

export type AnchorSnippetProps = AnchorProps & {
	target: string;
	rel: string;
};

export type ImageProps = ElementProps & {
	src: string;
	alt: string;
};

export type ImageSnippetProps = ImageProps;

export type HeadingProps = ElementProps;

export type ListProps = ElementProps;

export type ListItemProps = ElementProps;

export type ParagraphProps = ElementProps;

export type BlockquoteProps = ElementProps;

export type TableProps = ElementProps;

export type TableRowProps = ElementProps;

export type TableCellProps = ElementProps;

export type TableHeaderCellProps = ElementProps;

export type CodeProps = ElementProps & {
	className?: string;
};

export type PreProps = ElementProps;

export type StrongProps = ElementProps;

export type EmphasisProps = ElementProps;

export type SubscriptProps = ElementProps;

export type SuperscriptProps = ElementProps;

export type HorizontalRuleProps = ElementProps;

export type MermaidProps = ElementProps;

export type MathProps = ElementProps;
