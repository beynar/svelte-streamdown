import type { Lexer, TokenizerExtensionFunction, TokenizerThis } from 'marked';

export function letterToInt(letter: string) {
	return letter.toLowerCase().charCodeAt(0) - 96;
}

const romanMap = {
	I: 1,
	V: 5,
	X: 10,
	L: 50,
	C: 100,
	D: 500,
	M: 1000
} as const;

export function romanToInt(roman: string) {
	roman = roman.toUpperCase();
	let total = 0;

	for (let i = 0; i < roman.length; i++) {
		const current = romanMap[roman[i] as keyof typeof romanMap];
		const next = romanMap[roman[i + 1] as keyof typeof romanMap];

		total += next && current < next ? -current : current;
	}

	return total;
}

// Regular expression patterns for list detection
export const romanUpper = '(?:C|XC|L?X{0,3}(?:IX|IV|V?I{0,3}))';
export const romanLower = '(?:c|xc|l?x{0,3}(?:ix|iv|v?i{0,3}))';
// Fixed regex pattern - carefully balanced parentheses
export const bulletPattern = `(?:[*+-]|(?:\\d{1,9}|[a-zA-Z]|${romanUpper}|${romanLower})[.)])`;
export const rule = `^( {0,3}${bulletPattern})([ \\t][^\\n]+?)?(?:\\n|$)`;

function finalizeList(list: ListToken, lexer: Lexer) {
	if (list.tokens.length === 0) return;

	// Trim trailing newline from last item
	const lastItem = list.tokens[list.tokens.length - 1];
	lastItem.raw = lastItem.raw.trimEnd();
	lastItem.text = lastItem.text.trimEnd();
	list.raw = list.raw.trimEnd();

	// Handle child tokens
	for (const item of list.tokens) {
		lexer.state.top = false;
		item.tokens = lexer.blockTokens(item.text, []);
	}

	// Mark list as loose if needed
	if (list.loose) {
		for (const item of list.tokens) {
			item.loose = true;
		}
	}
}

