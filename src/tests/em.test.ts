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
	test('should parse simple emphasis text with single asterisks and verify all properties', () => {
		const tokens = lex('This is *italic* text.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		expect(paragraphToken.tokens).toBeDefined();

		const paragraphTokens = paragraphToken.tokens || [];
		const emTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'em');

		expect(emTokens.length).toBe(1);
		expect(emTokens[0].type).toBe('em');
		expect(emTokens[0].text).toBe('italic');
		expect(emTokens[0].raw).toBe('*italic*');
		expect(emTokens[0].tokens).toBeDefined();
	});

	test('should parse emphasis text with single underscores and verify properties', () => {
		const tokens = lex('This is _italic_ text.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const emTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'em');

		expect(emTokens.length).toBe(1);
		expect(emTokens[0].type).toBe('em');
		expect(emTokens[0].text).toBe('italic');
		expect(emTokens[0].raw).toBe('_italic_');
		expect(emTokens[0].tokens).toBeDefined();
	});

	test('should parse multiple emphasis texts in same paragraph', () => {
		const tokens = lex('This has *first italic* and *second italic* text.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const emTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'em');

		expect(emTokens.length).toBe(2);
		expect(emTokens[0].text).toBe('first italic');
		expect(emTokens[0].raw).toBe('*first italic*');
		expect(emTokens[1].text).toBe('second italic');
		expect(emTokens[1].raw).toBe('*second italic*');
	});

	test('should parse emphasis text with nested formatting', () => {
		const tokens = lex('This is *italic with `code` inside* text.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const emTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'em');

		expect(emTokens.length).toBe(1);
		expect(emTokens[0].tokens).toBeDefined();

		const emNestedTokens = emTokens[0].tokens || [];
		const codespanTokens = emNestedTokens.filter((t: { type: string }) => t.type === 'codespan');

		expect(codespanTokens.length).toBe(1);
		expect(codespanTokens[0].text).toBe('code');
	});

	test('should parse emphasis text in heading', () => {
		const tokens = lex('# Heading with *italic* text');
		const headingToken = getFirstTokenByType(tokens, 'heading');

		expect(headingToken).toBeDefined();
		expect(headingToken.tokens).toBeDefined();

		const headingTokens = headingToken.tokens || [];
		const emTokens = headingTokens.filter((t: { type: string }) => t.type === 'em');

		expect(emTokens.length).toBe(1);
		expect(emTokens[0].text).toBe('italic');
	});

	test('should parse emphasis text in blockquote', () => {
		const tokens = lex('> Quote with *italic* text');
		const blockquoteToken = getFirstTokenByType(tokens, 'blockquote');

		expect(blockquoteToken).toBeDefined();
		const nestedTokens = blockquoteToken.tokens || [];
		const paragraphToken = nestedTokens.find((t: any) => t.type === 'paragraph');
		expect(paragraphToken).toBeDefined();

		const paragraphTokens = paragraphToken.tokens || [];
		const emTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'em');

		expect(emTokens.length).toBe(1);
		expect(emTokens[0].text).toBe('italic');
	});

	test('should parse emphasis text in list item', () => {
		const tokens = lex('- Item with *italic* text');
		const listToken = getFirstTokenByType(tokens, 'list');

		expect(listToken).toBeDefined();
		expect(listToken.tokens.length).toBe(1);

		const listItemTokens = listToken.tokens[0].tokens || [];
		const paragraphToken = listItemTokens.find((t: any) => t.type === 'text');
		expect(paragraphToken).toBeDefined();

		const paragraphTokens = paragraphToken.tokens || [];
		const emTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'em');

		expect(emTokens.length).toBe(1);
		expect(emTokens[0].text).toBe('italic');
	});

	test('should parse emphasis text in table cell', () => {
		const tokens = lex('| *Italic* | Normal |\n|----------|--------|\n| Cell     | Text   |');
		const tableToken = getFirstTokenByType(tokens, 'table');

		expect(tableToken).toBeDefined();
		const tableHeader = tableToken.tokens.find((t: any) => t.type === 'thead');
		expect(tableHeader).toBeDefined();

		// Get the first table header cell (th)
		const firstHeaderRow = tableHeader.tokens[0]; // tr
		const firstHeaderCell = firstHeaderRow.tokens[0]; // th
		expect(firstHeaderCell.tokens).toBeDefined();
		const emTokens = firstHeaderCell.tokens.filter((t: { type: string }) => t.type === 'em');

		expect(emTokens.length).toBe(1);
		expect(emTokens[0].text).toBe('Italic');
	});

	test('should parse emphasis text with links inside', () => {
		const tokens = lex('This is *italic with [link](https://example.com) inside* text.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const emTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'em');

		expect(emTokens.length).toBe(1);
		expect(emTokens[0].tokens).toBeDefined();

		const emNestedTokens = emTokens[0].tokens || [];
		const linkTokens = emNestedTokens.filter((t: { type: string }) => t.type === 'link');

		expect(linkTokens.length).toBe(1);
		expect(linkTokens[0].href).toBe('https://example.com');
		expect(linkTokens[0].text).toBe('link');
	});

	test('should parse emphasis text with special characters', () => {
		const tokens = lex('This is *italic & < > " \' text* here.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const emTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'em');

		expect(emTokens.length).toBe(1);
		expect(emTokens[0].text).toBe('italic & < > " \' text');
	});

	test('should parse emphasis text with numbers and symbols', () => {
		const tokens = lex('Version *2.0.1* is available.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const emTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'em');

		expect(emTokens.length).toBe(1);
		expect(emTokens[0].text).toBe('2.0.1');
	});

	test('should handle emphasis text at start of paragraph', () => {
		const tokens = lex('*Italic start* of paragraph.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const emTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'em');

		expect(emTokens.length).toBe(1);
		expect(emTokens[0].text).toBe('Italic start');
	});

	test('should handle emphasis text at end of paragraph', () => {
		const tokens = lex('End with *italic text*.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const emTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'em');

		expect(emTokens.length).toBe(1);
		expect(emTokens[0].text).toBe('italic text');
	});

	test('should handle emphasis text spanning multiple words', () => {
		const tokens = lex('This is *very important italic text* here.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const emTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'em');

		expect(emTokens.length).toBe(1);
		expect(emTokens[0].text).toBe('very important italic text');
	});

	test('should not parse double asterisks as emphasis (edge case)', () => {
		const tokens = lex('This is **not italic** text.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const emTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'em');

		// Should not create em tokens for double asterisks
		expect(emTokens.length).toBe(0);

		// Should create strong tokens instead
		const strongTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'strong');
		expect(strongTokens.length).toBe(1);
		expect(strongTokens[0].text).toBe('not italic');
	});

	test('should handle nested strong and em formatting', () => {
		const tokens = lex('This is ***bold and italic*** text.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];

		// Should create either strong with nested em or em with nested strong
		const strongTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'strong');
		const emTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'em');

		// At least one should exist
		expect(strongTokens.length + emTokens.length).toBeGreaterThan(0);
	});

	test('should handle empty emphasis text (edge case)', () => {
		const tokens = lex('This has ** empty emphasis.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const emTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'em');

		// Behavior may vary - either no em token or empty em token
		if (emTokens.length > 0) {
			expect(emTokens[0].text).toBe('');
		}
	});

	test('should handle emphasis text with line breaks inside', () => {
		const tokens = lex('This is *italic\nwith line break* text.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const emTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'em');

		expect(emTokens.length).toBe(1);
		expect(emTokens[0].text).toBe('italic\nwith line break');
	});

	test('should not parse underscores within words as emphasis (edge case)', () => {
		const tokens = lex('This is snake_case_variable not emphasis.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const emTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'em');

		// Should not create em tokens for underscores within words
		expect(emTokens.length).toBe(0);
	});

	test('should parse emphasis with double underscores correctly', () => {
		const tokens = lex('This is __italic with double underscores__ text.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];

		// Double underscores should create strong, not em
		const strongTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'strong');
		expect(strongTokens.length).toBe(1);
		expect(strongTokens[0].text).toBe('italic with double underscores');
	});

	test('should handle mixed asterisk and underscore emphasis', () => {
		const tokens = lex('This has *asterisk* and _underscore_ emphasis.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const emTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'em');

		expect(emTokens.length).toBe(2);
		expect(emTokens[0].text).toBe('asterisk');
		expect(emTokens[1].text).toBe('underscore');
	});
});

describe('incomplete markdown', () => {
	test('should complete basic incomplete emphasis formatting', () => {
		const input = 'This text has *italic and _underscore';
		const result = parseIncompleteMarkdown(input);

		// Should complete all incomplete emphasis formatters in the order they appear
		expect(result).toBe('This text has *italic and _underscore*_');
	});

	test('should handle line breaks with incomplete emphasis', () => {
		const input = 'First line with *italic\nSecond line with _underscore';
		const result = parseIncompleteMarkdown(input);

		// Should complete formatting before line breaks
		expect(result).toBe('First line with *italic*\nSecond line with _underscore_');
	});

	test('should not complete emphasis within words', () => {
		const input = 'This is snake_case_variable with *incomplete';
		const result = parseIncompleteMarkdown(input);

		// Should not complete underscores within words but complete other emphasis
		expect(result).toBe('This is snake_case_variable with *incomplete*');
	});

	test('should handle emphasis in different contexts', () => {
		const input = '# Heading with *italic\n\n> Blockquote with _underscore';
		const result = parseIncompleteMarkdown(input);

		// Should complete emphasis in different markdown contexts
		expect(result).toBe('# Heading with *italic*\n\n> Blockquote with _underscore_');
	});
});
