import { expect, describe, test } from 'vitest';
import { lex } from '../lib/marked/index.js';
import { parseIncompleteMarkdown } from '../lib/utils/parse-incomplete-markdown.js';

// Helper functions
function getTokensByType(tokens: any[], type: string) {
	return tokens.filter((token) => token.type === type);
}

function getFirstTokenByType(tokens: any[], type: string) {
	return tokens.find((token) => token.type === type);
}

describe('tokenization', () => {
	test('should parse inline math with single dollars and verify all properties', () => {
		const tokens = lex('This is $E = mc^2$ inline math.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		expect(paragraphToken.tokens).toBeDefined();

		const paragraphTokens = paragraphToken.tokens || [];
		const mathTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'math');

		expect(mathTokens.length).toBe(1);
		expect(mathTokens[0].type).toBe('math');
		expect(mathTokens[0].text).toBe('E = mc^2');
		expect(mathTokens[0].raw).toBe('$E = mc^2$');
		expect(mathTokens[0].displayMode).toBe(false);
	});

	test('should parse block math with double dollars and verify properties', () => {
		const tokens = lex('$$\nE = mc^2\n$$');
		const mathToken = getFirstTokenByType(tokens, 'math');

		expect(mathToken).toBeDefined();
		expect(mathToken.type).toBe('math');
		expect(mathToken.text).toBe('E = mc^2');
		expect(mathToken.raw).toBe('$$\nE = mc^2\n$$');
		expect(mathToken.displayMode).toBe(true);
	});

	test('should parse inline block math with double dollars', () => {
		const tokens = lex('This is $$E = mc^2$$ inline block math.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const mathTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'math');

		expect(mathTokens.length).toBe(1);
		expect(mathTokens[0].text).toBe('E = mc^2');
		expect(mathTokens[0].raw).toBe('$$E = mc^2$$');
		expect(mathTokens[0].displayMode).toBe(true);
	});

	test('should parse complex mathematical expressions', () => {
		const tokens = lex('$\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const mathTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'math');

		expect(mathTokens.length).toBe(1);
		expect(mathTokens[0].text).toBe('\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}');
		expect(mathTokens[0].displayMode).toBe(false);
	});

	test('should parse math with Greek letters and symbols', () => {
		const tokens = lex('$\\alpha + \\beta = \\gamma \\cdot \\pi$');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const mathTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'math');

		expect(mathTokens.length).toBe(1);
		expect(mathTokens[0].text).toBe('\\alpha + \\beta = \\gamma \\cdot \\pi');
	});

	test('should parse multiple inline math expressions in same paragraph', () => {
		const tokens = lex('First $a = b$ and second $c = d$ math expressions.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const mathTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'math');

		expect(mathTokens.length).toBe(2);
		expect(mathTokens[0].text).toBe('a = b');
		expect(mathTokens[0].displayMode).toBe(false);
		expect(mathTokens[1].text).toBe('c = d');
		expect(mathTokens[1].displayMode).toBe(false);
	});

	test('should parse math in heading', () => {
		const tokens = lex('# Equation: $E = mc^2$');
		const headingToken = getFirstTokenByType(tokens, 'heading');

		expect(headingToken).toBeDefined();
		expect(headingToken.tokens).toBeDefined();

		const headingTokens = headingToken.tokens || [];
		const mathTokens = headingTokens.filter((t: { type: string }) => t.type === 'math');

		expect(mathTokens.length).toBe(1);
		expect(mathTokens[0].text).toBe('E = mc^2');
	});

	test('should parse math in blockquote', () => {
		const tokens = lex('> The famous equation is $E = mc^2$');
		const blockquoteToken = getFirstTokenByType(tokens, 'blockquote');

		expect(blockquoteToken).toBeDefined();
		const nestedTokens = blockquoteToken.tokens || [];
		const paragraphToken = nestedTokens.find((t: any) => t.type === 'paragraph');
		expect(paragraphToken).toBeDefined();

		const paragraphTokens = paragraphToken.tokens || [];
		const mathTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'math');

		expect(mathTokens.length).toBe(1);
		expect(mathTokens[0].text).toBe('E = mc^2');
	});

	test('should parse math in list item', () => {
		const tokens = lex('- Equation: $F = ma$\n- Another: $v = u + at$');
		const listToken = getFirstTokenByType(tokens, 'list');

		expect(listToken).toBeDefined();
		expect(listToken.tokens.length).toBe(2);

		// Check first item
		const firstItemTokens = listToken.tokens[0].tokens || [];
		const firstParagraph = firstItemTokens.find((t: any) => t.type === 'text');
		expect(firstParagraph).toBeDefined();

		const firstMathTokens = (firstParagraph.tokens || []).filter(
			(t: { type: string }) => t.type === 'math'
		);
		expect(firstMathTokens.length).toBe(1);
		expect(firstMathTokens[0].text).toBe('F = ma');

		// Check second item
		const secondItemTokens = listToken.tokens[1].tokens || [];
		const secondParagraph = secondItemTokens.find((t: any) => t.type === 'text');
		expect(secondParagraph).toBeDefined();

		const secondMathTokens = (secondParagraph.tokens || []).filter(
			(t: { type: string }) => t.type === 'math'
		);
		expect(secondMathTokens.length).toBe(1);
		expect(secondMathTokens[0].text).toBe('v = u + at');
	});

	test('should parse math in table cell', () => {
		const tokens = lex(
			'| Formula | $E = mc^2$ |\n|---------|------------|\n| Force   | $F = ma$   |'
		);
		const tableToken = getFirstTokenByType(tokens, 'table');

		expect(tableToken).toBeDefined();
		const tableHeader = tableToken.tokens.find((t: any) => t.type === 'thead');
		expect(tableHeader).toBeDefined();

		// Check header math - get second header cell
		const firstHeaderRow = tableHeader.tokens[0]; // tr
		const secondHeaderCell = firstHeaderRow.tokens[1]; // th (second cell)
		expect(secondHeaderCell.tokens).toBeDefined();
		const headerMathTokens = secondHeaderCell.tokens.filter(
			(t: { type: string }) => t.type === 'math'
		);
		expect(headerMathTokens.length).toBe(1);
		expect(headerMathTokens[0].text).toBe('E = mc^2');

		// Check row math - get tbody
		const tableBody = tableToken.tokens.find((t: any) => t.type === 'tbody');
		expect(tableBody).toBeDefined();
		const firstBodyRow = tableBody.tokens[0]; // tr
		const secondBodyCell = firstBodyRow.tokens[1]; // td (second cell)
		expect(secondBodyCell.tokens).toBeDefined();
		const cellMathTokens = secondBodyCell.tokens.filter((t: { type: string }) => t.type === 'math');
		expect(cellMathTokens.length).toBe(1);
		expect(cellMathTokens[0].text).toBe('F = ma');
	});

	test('should parse math with matrices and arrays', () => {
		const tokens = lex('$$\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$$');
		const mathToken = getFirstTokenByType(tokens, 'math');

		expect(mathToken).toBeDefined();
		expect(mathToken.text).toBe('\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}');
		expect(mathToken.displayMode).toBe(true);
	});

	test('should parse math with integrals and summations', () => {
		const tokens = lex('$\\int_0^\\infty e^{-x} dx = \\sum_{n=0}^\\infty \\frac{1}{n!}$');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const mathTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'math');

		expect(mathTokens.length).toBe(1);
		expect(mathTokens[0].text).toBe(
			'\\int_0^\\infty e^{-x} dx = \\sum_{n=0}^\\infty \\frac{1}{n!}'
		);
	});

	test('should handle math with escaped dollars inside', () => {
		const tokens = lex('$\\text{Price: \\$5.00}$');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const mathTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'math');

		expect(mathTokens.length).toBe(1);
		expect(mathTokens[0].text).toBe('\\text{Price: \\$5.00}');
	});

	test('should not parse single dollar as math when not paired (edge case)', () => {
		const tokens = lex('This costs $5.00 and that costs $10.00');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const mathTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'math');

		// Should not create math tokens for currency
		expect(mathTokens.length).toBe(0);
	});

	test('should parse math with line breaks in display mode', () => {
		const tokens = lex('$$\na = b + c \\\\\nd = e + f\n$$');
		const mathToken = getFirstTokenByType(tokens, 'math');

		expect(mathToken).toBeDefined();
		expect(mathToken.text).toBe('a = b + c \\\\\nd = e + f');
		expect(mathToken.displayMode).toBe(true);
	});

	test('should handle empty math expressions (edge case)', () => {
		const tokens = lex('Empty math: $$$$');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const mathTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'math');

		if (mathTokens.length > 0) {
			expect(mathTokens[0].text).toBe('');
		}
	});

	test('should parse math with special LaTeX commands', () => {
		const tokens = lex('$\\mathbb{R}, \\mathcal{L}, \\mathfrak{g}$');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const mathTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'math');

		expect(mathTokens.length).toBe(1);
		expect(mathTokens[0].text).toBe('\\mathbb{R}, \\mathcal{L}, \\mathfrak{g}');
	});

	test('should handle math with nested braces', () => {
		const tokens = lex('$\\frac{\\sqrt{a^2 + b^2}}{\\sqrt{c^2 + d^2}}$');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const mathTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'math');

		expect(mathTokens.length).toBe(1);
		expect(mathTokens[0].text).toBe('\\frac{\\sqrt{a^2 + b^2}}{\\sqrt{c^2 + d^2}}');
	});
});

