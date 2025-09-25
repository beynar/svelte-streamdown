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
	test('should parse simple paragraph and verify all properties', () => {
		const tokens = lex('This is a simple paragraph.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		expect(paragraphToken.type).toBe('paragraph');
		expect(paragraphToken.text).toBe('This is a simple paragraph.');
		expect(paragraphToken.raw).toBe('This is a simple paragraph.');
		expect(paragraphToken.tokens).toBeDefined();
	});

	test('should parse paragraph with inline formatting and verify nested tokens', () => {
		const tokens = lex('This paragraph has **bold** and *italic* text.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		expect(paragraphToken.type).toBe('paragraph');
		expect(paragraphToken.tokens).toBeDefined();

		const paragraphTokens = paragraphToken.tokens || [];
		const strongTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'strong');
		const emTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'em');

		expect(strongTokens.length).toBe(1);
		expect(strongTokens[0].text).toBe('bold');
		expect(emTokens.length).toBe(1);
		expect(emTokens[0].text).toBe('italic');
	});

	test('should parse paragraph with code spans and verify codespan tokens', () => {
		const tokens = lex('Use `console.log()` to debug your `JavaScript` code.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		expect(paragraphToken.tokens).toBeDefined();

		const paragraphTokens = paragraphToken.tokens || [];
		const codespanTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'codespan');

		expect(codespanTokens.length).toBe(2);
		expect(codespanTokens[0].text).toBe('console.log()');
		expect(codespanTokens[0].raw).toBe('`console.log()`');
		expect(codespanTokens[1].text).toBe('JavaScript');
		expect(codespanTokens[1].raw).toBe('`JavaScript`');
	});

	test('should parse paragraph with links and verify link token properties', () => {
		const tokens = lex('Visit [Google](https://google.com) for search.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		expect(paragraphToken.tokens).toBeDefined();

		const paragraphTokens = paragraphToken.tokens || [];
		const linkTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'link');

		expect(linkTokens.length).toBe(1);
		expect(linkTokens[0].href).toBe('https://google.com');
		expect(linkTokens[0].text).toBe('Google');
		expect(linkTokens[0].title).toBeNull();
		expect(linkTokens[0].tokens).toBeDefined();
	});

	test('should parse paragraph with images and verify image token properties', () => {
		const tokens = lex('Here is an image: ![Alt text](https://example.com/image.jpg)');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		expect(paragraphToken.tokens).toBeDefined();

		const paragraphTokens = paragraphToken.tokens || [];
		const imageTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'image');

		expect(imageTokens.length).toBe(1);
		expect(imageTokens[0].href).toBe('https://example.com/image.jpg');
		expect(imageTokens[0].text).toBe('Alt text');
		expect(imageTokens[0].title).toBeNull();
	});

	test('should parse paragraph with strikethrough and verify del tokens', () => {
		const tokens = lex('This text is ~~crossed out~~ and this is not.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		expect(paragraphToken.tokens).toBeDefined();

		const paragraphTokens = paragraphToken.tokens || [];
		const delTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'del');

		expect(delTokens.length).toBe(1);
		expect(delTokens[0].text).toBe('crossed out');
		expect(delTokens[0].raw).toBe('~~crossed out~~');
	});

	test('should parse paragraph with line breaks and verify br tokens', () => {
		const tokens = lex('First line  \nSecond line');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		expect(paragraphToken.tokens).toBeDefined();

		const paragraphTokens = paragraphToken.tokens || [];
		const brTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'br');

		expect(brTokens.length).toBe(1);
	});

	test('should parse multiple paragraphs separated by blank lines', () => {
		const tokens = lex('First paragraph.\n\nSecond paragraph.\n\nThird paragraph.');
		const paragraphTokens = getTokensByType(tokens, 'paragraph');

		expect(paragraphTokens.length).toBe(3);
		expect(paragraphTokens[0].text).toBe('First paragraph.');
		expect(paragraphTokens[1].text).toBe('Second paragraph.');
		expect(paragraphTokens[2].text).toBe('Third paragraph.');
	});

	test('should parse paragraph with mixed formatting and verify all token types', () => {
		const tokens = lex(
			'This has **bold**, *italic*, `code`, [link](https://example.com), and ~~strikethrough~~.'
		);
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		expect(paragraphToken.tokens).toBeDefined();

		const paragraphTokens = paragraphToken.tokens || [];
		const strongTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'strong');
		const emTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'em');
		const codespanTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'codespan');
		const linkTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'link');
		const delTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'del');

		expect(strongTokens.length).toBe(1);
		expect(emTokens.length).toBe(1);
		expect(codespanTokens.length).toBe(1);
		expect(linkTokens.length).toBe(1);
		expect(delTokens.length).toBe(1);
	});

	test('should parse paragraph with special characters and unicode', () => {
		const tokens = lex('Special chars: & < > " \' and unicode: 🚀 ñ ü');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		expect(paragraphToken.text).toBe('Special chars: & < > " \' and unicode: 🚀 ñ ü');
	});

	test('should parse paragraph with subscript and superscript', () => {
		const tokens = lex('Water is H~2~O and energy is E = mc^2^.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		expect(paragraphToken.tokens).toBeDefined();

		const paragraphTokens = paragraphToken.tokens || [];
		const subTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'sub');
		const supTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'sup');

		expect(subTokens.length).toBe(1);
		expect(subTokens[0].text).toBe('2');
		expect(supTokens.length).toBe(1);
		expect(supTokens[0].text).toBe('2');
	});

	test('should handle empty paragraph (edge case)', () => {
		const tokens = lex('');
		const paragraphTokens = getTokensByType(tokens, 'paragraph');

		expect(paragraphTokens.length).toBe(0);
	});

	test('should handle paragraph with only whitespace (edge case)', () => {
		const tokens = lex('   \n   \n   ');
		const paragraphTokens = getTokensByType(tokens, 'paragraph');

		// Should not create paragraph tokens for whitespace-only content
		expect(paragraphTokens.length).toBe(0);
	});
});

describe('incomplete markdown', () => {
	test('should complete basic incomplete formatting in paragraphs', () => {
		const input = 'This paragraph has **bold and *italic';
		const result = parseIncompleteMarkdown(input);

		// Should complete all incomplete formatters in the order they appear
		expect(result).toBe('This paragraph has **bold and *italic***');
	});

	test('should handle line breaks with incomplete formatting in paragraphs', () => {
		const input = 'First line with **bold\nSecond line with *italic';
		const result = parseIncompleteMarkdown(input);

		// Should complete formatting before line breaks
		expect(result).toBe('First line with **bold**\nSecond line with *italic*');
	});

	test('should handle different formatting types in paragraphs', () => {
		const input = 'Paragraph with `code, [link, ~~strike, and **bold';
		const result = parseIncompleteMarkdown(input);

		// Should complete incomplete formatters at end of string
		expect(result).toBe(
			'Paragraph with `code, [link, ~~strike, and **bold**~~`](streamdown:incomplete-link)'
		);
	});

	test('should handle complex paragraphs with multiple incomplete elements', () => {
		const input = 'Complex text with **bold**, *italic, `code, and [link';
		const result = parseIncompleteMarkdown(input);

		// Should complete incomplete formatters at end of string
		expect(result).toBe(
			'Complex text with **bold**, *italic, `code, and [link*`](streamdown:incomplete-link)'
		);
	});
});
