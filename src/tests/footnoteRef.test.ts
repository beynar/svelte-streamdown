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
	test('should parse simple footnote reference and verify all properties', () => {
		const tokens = lex('This is a text with footnote[^1].\n\n[^1]: This is the footnote.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		expect(paragraphToken.tokens).toBeDefined();

		const paragraphTokens = paragraphToken.tokens || [];
		const footnoteRefTokens = paragraphTokens.filter(
			(t: { type: string }) => t.type === 'footnoteRef'
		);

		expect(footnoteRefTokens.length).toBe(1);
		expect(footnoteRefTokens[0].type).toBe('footnoteRef');
		expect(footnoteRefTokens[0].label).toBe('1');
		expect(footnoteRefTokens[0].raw).toBe('[^1]');
	});

	test('should parse footnote reference with text label', () => {
		const tokens = lex('Text with named footnote[^note1].\n\n[^note1]: Named footnote content.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const footnoteRefTokens = paragraphTokens.filter(
			(t: { type: string }) => t.type === 'footnoteRef'
		);

		expect(footnoteRefTokens.length).toBe(1);
		expect(footnoteRefTokens[0].type).toBe('footnoteRef');
		expect(footnoteRefTokens[0].label).toBe('note1');
		expect(footnoteRefTokens[0].raw).toBe('[^note1]');
	});

	test('should parse multiple footnote references in same paragraph', () => {
		const tokens = lex(
			'Text with first[^1] and second[^2] footnotes.\n\n[^1]: First footnote.\n[^2]: Second footnote.'
		);
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const footnoteRefTokens = paragraphTokens.filter(
			(t: { type: string }) => t.type === 'footnoteRef'
		);

		expect(footnoteRefTokens.length).toBe(2);
		expect(footnoteRefTokens[0].label).toBe('1');
		expect(footnoteRefTokens[0].raw).toBe('[^1]');
		expect(footnoteRefTokens[1].label).toBe('2');
		expect(footnoteRefTokens[1].raw).toBe('[^2]');
	});

	test('should parse footnote reference in heading', () => {
		const tokens = lex('# Heading with footnote[^heading]\n\n[^heading]: Footnote in heading.');
		const headingToken = getFirstTokenByType(tokens, 'heading');

		expect(headingToken).toBeDefined();
		expect(headingToken.tokens).toBeDefined();

		const headingTokens = headingToken.tokens || [];
		const footnoteRefTokens = headingTokens.filter(
			(t: { type: string }) => t.type === 'footnoteRef'
		);

		expect(footnoteRefTokens.length).toBe(1);
		expect(footnoteRefTokens[0].label).toBe('heading');
	});

	test('should parse footnote reference in blockquote', () => {
		const tokens = lex('> Quote with footnote[^quote].\n\n[^quote]: Footnote in quote.');
		const blockquoteToken = getFirstTokenByType(tokens, 'blockquote');

		expect(blockquoteToken).toBeDefined();
		const nestedTokens = blockquoteToken.tokens || [];
		const paragraphToken = nestedTokens.find((t: any) => t.type === 'paragraph');
		expect(paragraphToken).toBeDefined();

		const paragraphTokens = paragraphToken.tokens || [];
		const footnoteRefTokens = paragraphTokens.filter(
			(t: { type: string }) => t.type === 'footnoteRef'
		);

		expect(footnoteRefTokens.length).toBe(1);
		expect(footnoteRefTokens[0].label).toBe('quote');
	});

	test('should parse footnote reference in list item', () => {
		const tokens = lex('- Item with footnote[^list]\n\n[^list]: Footnote in list.');
		const listToken = getFirstTokenByType(tokens, 'list');

		expect(listToken).toBeDefined();
		expect(listToken.tokens.length).toBe(1);

		const listItemTokens = listToken.tokens[0].tokens || [];
		const paragraphToken = listItemTokens.find((t: any) => t.type === 'text');
		expect(paragraphToken).toBeDefined();

		const paragraphTokens = paragraphToken.tokens || [];
		const footnoteRefTokens = paragraphTokens.filter(
			(t: { type: string }) => t.type === 'footnoteRef'
		);

		expect(footnoteRefTokens.length).toBe(1);
		expect(footnoteRefTokens[0].label).toBe('list');
	});

	test('should parse footnote reference in table cell', () => {
		const tokens = lex(
			'| Cell with footnote[^table] | Normal |\n|---------------------------|--------|\n| Cell                      | Text   |\n\n[^table]: Footnote in table.'
		);
		const tableToken = getFirstTokenByType(tokens, 'table');

		expect(tableToken).toBeDefined();
		const tableHeader = tableToken.tokens.find((t: any) => t.type === 'thead');
		expect(tableHeader).toBeDefined();

		// Get the first table header cell (th)
		const firstHeaderRow = tableHeader.tokens[0]; // tr
		const firstHeaderCell = firstHeaderRow.tokens[0]; // th
		expect(firstHeaderCell.tokens).toBeDefined();
		const footnoteRefTokens = firstHeaderCell.tokens.filter(
			(t: { type: string }) => t.type === 'footnoteRef'
		);

		expect(footnoteRefTokens.length).toBe(1);
		expect(footnoteRefTokens[0].label).toBe('table');
	});

	test('should parse footnote reference with formatting around it', () => {
		const tokens = lex(
			'**Bold text**[^1] and *italic text*[^2].\n\n[^1]: First footnote.\n[^2]: Second footnote.'
		);
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const footnoteRefTokens = paragraphTokens.filter(
			(t: { type: string }) => t.type === 'footnoteRef'
		);
		const strongTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'strong');
		const emTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'em');

		expect(footnoteRefTokens.length).toBe(2);
		expect(strongTokens.length).toBe(1);
		expect(emTokens.length).toBe(1);
		expect(footnoteRefTokens[0].label).toBe('1');
		expect(footnoteRefTokens[1].label).toBe('2');
	});

	test('should parse footnote reference with special characters in label', () => {
		const tokens = lex(
			'Text with footnote[^note-1_test].\n\n[^note-1_test]: Footnote with special chars.'
		);
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const footnoteRefTokens = paragraphTokens.filter(
			(t: { type: string }) => t.type === 'footnoteRef'
		);

		expect(footnoteRefTokens.length).toBe(1);
		expect(footnoteRefTokens[0].label).toBe('note-1_test');
	});

	test('should parse footnote reference with numbers in label', () => {
		const tokens = lex('Text with footnote[^123].\n\n[^123]: Numeric footnote.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const footnoteRefTokens = paragraphTokens.filter(
			(t: { type: string }) => t.type === 'footnoteRef'
		);

		expect(footnoteRefTokens.length).toBe(1);
		expect(footnoteRefTokens[0].label).toBe('123');
	});

	test('should parse footnote reference at start of paragraph', () => {
		const tokens = lex(
			'[^start]This paragraph starts with footnote.\n\n[^start]: Starting footnote.'
		);
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const footnoteRefTokens = paragraphTokens.filter(
			(t: { type: string }) => t.type === 'footnoteRef'
		);

		expect(footnoteRefTokens.length).toBe(1);
		expect(footnoteRefTokens[0].label).toBe('start');
	});

	test('should parse footnote reference at end of paragraph', () => {
		const tokens = lex('This paragraph ends with footnote[^end].\n\n[^end]: Ending footnote.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const footnoteRefTokens = paragraphTokens.filter(
			(t: { type: string }) => t.type === 'footnoteRef'
		);

		expect(footnoteRefTokens.length).toBe(1);
		expect(footnoteRefTokens[0].label).toBe('end');
	});

	test('should parse footnote reference with links around it', () => {
		const tokens = lex(
			'[Link](https://example.com)[^link] with footnote.\n\n[^link]: Footnote after link.'
		);
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const footnoteRefTokens = paragraphTokens.filter(
			(t: { type: string }) => t.type === 'footnoteRef'
		);
		const linkTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'link');

		expect(footnoteRefTokens.length).toBe(1);
		expect(linkTokens.length).toBe(1);
		expect(footnoteRefTokens[0].label).toBe('link');
		expect(linkTokens[0].href).toBe('https://example.com');
	});

	test('should parse footnote reference with code spans around it', () => {
		const tokens = lex('`code`[^code] with footnote.\n\n[^code]: Footnote after code.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const footnoteRefTokens = paragraphTokens.filter(
			(t: { type: string }) => t.type === 'footnoteRef'
		);
		const codespanTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'codespan');

		expect(footnoteRefTokens.length).toBe(1);
		expect(codespanTokens.length).toBe(1);
		expect(footnoteRefTokens[0].label).toBe('code');
		expect(codespanTokens[0].text).toBe('code');
	});

	test('should not parse invalid footnote reference syntax (edge case)', () => {
		const tokens = lex('This is not a footnote [^] or [^].');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const footnoteRefTokens = paragraphTokens.filter(
			(t: { type: string }) => t.type === 'footnoteRef'
		);

		// Should not create footnote ref tokens for invalid syntax
		expect(footnoteRefTokens.length).toBe(0);
	});

	test('should handle footnote reference without definition (edge case)', () => {
		const tokens = lex('Text with undefined footnote[^undefined].');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const footnoteRefTokens = paragraphTokens.filter(
			(t: { type: string }) => t.type === 'footnoteRef'
		);

		// Should still create footnote ref token even without definition
		expect(footnoteRefTokens.length).toBe(1);
		expect(footnoteRefTokens[0].label).toBe('undefined');
	});

	test('should parse footnote reference with long label', () => {
		const tokens = lex(
			'Text with long footnote[^very-long-footnote-label-name].\n\n[^very-long-footnote-label-name]: Long label footnote.'
		);
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const footnoteRefTokens = paragraphTokens.filter(
			(t: { type: string }) => t.type === 'footnoteRef'
		);

		expect(footnoteRefTokens.length).toBe(1);
		expect(footnoteRefTokens[0].label).toBe('very-long-footnote-label-name');
	});

	test('should parse footnote reference with mixed case label', () => {
		const tokens = lex(
			'Text with mixed case footnote[^MixedCase].\n\n[^MixedCase]: Mixed case footnote.'
		);
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const footnoteRefTokens = paragraphTokens.filter(
			(t: { type: string }) => t.type === 'footnoteRef'
		);

		expect(footnoteRefTokens.length).toBe(1);
		expect(footnoteRefTokens[0].label).toBe('MixedCase');
	});
});