describe('incomplete markdown', () => {
	test('should complete basic incomplete inline math', () => {
		const input = 'This equation $E = mc^2';
		const result = parseIncompleteMarkdown(input);

		// Should complete the math formatting
		expect(result).toBe('This equation $E = mc^2$');
	});

	test('should complete incomplete block math', () => {
		const input = 'Block equation $$E = mc^2';
		const result = parseIncompleteMarkdown(input);

		// Should complete the math block
		expect(result).toBe('Block equation $$E = mc^2$$');
	});

	test('should handle line breaks with incomplete math', () => {
		const input = 'First line $E = mc^2\nSecond line';
		const result = parseIncompleteMarkdown(input);

		// Should complete math before line break
		expect(result).toBe('First line $E = mc^2$\nSecond line');
	});

	test('should handle multi-line block math completion', () => {
		const input = '$$\nE = mc^2\nF = ma';
		const result = parseIncompleteMarkdown(input);

		// Should complete the math block with newline
		expect(result).toBe('$$\nE = mc^2\nF = ma\n$$');
	});

	test('should not complete currency symbols as incomplete math', () => {
		const input = 'This costs $199 and that costs $299';
		const result = parseIncompleteMarkdown(input);

		// Should remain unchanged as these are currency symbols
		expect(result).toBe('This costs $199 and that costs $299');
	});

	test('should not complete currency with dollar after number', () => {
		const input = 'Price is 199$ or 299$';
		const result = parseIncompleteMarkdown(input);

		// Should remain unchanged as these are currency symbols
		expect(result).toBe('Price is 199$ or 299$');
	});

	test('should not complete currency with space after dollar', () => {
		const input = 'Cost is $ 199 or $ 299';
		const result = parseIncompleteMarkdown(input);

		// Should remain unchanged as these are currency symbols with space
		expect(result).toBe('Cost is $ 199 or $ 299');
	});

	test('should not complete mixed currency formats', () => {
		const input = 'Prices: $50, 75$, $ 100, and $125.99';
		const result = parseIncompleteMarkdown(input);

		// Should remain unchanged as these are all currency formats
		expect(result).toBe('Prices: $50, 75$, $ 100, and $125.99');
	});

	test('should complete actual math but not currency in same text', () => {
		const input = 'Math $x + y$ costs $199 and formula $a = b';
		const result = parseIncompleteMarkdown(input);

		// Should complete the incomplete math but leave currency unchanged
		expect(result).toBe('Math $x + y$ costs $199 and formula $a = b$');
	});
});