export function markedList(): {
	extensions: Array<{
		name: string;
		level: 'block' | 'inline';
		tokenizer: TokenizerExtensionFunction;
	}>;
} {
	return {
		extensions: [
			{
				name: 'list',
				level: 'block',
				tokenizer(this: TokenizerThis, src: string) {
					let cap = new RegExp(rule).exec(src);

					if (!cap) return null;

					const bullet = cap[1].trim();
					const isOrdered = bullet !== '*' && bullet !== '-' && bullet !== '+';
					let bull;
					let type = '';
					let expectedValue = 1;

					// Detect list type (Roman, alphabetic, numeric)
					if (isOrdered) {
						if (bullet.match(new RegExp(`^${romanUpper}[.)]$`))) {
							type = 'upper-roman';
							bull = `${romanUpper}\\${bullet.slice(-1)}`;
						} else if (bullet.match(new RegExp(`^${romanLower}[.)]$`))) {
							type = 'lower-roman';
							bull = `${romanLower}\\${bullet.slice(-1)}`;
						} else if (bullet.match(/^[a-z][.)]$/)) {
							type = 'lower-alpha';
							bull = `[a-z]\\${bullet.slice(-1)}`;
						} else if (bullet.match(/^[A-Z][.)]$/)) {
							type = 'upper-alpha';
							bull = `[A-Z]\\${bullet.slice(-1)}`;
						} else {
							type = 'decimal';
							bull = `\\d{1,9}\\${bullet.slice(-1)}`;
						}
					} else {
						bull = this.lexer.options.pedantic ? bullet : '[*+-]';
					}

					const list = {
						type: 'list',
						raw: '',
						ordered: isOrdered,
						listType: isOrdered ? type : null,
						loose: false,
						tokens: [] as ListItemToken[]
					} as ListToken;

					// Get next list item
					const itemRegex = new RegExp(`^( {0,3}${bull})((?:[\t ][^\\n]*)?(?:\\n|$))`);
					let endsWithBlankLine = false;

					// Check if current bullet point can start a new List Item
					while (src) {
						let raw = '';
						let itemContents = '';
						let endEarly = false;

						if (!(cap = itemRegex.exec(src))) break;

						raw = cap[0];
						const bullet = cap[1].trim();
						src = src.substring(raw.length);

						const line = cap[2].split('\n', 1)[0].replace(/^\t+/, (t) => ' '.repeat(3 * t.length));
						const nextLine = src.split('\n', 1)[0];
						const blankLine = !line.trim();

						let indent = 0;
						if (this.lexer.options.pedantic) {
							indent = 2;
							itemContents = line.trimStart();
						} else if (blankLine) {
							indent = cap[1].length + 1;
						} else {
							indent = cap[2].search(/[^ ]/); // Find first non-space char
							indent = indent > 4 ? 1 : indent; // Treat indented code blocks (> 4 spaces) as having only 1 indent
							itemContents = line.slice(indent);
							indent += cap[1].length;
						}

						if (blankLine && /^[ \t]*$/.test(nextLine)) {
							// Items begin with at most one blank line
							raw += nextLine + '\n';
							src = src.substring(nextLine.length + 1);
							endEarly = true;
						}

						if (!endEarly) {
							const nextBulletRegex = new RegExp(
								`^ {0,${Math.min(3, indent - 1)}}(?:[*+-]|(?:\\d{1,9}|[a-zA-Z]|${romanUpper}|${romanLower})[.)])((?:[ \t][^\\n]*)?(?:\\n|$))`
							);
							const hrRegex = new RegExp(
								`^ {0,${Math.min(3, indent - 1)}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`
							);
							const fencesBeginRegex = new RegExp(`^ {0,${Math.min(3, indent - 1)}}(?:\`\`\`|~~~)`);
							const headingBeginRegex = new RegExp(`^ {0,${Math.min(3, indent - 1)}}#`);
							const htmlBeginRegex = new RegExp(`^ {0,${Math.min(3, indent - 1)}}<[a-z].*>`, 'i');

							// Check if following lines should be included in List Item
							while (src) {
								const rawLine = src.split('\n', 1)[0];
								const nextLineWithoutTabs = rawLine.replace(/\t/g, '    ');

								if (
									fencesBeginRegex.test(nextLineWithoutTabs) ||
									headingBeginRegex.test(nextLineWithoutTabs) ||
									htmlBeginRegex.test(nextLineWithoutTabs) ||
									nextBulletRegex.test(nextLineWithoutTabs) ||
									hrRegex.test(nextLineWithoutTabs)
								)
									break;

								if (nextLineWithoutTabs.search(/[^ ]/) >= indent || !nextLineWithoutTabs.trim()) {
									itemContents += '\n' + nextLineWithoutTabs.slice(indent);
								} else {
									itemContents += '\n' + nextLineWithoutTabs;
								}

								raw += rawLine + '\n';
								src = src.substring(rawLine.length + 1);
							}
						}

						if (!list.loose) {
							// If the previous item ended with a blank line, the list is loose
							if (endsWithBlankLine) {
								list.loose = true;
							} else if (/\n[ \t]*\n[ \t]*$/.test(raw)) {
								endsWithBlankLine = true;
							}
						}

						let isTask = null;
						let isChecked = false;
						// Check for task list items
						if (this.lexer.options.gfm) {
							isTask = /^\[[ xX]] /.exec(itemContents);
							if (isTask) {
								isChecked = isTask[0] !== '[ ] ';
								itemContents = itemContents.replace(/^\[[ xX]] +/, '');
							}
						}

						let value = null;
						if (!isOrdered) {
							// Do nothing for unordered lists
						} else if (type === 'decimal') {
							value = parseInt(bullet.slice(0, -1), 10);
						} else if (type === 'lower-alpha' || type === 'upper-alpha') {
							value = letterToInt(bullet.slice(0, -1));
						} else if (type === 'lower-roman' || type === 'upper-roman') {
							value = romanToInt(bullet.slice(0, -1));
						}

						list.tokens.push({
							type: 'list_item',
							raw,
							task: !!isTask,
							checked: isChecked,
							loose: false,
							text: itemContents,
							value,
							skipped: isOrdered && value !== expectedValue,
							tokens: []
						});

						expectedValue = (value ?? 0) + 1;
						list.raw += raw;
					}

					if (list.tokens.length === 0) return null;

					// Finalize the list
					finalizeList(list, this.lexer);

					return list as any;
				}
			}
		]
	};
}
export interface ListToken {
	type: 'list';
	raw: string;
	ordered: boolean;
	listType: 'decimal' | 'lower-alpha' | 'upper-alpha' | 'lower-roman' | 'upper-roman' | null;
	loose: boolean;
	tokens: ListItemToken[];
}

/**
 * Token representing an item in an extended list.
 */
export interface ListItemToken {
	type: 'list_item';
	raw: string;
	task: boolean;
	checked: boolean;
	loose: boolean;
	text: string;
	value: number | null;
	skipped: boolean;
	tokens: unknown[]; // Tokens inside the list item (e.g., paragraphs, inline elements, etc.)
}
