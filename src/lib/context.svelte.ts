import type { Snippet } from 'svelte';
import type { DeepPartialTheme, Theme } from './theme.js';
import type { MermaidConfig } from 'mermaid';
import type { KatexOptions } from 'katex';
import { getContext, onMount, setContext } from 'svelte';
import type { BundledTheme } from 'shiki';

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
		props: Omit<StreamdownProps, keyof Snippets | 'class'> & { snippets: Snippets<Source> }
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
	CitationToken
} from './marked/index.js';
import type { Tokens } from 'marked';
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
				: {})
		]
	>;
};

export type StreamdownProps<Source extends Record<string, any> = Record<string, any>> = {
	streamdown?: StreamdownContext;
	sources?: {
		[key: string]: Source;
	};
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
		zoomIn?: Snippet;
		zoomOut?: Snippet;
		fitView?: Snippet;
		note?: Snippet;
		tip?: Snippet;
		warning?: Snippet;
		caution?: Snippet;
		important?: Snippet;
	};
	extensions?: Extension[];
	children?: Snippet<[{ streamdown: StreamdownContext; token: GenericToken; children: Snippet }]>;
} & Partial<Snippets<Source>>;