describe('incomplete markdown', () => {
	test('should handle incomplete footnote references', () => {
		const input = 'Text with incomplete footnote[^';
		const result = parseIncompleteMarkdown(input);

		// Should complete footnote with special marker
		expect(result).toBe('Text with incomplete footnote[^streamdown:footnote]');
	});

	test('should complete incomplete formatting around complete footnotes', () => {
		const input = 'Complete footnote[^1] and **incomplete bold.\n\n[^1]: Complete footnote.';
		const result = parseIncompleteMarkdown(input);

		// Should preserve footnote and complete bold formatting
		expect(result).toBe(
			'Complete footnote[^1] and **incomplete bold.**\n\n[^1]: Complete footnote.'
		);
	});

	test('should handle footnotes in different contexts', () => {
		const input = '# Heading with footnote[^heading\n\n> Blockquote with *incomplete';
		const result = parseIncompleteMarkdown(input);

		// Should complete footnote and italic
		console.log(result);
		expect(result).toBe(
			'# Heading with footnote[^streamdown:footnote]\n\n> Blockquote with *incomplete*'
		);
	});

	test('should handle mixed incomplete formatting with footnotes', () => {
		const input = 'Text with **bold**, *italic, footnote[^note, and ~~strike';
		const result = parseIncompleteMarkdown(input);

		// Should complete all incomplete formatters including footnote

		expect(result).toBe(
			'Text with **bold**, *italic, footnote[^streamdown:footnote], and ~~strike~~*'
		);
	});
});
