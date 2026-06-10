import {
	Lexer,
	type MarkedToken,
	type RendererExtensionFunction,
	type Token,
	type TokenizerExtensionFunction,
	type TokenizerStartFunction,
	type TokenizerThis,
	type Tokens,
	type TokensList
} from 'marked';
import { markedAlert, type AlertToken } from './marked-alert.js';
import { markedFootnote, type FootnoteToken } from './marked-footnotes.js';
import { markedMath, type MathToken } from './marked-math.js';
import { markedSub, markedSup, type SubSupToken } from './marked-subsup.js';
import { markedList, type ListItemToken, type ListToken } from './marked-list.js';
import { markedBr, type BrToken } from './marked-br.js';
import { markedHr, type HrToken } from './marked-hr.js';
import {
	markedTable,
	type TableToken,
	type THead,
	type TBody,
	type TFoot,
	type THeadRow,
	type TRow,
	type TH,
	type TD
} from './marked-table.js';
import {
	markedDl,
	type DescriptionDetailToken,
	type DescriptionListToken,
	type DescriptionTermToken,
	type DescriptionToken
} from './marked-dl.js';
import { markedAlign, type AlignToken } from './marked-align.js';
import { markedCitations, type CitationToken } from './marked-citations.js';
import { markedMdx, type MdxToken } from './marked-mdx.js';

export type GenericToken = {
	type: string;
	raw: string;
	tokens?: Token[];
} & Record<string, any>;

export type Extension = {
	name: string;
	level: 'block' | 'inline';
	tokenizer: (
		this: TokenizerThis,
		src: string,
		tokens: Token[] | TokensList
	) => GenericToken | undefined;
	start?: TokenizerStartFunction;
	applyInBlockParsing?: boolean;
};

export type StreamdownToken =
	| Exclude<MarkedToken, Tokens.List | Tokens.ListItem | Tokens.Table>
	| ListToken
	| ListItemToken
	| MathToken
	| AlertToken
	| FootnoteToken
	| SubSupToken
	| BrToken
	| HrToken
	| TableToken
	| THead
	| TBody
	| TFoot
	| THeadRow
	| TRow
	| TH
	| TD
	| DescriptionListToken
	| DescriptionToken
	| DescriptionDetailToken
	| DescriptionTermToken
	| AlignToken
	| CitationToken
	| MdxToken;

// Re-export table types from marked-table
export type { TableToken, THead, TBody, TFoot, THeadRow, TRow, TH, TD } from './marked-table.js';

// Default plugin sets, in registration order. Hoisted so the options object
// (and the regexes/closures inside each plugin) is built once, not per chunk.
// The tokenizers are stateless at creation time — per-document state lives on
// the Lexer instance (e.g. footnotes maps, reference-link defs), so a fresh
// Lexer per call keeps documents isolated while the options are shared.
const DEFAULT_LEX_EXTENSIONS: Extension[] = [
	markedHr,
	markedTable,
	...markedFootnote(),
	markedAlert,
	...markedMath,
	markedSub,
	markedSup,
	markedList,
	markedBr,
	markedDl,
	markedAlign,
	markedCitations,
	markedMdx
];

const DEFAULT_BLOCK_EXTENSIONS: Extension[] = [
	markedHr,
	...markedFootnote(),
	markedDl,
	markedTable,
	markedAlign,
	markedMdx
];

const parseExtensions = (...extensions: Extension[]) => {
	const options: {
		gfm: boolean;
		extensions: {
			block: TokenizerExtensionFunction[];
			inline: TokenizerExtensionFunction[];
			childTokens: Record<string, string[]>;
			renderers: Record<string, RendererExtensionFunction>;
			startBlock: TokenizerStartFunction[];
			startInline: TokenizerStartFunction[];
		};
	} = {
		gfm: true,
		extensions: {
			block: [],
			inline: [],
			childTokens: {},
			renderers: {},
			startBlock: [],
			startInline: []
		}
	};

	extensions.forEach(({ level, name, tokenizer, ...rest }) => {
		if ('start' in rest && rest.start) {
			if (level === 'block') {
				options.extensions.startBlock!.push(rest.start as TokenizerStartFunction);
			} else {
				options.extensions.startInline!.push(rest.start as TokenizerStartFunction);
			}
		}
		if (tokenizer) {
			if (level === 'block') {
				options.extensions.block.push(tokenizer);
			} else {
				options.extensions.inline.push(tokenizer);
			}
		}
	});

	return options;
};

type LexerOptions = ReturnType<typeof parseExtensions>;

// Options objects are stateless and reusable across Lexer instances; cache them
// per user-extension array (props are referentially stable across chunks) so the
// hot path skips rebuilding ~20 tokenizer registrations on every streamed chunk.
const DEFAULT_LEX_OPTIONS = parseExtensions(...DEFAULT_LEX_EXTENSIONS);
const DEFAULT_BLOCK_OPTIONS = parseExtensions(...DEFAULT_BLOCK_EXTENSIONS);
const lexOptionsCache = new WeakMap<Extension[], LexerOptions>();
const blockOptionsCache = new WeakMap<Extension[], LexerOptions>();

