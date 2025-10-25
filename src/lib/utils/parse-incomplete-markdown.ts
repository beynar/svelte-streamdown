// Simplified interface that merges Plugin and PatternRule
interface Plugin {
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
	context: 'normal' | 'list' | 'blockquote' | 'descriptionList';
	blockingContexts: Set<'code' | 'math' | 'center' | 'right'>;
	lineContexts?: Array<{ code: boolean; math: boolean; center: boolean; right: boolean }>;
	fenceInfo?: string;
	mdxUnclosedTags?: Array<{ tagName: string; lineIndex: number }>;
	mdxLineStates?: Array<{ inMdx: boolean; incompletePositions: number[] }>;
}

class IncompleteMarkdownParser {
	private plugins: Plugin[] = [];
	private state: ParseState = {
		currentLine: 0,
		context: 'normal',
		blockingContexts: new Set(),
		lineContexts: []
	};

	setState = (state: Partial<ParseState>) => {
		this.state = { ...this.state, ...state };
	};

	constructor(plugins: Plugin[] = []) {
		this.plugins = plugins;
	}

	// Main parsing methods
	parse(text: string): string {
		if (!text || typeof text !== 'string') {
			return text;
		}

		this.state = {
			currentLine: 0,
			context: 'normal',
			blockingContexts: new Set(),
			lineContexts: [],
			fenceInfo: undefined
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
			// Block-level plugin that manages blocking contexts
			{
				name: 'contextManager',
				preprocess: ({ text }) => {
					// Pre-scan the entire text to establish blocking contexts
					const lines = text.split('\n');
					let inCodeBlock = false;
					let inMathBlock = false;
					let inCenterBlock = false;
					let inRightBlock = false;

					// Track which lines are in which contexts for state management
					const lineContexts: Array<{
						code: boolean;
						math: boolean;
						center: boolean;
						right: boolean;
					}> = [];

					for (let i = 0; i < lines.length; i++) {
						const line = lines[i];

						// Check for block boundaries
						if (line.trim().startsWith('```') || line.trim().startsWith('~~~')) {
							inCodeBlock = !inCodeBlock;
						}
						if (line.trim().startsWith('$$') && !line.trim().includes('$$', 2)) {
							inMathBlock = !inMathBlock;
						}
						if (line.trim() === '[center]') {
							inCenterBlock = true;
						}
						if (line.trim() === '[/center]') {
							inCenterBlock = false;
						}
						if (line.trim() === '[right]') {
							inRightBlock = true;
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
					if (inCodeBlock) finalContexts.add('code');
					if (inMathBlock) finalContexts.add('math');
					if (inCenterBlock) finalContexts.add('center');
					if (inRightBlock) finalContexts.add('right');

					// Return both the text and the updated state
					return {
						text: text, // Don't modify text in preprocess
						state: {
							blockingContexts: finalContexts as Set<'code' | 'math' | 'center' | 'right'>,
							lineContexts
						}
					};
				},
				postprocess: ({ text, state }) => {
					// Complete incomplete blocks at end of input
					if (state.blockingContexts.has('code')) {
						return text + '\n```';
					}
					if (state.blockingContexts.has('math')) {
						return text + '\n$$';
					}
					if (state.blockingContexts.has('center')) {
						return text + '\n[/center]';
					}
					if (state.blockingContexts.has('right')) {
						return text + '\n[/right]';
					}
					return text;
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
						const endOfCellOrLine = findEndOfCellOrLineContaining(line, lastTripleAsteriskIndex);
						if (isEndingWithTripleAsterisk) {
							return line.substring(0, lastTripleAsteriskIndex);
						}
						return line.substring(0, endOfCellOrLine) + '***' + line.substring(endOfCellOrLine);
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
						const endOfCellOrLine = findEndOfCellOrLineContaining(line, lastDoubleAsteriskIndex);
						if (isEndingWithDoubleAsterisk) {
							return line.substring(0, lastDoubleAsteriskIndex);
						}
						return line.substring(0, endOfCellOrLine) + '**' + line.substring(endOfCellOrLine);
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
						const endOfCellOrLine = findEndOfCellOrLineContaining(line, lastDoubleUnderscoreIndex);
						if (isEndingWithDoubleUnderscore) {
							return line.substring(0, lastDoubleUnderscoreIndex);
						}
						return line.substring(0, endOfCellOrLine) + '__' + line.substring(endOfCellOrLine);
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
						const endOfCellOrLine = findEndOfCellOrLineContaining(line, lastDoubleTildeIndex);
						// Only complete if there's content after the tildes
						const contentAfterTildes = line.substring(lastDoubleTildeIndex + 2, endOfCellOrLine);
						if (contentAfterTildes.trim().length > 0) {
							if (isEndingWithDoubleTilde) {
								return line.substring(0, lastDoubleTildeIndex);
							}
							return line.substring(0, endOfCellOrLine) + '~~' + line.substring(endOfCellOrLine);
						}
					}
					return line;
				}
			},

			{
				name: 'singleAsteriskItalic',
				pattern: /[\s\S]*/,
				skipInBlockTypes: ['code', 'math'],
				handler: ({ line }) => {
					if (line.trim() === '***') {
						return line;
					}
					// Inline countSingleAsterisks logic
					let singleAsterisks = 0;
					for (let i = 0; i < line.length; i++) {
						if (line[i] === '*') {
							const prevChar = i > 0 ? line[i - 1] : '';
							const nextChar = i < line.length - 1 ? line[i + 1] : '';
							let lineStartIndex = i;
							for (let j = i - 1; j >= 0; j--) {
								if (line[j] === '\n') {
									lineStartIndex = j + 1;
									break;
								}
								if (j === 0) {
									lineStartIndex = 0;
									break;
								}
							}
							const beforeAsterisk = line.substring(lineStartIndex, i);
							if (beforeAsterisk.trim() === '' && (nextChar === ' ' || nextChar === '\t')) {
								continue;
							}
							if (prevChar !== '*' && nextChar !== '*') {
								singleAsterisks++;
							}
						}
					}

					if (singleAsterisks % 2 === 1) {
						// Inline findFirstSingleAsterisk logic
						let firstSingleAsteriskIndex = -1;
						for (let i = 0; i < line.length; i++) {
							if (line[i] === '*' && line[i - 1] !== '*' && line[i + 1] !== '*') {
								const prevChar = i > 0 ? line[i - 1] : '';
								const nextChar = i < line.length - 1 ? line[i + 1] : '';
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
				pattern: /[\s\S]*/,
				skipInBlockTypes: ['code', 'math'],
				handler: ({ line }) => {
					// Inline countSingleUnderscores logic
					let singleUnderscores = 0;
					for (let i = 0; i < line.length; i++) {
						if (line[i] === '_') {
							const prevChar = i > 0 ? line[i - 1] : '';
							const nextChar = i < line.length - 1 ? line[i + 1] : '';
							if (prevChar === '\\') continue;
							if (isWithinMathBlock(line, i)) continue;
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
							}
						}
					}

					if (singleUnderscores % 2 === 1) {
						// Inline findFirstSingleUnderscore logic
						let firstSingleUnderscoreIndex = -1;
						for (let i = 0; i < line.length; i++) {
							if (
								line[i] === '_' &&
								line[i - 1] !== '_' &&
								line[i + 1] !== '_' &&
								line[i - 1] !== '\\' &&
								!isWithinMathBlock(line, i)
							) {
								const prevChar = i > 0 ? line[i - 1] : '';
								const nextChar = i < line.length - 1 ? line[i + 1] : '';
								if (
									prevChar &&
									nextChar &&
									/[\p{L}\p{N}_]/u.test(prevChar) &&
									/[\p{L}\p{N}_]/u.test(nextChar)
								) {
									continue;
								}
								firstSingleUnderscoreIndex = i;
								break;
							}
						}

						if (firstSingleUnderscoreIndex !== -1) {
							const endOfCellOrLine = findEndOfCellOrLineContaining(
								line,
								firstSingleUnderscoreIndex
							);
							return line.substring(0, endOfCellOrLine) + '_' + line.substring(endOfCellOrLine);
						}
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
						if (lastTildeIndex !== -1 && !isWithinMathBlock(line, lastTildeIndex)) {
							const endOfCellOrLine = findEndOfCellOrLineContaining(line, lastTildeIndex);
							// Only complete if there's content after the tilde
							const contentAfterTilde = line.substring(lastTildeIndex + 1, endOfCellOrLine);
							if (contentAfterTilde.trim().length > 0) {
								return line.substring(0, endOfCellOrLine) + '~' + line.substring(endOfCellOrLine);
							}
						}
					}
					return line;
				}
			},
			{
				name: 'inlineCitation',
				pattern: /\[/,
				skipInBlockTypes: ['code', 'math'],
				handler: ({ line }) => {
					// Count unescaped opening brackets without matching closing brackets
					let unclosedBrackets = 0;
					for (let i = 0; i < line.length; i++) {
						if (line[i] === '[' && (i === 0 || line[i - 1] !== '\\')) {
							// Check if this bracket has a matching closing bracket later in the line
							const restOfLine = line.substring(i + 1);
							const closingIndex = restOfLine.indexOf(']');
							if (closingIndex === -1) {
								unclosedBrackets++;
							}
						}
					}

					// If there's an odd number of unclosed brackets, add closing bracket
					if (unclosedBrackets % 2 === 1) {
						const endOfCellOrLine = findEndOfCellOrLineContaining(line, line.length - 1);
						return line.substring(0, endOfCellOrLine) + ']' + line.substring(endOfCellOrLine);
					}

					return line;
				}
			},
			{
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
				name: 'superscript',
				pattern: /\^/,
				skipInBlockTypes: ['code', 'math'],
				handler: ({ line }) => {
					// Inline countSingleCarets logic
					let singleCarets = 0;
					for (let i = 0; i < line.length; i++) {
						if (line[i] === '^') {
							const prevChar = i > 0 ? line[i - 1] : '';
							if (prevChar === '\\') continue;
							if (!isWithinFootnoteRef(line, i)) singleCarets++;
						}
					}

					if (singleCarets % 2 === 1) {
						const lastCaretIndex = line.lastIndexOf('^');
						if (
							lastCaretIndex !== -1 &&
							!isWithinMathBlock(line, lastCaretIndex) &&
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
									!/\d/.test(nextChar)
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
					if (urlMatch) {
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
					if (linkMatch && !line.includes('](')) {
						const [, openBracket, linkTextWithPossibleBoundary] = linkMatch;
						// Find the position of the opening bracket
						const bracketIndex = line.lastIndexOf(openBracket);
						const endOfCellOrLine = findEndOfCellOrLineContaining(line, bracketIndex);

						// Extract the clean link text (remove any trailing | or whitespace)
						const linkText = linkTextWithPossibleBoundary.replace(/[\s|]+$/, '');
						const marker = openBracket.startsWith('!')
							? 'streamdown:incomplete-image'
							: 'streamdown:incomplete-link';

						// Replace from bracket to end of cell/line, including boundary if it's |
						const includeBoundary = endOfCellOrLine < line.length && line[endOfCellOrLine] === '|';
						const incompleteEnd = includeBoundary ? endOfCellOrLine + 1 : endOfCellOrLine;
						const incompletePart = line.substring(bracketIndex, incompleteEnd);
						const completedPart =
							openBracket + linkText + '](' + marker + ')' + (includeBoundary ? '|' : '');

						return line.replace(incompletePart, completedPart);
					}
					return line;
				}
			},
			{
				name: 'alignmentBlocks',
				pattern: /^(\s*\[(center|right)\])$/,
				skipInBlockTypes: ['code', 'math'],
				handler: ({ line, state }) => {
					// Check if this is an opening alignment tag without content or closing tag
					const alignMatch = line.match(/^(\s*\[(center|right)\])$/);
					if (alignMatch) {
						const indent = alignMatch[1].length - alignMatch[1].trim().length;
						const alignType = alignMatch[2];
						return line + '\n' + ' '.repeat(indent) + '[/' + alignType + ']';
					}
					return line;
				}
			},
			{
				name: 'mdx',
				skipInBlockTypes: ['code', 'math', 'center', 'right'],
				preprocess: ({ text }) => {
					// Track MDX component states across the entire text
					const lines = text.split('\n');
					const openTags: Array<{ tagName: string; lineIndex: number }> = [];
					let mdxLineStates: Array<{ inMdx: boolean; incompletePositions: number[] }> = [];

					for (let i = 0; i < lines.length; i++) {
						const line = lines[i];
						let inMdx = false;
						let incompletePositions: number[] = [];

						// Find all MDX tags in the line
						let searchPos = 0;
						while (searchPos < line.length) {
							// Look for opening bracket with capital letter (MDX component)
							const tagStart = line.indexOf('<', searchPos);
							if (tagStart === -1 || tagStart >= line.length - 1) break;

							const nextChar = line[tagStart + 1];
							// Only match if starts with capital letter (MDX component)
							if (!/[A-Z]/.test(nextChar)) {
								searchPos = tagStart + 1;
								continue;
							}

							// Try to match complete self-closing tag
							const selfClosingMatch = line
								.substring(tagStart)
								.match(/^<([A-Z][a-zA-Z0-9]*)((?:\s+\w+=(?:"[^"]*"|{[^}]*}))*)\s*\/>/);
							if (selfClosingMatch) {
								searchPos = tagStart + selfClosingMatch[0].length;
								continue;
							}

							// Try to match complete opening tag with immediate closing
							const completeMatch = line
								.substring(tagStart)
								.match(/^<([A-Z][a-zA-Z0-9]*)((?:\s+\w+=(?:"[^"]*"|{[^}]*}))*)\s*>.*?<\/\1>/);
							if (completeMatch) {
								searchPos = tagStart + completeMatch[0].length;
								continue;
							}

							// Try to match opening tag
							const openTagMatch = line
								.substring(tagStart)
								.match(/^<([A-Z][a-zA-Z0-9]*)((?:\s+\w+=(?:"[^"]*"|{[^}]*}))*)\s*>/);
							if (openTagMatch) {
								const tagName = openTagMatch[1];
								openTags.push({ tagName, lineIndex: i });
								inMdx = true;
								searchPos = tagStart + openTagMatch[0].length;
								continue;
							}

							// Check for incomplete self-closing (e.g., <Component /)
							const incompleteSelfClosing = line
								.substring(tagStart)
								.match(/^<([A-Z][a-zA-Z0-9]*)[^>]*\/$/);
							if (incompleteSelfClosing) {
								incompletePositions.push(tagStart);
								break; // This is at the end of the line
							}

							// Check for incomplete tag (no closing >) - only at end of line
							const incompleteTag = line
								.substring(tagStart)
								.match(/^<([A-Z][a-zA-Z0-9]*)(?:\s+[^>]*)?$/);
							if (incompleteTag) {
								incompletePositions.push(tagStart);
								break; // This is at the end of the line
							}

							searchPos = tagStart + 1;
						}

						// Check for closing tags
						const closeTagMatches = line.matchAll(/<\/([A-Z][a-zA-Z0-9]*)>/g);
						for (const closeMatch of closeTagMatches) {
							const tagName = closeMatch[1];
							// Find and remove the matching open tag
							const openIndex = openTags.findIndex((t) => t.tagName === tagName);
							if (openIndex !== -1) {
								openTags.splice(openIndex, 1);
							}
						}

						mdxLineStates[i] = { inMdx, incompletePositions };
					}

					return {
						text,
						state: {
							mdxUnclosedTags: openTags,
							mdxLineStates
						}
					};
				},
				handler: ({ line, state }) => {
					// Escape incomplete MDX syntax by wrapping in backticks
					const lineStates = state.mdxLineStates || [];
					const currentState = lineStates[state.currentLine];

					if (currentState?.incompletePositions && currentState.incompletePositions.length > 0) {
						// Process incomplete positions from right to left to preserve indices
						let result = line;
						for (let i = currentState.incompletePositions.length - 1; i >= 0; i--) {
							const pos = currentState.incompletePositions[i];
							const before = result.substring(0, pos);
							const incomplete = result.substring(pos);
							result = before + '`' + incomplete + '`';
						}
						return result;
					}

					return line;
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

export const parseIncompleteMarkdown = (text: string): string => {
	if (!text || typeof text !== 'string') {
		return text;
	}
	return defaultParser.parse(text);
};

// Utility functions

const findEndOfCellOrLineContaining = (text: string, position: number): number => {
	let endPos = position;
	while (endPos < text.length && text[endPos] !== '\n' && text[endPos] !== '|') {
		endPos++;
	}
	return endPos;
};

const isWithinMathBlock = (text: string, position: number): boolean => {
	let inInlineMath = false;
	let inBlockMath = false;

	for (let i = 0; i < text.length && i < position; i++) {
		if (text[i] === '\\' && text[i + 1] === '$') {
			i++;
			continue;
		}

		if (text[i] === '$') {
			if (text[i + 1] === '$') {
				inBlockMath = !inBlockMath;
				i++;
				inInlineMath = false;
			} else if (!inBlockMath) {
				inInlineMath = !inInlineMath;
			}
		}
	}

	return inInlineMath || inBlockMath;
};

const isWithinFootnoteRef = (text: string, position: number): boolean => {
	let openBracketPos = -1;
	let caretPos = -1;

	for (let i = position; i >= 0; i--) {
		if (text[i] === ']') return false;
		if (text[i] === '^' && caretPos === -1) caretPos = i;
		if (text[i] === '[') {
			openBracketPos = i;
			break;
		}
	}

	if (openBracketPos !== -1 && caretPos === openBracketPos + 1 && position >= caretPos) {
		for (let i = position + 1; i < text.length; i++) {
			if (text[i] === ']') return true;
			if (text[i] === '[' || text[i] === '\n') break;
		}
	}

	return false;
};

// Export the class and interfaces
