import type { BundledTheme } from 'shiki';
import type { Snippet } from 'svelte';
import type { Theme } from './theme.js';
import type { MermaidConfig } from 'mermaid';
import type { KatexOptions } from 'katex';
import type { StreamdownContext } from './Streamdown.svelte';
import type { StreamdownToken } from './marked/index.js';

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
export type Snippets = {
	[K in PredefinedElements]?: Snippet<
		[
			{
				children: Snippet;
				token: StreamdownToken;
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
	customElements?: Record<
		string,
		Snippet<
			[
				{
					children: Snippet;
					token: StreamdownToken;
				}
			]
		>
	>;
} & Partial<Snippets>;
