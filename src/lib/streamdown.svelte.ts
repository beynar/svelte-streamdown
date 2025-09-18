import type { BundledTheme } from 'shiki';
import type { Snippet } from 'svelte';
import type { Theme } from './theme.js';
import type { MermaidConfig } from 'mermaid';
import type { KatexOptions } from 'katex';
import { getContext, onMount, setContext } from 'svelte';

export interface StreamdownContext
	extends Omit<StreamdownProps, keyof Snippets | 'class' | 'theme' | 'shikiTheme'> {
	snippets: Snippets;
	shikiTheme: BundledTheme;
	theme: Theme;
	controls: {
		code: boolean;
		mermaid: boolean;
	};
	animation: {
		enabled: boolean;
	} & StreamdownProps['animation'];
}
export class StreamdownContext {
	footnotes = {
		refs: new Map<string, FootnoteRef>(),
		footnotes: new Map<string, Footnote>()
	};

	isMounted = $state(false);

	animationTextStyle = $derived(
		`animation-name: sd-${this.animation.type};
animation-duration: ${this.animation.duration}ms;
animation-timing-function: ${this.animation.timingFunction};
animation-iteration-count: 1;
animation-fill-mode: forwards;
white-space: pre-wrap;
display: inline-block;`
	);

	animationBlockStyle = $derived(
		`animation-name: sd-${this.animation.type};
animation-duration: ${this.animation.duration}ms;
animation-timing-function: ${this.animation.timingFunction};
animation-iteration-count: 1;
animation-fill-mode: forwards;`
	);

	constructor(props: Omit<StreamdownProps, keyof Snippets | 'class'> & { snippets: Snippets }) {
		bind(this, props);
		setContext('streamdown', this);
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
	MathToken,
	SubSupToken,
	TableToken,
	THead,
	TBody,
	TFoot,
	THeadRow,
	TRow,
	TD,
	TH
} from './marked/index.js';
import type { Tokens } from 'marked';
import type { ListItemToken, ListToken } from './marked/marked-list.js';
import type { Footnote, FootnoteRef, FootnoteToken } from './marked/marked-footnotes.js';
import { bind } from './utils/bind.js';

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
};

type PredefinedElements = keyof TokenSnippet;

export type Snippets = {
	[K in PredefinedElements]?: Snippet<
		[
			{
				children: Snippet;
				token: TokenSnippet[K];
			}
		]
	>;
};

export type StreamdownProps = {
	streamdown?: StreamdownContext;
	element?: HTMLElement;
	content: string;
	class?: string;
	parseIncompleteMarkdown?: boolean;
	// Security props
	defaultOrigin?: string;
	allowedLinkPrefixes?: string[];
	allowedImagePrefixes?: string[];

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
	controls?: {
		code?: boolean;
		mermaid?: boolean;
	};
	renderHtml?: boolean | ((token: Tokens.HTML | Tokens.Tag) => string);

	animation?: {
		enabled?: boolean;
		type?: 'fade' | 'blur' | 'typewriter' | 'slideUp' | 'slideDown';
		duration?: number;
		timingFunction?: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';
		tokenize?: 'word' | 'char';
	};
} & Partial<Snippets>;
