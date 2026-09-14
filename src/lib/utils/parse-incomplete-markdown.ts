import { closingFence, trackFence, type OpenFence } from './fence.js';
import { DEFAULT_TAGS, type TagMatchers } from '../marked/marked-mdx.js';

/** Per-call knobs `Block.svelte` threads down from the Streamdown context. */
export type CompleterOptions = {
	/** The tag allowlist the lexer uses, so the completer never disagrees with it. */
	tags?: TagMatchers;
	/**
	 * Is this the block still being streamed into? Only there may a half-typed
	 * HTML tag be stripped — a sealed paragraph reading `if a <b then` must keep
	 * its tail forever (upstream 3e6a77d strips unconditionally; we do not).
	 */
	live?: boolean;
};

// Simplified interface that merges Plugin and PatternRule
export interface Plugin {
	name: string;
	pattern?: RegExp;
	handler?: (payload: HandlerPayload) => string;
	skipInBlockTypes?: string[]; // block types where this plugin should be skipped
	preprocess?: (payload: HookPayload) => string | { text: string; state: Partial<ParseState> };
	postprocess?: (payload: HookPayload) => string;
}

interface HookPayload {
	text: string;
	state: ParseState;
	setState: (state: Partial<ParseState>) => void;
}
interface HandlerPayload {
	line: string;
	text: string;
	match: RegExpMatchArray;
	state: ParseState;
	setState: (state: Partial<ParseState>) => void;
}

interface ParseState {
	currentLine: number;
	/** How many lines the text has, so a plugin can tell the last one. */
	lineCount: number;
	context: 'normal' | 'list' | 'blockquote' | 'descriptionList';
	blockingContexts: Set<'code' | 'math' | 'center' | 'right'>;
	/** Delimiter that closes the open math block: '$$' or '\]'. */
	mathCloser?: '$$' | '\\]';
	/** The fence still open at the end of the input, if any — what closes it. */
	openFence?: OpenFence;
	lineContexts?: Array<{ code: boolean; math: boolean; center: boolean; right: boolean }>;
	mdxUnclosedTags?: Array<{ tagName: string; lineIndex: number }>;
	/** Tag allowlist for this call (see CompleterOptions). */
	tags: TagMatchers;
	/** Is this the block still streaming (see CompleterOptions)? */
	live: boolean;
}

export class IncompleteMarkdownParser {
	private plugins: Plugin[] = [];
	private state: ParseState = {
		currentLine: 0,
		lineCount: 0,
		context: 'normal',
		blockingContexts: new Set(),
		lineContexts: [],
		tags: DEFAULT_TAGS,
		live: true
	};

	setState = (state: Partial<ParseState>) => {
		this.state = { ...this.state, ...state };
	};

	constructor(plugins: Plugin[] = []) {
		this.plugins = plugins;
	}

	// Main parsing methods
	parse(text: string, options?: CompleterOptions): string {
		if (!text || typeof text !== 'string') {
			return text;
		}

		this.state = {
			currentLine: 0,
			lineCount: 0,
			context: 'normal',
			blockingContexts: new Set(),
			lineContexts: [],
			tags: options?.tags ?? DEFAULT_TAGS,
			live: options?.live ?? true
		};

		let result = text;

		// Execute preprocess hooks for all plugins
		for (const plugin of this.plugins) {
			if (plugin.preprocess) {
				try {
					const preprocessResult = plugin.preprocess({
						text: result,
						state: this.state,
						setState: this.setState
					});
					if (typeof preprocessResult === 'string') {
						result = preprocessResult;
					} else {
						result = preprocessResult.text;
						this.setState(preprocessResult.state);
					}
				} catch (error) {
					console.error(`Plugin ${plugin.name} preprocess hook failed:`, error);
				}
			}
		}

		// Split into lines for processing
		const lines = result.split('\n');
		const processedLines = [...lines];
		this.state.lineCount = processedLines.length;

		// Process each line with each plugin
		for (let i = 0; i < processedLines.length; i++) {
			this.state.currentLine = i;
			let line = processedLines[i];

			for (const plugin of this.plugins) {
				// Skip this plugin if current line is in a blocking context
				const currentLineContext = this.state.lineContexts?.[i];
				const shouldSkip =
					currentLineContext &&
					(plugin.skipInBlockTypes || []).some(
						(blockType) => currentLineContext[blockType as 'code' | 'math']
					);
				if (shouldSkip) {
					continue;
				}

				try {
					const match = plugin.pattern ? line.match(plugin.pattern) : line.match(/.*/);
					if (match && plugin.handler) {
						line = plugin.handler({
							line,
							text: line,
							match,
							state: this.state,
							setState: this.setState
						});
					}
				} catch (error) {
					console.error(`Plugin ${plugin.name} failed on line ${i}:`, error);
				}
			}

			processedLines[i] = line;
		}

		// Rebuild text from processed lines
		result = processedLines.join('\n');

		// Execute afterParse hooks for all plugins
		for (const plugin of this.plugins) {
			if (plugin.postprocess) {
				try {
					result = plugin.postprocess({ text: result, state: this.state, setState: this.setState });
				} catch (error) {
					console.error(`Plugin ${plugin.name} afterParse hook failed:`, error);
				}
			}
		}

		return result;
	}

