import type { Extension, GenericToken } from './index.js';
import type { Lexer } from 'marked';

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
export const rule = `^( {0,3}${bulletPattern})([ \\t][^\\n]*|[ \\t])?(?:\\n|$)`;

// --- Precompiled regexes ---------------------------------------------------
// These were previously rebuilt on every tokenizer call and, for the boundary
// set, on every item iteration. They are stateless (no `g` flag) so they are
// safe to share. This is the bulk of the per-chunk list cost.
const RULE_RE = new RegExp(rule);
const ROMAN_UPPER_RE = new RegExp(`^${romanUpper}[.)]$`);
const ROMAN_LOWER_RE = new RegExp(`^${romanLower}[.)]$`);
const LOWER_ALPHA_RE = /^[a-z][.)]$/;
const UPPER_ALPHA_RE = /^[A-Z][.)]$/;

// The per-item boundary regexes vary only by the indent clamp (0..3); build the
// four variants once at module load and index into them.
function buildBoundaryRegexes(maxIndent: number) {
	return {
		nextBullet: new RegExp(
			`^ {0,${maxIndent}}(?:[*+-]|(?:\\d{1,9}|[a-zA-Z]|${romanUpper}|${romanLower})[.)])((?:[ \t][^\\n]*)?(?:\\n|$))`
		),
		hr: new RegExp(`^ {0,${maxIndent}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`),
		fences: new RegExp(`^ {0,${maxIndent}}(?:\`\`\`|~~~)`),
		heading: new RegExp(`^ {0,${maxIndent}}#`),
		html: new RegExp(`^ {0,${maxIndent}}<[a-z].*>`, 'i')
	};
}
const LIST_BOUNDARY_TABLE = [0, 1, 2, 3].map(buildBoundaryRegexes);

// itemRegex depends only on `bull`, which has a small finite set of shapes;
// cache the compiled instances instead of recompiling per tokenizer call.
const itemRegexCache = new Map<string, RegExp>();
function getItemRegex(bull: string): RegExp {
	let re = itemRegexCache.get(bull);
	if (!re) {
		re = new RegExp(`^( {0,3}${bull})([\t ][^\\n]*|[\t ])?(?:\\n|$)`);
		itemRegexCache.set(bull, re);
	}
	return re;
}

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

		// A blank line inside a single item also makes the list loose
		if (!list.loose) {
			const spaceTokens = item.tokens.filter((token) => token.type === 'space');
			if (spaceTokens.length > 0 && spaceTokens.some((token) => /\n.*\n/.test(token.raw))) {
				list.loose = true;
			}
		}
	}

	// Mark list as loose if needed and re-tokenize items as block content so
	// their text becomes paragraph tokens instead of inline text
	if (list.loose) {
		for (const item of list.tokens) {
			item.loose = true;
			lexer.state.top = true;
			item.tokens = lexer.blockTokens(item.text, []);
		}
	}
}
function escapeForRegex(s: string) {
	return s.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
}
export const markedList: Extension = {
	name: 'list',
	level: 'block',
	tokenizer(this, src) {
		let cap = RULE_RE.exec(src);

		if (!cap) return undefined;

		const bullet = cap[1].trim();
		const isOrdered = bullet !== '*' && bullet !== '-' && bullet !== '+';
		let bull;
		let type = '';
		let expectedValue: number | null = null;

		// Detect list type (Roman, alphabetic, numeric)
		if (isOrdered) {
			if (ROMAN_UPPER_RE.test(bullet)) {
				type = 'upper-roman';
				bull = `${romanUpper}\\${bullet.slice(-1)}`;
			} else if (ROMAN_LOWER_RE.test(bullet)) {
				type = 'lower-roman';
				bull = `${romanLower}\\${bullet.slice(-1)}`;
			} else if (LOWER_ALPHA_RE.test(bullet)) {
				type = 'lower-alpha';
				bull = `[a-z]\\${bullet.slice(-1)}`;
			} else if (UPPER_ALPHA_RE.test(bullet)) {
				type = 'upper-alpha';
				bull = `[A-Z]\\${bullet.slice(-1)}`;
			} else {
				type = 'decimal';
				bull = `\\d{1,9}\\${bullet.slice(-1)}`;
			}
		} else {
			bull = this.lexer.options.pedantic ? escapeForRegex(bullet) : '[*+-]';
		}

		const list = {
			type: 'list',
			raw: '',
			ordered: isOrdered,
			listType: isOrdered ? type : null,
			loose: false,
			start: undefined, // Will be set when first item is processed
			tokens: [] as ListItemToken[]
		} as ListToken;

		// Get next list item
		// Updated regex to properly handle empty list items (space after bullet, then newline)
		const itemRegex = getItemRegex(bull);
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

			const line = cap[2]
				? cap[2].split('\n', 1)[0].replace(/^\t+/, (t) => ' '.repeat(4 * t.length))
				: '';
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
				const { nextBullet, hr, fences, heading, html } =
					LIST_BOUNDARY_TABLE[Math.min(3, indent - 1)];

				// Check if following lines should be included in List Item
				while (src) {
					const rawLine = src.split('\n', 1)[0];
					const nextLineWithoutTabs = rawLine.replace(/\t/g, '    ');

					if (
						fences.test(nextLineWithoutTabs) ||
						heading.test(nextLineWithoutTabs) ||
						html.test(nextLineWithoutTabs) ||
						nextBullet.test(nextLineWithoutTabs) ||
						hr.test(nextLineWithoutTabs)
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

			// Handle expectedValue initialization and validation
			let skipped = false;
			if (isOrdered) {
				if (expectedValue === null) {
					// First item: set expectedValue to this item's value (or 1 if parsing failed)
					expectedValue = value ?? 1;
					// Set the start property for ordered lists
					list.start = expectedValue;
				} else {
					// Subsequent items: check if value matches expected
					skipped = value !== null && value !== expectedValue;
					// Increment expectedValue for next item
					expectedValue += 1;
				}
			}

			list.tokens.push({
				type: 'list_item',
				raw,
				task: !!isTask,
				checked: isChecked,
				loose: false,
				text: itemContents,
				value,
				skipped,
				tokens: []
			});
			list.raw += raw;
		}

		if (list.tokens.length === 0) return undefined;

		// Finalize the list
		finalizeList(list, this.lexer);

		return list as ListToken;
	}
};

export interface ListToken {
	type: 'list';
	raw: string;
	ordered: boolean;
	listType: 'decimal' | 'lower-alpha' | 'upper-alpha' | 'lower-roman' | 'upper-roman' | null;
	loose: boolean;
	start?: number;
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
	tokens: GenericToken[]; // Tokens inside the list item (e.g., paragraphs, inline elements, etc.)
}
