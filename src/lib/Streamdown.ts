import type { BundledTheme } from 'shiki';
import type { Snippet } from 'svelte';
import type { Theme } from './theme.js';
import type { MermaidConfig } from 'mermaid';
import type { KatexOptions } from 'katex';
import type { StreamdownContext } from './Streamdown.svelte';
import type {
	AlertToken,
	MathToken,
	StreamdownToken,
	SubSupToken,
	TableHead,
	TableRow,
	TD,
	TH
} from './marked/index.js';
import type { Tokens } from 'marked';
import type { ListItemToken, ListToken } from './marked/marked-list.js';
import type { FootnoteRef, FootnoteToken } from './marked/marked-footnotes.js';

type PredefinedElements =
	| 'heading'
	| 'paragraph'
	| 'blockquote'
	| 'code'
	| 'codespan'
	| 'ul'
	| 'ol'
	| 'li'
	| 'table'
	| 'tableRow'
	| 'tableHead'
	| 'td'
	| 'th'
	| 'image'
	| 'link'
	| 'strong'
	| 'em'
	| 'del'
	| 'hr'
	| 'br'
	| 'math'
	| 'alert'
	| 'mermaid'
	| 'footnoteRef'
	| 'footnotePopover'
	| 'sup'
	| 'sub';

type TokenSnippet = {
	heading: Tokens.Heading;
	paragraph: Tokens.Paragraph;
	blockquote: Tokens.Blockquote;
	code: Tokens.Code;
	codespan: Tokens.Codespan;
	ul: ListToken;
	ol: ListToken;
	li: ListItemToken;
	table: Tokens.Table;
	tableRow: TableRow;
	tableHead: TableHead;
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
	// customElements?: Record<
	// 	string,
	// 	Snippet<
	// 		[
	// 			{
	// 				children: Snippet;
	// 				token: StreamdownToken;
	// 			}
	// 		]
	// 	>
	// >;
} & Partial<Snippets>;
