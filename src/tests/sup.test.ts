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
	test('should parse simple superscript and verify all properties', () => {
		const tokens = lex('Energy formula E = mc^2^.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		expect(paragraphToken.tokens).toBeDefined();

		const paragraphTokens = paragraphToken.tokens || [];
		const supTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'sup');

		expect(supTokens.length).toBe(1);
		expect(supTokens[0].type).toBe('sup');
		expect(supTokens[0].text).toBe('2');
		expect(supTokens[0].raw).toBe('^2^');
	});

	test('should parse superscript with multiple characters', () => {
		const tokens = lex('Power of ten: 10^23^.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const supTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'sup');

		expect(supTokens.length).toBe(1);
		expect(supTokens[0].text).toBe('23');
		expect(supTokens[0].raw).toBe('^23^');
	});

	test('should parse multiple superscripts in same paragraph', () => {
		const tokens = lex('Formulas: E = mc^2^ and F = ma^2^.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const supTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'sup');

		expect(supTokens.length).toBe(2);
		expect(supTokens[0].text).toBe('2');
		expect(supTokens[0].raw).toBe('^2^');
		expect(supTokens[1].text).toBe('2');
		expect(supTokens[1].raw).toBe('^2^');
	});

	test('should parse superscript in heading', () => {
		const tokens = lex('# Energy Formula E = mc^2^');
		const headingToken = getFirstTokenByType(tokens, 'heading');

		expect(headingToken).toBeDefined();
		expect(headingToken.tokens).toBeDefined();

		const headingTokens = headingToken.tokens || [];
		const supTokens = headingTokens.filter((t: { type: string }) => t.type === 'sup');

		expect(supTokens.length).toBe(1);
		expect(supTokens[0].text).toBe('2');
	});

	test('should parse superscript in blockquote', () => {
		const tokens = lex('> The famous equation E = mc^2^');
		const blockquoteToken = getFirstTokenByType(tokens, 'blockquote');

		expect(blockquoteToken).toBeDefined();
		const nestedTokens = blockquoteToken.tokens || [];
		const paragraphToken = nestedTokens.find((t: any) => t.type === 'paragraph');
		expect(paragraphToken).toBeDefined();

		const paragraphTokens = paragraphToken.tokens || [];
		const supTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'sup');

		expect(supTokens.length).toBe(1);
		expect(supTokens[0].text).toBe('2');
	});

	test('should parse superscript in list item', () => {
		const tokens = lex('- Energy: E = mc^2^\n- Force: F = ma');
		const listToken = getFirstTokenByType(tokens, 'list');

		expect(listToken).toBeDefined();
		expect(listToken.tokens.length).toBe(2);

		const firstItemTokens = listToken.tokens[0].tokens || [];
		const paragraphToken = firstItemTokens.find((t: any) => t.type === 'text');
		expect(paragraphToken).toBeDefined();

		const paragraphTokens = paragraphToken.tokens || [];
		const supTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'sup');

		expect(supTokens.length).toBe(1);
		expect(supTokens[0].text).toBe('2');
	});

	test('should parse superscript in table cell', () => {
		const tokens = lex('| Formula | E = mc^2^ |\n|---------|----------|\n| Force   | F = ma   |');
		const tableToken = getFirstTokenByType(tokens, 'table');

		expect(tableToken).toBeDefined();
		const tableHeader = tableToken.tokens.find((t: any) => t.type === 'thead');
		expect(tableHeader).toBeDefined();

		// Get the second table header cell (th)
		const firstHeaderRow = tableHeader.tokens[0]; // tr
		const secondHeaderCell = firstHeaderRow.tokens[1]; // th (second cell)
		expect(secondHeaderCell.tokens).toBeDefined();
		const supTokens = secondHeaderCell.tokens.filter((t: { type: string }) => t.type === 'sup');

		expect(supTokens.length).toBe(1);
		expect(supTokens[0].text).toBe('2');
	});

	test('should parse superscript with letters', () => {
		const tokens = lex('Variable x^n^ in equation.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const supTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'sup');

		expect(supTokens.length).toBe(1);
		expect(supTokens[0].text).toBe('n');
		expect(supTokens[0].raw).toBe('^n^');
	});

	test('should parse superscript with mixed characters', () => {
		const tokens = lex('Complex exponent: x^2n+1^.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const supTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'sup');

		expect(supTokens.length).toBe(1);
		expect(supTokens[0].text).toBe('2n+1');
		expect(supTokens[0].raw).toBe('^2n+1^');
	});

	test('should parse superscript with formatting around it', () => {
		const tokens = lex('**Bold** E = mc^2^ and *italic* text.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const supTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'sup');
		const strongTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'strong');
		const emTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'em');

		expect(supTokens.length).toBe(1);
		expect(strongTokens.length).toBe(1);
		expect(emTokens.length).toBe(1);
		expect(supTokens[0].text).toBe('2');
	});

	test('should parse superscript with links around it', () => {
		const tokens = lex('[Einstein](https://example.com) E = mc^2^ formula.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const supTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'sup');
		const linkTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'link');

		expect(supTokens.length).toBe(1);
		expect(linkTokens.length).toBe(1);
		expect(supTokens[0].text).toBe('2');
		expect(linkTokens[0].text).toBe('Einstein');
	});

	test('should parse superscript with code spans around it', () => {
		const tokens = lex('`energy` = mc^2^ calculation.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const supTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'sup');
		const codespanTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'codespan');

		expect(supTokens.length).toBe(1);
		expect(codespanTokens.length).toBe(1);
		expect(supTokens[0].text).toBe('2');
		expect(codespanTokens[0].text).toBe('energy');
	});

	test('should parse superscript at start of paragraph', () => {
		const tokens = lex('^2^ is the square of 2.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const supTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'sup');

		expect(supTokens.length).toBe(1);
		expect(supTokens[0].text).toBe('2');
	});

	test('should parse superscript at end of paragraph', () => {
		const tokens = lex('The power is x^n^.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const supTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'sup');

		expect(supTokens.length).toBe(1);
		expect(supTokens[0].text).toBe('n');
	});

	test('should not parse single caret as superscript (edge case)', () => {
		const tokens = lex('This has a single ^ caret.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const supTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'sup');

		// Should not create sup tokens for single caret
		expect(supTokens.length).toBe(0);
	});

	test('should handle empty superscript (edge case)', () => {
		const tokens = lex('Empty superscript: ^^.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const supTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'sup');

		// Behavior may vary - either no sup token or empty sup token
		if (supTokens.length > 0) {
			expect(supTokens[0].text).toBe('');
		}
	});

	test('should parse superscript with special characters', () => {
		const tokens = lex('Notation: x^(n+1)^.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const supTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'sup');

		expect(supTokens.length).toBe(1);
		expect(supTokens[0].text).toBe('(n+1)');
	});

	test('should parse superscript with subscript nearby', () => {
		const tokens = lex('Chemical: H~2~O and energy E = mc^2^.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const supTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'sup');
		const subTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'sub');

		expect(supTokens.length).toBe(1);
		expect(subTokens.length).toBe(1);
		expect(supTokens[0].text).toBe('2');
		expect(subTokens[0].text).toBe('2');
	});

	test('should not confuse with footnote reference (edge case)', () => {
		const tokens = lex('Superscript x^2^ not footnote[^1].');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const supTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'sup');
		const footnoteRefTokens = paragraphTokens.filter(
			(t: { type: string }) => t.type === 'footnoteRef'
		);

		expect(supTokens.length).toBe(1);
		expect(footnoteRefTokens.length).toBe(1);
		expect(supTokens[0].text).toBe('2');
		expect(footnoteRefTokens[0].label).toBe('1');
	});

	test('should parse superscript with math expressions', () => {
		const tokens = lex('Math: $x^2$ and text x^2^.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const supTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'sup');
		const mathTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'math');

		expect(supTokens.length).toBe(1);
		expect(mathTokens.length).toBe(1);
		expect(supTokens[0].text).toBe('2');
		expect(mathTokens[0].text).toBe('x^2');
	});
});

describe('incomplete markdown', () => {
	test('should complete basic incomplete superscript', () => {
		const input = 'Energy formula E = mc^2';
		const result = parseIncompleteMarkdown(input);

		// Should complete the superscript formatting
		expect(result).toBe('Energy formula E = mc^2^');
	});

	test('should handle line breaks with incomplete superscript', () => {
		const input = 'First line E = mc^2\nSecond line';
		const result = parseIncompleteMarkdown(input);

		// Should complete superscript before line break
		expect(result).toBe('First line E = mc^2^\nSecond line');
	});

	test('should not complete empty or whitespace-only superscript', () => {
		const input = 'Empty superscript: ^';
		const result = parseIncompleteMarkdown(input);

		// Should not complete if no content after caret
		expect(result).toBe('Empty superscript: ^');
	});
});