const getLexOptions = (extensions: Extension[]): LexerOptions => {
	if (extensions.length === 0) return DEFAULT_LEX_OPTIONS;
	let options = lexOptionsCache.get(extensions);
	if (!options) {
		options = parseExtensions(...DEFAULT_LEX_EXTENSIONS, ...extensions);
		lexOptionsCache.set(extensions, options);
	}
	return options;
};

const getBlockOptions = (extensions: Extension[]): LexerOptions => {
	if (extensions.length === 0) return DEFAULT_BLOCK_OPTIONS;
	let options = blockOptionsCache.get(extensions);
	if (!options) {
		options = parseExtensions(
			...DEFAULT_BLOCK_EXTENSIONS,
			...extensions.filter(
				({ level, applyInBlockParsing }) => level === 'block' && applyInBlockParsing
			)
		);
		blockOptionsCache.set(extensions, options);
	}
	return options;
};

export const lex = (markdown: string, extensions: Extension[] = []): StreamdownToken[] => {
	return new Lexer(getLexOptions(extensions))
		.lex(markdown)
		.filter((token) => token.type !== 'space' && token.type !== 'footnote') as StreamdownToken[];
};

/**
 * Opaque incremental state for `parseBlocks`. Create one per Streamdown
 * instance (or per simulated stream) and pass it on every call: append-only
 * content updates then re-lex only the last couple of blocks instead of the
 * whole document. Any non-append update falls back to a full parse.
 */
export type ParseBlocksCache = {
	content: string;
	/** every block token's raw (including space/footnote tokens) in document order */
	raws: string[];
	/** parallel to raws: whether the token is part of the rendered block list */
	keep: boolean[];
};

export const createParseBlocksCache = (): ParseBlocksCache => ({
	content: '',
	raws: [],
	keep: []
});

// Number of trailing rendered blocks that stay "live" (re-lexed every chunk).
// 2 covers constructs that merge backward as they stream in — e.g. a paragraph
// line becoming a table once its delimiter row arrives, or a setext heading.
const SEAL_SLACK = 2;

const blockTokensOf = (markdown: string, extensions: Extension[]) =>
	new Lexer(getBlockOptions(extensions)).blockTokens(markdown, []);

export const parseBlocks = (
	markdown: string,
	extensions: Extension[] = [],
	cache?: ParseBlocksCache
): string[] => {
	if (
		cache &&
		cache.content.length > 0 &&
		markdown.length > cache.content.length &&
		markdown.startsWith(cache.content)
	) {
		// Append-only update: seal everything except the last SEAL_SLACK rendered
		// blocks and re-lex only the tail. cache.raws concatenates exactly to
		// cache.content (verified by length below), so summed lengths are offsets.
		let cut = cache.raws.length;
		let liveBlocks = 0;
		while (cut > 0 && liveBlocks < SEAL_SLACK) {
			cut--;
			if (cache.keep[cut]) liveBlocks++;
		}
		let offset = 0;
		for (let i = 0; i < cut; i++) offset += cache.raws[i].length;

		const tailTokens = blockTokensOf(markdown.slice(offset), extensions);
		let tailLength = 0;
		for (const token of tailTokens) tailLength += token.raw.length;

		// Contiguity guard: if the lexer normalized the tail (so raws no longer
		// reconstruct the input), the offsets cannot be trusted — full reparse.
		if (offset + tailLength === markdown.length) {
			cache.raws.length = cut;
			cache.keep.length = cut;
			for (const token of tailTokens) {
				cache.raws.push(token.raw);
				cache.keep.push(token.type !== 'space' && token.type !== 'footnote');
			}
			cache.content = markdown;
			return cache.raws.filter((_, i) => cache.keep[i]);
		}
	}

	// Full parse (first call, non-append update, or contiguity fallback).
	const tokens = blockTokensOf(markdown, extensions);
	const blocks: string[] = [];
	if (cache) {
		cache.raws = [];
		cache.keep = [];
		let total = 0;
		for (const token of tokens) {
			const keep = token.type !== 'space' && token.type !== 'footnote';
			cache.raws.push(token.raw);
			cache.keep.push(keep);
			total += token.raw.length;
			if (keep) blocks.push(token.raw);
		}
		// Only trust the cache for future appends if raws reconstruct the input.
		cache.content = total === markdown.length ? markdown : '';
		return blocks;
	}
	for (const token of tokens) {
		if (token.type !== 'space' && token.type !== 'footnote') blocks.push(token.raw);
	}
	return blocks;
};

export type {
	MathToken,
	AlertToken,
	FootnoteToken,
	SubSupToken,
	BrToken,
	HrToken,
	AlignToken,
	CitationToken,
	MdxToken
};
