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
	test('should parse simple strong text with double asterisks and verify all properties', () => {
		const tokens = lex('This is **bold** text.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		expect(paragraphToken.tokens).toBeDefined();

		const paragraphTokens = paragraphToken.tokens || [];
		const strongTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'strong');

		expect(strongTokens.length).toBe(1);
		expect(strongTokens[0].type).toBe('strong');
		expect(strongTokens[0].text).toBe('bold');
		expect(strongTokens[0].raw).toBe('**bold**');
		expect(strongTokens[0].tokens).toBeDefined();
	});

	test('should parse strong text with double underscores and verify properties', () => {
		const tokens = lex('This is __bold__ text.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const strongTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'strong');

		expect(strongTokens.length).toBe(1);
		expect(strongTokens[0].type).toBe('strong');
		expect(strongTokens[0].text).toBe('bold');
		expect(strongTokens[0].raw).toBe('__bold__');
		expect(strongTokens[0].tokens).toBeDefined();
	});

	test('should parse multiple strong texts in same paragraph', () => {
		const tokens = lex('This has **first bold** and **second bold** text.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const strongTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'strong');

		expect(strongTokens.length).toBe(2);
		expect(strongTokens[0].text).toBe('first bold');
		expect(strongTokens[0].raw).toBe('**first bold**');
		expect(strongTokens[1].text).toBe('second bold');
		expect(strongTokens[1].raw).toBe('**second bold**');
	});

	test('should parse strong text with nested formatting', () => {
		const tokens = lex('This is **bold with `code` inside** text.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const strongTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'strong');

		expect(strongTokens.length).toBe(1);
		expect(strongTokens[0].tokens).toBeDefined();

		const strongNestedTokens = strongTokens[0].tokens || [];
		const codespanTokens = strongNestedTokens.filter(
			(t: { type: string }) => t.type === 'codespan'
		);

		expect(codespanTokens.length).toBe(1);
		expect(codespanTokens[0].text).toBe('code');
	});

	test('should parse strong text in heading', () => {
		const tokens = lex('# Heading with **bold** text');
		const headingToken = getFirstTokenByType(tokens, 'heading');

		expect(headingToken).toBeDefined();
		expect(headingToken.tokens).toBeDefined();

		const headingTokens = headingToken.tokens || [];
		const strongTokens = headingTokens.filter((t: { type: string }) => t.type === 'strong');

		expect(strongTokens.length).toBe(1);
		expect(strongTokens[0].text).toBe('bold');
	});

	test('should parse strong text in blockquote', () => {
		const tokens = lex('> Quote with **bold** text');
		const blockquoteToken = getFirstTokenByType(tokens, 'blockquote');

		expect(blockquoteToken).toBeDefined();
		const nestedTokens = blockquoteToken.tokens || [];
		const paragraphToken = nestedTokens.find((t: any) => t.type === 'paragraph');
		expect(paragraphToken).toBeDefined();

		const paragraphTokens = paragraphToken.tokens || [];
		const strongTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'strong');

		expect(strongTokens.length).toBe(1);
		expect(strongTokens[0].text).toBe('bold');
	});

	test('should parse strong text in list item', () => {
		const tokens = lex('- Item with **bold** text');
		const listToken = getFirstTokenByType(tokens, 'list');

		expect(listToken).toBeDefined();
		expect(listToken.tokens.length).toBe(1);

		const listItemTokens = listToken.tokens[0].tokens || [];
		const paragraphToken = listItemTokens.find((t: any) => t.type === 'text');
		expect(paragraphToken).toBeDefined();

		const paragraphTokens = paragraphToken.tokens || [];
		const strongTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'strong');

		expect(strongTokens.length).toBe(1);
		expect(strongTokens[0].text).toBe('bold');
	});

	test('should parse strong text in table cell', () => {
		const tokens = lex('| **Bold** | Normal |\n|----------|--------|\n| Cell     | Text   |');
		const tableToken = getFirstTokenByType(tokens, 'table');

		expect(tableToken).toBeDefined();
		const tableHeader = tableToken.tokens.find((t: any) => t.type === 'thead');
		expect(tableHeader).toBeDefined();

		// Get the first table header cell (th)
		const firstHeaderRow = tableHeader.tokens[0]; // tr
		const firstHeaderCell = firstHeaderRow.tokens[0]; // th
		expect(firstHeaderCell.tokens).toBeDefined();
		const strongTokens = firstHeaderCell.tokens.filter(
			(t: { type: string }) => t.type === 'strong'
		);

		expect(strongTokens.length).toBe(1);
		expect(strongTokens[0].text).toBe('Bold');
	});

	test('should parse strong text with links inside', () => {
		const tokens = lex('This is **bold with [link](https://example.com) inside** text.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const strongTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'strong');

		expect(strongTokens.length).toBe(1);
		expect(strongTokens[0].tokens).toBeDefined();

		const strongNestedTokens = strongTokens[0].tokens || [];
		const linkTokens = strongNestedTokens.filter((t: { type: string }) => t.type === 'link');

		expect(linkTokens.length).toBe(1);
		expect(linkTokens[0].href).toBe('https://example.com');
		expect(linkTokens[0].text).toBe('link');
	});

	test('should parse strong text with special characters', () => {
		const tokens = lex('This is **bold & < > " \' text** here.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const strongTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'strong');

		expect(strongTokens.length).toBe(1);
		expect(strongTokens[0].text).toBe('bold & < > " \' text');
	});

	test('should parse strong text with numbers and symbols', () => {
		const tokens = lex('Version **2.0.1** is available.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const strongTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'strong');

		expect(strongTokens.length).toBe(1);
		expect(strongTokens[0].text).toBe('2.0.1');
	});

	test('should handle strong text at start of paragraph', () => {
		const tokens = lex('**Bold start** of paragraph.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const strongTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'strong');

		expect(strongTokens.length).toBe(1);
		expect(strongTokens[0].text).toBe('Bold start');
	});

	test('should handle strong text at end of paragraph', () => {
		const tokens = lex('End with **bold text**.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const strongTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'strong');

		expect(strongTokens.length).toBe(1);
		expect(strongTokens[0].text).toBe('bold text');
	});

	test('should handle strong text spanning multiple words', () => {
		const tokens = lex('This is **very important bold text** here.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const strongTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'strong');

		expect(strongTokens.length).toBe(1);
		expect(strongTokens[0].text).toBe('very important bold text');
	});

	test('should not parse single asterisks as strong (edge case)', () => {
		const tokens = lex('This is *not bold* text.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const strongTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'strong');

		// Should not create strong tokens for single asterisks
		expect(strongTokens.length).toBe(0);

		// Should create em tokens instead
		const emTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'em');
		expect(emTokens.length).toBe(1);
		expect(emTokens[0].text).toBe('not bold');
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

	test('should handle empty strong text (edge case)', () => {
		const tokens = lex('This has **** empty strong.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const strongTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'strong');

		// Behavior may vary - either no strong token or empty strong token
		if (strongTokens.length > 0) {
			expect(strongTokens[0].text).toBe('');
		}
	});

	test('should handle strong text with line breaks inside', () => {
		const tokens = lex('This is **bold\nwith line break** text.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const strongTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'strong');

		expect(strongTokens.length).toBe(1);
		expect(strongTokens[0].text).toBe('bold\nwith line break');
	});
});

describe('incomplete markdown', () => {
	test('should complete basic incomplete strong formatting', () => {
		const input = 'This text has **bold and __underscore';
		const result = parseIncompleteMarkdown(input);

		// Should complete all incomplete strong formatters in the order they appear
		expect(result).toBe('This text has **bold and __underscore**__');
	});

	test('should handle line breaks with incomplete strong formatting', () => {
		const input = 'First line with **bold\nSecond line with __underscore';
		const result = parseIncompleteMarkdown(input);

		// Should complete formatting before line breaks
		expect(result).toBe('First line with **bold**\nSecond line with __underscore__');
	});

	test('should handle strong formatting in different contexts', () => {
		const input = '# Heading with **bold\n\n> Blockquote with __underscore';
		const result = parseIncompleteMarkdown(input);

		// Should complete strong formatting in different markdown contexts
		expect(result).toBe('# Heading with **bold**\n\n> Blockquote with __underscore__');
	});

	test('should handle mixed strong and emphasis formatting', () => {
		const input = 'Text with **bold and *italic';
		const result = parseIncompleteMarkdown(input);

		// Should complete all incomplete formatters in the order they appear
		expect(result).toBe('Text with **bold and *italic***');
	});
});