	// Create default plugins that replicate the original handler functions
	static createDefaultPlugins(): Plugin[] {
		return [
			{
				// `Hello <div cla` and `<div>content</di` render as literal source on
				// every chunk until the `>` lands (upstream 3e6a77d). Strip that tail —
				// but only on the block still being streamed and only when the name is
				// really a tag. Upstream strips `/<[a-zA-Z\/][^>]*$/` unconditionally,
				// which on our per-block completer would eat the tail of a sealed
				// paragraph reading `if a <b then` for good.
				// Registered first so the mdx plugin below never sees a half-typed tag.
				name: 'incompleteHtmlTag',
				// Cheap gate: a line with no '<' can never match.
				pattern: /</,
				skipInBlockTypes: ['code', 'math'],
				handler: ({ line, state }) => {
					// Only the streaming tail: the live block's LAST line. An unfinished
					// tag on an earlier line can never complete, and `live` is merely
					// "last block", so `Use the <div element to wrap it.` in a finished
					// document must keep its text. The patterns below are `$`-anchored,
					// so matching on the last line means matching at the end of the text.
					if (!state.live || state.currentLine !== state.lineCount - 1) return line;
					// The incomplete tag is the last '<' with no '>' after it, so anchor
					// there instead of letting `[^>]*$` backtrack from every '<' on the
					// line (that is quadratic on a line full of complete tags).
					const start = line.lastIndexOf('<');
					if (start === -1) return line;
					// `</` with the name not yet typed is unambiguous — no prose ends a
					// line that way — and it is the one frame a name check cannot catch.
					if (start === line.length - 2 && line[start + 1] === '/') {
						return isWithinCompleteInlineCode(line, start) ? line : line.slice(0, start);
					}
					const match = incompleteHtmlTag.exec(line.slice(start));
					if (!match) return line;
					const name = match[1];
					if (!isTagPrefix(name, state.tags)) return line;
					// One-letter lowercase elements (a, b, i, p, q, s, u) are also how prose
					// looks: `if a <b then` on the last line of a finished document must keep
					// its text, and `live` cannot tell finished from streaming. Such a letter
					// only counts as a tag once an attribute has started (`<a href="`). An
					// uppercase letter (`<C`) can only be a component prefix, never prose.
					if (name.length === 1 && name === name.toLowerCase() && !match[0].includes('='))
						return line;
					// A '<' inside a closed code span is content, not a tag (a725579).
					if (isWithinCompleteInlineCode(line, start)) return line;
					// No trimEnd (upstream does): 4.1.1 cut PascalCase tags at exactly
					// this offset, so `Some text <Comp` keeps rendering as `Some text `.
					return line.slice(0, start);
				}
			},
			{
				// In a list item a '>' before a number is a comparison
				// ('- > 25: rich'), but marked reads it as a nested blockquote. Escaping it
				// keeps the text, and the escape renders as a plain '>' (4fffb9f).
				// `pattern` is only a cheap gate — a line whose first non-space character is
				// not a list marker can never match, and bails on that one character.
				name: 'comparisonOperator',
				pattern: /^\s*[-*+\d]/,
				skipInBlockTypes: ['code', 'math'],
				handler: ({ line }) => {
					const match = listItemComparison.exec(line);
					return match ? `${match[1]}\\>${line.slice(match[0].length)}` : line;
				}
			},
			// Block-level plugin that manages blocking contexts
			{
				name: 'contextManager',
				preprocess: ({ text }) => {
					// Pre-scan the entire text to establish blocking contexts
					const lines = text.split('\n');
					let fence: OpenFence = null;
					let inMathBlock = false;
					let mathCloser: '$$' | '\\]' = '$$';
					let inCenterBlock = false;
					let inRightBlock = false;
					let centerOpenLine = -1;
					let rightOpenLine = -1;

					// Track which lines are in which contexts for state management
					const lineContexts: Array<{
						code: boolean;
						math: boolean;
						center: boolean;
						right: boolean;
					}> = [];

					for (let i = 0; i < lines.length; i++) {
						const line = lines[i];

						// Check for block boundaries. Fences may be quoted inside
						// blockquotes/alerts ("> ```"); trackFence is the same CommonMark
						// scanner the `incomplete` signal uses, so the two cannot drift.
						fence = trackFence(line, fence);
						const inCodeBlock = fence !== null;
						// A math block opens with '$$' or a lone '\\[' and closes with the
						// same delimiter it opened with, so '$' inside '\\[ … \\]' is literal.
						const trimmed = line.trim();
						const isDollarFence = trimmed.startsWith('$$') && !trimmed.includes('$$', 2);
						if (!inMathBlock) {
							if (isDollarFence || trimmed === '\\[') {
								inMathBlock = true;
								mathCloser = isDollarFence ? '$$' : '\\]';
							}
						} else if (mathCloser === '$$' ? isDollarFence : trimmed === '\\]') {
							inMathBlock = false;
						}
						if (line.trim() === '[center]') {
							inCenterBlock = true;
							centerOpenLine = i;
						}
						if (line.trim() === '[/center]') {
							inCenterBlock = false;
						}
						if (line.trim() === '[right]') {
							inRightBlock = true;
							rightOpenLine = i;
						}
						if (line.trim() === '[/right]') {
							inRightBlock = false;
						}

						lineContexts[i] = {
							code: inCodeBlock,
							math: inMathBlock,
							center: inCenterBlock,
							right: inRightBlock
						};
					}

					// Set the final blocking contexts (for postprocessing)
					const finalContexts = new Set<string>();
					if (fence) finalContexts.add('code');
					if (inMathBlock) finalContexts.add('math');
					// Only auto-close center/right when content follows the opening tag;
					// a bare trailing '[center]'/'[right]' line is left untouched.
					if (inCenterBlock && centerOpenLine < lines.length - 1) finalContexts.add('center');
					if (inRightBlock && rightOpenLine < lines.length - 1) finalContexts.add('right');

					// Return both the text and the updated state
					return {
						text: text, // Don't modify text in preprocess
						state: {
							blockingContexts: finalContexts as Set<'code' | 'math' | 'center' | 'right'>,
							lineContexts,
							mathCloser,
							openFence: fence
						}
					};
				},
				postprocess: ({ text, state }) => {
					// Complete incomplete blocks at end of input.
					// Close inner blocks (code/math) before alignment wrappers.
					let result = text;
					if (state.blockingContexts.has('code')) {
						// Close with the fence that was opened, at the depth it was opened: a
						// '~~~' block is not closed by '```', a longer run needs a closer at
						// least as long, and a fence inside a list item needs its closer inside
						// the item — one at column 0 leaves the block open and starts a new one.
						const fence = state.openFence;
						result += '\n' + (fence ? closingFence(fence) : '```');
					}
					if (state.blockingContexts.has('math')) {
						if (state.mathCloser === '\\]') {
							result += '\n\\]';
						} else {
							// The first half of the closing '$$' may already have arrived: adding a
							// whole '\n$$' would leave a stray '$' inside the math and '$$' after it.
							result += result.endsWith('$') && !result.endsWith('$$') ? '$' : '\n$$';
						}
					}
					if (state.blockingContexts.has('center')) {
						result += '\n[/center]';
					}
					if (state.blockingContexts.has('right')) {
						result += '\n[/right]';
					}
					return result;
				}
			},
			{
				name: 'boldItalic',
				pattern: /\*\*\*/,
				skipInBlockTypes: ['code', 'math'],
				handler: ({ line }) => {
					if (line.trim() === '***') {
						return line;
					}
					const isEndingWithTripleAsterisk = line.endsWith('***');
					const tripleAsterisks = (line.match(/\*\*\*/g) || []).length;
					if (tripleAsterisks % 2 === 1) {
						const lastTripleAsteriskIndex = line.lastIndexOf('***');
						if (isWithinCompleteInlineCode(line, lastTripleAsteriskIndex)) return line;
						const endOfCellOrLine = findEndOfCellOrLineContaining(line, lastTripleAsteriskIndex);
						if (isEndingWithTripleAsterisk) {
							return line.substring(0, lastTripleAsteriskIndex);
						}
						const before = line.substring(0, endOfCellOrLine);
						// Part of the closing '***' may have already arrived (a trailing '*' or
						// '**'); only add the missing asterisks so we complete to exactly '***'
						// instead of leaving stray asterisks after the text.
						const trailing = before.match(/\*+$/)?.[0].length ?? 0;
						const missing = trailing >= 1 && trailing <= 2 ? 3 - trailing : 3;
						return before + '*'.repeat(missing) + line.substring(endOfCellOrLine);
					}
					return line;
				}
			},
			{
				name: 'bold',
				pattern: /\*\*/,
				skipInBlockTypes: ['code', 'math'],
				handler: ({ line }) => {
					if (line.trim() === '***') {
						return line;
					}
					const doubleAsteriskMatches = (line.match(/\*\*/g) || []).length;
					if (doubleAsteriskMatches % 2 === 1) {
						const isEndingWithDoubleAsterisk = line.endsWith('**');
						const lastDoubleAsteriskIndex = line.lastIndexOf('**');
						if (isWithinCompleteInlineCode(line, lastDoubleAsteriskIndex)) return line;
						const endOfCellOrLine = findEndOfCellOrLineContaining(line, lastDoubleAsteriskIndex);
						if (isEndingWithDoubleAsterisk) {
							return line.substring(0, lastDoubleAsteriskIndex);
						}
						const before = line.substring(0, endOfCellOrLine);
						// If the content already ends with a single '*' — the first half of the
						// closing '**' arriving mid-stream — only add one more '*' to complete it.
						// Otherwise we'd emit '***' and leave a stray '*' after the bold text.
						const closing = before.endsWith('*') && !before.endsWith('**') ? '*' : '**';
						return before + closing + line.substring(endOfCellOrLine);
					}
					return line;
				}
			},
			{
				name: 'doubleUnderscoreItalic',
				pattern: /__/,
				skipInBlockTypes: ['code', 'math'],
				handler: ({ line }) => {
					if (line.trim() === '___') {
						return line;
					}
					const underscorePairs = (line.match(/__/g) || []).length;
					if (underscorePairs % 2 === 1) {
						const isEndingWithDoubleUnderscore = line.endsWith('__');
						const lastDoubleUnderscoreIndex = line.lastIndexOf('__');
						if (isWithinCompleteInlineCode(line, lastDoubleUnderscoreIndex)) return line;
						const endOfCellOrLine = findEndOfCellOrLineContaining(line, lastDoubleUnderscoreIndex);
						if (isEndingWithDoubleUnderscore) {
							return line.substring(0, lastDoubleUnderscoreIndex);
						}
						const before = line.substring(0, endOfCellOrLine);
						// A half-typed closing '__' (a lone trailing '_') only needs one more '_',
						// not a full '__' that would leave a stray underscore after the text.
						const closing = before.endsWith('_') && !before.endsWith('__') ? '_' : '__';
						return before + closing + line.substring(endOfCellOrLine);
					}
					return line;
				}
			},
			{
				name: 'strikethrough',
				pattern: /~~/,
				skipInBlockTypes: ['code', 'math'],
				handler: ({ line }) => {
					const tildePairs = (line.match(/~~/g) || []).length;
					if (tildePairs % 2 === 1) {
						const isEndingWithDoubleTilde = line.endsWith('~~');
						const lastDoubleTildeIndex = line.lastIndexOf('~~');
						if (isWithinCompleteInlineCode(line, lastDoubleTildeIndex)) return line;
						const endOfCellOrLine = findEndOfCellOrLineContaining(line, lastDoubleTildeIndex);
						// Only complete if there's content after the tildes
						const contentAfterTildes = line.substring(lastDoubleTildeIndex + 2, endOfCellOrLine);
						if (contentAfterTildes.trim().length > 0) {
							if (isEndingWithDoubleTilde) {
								return line.substring(0, lastDoubleTildeIndex);
							}
							const before = line.substring(0, endOfCellOrLine);
							// A half-typed closing '~~' (a lone trailing '~') only needs one more '~'.
							const closing = before.endsWith('~') && !before.endsWith('~~') ? '~' : '~~';
							return before + closing + line.substring(endOfCellOrLine);
						}
					}
					return line;
				}
			},

			{
				name: 'singleAsteriskItalic',
				pattern: /\*/,
				skipInBlockTypes: ['code', 'math'],
				handler: ({ line }) => {
					if (line.trim() === '***') {
						return line;
					}
					// '\(w^{*}\)' and '$w^{*}$' are formulas, not half-open emphasis (8093f2a).
					const mathy = mathDelimiter.test(line);
					// Inline countSingleAsterisks logic
					let singleAsterisks = 0;
					let lastSingleAsterisk = -1;
					for (let i = 0; i < line.length; i++) {
						if (line[i] === '*') {
							const prevChar = i > 0 ? line[i - 1] : '';
							const nextChar = i < line.length - 1 ? line[i + 1] : '';
							// Whitespace on both sides means arithmetic ('5 * 0') or a bare list
							// marker, never an emphasis delimiter (c347b53).
							if (isSpaceOrEdge(prevChar) && isSpaceOrEdge(nextChar)) {
								continue;
							}
							if (mathy && isWithinMathBlock(line, i)) {
								continue;
							}
							if (isWithinCompleteInlineCode(line, i)) {
								continue;
							}
							if (prevChar !== '*' && nextChar !== '*') {
								singleAsterisks++;
								lastSingleAsterisk = i;
							}
						}
					}

					if (singleAsterisks % 2 === 1) {
						// The dangling asterisk is the last counted one. If it cannot OPEN
						// emphasis (nothing or whitespace after it) it is an intraword or
						// trailing closer — '*foo*bar*' is literal, not half of '*foo*bar**'
						// (9f96409).
						if (isSpaceOrEdge(line[lastSingleAsterisk + 1] ?? '')) {
							return line;
						}
						// Inline findFirstSingleAsterisk logic
						let firstSingleAsteriskIndex = -1;
						for (let i = 0; i < line.length; i++) {
							if (line[i] === '*' && line[i - 1] !== '*' && line[i + 1] !== '*') {
								const prevChar = i > 0 ? line[i - 1] : '';
								const nextChar = i < line.length - 1 ? line[i + 1] : '';
								if (isSpaceOrEdge(prevChar) && isSpaceOrEdge(nextChar)) continue;
								if (mathy && isWithinMathBlock(line, i)) continue;
								if (isWithinCompleteInlineCode(line, i)) continue;
								if (/\w/.test(prevChar) && /\w/.test(nextChar)) continue;
								if (/\w/.test(prevChar) && !/\s/.test(prevChar)) continue;
								firstSingleAsteriskIndex = i;
								break;
							}
						}

						if (firstSingleAsteriskIndex !== -1) {
							const endOfCellOrLine = findEndOfCellOrLineContaining(line, firstSingleAsteriskIndex);
							return line.substring(0, endOfCellOrLine) + '*' + line.substring(endOfCellOrLine);
						}
					}
					return line;
				}
			},
			{
				name: 'inlineCode',
				skipInBlockTypes: ['code', 'math'],
				pattern: /`/,
				handler: ({ line }) => {
					// Inline countSingleBackticks logic
					let singleBacktickCount = 0;
					for (let i = 0; i < line.length; i++) {
						if (line[i] === '`') {
							const isTripleStart = line.substring(i, i + 3) === '```';
							const isTripleMiddle = i > 0 && line.substring(i - 1, i + 2) === '```';
							const isTripleEnd = i > 1 && line.substring(i - 2, i + 1) === '```';
							const isPartOfTriple = isTripleStart || isTripleMiddle || isTripleEnd;
							if (!isPartOfTriple) {
								singleBacktickCount++;
							}
						}
					}

					// Inline hasCompleteCodeBlock logic
					const tripleBackticks = (line.match(/```/g) || []).length;
					const hasCompleteBlock =
						tripleBackticks > 0 && tripleBackticks % 2 === 0 && line.includes('\n');

					if (singleBacktickCount % 2 === 1 && !hasCompleteBlock) {
						const lastBacktickIndex = line.lastIndexOf('`');
						const endOfCellOrLine = findEndOfCellOrLineContaining(line, lastBacktickIndex);
						// Only complete if there's content after the backtick and it doesn't contain table delimiters
						const contentAfterBacktick = line.substring(lastBacktickIndex + 1, endOfCellOrLine);
						if (contentAfterBacktick.trim().length > 0 && !contentAfterBacktick.includes('|')) {
							return line.substring(0, endOfCellOrLine) + '`' + line.substring(endOfCellOrLine);
						}
					}
					return line;
				}
			},
			{
				name: 'singleUnderscoreItalic',
				pattern: /_/,
				skipInBlockTypes: ['code', 'math'],
				handler: ({ line }) => {
					// Inline countSingleUnderscores logic. The first counted underscore is
					// also the one findFirstSingleUnderscore used to look for in a second
					// identical pass, so it is picked up here.
					let singleUnderscores = 0;
					let firstSingleUnderscoreIndex = -1;
					for (let i = 0; i < line.length; i++) {
						if (line[i] === '_') {
							const prevChar = i > 0 ? line[i - 1] : '';
							const nextChar = i < line.length - 1 ? line[i + 1] : '';
							if (prevChar === '\\') continue;
							if (isWithinMathBlock(line, i)) continue;
							if (isWithinCompleteInlineCode(line, i)) continue;
							if (
								prevChar &&
								nextChar &&
								/[\p{L}\p{N}_]/u.test(prevChar) &&
								/[\p{L}\p{N}_]/u.test(nextChar)
							) {
								continue;
							}
							if (prevChar !== '_' && nextChar !== '_') {
								singleUnderscores++;
								if (firstSingleUnderscoreIndex === -1) firstSingleUnderscoreIndex = i;
							}
						}
					}

					if (singleUnderscores % 2 === 1) {
						const endOfCellOrLine = findEndOfCellOrLineContaining(line, firstSingleUnderscoreIndex);
						return line.substring(0, endOfCellOrLine) + '_' + line.substring(endOfCellOrLine);
					}
					return line;
				}
			},
			{
				name: 'subscript',
				pattern: /~/,
				skipInBlockTypes: ['code', 'math'],
				handler: ({ line }) => {
					// Inline countSingleTildes logic
					let singleTildes = 0;
					for (let i = 0; i < line.length; i++) {
						if (line[i] === '~') {
							const prevChar = i > 0 ? line[i - 1] : '';
							const nextChar = i < line.length - 1 ? line[i + 1] : '';
							if (prevChar === '\\') continue;
							if (prevChar !== '~' && nextChar !== '~') singleTildes++;
						}
					}

					if (singleTildes % 2 === 1) {
						const lastTildeIndex = line.lastIndexOf('~');
						if (
							lastTildeIndex !== -1 &&
							!isWithinMathBlock(line, lastTildeIndex) &&
							!isWithinCompleteInlineCode(line, lastTildeIndex)
						) {
							const endOfCellOrLine = findEndOfCellOrLineContaining(line, lastTildeIndex);
							const contentAfterTilde = line.substring(lastTildeIndex + 1, endOfCellOrLine);
							// A subscript is '~text~' with no whitespace inside (same rule as the
							// lexer), and a digit before the tilde means a range like '20~25°C':
							// closing those would manufacture a subscript nobody typed (716a5f0).
							if (
								contentAfterTilde.length > 0 &&
								!/\s/.test(contentAfterTilde) &&
								!/\d/.test(line[lastTildeIndex - 1] ?? '')
							) {
								return line.substring(0, endOfCellOrLine) + '~' + line.substring(endOfCellOrLine);
							}
						}
					}
					return line;
				}
			},
			{
				// Must run before inlineCitation: otherwise a trailing `[^label` gets
				// closed with a plain `]`, defeating the streamdown:footnote marker.
				name: 'footnoteRef',
				pattern: /\[\^[^\]\s,]*/,
				skipInBlockTypes: ['code', 'math'],
				handler: ({ line }) => {
					if (!line.includes(']')) {
						return line.replace(/\[\^[^\]\s,]*/, '[^streamdown:footnote]');
					}
					return line;
				}
			},
			{
				name: 'inlineCitation',
				pattern: /\[/,
				skipInBlockTypes: ['code', 'math'],
				handler: ({ line }) => {
					// Lines that already contain link/image "](" syntax belong to the
					// linksAndImages plugin: completing or preserving them is its job.
					if (line.includes('](')) {
						return line;
					}

					// A '[' is unclosed exactly when no ']' follows it, so nothing before the
					// last ']' can be: one lastIndexOf replaces an indexOf per bracket.
					const lastClose = line.lastIndexOf(']');
					const unclosed: number[] = [];
					for (let i = lastClose + 1; i < line.length; i++) {
						// Inside a math span a bracket is notation, not a citation opener:
						// '\\(a[b\\)' must not gain a ']' at the end of the line.
						if (line[i] === '[' && line[i - 1] !== '\\' && mathContextAt(line, i) === 'none') {
							unclosed.push(i);
						}
					}
					if (unclosed.length === 0) return line;

					// A completed `[...]` pair in front of them is evidence of an in-progress
					// link, left to linksAndImages. No ']' can follow the first unclosed
					// bracket, so that answer is the same for all of them: decided once.
					let sawOpen = false;
					for (let i = 0; i < unclosed[0]; i++) {
						if (line[i] === ']' && sawOpen) return line;
						sawOpen ||= line[i] === '[';
					}

					// Close every unclosed citation bracket. Brackets that look like
					// incomplete images (`![`), footnotes (`[^`), link text containing
					// markdown formatting, or table-cell content are left for the dedicated
					// plugins (footnoteRef, linksAndImages). The cell boundary, the
					// formatting scan and the citation key all advance monotonically with
					// the brackets, so the line is walked a constant number of times.
					const insertions: number[] = [];
					let cellEnd = 0;
					let lastFormatting = -1;
					let keyStart = 0;
					let keyEnd = 0;
					for (let k = 0; k < unclosed.length; k++) {
						const pos = unclosed[k];
						if (cellEnd <= pos) {
							cellEnd = findEndOfCellOrLineContaining(line, pos);
							lastFormatting = -1;
							for (let i = pos + 1; i < cellEnd; i++) {
								if (formattingChars.has(line[i])) lastFormatting = i;
							}
						}
						const isImage = pos > 0 && line[pos - 1] === '!';
						const isFootnote = line[pos + 1] === '^';
						const isTableCell = cellEnd < line.length && line[cellEnd] === '|';
						if (isImage || isFootnote || lastFormatting > pos || isTableCell) {
							continue;
						}
						if (k === unclosed.length - 1) {
							// Last bracket: close at end of cell/line (keeps multi-key citations together)
							insertions.push(cellEnd);
						} else {
							// Earlier brackets: close right after the citation key (first word)
							if (keyStart < pos + 1) keyStart = pos + 1;
							while (keyStart < cellEnd && isSpaceOrEdge(line[keyStart])) keyStart++;
							if (keyEnd < keyStart) keyEnd = keyStart;
							while (keyEnd < cellEnd && !isSpaceOrEdge(line[keyEnd])) keyEnd++;
							if (keyEnd > keyStart) insertions.push(keyEnd);
						}
					}
					if (insertions.length === 0) return line;

					// Offsets are all against the original line and ascending, so the
					// closers are spliced in with one join instead of rebuilding the line
					// per bracket.
					const out: string[] = [];
					let from = 0;
					for (const at of insertions) {
						out.push(line.slice(from, at), ']');
						from = at;
					}
					out.push(line.slice(from));
					return out.join('');
				}
			},
			{
				name: 'superscript',
				pattern: /\^/,
				skipInBlockTypes: ['code', 'math'],
				handler: ({ line }) => {
					// An exponent ('\(w^{*}\)', '$E = mc^2$') is not half-open superscript.
					const mathy = mathDelimiter.test(line);
					// Inline countSingleCarets logic
					let singleCarets = 0;
					for (let i = 0; i < line.length; i++) {
						if (line[i] === '^') {
							const prevChar = i > 0 ? line[i - 1] : '';
							if (prevChar === '\\') continue;
							if (mathy && isWithinMathBlock(line, i)) continue;
							if (!isWithinFootnoteRef(line, i)) singleCarets++;
						}
					}

					if (singleCarets % 2 === 1) {
						const lastCaretIndex = line.lastIndexOf('^');
						if (
							lastCaretIndex !== -1 &&
							!(mathy && isWithinMathBlock(line, lastCaretIndex)) &&
							!isWithinFootnoteRef(line, lastCaretIndex)
						) {
							const endOfCellOrLine = findEndOfCellOrLineContaining(line, lastCaretIndex);
							// Only complete if there's content after the caret
							const contentAfterCaret = line.substring(lastCaretIndex + 1, endOfCellOrLine);
							if (contentAfterCaret.trim().length > 0) {
								return line.substring(0, endOfCellOrLine) + '^' + line.substring(endOfCellOrLine);
							}
						}
					}
					return line;
				}
			},
			{
				name: 'inlineMath',
				pattern: /\$/,
				skipInBlockTypes: ['code', 'math'],
				handler: ({ line }) => {
					// Inline countSingleDollarSigns logic
					let singleDollars = 0;
					for (let i = 0; i < line.length; i++) {
						if (line[i] === '$') {
							const prevChar = i > 0 ? line[i - 1] : '';
							const nextChar = i < line.length - 1 ? line[i + 1] : '';
							if (prevChar === '\\') continue;
							if (prevChar === '$' || nextChar === '$') continue;
							if (nextChar && /\d/.test(nextChar)) continue;
							// A '$' shown as code ('`$var`') must not flip the parity (e50b0c4)
							if (isWithinCompleteInlineCode(line, i)) continue;
							singleDollars++;
						}
					}

					if (singleDollars % 2 === 1) {
						let lastDollarIndex = -1;
						for (let i = line.length - 1; i >= 0; i--) {
							if (line[i] === '$') {
								const prevChar = i > 0 ? line[i - 1] : '';
								const nextChar = i < line.length - 1 ? line[i + 1] : '';
								if (
									prevChar !== '\\' &&
									prevChar !== '$' &&
									nextChar !== '$' &&
									nextChar !== '' &&
									!/\d/.test(nextChar) &&
									!isWithinCompleteInlineCode(line, i)
								) {
									lastDollarIndex = i;
									break;
								}
							}
						}
						if (lastDollarIndex !== -1) {
							const endOfCellOrLine = findEndOfCellOrLineContaining(line, lastDollarIndex);
							return line.substring(0, endOfCellOrLine) + '$' + line.substring(endOfCellOrLine);
						}
					}
					return line;
				}
			},
			{
				name: 'blockMath',
				pattern: /\$\$/,
				skipInBlockTypes: ['code', 'math'],
				handler: ({ line }) => {
					// Don't process block boundaries (lines that are just $$)
					if (line.trim() === '$$') return line;

					const dollarPairs = (line.match(/\$\$/g) || []).length;
					if (dollarPairs % 2 === 0) return line;
					const firstDollarIndex = line.indexOf('$$');
					// Only complete if there's content after $$ on the same line (no newline immediately after)
					const hasNewlineAfterStart = line.indexOf('\n', firstDollarIndex) !== -1;
					if (!hasNewlineAfterStart) {
						// Single line case: $$content → $$content$$
						return line + '$$';
					}
					// Multi-line cases are handled by contextManager
					return line;
				}
			},
			{
				// Same job inlineMath does for '$': a half-streamed '\(x^2' should render
				// as math rather than flashing a literal escaped paren. A lone '\[' on its
				// own line is a block opener and is closed by contextManager instead.
				name: 'latexMath',
				pattern: /\\[([]/,
				skipInBlockTypes: ['code', 'math'],
				handler: ({ line }) => {
					const context = mathContextAt(line, line.length);
					if (context !== 'inlineLatex' && context !== 'blockLatex') return line;
					const opener = context === 'inlineLatex' ? '\\(' : '\\[';
					const openIndex = line.lastIndexOf(opener);
					const endOfCellOrLine = findEndOfCellOrLineContaining(line, openIndex);
					// Nothing to render yet: leave the bare delimiter for the next chunk.
					if (!line.substring(openIndex + 2, endOfCellOrLine).trim()) return line;
					const closer = context === 'inlineLatex' ? '\\)' : '\\]';
					return line.substring(0, endOfCellOrLine) + closer + line.substring(endOfCellOrLine);
				}
			},
			{
				name: 'descriptionList',
				pattern: /^(\s*):/,
				skipInBlockTypes: ['code', 'math'],
				handler: ({ line }) => {
					// Check if this is a description list item that needs completion
					const colonMatch = line.match(/^(\s*):(.+)$/);
					if (colonMatch) {
						const [, indent, content] = colonMatch;
						// Only complete if the content doesn't already contain a colon
						if (!content.includes(':')) {
							const endOfCellOrLine = findEndOfCellOrLineContaining(line, line.length - 1);
							return line.substring(0, endOfCellOrLine) + ':' + line.substring(endOfCellOrLine);
						}
					}
					return line;
				}
			},
			{
				name: 'linksAndImages',
				pattern: /(!?\[.*)$/,
				skipInBlockTypes: ['code', 'math'],
				handler: ({ line }) => {
					// Check for incomplete links with URLs: [text](url
					const urlMatch = line.match(/(!?\[[^\]]*\]\()([^)]*?)$/);
					// An escaped bracket opens nothing — '\[' is LaTeX display math or a
					// literal '[', never an incomplete link (8093f2a). Both regexes here are
					// anchored to the end of the line, so a guarded match means the line has
					// no incomplete link at all.
					if (urlMatch && !isEscapedBracket(line, urlMatch)) {
						const url = urlMatch[2];
						if (url.length > 0) {
							// Inline isUrlIncomplete logic
							let isIncomplete = true;
							if (url && url.length >= 4) {
								if (
									(url.startsWith('http://') && url.length >= 12) ||
									(url.startsWith('https://') && url.length >= 13)
								) {
									let domain = url;
									if (url.startsWith('http://')) domain = url.substring(7);
									else if (url.startsWith('https://')) domain = url.substring(8);

									domain = domain.split('/')[0].split('?')[0].split('#')[0];
									const domainParts = domain.split('.');
									if (domainParts.length >= 2) {
										const extension = domainParts[domainParts.length - 1];
										if (extension.length >= 2 && /^[a-zA-Z]+$/.test(extension)) {
											isIncomplete = false;
										}
									}
								}
							}

							if (isIncomplete) {
								const marker = urlMatch[1].startsWith('!')
									? 'streamdown:incomplete-image'
									: 'streamdown:incomplete-link';
								return line.replace(url, marker) + ')';
							} else {
								return line + ')';
							}
						} else {
							const marker = urlMatch[1].startsWith('!')
								? 'streamdown:incomplete-image'
								: 'streamdown:incomplete-link';
							return line + marker + ')';
						}
					}

					// Check for incomplete links without URLs: [text
					const linkMatch = line.match(/(!?\[)([^\]]*?)$/);
					if (linkMatch && !isEscapedBracket(line, linkMatch) && !line.includes('](')) {
						const [, openBracket, linkTextWithPossibleBoundary] = linkMatch;
						// Position of the matched opening bracket (the regex matches the first
						// bracket that stays unclosed through the end of the line). Using the
						// match index keeps the replacement aligned with the captured link text;
						// `lastIndexOf` could point at a different bracket and duplicate text.
						const bracketIndex = linkMatch.index ?? 0;
						const endOfCellOrLine = findEndOfCellOrLineContaining(line, bracketIndex);

						// Extract the clean link text (remove any trailing | or whitespace)
						const linkText = linkTextWithPossibleBoundary.replace(/[\s|]+$/, '');
						const marker = openBracket.startsWith('!')
							? 'streamdown:incomplete-image'
							: 'streamdown:incomplete-link';

						// Replace from bracket to end of cell/line, including boundary if it's |
						const includeBoundary = endOfCellOrLine < line.length && line[endOfCellOrLine] === '|';
						const incompleteEnd = includeBoundary ? endOfCellOrLine + 1 : endOfCellOrLine;
						const completedPart =
							openBracket + linkText + '](' + marker + ')' + (includeBoundary ? '|' : '');

						return line.substring(0, bracketIndex) + completedPart + line.substring(incompleteEnd);
					}
					return line;
				}
			},
			{
				name: 'mdx',
				skipInBlockTypes: ['code', 'math', 'center', 'right'],
				preprocess: ({ text, state }) => {
					// Track MDX component states across the entire text
					const tags = state.tags;
					const lines = text.split('\n');
					const openTags: Array<{ tagName: string; lineIndex: number }> = [];

					for (let i = 0; i < lines.length; i++) {
						// Lines inside code fences or math blocks are opaque content: MDX-looking
						// tags there must not open/close/track components.
						const lineCtx = state.lineContexts?.[i];
						if (lineCtx?.code || lineCtx?.math) {
							continue;
						}
						const line = lines[i];

						// Find all MDX tags in the line
						let searchPos = 0;
						while (searchPos < line.length) {
							// Look for an opening bracket that starts an allowlisted tag
							const tagStart = line.indexOf('<', searchPos);
							if (tagStart === -1 || tagStart >= line.length - 1) break;

							const nextChar = line[tagStart + 1];

							// Closing tag for a component opened on an earlier line. Handled
							// inside the scan so a close that is part of a same-line complete
							// pair (consumed below) is never double-counted against the stack.
							const closeTagMatch = line.substring(tagStart).match(tags.closeTag);
							if (closeTagMatch) {
								const tagName = closeTagMatch[1];
								// Pop the innermost same-name open (LIFO) so the auto-appended
								// closers keep the right nesting order.
								for (let openIndex = openTags.length - 1; openIndex >= 0; openIndex--) {
									if (openTags[openIndex].tagName === tagName) {
										openTags.splice(openIndex, 1);
										break;
									}
								}
								searchPos = tagStart + closeTagMatch[0].length;
								continue;
							}

							// Every allowlisted name starts with a letter; cheap gate.
							if (!/[a-zA-Z]/.test(nextChar)) {
								searchPos = tagStart + 1;
								continue;
							}

							// Try to match complete self-closing tag
							const selfClosingMatch = line.substring(tagStart).match(tags.selfClosing);
							if (selfClosingMatch) {
								searchPos = tagStart + selfClosingMatch[0].length;
								continue;
							}

							// Try to match complete opening tag with immediate closing
							const completeMatch = line.substring(tagStart).match(tags.complete);
							if (completeMatch) {
								searchPos = tagStart + completeMatch[0].length;
								continue;
							}

							// Try to match opening tag
							const openTagMatch = line.substring(tagStart).match(tags.openTag);
							if (openTagMatch) {
								const tagName = openTagMatch[1];
								openTags.push({ tagName, lineIndex: i });
								searchPos = tagStart + openTagMatch[0].length;
								continue;
							}

							// A tag cut off before its `>` is the last thing on the line (the
							// incompleteHtmlTag plugin, which ran first, strips it); scanning on
							// from the next character finds nothing and ends the loop.
							searchPos = tagStart + 1;
						}
					}

					return { text, state: { mdxUnclosedTags: openTags } };
				},
				postprocess: ({ text, state }) => {
					// Complete unclosed MDX components at the end
					const unclosedTags = state.mdxUnclosedTags || [];
					if (unclosedTags.length > 0) {
						// Close tags in reverse order (innermost first)
						let result = text;
						for (let i = unclosedTags.length - 1; i >= 0; i--) {
							result += `\n</${unclosedTags[i].tagName}>`;
						}
						return result;
					}
					return text;
				}
			}
		];
	}
}

// Legacy function for backward compatibility
const defaultPlugins = IncompleteMarkdownParser.createDefaultPlugins();
const defaultParser = new IncompleteMarkdownParser(defaultPlugins);

export const parseIncompleteMarkdown = (text: string, options?: CompleterOptions): string => {
	if (!text || typeof text !== 'string') {
		return text;
	}
	return defaultParser.parse(text, options);
};

// Utility functions

// Full test for the comparisonOperator plugin, whose `pattern` only gates it.
const listItemComparison = /^(\s*(?:[-*+]|\d+[.)]) +)>(?==?\s*\$?\d)/;

