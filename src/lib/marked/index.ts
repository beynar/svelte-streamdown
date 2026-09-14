import {
	Lexer,
	Tokenizer,
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

/**
 * A fenced code block. `lang` is the first word of the info string; everything
 * after it is `meta` (`undefined` when there is none).
 */
export type CodeToken = Tokens.Code & { meta?: string };

export type StreamdownToken =
	| Exclude<MarkedToken, Tokens.List | Tokens.ListItem | Tokens.Table | Tokens.Code>
	| CodeToken
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

class StreamdownTokenizer extends Tokenizer {
	/**
	 * marked keeps the whole fence info string in `lang`, so ```ts title="x" {1}
	 * highlighted as plaintext, labelled the header with the entire string, downloaded
	 * as `file.txt` and — worst — missed `token.lang === 'mermaid'` (upstream d4ec6c0).
	 * Splitting here rather than walking lex()'s output costs one search per code
	 * token instead of a per-block tree walk, and it also reaches fences nested in
	 * lists and blockquotes, which a pass over the top-level tokens would not.
	 */
	override fences(src: string): CodeToken | undefined {
		const token = super.fences(src);
		if (token?.lang) {
			const end = token.lang.search(/\s/);
			if (end !== -1) {
				(token as CodeToken).meta = token.lang.slice(end + 1).trim() || undefined;
				token.lang = token.lang.slice(0, end);
			}
		}
		return token;
	}

	/**
	 * `~x~` is a subscript here, not GFM strikethrough (marked-subsup.ts). The old
	 * subscript rule shadowed single-tilde del by matching anything; now that it
	 * rejects whitespace, del would inherit exactly the sentences 716a5f0 is about
	 * (`20~25°C and 30~35°C` → del('~25°C and 30~')). Only `~~` opens a del.
	 */
	override del(src: string, maskedSrc: string, prevChar?: string) {
		if (src.charCodeAt(0) !== 126 /* ~ */ || src.charCodeAt(1) !== 126) return;
		return super.del(src, maskedSrc, prevChar);
	}
}

const parseExtensions = (...extensions: Extension[]) => {
	const options: {
		gfm: boolean;
		tokenizer: Tokenizer;
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
		tokenizer: new StreamdownTokenizer(),
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

// Options objects are reusable across Lexer instances; cache them per
// user-extension array (props are referentially stable across chunks) so the hot
// path skips rebuilding ~20 tokenizer registrations on every streamed chunk. The
// cached object carries one shared Tokenizer whose `lexer` back-pointer marked
// re-stamps per Lexer construction — safe only because lexing is synchronous and
// never re-entrant across documents.
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
 *
 * Everything here is sized so the append path costs O(live tail), never
 * O(document): `offsets`/`keptBefore` are prefix sums so the seal point is an
 * array lookup, and `blocks` is a persistent array whose tail is truncated and
 * re-pushed instead of being rebuilt with a `filter` callback every chunk.
 */
export type ParseBlocksCache = {
	/** the content the cache describes (held by reference, never copied); '' = cold */
	content: string;
	/** every block token's raw (including space/footnote tokens) in document order */
	raws: string[];
	/** parallel to raws: whether the token is part of the rendered block list */
	keep: boolean[];
	/** prefix sums: offsets[i] = start index of raws[i]; offsets[raws.length] = content.length */
	offsets: number[];
	/** prefix sums: keptBefore[i] = number of kept tokens among raws[0..i) */
	keptBefore: number[];
	/** persistent list of kept raws; only its tail is rewritten on append */
	blocks: string[];
	/**
	 * What kind of update the last call was. Rendering skips the streaming
	 * animation on a `bulk` one — a replacement, or an append far larger than any
	 * streamed chunk — where ~10k spans would otherwise all animate in one frame.
	 */
	lastUpdate: 'first' | 'stream' | 'bulk';
};

export const createParseBlocksCache = (): ParseBlocksCache => ({
	content: '',
	raws: [],
	keep: [],
	offsets: [0],
	keptBefore: [0],
	blocks: [],
	lastUpdate: 'first'
});

// Number of trailing rendered blocks that stay "live" (re-lexed every chunk).
// 2 covers constructs that merge backward as they stream in — e.g. a paragraph
// line becoming a table once its delimiter row arrives, or a setext heading.
const SEAL_SLACK = 2;

// Stride spot checks over the sealed prefix per append (see `appendable`), on
// top of the per-block-start probes. The sealed region was compared
// byte-for-byte while it was live, so this only has to catch a caller that
// swapped in a different, longer document.
const SEAL_PROBES = 16;

/**
 * A Lexer used only to slice a document into top-level block raws.
 *
 * `Tokenizer.list()` recurses into every list item's text purely to decide
 * whether the list is loose — `raw` is already final by then — and it marks that
 * recursion by setting `state.top = false` first. `Tokenizer.blockquote()` also
 * recurses, but its `raw` genuinely depends on the result (continuation lines are
 * folded into a nested list/blockquote token), and it sets `state.top = true`.
 * So dropping every nested call made with `top === false` removes the whole
 * list-item subtree parse without changing a single raw.
 */
class SplitLexer extends Lexer {
	override blockTokens(src: string, tokens: any = [], lastParagraphClipped = false): any {
		if (!this.state.top) {
			// Lexer.blockTokens() sets state.top = true on exit; the skip must too.
			this.state.top = true;
			return tokens;
		}
		return super.blockTokens(src, tokens, lastParagraphClipped);
	}
	/** Extensions (dl, table) tokenize cell/term text inline; raws never depend on it. */
	override inlineTokens(src: string, tokens: any = []): any {
		return tokens;
	}
}

const blockTokensOf = (markdown: string, extensions: Extension[]) =>
	new SplitLexer(getBlockOptions(extensions)).blockTokens(markdown, []);

/**
 * Is `markdown` an append to `cache.content`?
 *
 * The live region [offset, cache.content.length) is compared exactly — that is
 * the only region whose segmentation can still change. The sealed prefix is only
 * sampled, never scanned: a complete `markdown.startsWith(cache.content)` was
 * 93% of parseBlocks' streaming cost (676 ms of 727 ms over a 100 KB /
 * 5028-chunk stream) and is the single reason the append path was O(N) per chunk
 * rather than O(tail).
 *
 * Two families of samples, both O(sealed blocks) and not O(sealed characters):
 * the first character of every sealed block (`cache.offsets` already holds those
 * positions), which catches any edit that moves a block boundary or rewrites a
 * block's first character — the shape a real out-of-band edit takes; plus
 * SEAL_PROBES evenly spaced characters, which catch a wholesale document swap.
 * A same-length edit in the middle of a sealed block can still slip through; see
 * the streaming contract in the README.
 *
 * Note this compares source against source, not source against `raws`: marked's
 * tokenizers normalize (e.g. the list tokenizer rewrites a trailing space as a
 * newline), so raws are not always literal slices of the input.
 */
const appendable = (
	markdown: string,
	cache: ParseBlocksCache,
	cut: number,
	offset: number
): boolean => {
	const content = cache.content;
	for (let i = offset; i < content.length; i++) {
		if (markdown.charCodeAt(i) !== content.charCodeAt(i)) return false;
	}
	if (offset === 0) return true;
	for (let b = 0; b < cut; b++) {
		const i = cache.offsets[b];
		if (markdown.charCodeAt(i) !== content.charCodeAt(i)) return false;
	}
	const step = offset > SEAL_PROBES ? offset / SEAL_PROBES : 1;
	for (let f = 0; f < offset; f += step) {
		const i = f | 0;
		if (markdown.charCodeAt(i) !== content.charCodeAt(i)) return false;
	}
	return markdown.charCodeAt(offset - 1) === content.charCodeAt(offset - 1);
};

// An append this large in a single update is a paste or a "show all", not a
// streamed chunk. Real streams arrive in tens of characters, and even a client
// that batches renders to one frame at ~1000 tokens/s adds a few hundred; the
// harm — thousands of spans starting a CSS animation in the same frame — only
// begins well past this. ponytail: heuristic; a prop if anyone needs to tune it.
const BULK_APPEND_CHARS = 2048;

const updateKind = (
	isAppend: boolean,
	previousLength: number,
	length: number
): ParseBlocksCache['lastUpdate'] => {
	if (!isAppend) return previousLength === 0 ? 'first' : 'bulk';
	return length - previousLength > BULK_APPEND_CHARS ? 'bulk' : 'stream';
};

export const parseBlocks = (
	markdown: string,
	extensions: Extension[] = [],
	cache?: ParseBlocksCache
): string[] => {
	// Whether this call extends the content the cache already described — decided
	// by the same probe the fast path uses, so the contiguity fallback below still
	// counts as an append for the animation's purposes.
	let isAppend = false;
	const previousLength = cache?.content.length ?? 0;
	if (cache && cache.content.length > 0 && markdown.length > cache.content.length) {
		// Append-only update: seal everything except the last SEAL_SLACK rendered
		// blocks and re-lex only the tail. offsets[] are prefix sums over raws, so
		// the seal point costs one array read instead of a running sum.
		let cut = cache.raws.length;
		let liveBlocks = 0;
		while (cut > 0 && liveBlocks < SEAL_SLACK) {
			cut--;
			if (cache.keep[cut]) liveBlocks++;
		}
		const offset = cache.offsets[cut];

		if (appendable(markdown, cache, cut, offset)) {
			isAppend = true;
			const tailTokens = blockTokensOf(markdown.slice(offset), extensions);
			let tailLength = 0;
			for (const token of tailTokens) tailLength += token.raw.length;

			// Contiguity guard: if the lexer normalized the tail (so raws no longer
			// reconstruct the input), the offsets cannot be trusted — full reparse.
			if (offset + tailLength === markdown.length) {
				const keptAtCut = cache.keptBefore[cut];
				cache.raws.length = cut;
				cache.keep.length = cut;
				cache.offsets.length = cut + 1;
				cache.keptBefore.length = cut + 1;
				cache.blocks.length = keptAtCut;
				let pos = offset;
				let kept = keptAtCut;
				for (const token of tailTokens) {
					const raw = token.raw;
					const keep = token.type !== 'space' && token.type !== 'footnote';
					cache.raws.push(raw);
					cache.keep.push(keep);
					pos += raw.length;
					cache.offsets.push(pos);
					if (keep) {
						cache.blocks.push(raw);
						kept++;
					}
					cache.keptBefore.push(kept);
				}
				cache.content = markdown;
				cache.lastUpdate = updateKind(isAppend, previousLength, markdown.length);
				// Copy out: callers (Svelte `$derived`, the perf harness) diff block
				// lists by identity, so handing back the persistent array would read as
				// "nothing changed". slice() is a memcpy with no per-element callback.
				return cache.blocks.slice();
			}
		}
	}

	// Full parse (first call, non-append update, or contiguity fallback).
	const tokens = blockTokensOf(markdown, extensions);
	if (cache) {
		cache.raws.length = 0;
		cache.keep.length = 0;
		cache.offsets.length = 1;
		cache.keptBefore.length = 1;
		cache.blocks.length = 0;
		let pos = 0;
		let kept = 0;
		for (const token of tokens) {
			const raw = token.raw;
			const keep = token.type !== 'space' && token.type !== 'footnote';
			cache.raws.push(raw);
			cache.keep.push(keep);
			pos += raw.length;
			cache.offsets.push(pos);
			if (keep) {
				cache.blocks.push(raw);
				kept++;
			}
			cache.keptBefore.push(kept);
		}
		cache.lastUpdate = updateKind(isAppend, previousLength, markdown.length);
		// Only trust the cache for future appends if raws reconstruct the input.
		cache.content = pos === markdown.length ? markdown : '';
		return cache.blocks.slice();
	}
	const blocks: string[] = [];
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
