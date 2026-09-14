import type { Extension } from './index.js';

// Math parsing rules
// Block math: supports both newline format ($$\nmath\n$$) and single-line format ($$math$$)
const blockRule = /^(\$\$)(?:\n((?:\\[\s\S]|[^\\])+?)\n\1(?:\n|$)|([^$\n]+?)\1(?=\s|$|$))/;
// Inline math: handles both single ($) and double ($$) dollar delimiters
// Avoids matching currency by checking context and requiring proper content
const inlineRule = /^(\${1,2})(?!\$)((?:[^$\n]|\\\$)*?)\1(?!\d)/;
// LaTeX delimiters. LLMs emit these as often as dollars, so they produce the
// same `math` token: `\(`/`\)` inline, `\[`/`\]` display. Only the block form
// may span lines; an escaped backslash (`\\(`) is not a delimiter, which the
// charCode dispatch below rejects before any regex runs.
const inlineParenRule = /^\\\(([^\n]*?)\\\)/;
const inlineBracketRule = /^\\\[([^\n]*?)\\\]/;
const blockBracketRule = /^\\\[([\s\S]+?)\\\](?:\n|$)/;

// Enhanced currency detection patterns
const currencyPatterns = {
	// Simple price patterns: $123, $123.45, $1,234.56
	simplePrice: /^\d{1,3}(?:,\d{3})*(?:\.\d{2})?$/,
	// Multiple prices or numbers: "123, 456", "123.45, 678.90", "123 or 456"
	multipleNumbers: /^\d+(?:[.,]\d+)*(?:\s*[,;]\s*\d+(?:[.,]\d+)*)+$/,
	// Price ranges: "123-456", "123 - 456", "123 to 456"
	priceRange: /^\d+(?:\.\d{2})?\s*(?:-|to|or)\s*\d+(?:\.\d{2})?$/i,
	// Common currency words nearby (check surrounding context)
	currencyContext: /(?:price|cost|dollar|euro|pound|yen|currency|pay|buy|sell|expensive|cheap)/i
};

export const markedMath: Extension[] = [
	{
		name: 'math',
		level: 'block',
		tokenizer(this, src) {
			if (src.charCodeAt(0) === 92 /* \ */) {
				if (src.charCodeAt(1) !== 91 /* [ */) return;
				const latex = src.match(blockBracketRule);
				if (!latex) return;
				return {
					type: 'math',
					isInline: false,
					displayMode: true,
					raw: latex[0],
					text: latex[1].trim()
				} satisfies MathToken;
			}
			if (src.charCodeAt(0) !== 36 /* $ */) return;
			const match = src.match(blockRule);

			if (match) {
				// match[2] is multiline format, match[3] is single-line format
				const content = (match[2] || match[3]).trim();
				return {
					type: 'math',
					isInline: false,
					displayMode: true,
					raw: match[0],
					text: content
				} satisfies MathToken;
			}
		}
	},
	{
		name: 'math',
		level: 'inline',
		start(src) {
			let index = 0;
			let searchSrc = src;

			while (searchSrc) {
				const dollarIndex = searchSrc.indexOf('$');
				if (dollarIndex === -1) {
					return;
				}

				const currentIndex = index + dollarIndex;
				const possibleMath = src.substring(currentIndex);

				// Check if this could be math (not currency)
				const match = possibleMath.match(inlineRule);
				if (match) {
					const content = match[2];
					const dollarCount = match[1]; // '$' or '$$'

					// Only apply currency detection to single dollars
					// Double dollars ($$) indicate explicit math intent
					if (dollarCount === '$' && isCurrencyPattern(content, src, currentIndex)) {
						// This looks like currency with single dollars, skip it
						index += dollarIndex + 1;
						searchSrc = src.substring(index);
						continue;
					}

					return currentIndex;
				}

				index += dollarIndex + 1;
				searchSrc = src.substring(index);
			}
		},
		tokenizer(this, src) {
			// The rules are anchored on their opening delimiter; skip the regex
			// otherwise (see marked-br.ts) — this runs at every inline scan position.
			if (src.charCodeAt(0) === 92 /* \ */) {
				const open = src.charCodeAt(1);
				// `\\(` is an escaped backslash followed by a paren, never math.
				const displayMode = open === 91; /* [ */
				if (!displayMode && open !== 40 /* ( */) return;
				const latex = src.match(displayMode ? inlineBracketRule : inlineParenRule);
				if (!latex) return;
				return {
					type: 'math',
					isInline: true,
					displayMode,
					raw: latex[0],
					text: latex[1].trim()
				} satisfies MathToken;
			}
			if (src.charCodeAt(0) !== 36 /* $ */) return;
			const match = src.match(inlineRule);
			if (match) {
				const content = match[2];
				const dollarCount = match[1]; // '$' or '$$'
				const isDisplayMode = dollarCount === '$$';

				// Only apply currency detection to single dollars
				// Double dollars ($$) indicate explicit math intent
				if (dollarCount === '$' && isCurrencyPattern(content, src, 0)) {
					// This looks like currency with single dollars, skip it
					return;
				}

				return {
					type: 'math',
					isInline: true, // Inline tokenizer always produces inline math
					displayMode: isDisplayMode, // $$ = display mode styling, $ = inline styling
					raw: match[0],
					text: content.trim()
				} satisfies MathToken;
			}
		}
	}
];

// Helper function to detect currency patterns
function isCurrencyPattern(content: string, fullSrc: string, dollarIndex: number): boolean {
	const trimmedContent = content.trim();

	// Check for simple price patterns
	if (currencyPatterns.simplePrice.test(trimmedContent)) {
		return true;
	}

	// Check for multiple numbers/prices pattern (like "199, 199")
	if (currencyPatterns.multipleNumbers.test(trimmedContent)) {
		return true;
	}

	// Check for price ranges
	if (currencyPatterns.priceRange.test(trimmedContent)) {
		return true;
	}

	// Check surrounding context for currency-related words
	const contextStart = Math.max(0, dollarIndex - 50);
	const contextEnd = Math.min(fullSrc.length, dollarIndex + content.length + 50);
	const context = fullSrc.substring(contextStart, contextEnd);

	if (currencyPatterns.currencyContext.test(context)) {
		// If currency context is found and content is purely numeric, likely currency
		if (/^\d+(?:[.,]\d+)*$/.test(trimmedContent)) {
			return true;
		}
	}

	// Additional check: if content is just numbers with common currency formatting
	if (/^\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?$/.test(trimmedContent)) {
		return true;
	}

	return false;
}

export type MathToken = {
	type: 'math';
	raw: string;
	text: string;
	isInline: boolean;
	displayMode: boolean;
};