// An opening or closing tag that never got its '>', anchored at the line's last
// '<': the name (hyphens allowed, so `</ai-thinking` is caught too), then any
// number of COMPLETE attributes, then at most one still being typed. Upstream
// accepts any `[^>]*` tail, which also swallows ordinary prose — `if a <b then
// c` and `Use the <div element to wrap it.` both end in a `<name` with no '>'
// after it. Requiring every attribute but the last to carry a quoted value is
// what tells a half-typed tag from a sentence.
const incompleteHtmlTag =
	/^<\/?([a-zA-Z][a-zA-Z0-9-]*)(?:\s+[\w-]+=(?:"[^"]*"|'[^']*'|\{[^}]*\}))*(?:\s+[\w-]*(?:=(?:"[^"]*|'[^']*|\{[^}]*)?)?)?\s*\/?$/;

/**
 * The HTML element names a half-typed tag may be stripped for. Deliberately a
 * short list of what an LLM actually emits rather than the full HTML vocabulary:
 * every name here is one the user will never mean literally at the end of a
 * streamed line, which is what makes the strip safe. Anything else must come in
 * through `customTags` / `mdxComponents`.
 */
const htmlElements = [
	'a',
	'abbr',
	'b',
	'blockquote',
	'br',
	'button',
	'code',
	'col',
	'colgroup',
	'dd',
	'del',
	'details',
	'div',
	'dl',
	'dt',
	'em',
	'figcaption',
	'figure',
	'h1',
	'h2',
	'h3',
	'h4',
	'h5',
	'h6',
	'hr',
	'i',
	'iframe',
	'img',
	'input',
	'ins',
	'kbd',
	'label',
	'li',
	'mark',
	'ol',
	'p',
	'picture',
	'pre',
	'q',
	's',
	'samp',
	'section',
	'small',
	'source',
	'span',
	'strong',
	'sub',
	'summary',
	'sup',
	'table',
	'tbody',
	'td',
	'tfoot',
	'th',
	'thead',
	'tr',
	'u',
	'ul',
	'video'
];

// A tag arrives one character at a time, so `<d`, `<di` and `<div` must all be
// recognised or the raw text flashes for a chunk or two anyway. Every prefix of
// every name above, precomputed — ~250 entries, one Set lookup per probe.
const htmlPrefixes = new Set<string>();
for (const element of htmlElements) {
	for (let i = 1; i <= element.length; i++) htmlPrefixes.add(element.slice(0, i));
}

/** Could `name` still grow into a tag we are allowed to strip? */
const isTagPrefix = (name: string, tags: TagMatchers): boolean =>
	htmlPrefixes.has(name.toLowerCase()) ||
	// PascalCase is prefix-closed by construction, so this covers `<MyComp` too.
	tags.name.test(name) ||
	tags.names.some((tag) => tag.startsWith(name));

// Emphasis/code markers, as a set so inlineCitation can scan a cell for them
// without building a substring per bracket.
const formattingChars = new Set(['*', '~', '`', '_']);

// The char accessors in the plugins return '' past either end of the line, so an
// empty string here means "edge of line".
const isSpaceOrEdge = (char: string): boolean => !char || /\s/.test(char);

const findEndOfCellOrLineContaining = (text: string, position: number): number => {
	let endPos = position;
	while (endPos < text.length && text[endPos] !== '\n' && text[endPos] !== '|') {
		endPos++;
	}
	return endPos;
};

// End (exclusive) of the complete inline-code span opened by the backtick run at
// `open`, or -1 when that run is never closed.
const endOfCodeSpan = (line: string, open: number): number => {
	let openEnd = open;
	while (line.charCodeAt(openEnd) === 96) openEnd++;
	const runLength = openEnd - open;
	for (let j = openEnd; j < line.length; j++) {
		if (line.charCodeAt(j) !== 96) continue;
		let closeEnd = j;
		while (line.charCodeAt(closeEnd) === 96) closeEnd++;
		if (closeEnd - j === runLength) return j + runLength;
		j = closeEnd - 1;
	}
	return -1;
};

// The spans are probed at ascending positions along one line (once per marker
// character in the worst case), so the walk is resumed where it stopped instead
// of restarted from the line's first backtick — the difference between linear
// and quadratic on a long line. A query that moves backwards, or onto another
// line, restarts it. Four scalars: allocating a mask per line instead costs more
// in GC than the scan it saves.
let codeLine = '';
let codePosition = -1;
let codeOpen = -1;
let codeEnd = -1;
let codeUnclosed = false;

const isWithinCompleteInlineCode = (line: string, position: number): boolean => {
	if (line !== codeLine || position < codePosition) {
		codeLine = line;
		codeOpen = line.indexOf('`');
		codeEnd = codeOpen === -1 ? -1 : endOfCodeSpan(line, codeOpen);
		// An unterminated run closes nothing, so neither it nor anything after it
		// is code: completing emphasis inside it is what streaming needs.
		codeUnclosed = codeOpen !== -1 && codeEnd === -1;
	}
	codePosition = position;
	while (!codeUnclosed && codeOpen !== -1 && position >= codeEnd) {
		codeOpen = line.indexOf('`', codeEnd);
		if (codeOpen === -1) break;
		codeEnd = endOfCodeSpan(line, codeOpen);
		if (codeEnd === -1) codeUnclosed = true;
	}
	return !codeUnclosed && codeOpen !== -1 && position >= codeOpen && position < codeEnd;
};

type MathContext = 'none' | 'inlineDollar' | 'blockDollar' | 'inlineLatex' | 'blockLatex';

/**
 * Math delimiters `mathContextAt` reacts to. Testing this first keeps the
 * per-character scan off the lines — nearly all of them — that cannot be math.
 */
const mathDelimiter = /\$|\\[([]/;

// Same deal as the code-span walk above: one left-to-right fold over the line,
// resumed rather than replayed from character 0 on every probe. The fold carries
// the LaTeX states too (8093f2a), so the guards that consult it stay linear on a
// long line instead of costing an O(n) probe per marker.
let mathLine = '';
let mathNext = 0;
let mathState: MathContext = 'none';

/**
 * The math context a position sits in: `$`/`$$` as before, plus the LaTeX
 * delimiters the lexer now tokenizes. Inside `\(`/`\[` a `$` is literal, so
 * dollars are only read when no LaTeX span is open.
 */
const mathContextAt = (text: string, position: number): MathContext => {
	if (text !== mathLine || position < mathNext) {
		mathLine = text;
		mathNext = 0;
		mathState = 'none';
	}

	let i = mathNext;
	for (; i < text.length && i < position; i++) {
		if (text[i] === '\\') {
			const next = text[i + 1];
			// An escaped backslash consumes both characters, so '\\[' in the source is a
			// literal backslash then a '[', not an opener. The lexer's tokenizer rejects
			// it the same way; skipping the pair keeps the two scanners in agreement.
			if (next === '\\') {
				i++;
				continue;
			}
			if (next === '$') {
				i++;
				continue;
			}
			if (mathState === 'none' && (next === '(' || next === '[')) {
				mathState = next === '(' ? 'inlineLatex' : 'blockLatex';
				i++;
				continue;
			}
			if (
				(mathState === 'inlineLatex' && next === ')') ||
				(mathState === 'blockLatex' && next === ']')
			) {
				mathState = 'none';
				i++;
				continue;
			}
			continue;
		}

		if (text[i] === '$' && mathState !== 'inlineLatex' && mathState !== 'blockLatex') {
			if (text[i + 1] === '$') {
				mathState = mathState === 'blockDollar' ? 'none' : 'blockDollar';
				i++;
			} else if (mathState !== 'blockDollar') {
				// '$100' is a price, not an opening delimiter — the same currency rule the
				// inlineMath counter below and the lexer apply. Without it a single price
				// on the line would make everything after it look like math.
				if (mathState === 'none' && /\d/.test(text[i + 1] ?? '')) continue;
				mathState = mathState === 'inlineDollar' ? 'none' : 'inlineDollar';
			}
		}
	}
	mathNext = i;

	return mathState;
};

const isWithinMathBlock = (text: string, position: number): boolean =>
	mathContextAt(text, position) !== 'none';

/**
 * True when the '[' captured in group 1 (possibly behind a '!') cannot open a
 * link: it is backslash-escaped, or it sits inside a math span, where brackets
 * are notation ('\\(a[b\\)') rather than markup.
 */
const isEscapedBracket = (line: string, match: RegExpMatchArray): boolean => {
	const bracketIndex = (match.index ?? 0) + (match[1].startsWith('!') ? 1 : 0);
	return line[bracketIndex - 1] === '\\' || mathContextAt(line, bracketIndex) !== 'none';
};

// Only ever asked about a '^': that caret belongs to a footnote reference when a
// '[' sits immediately before it and a ']' closes it before any other bracket.
// (Walking back to the nearest bracket instead is O(line) per caret.)
const isWithinFootnoteRef = (text: string, position: number): boolean => {
	if (text[position - 1] !== '[') return false;

	for (let i = position + 1; i < text.length; i++) {
		if (text[i] === ']') return true;
		if (text[i] === '[' || text[i] === '\n') break;
	}

	return false;
};

// Export the class and interfaces
