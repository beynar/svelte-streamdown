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
	test('should parse simple blockquote and verify all properties', () => {
		const tokens = lex('> This is a blockquote.');
		const blockquoteToken = getFirstTokenByType(tokens, 'blockquote');

		expect(blockquoteToken).toBeDefined();
		expect(blockquoteToken.type).toBe('blockquote');
		expect(blockquoteToken.raw).toBe('> This is a blockquote.');
		expect(blockquoteToken.text).toBe('This is a blockquote.');
		expect(blockquoteToken.tokens).toBeDefined();

		// Check nested paragraph token
		const nestedTokens = blockquoteToken.tokens || [];
		const paragraphToken = nestedTokens.find((t: any) => t.type === 'paragraph');
		expect(paragraphToken).toBeDefined();
		expect(paragraphToken.text).toBe('This is a blockquote.');
	});

	test('should parse multi-line blockquote and verify structure', () => {
		const tokens = lex('> First line of blockquote.\n> Second line of blockquote.');
		const blockquoteToken = getFirstTokenByType(tokens, 'blockquote');

		expect(blockquoteToken).toBeDefined();
		expect(blockquoteToken.type).toBe('blockquote');
		expect(blockquoteToken.raw).toBe('> First line of blockquote.\n> Second line of blockquote.');
		expect(blockquoteToken.tokens).toBeDefined();

		// Should contain a single paragraph with both lines
		const nestedTokens = blockquoteToken.tokens || [];
		const paragraphToken = nestedTokens.find((t: any) => t.type === 'paragraph');
		expect(paragraphToken).toBeDefined();
		expect(paragraphToken.text).toBe('First line of blockquote.\nSecond line of blockquote.');
	});

	test('should parse blockquote with formatting and verify nested tokens', () => {
		const tokens = lex('> This blockquote has **bold** and *italic* text.');
		const blockquoteToken = getFirstTokenByType(tokens, 'blockquote');

		expect(blockquoteToken).toBeDefined();
		expect(blockquoteToken.tokens).toBeDefined();

		const nestedTokens = blockquoteToken.tokens || [];
		const paragraphToken = nestedTokens.find((t: any) => t.type === 'paragraph');
		expect(paragraphToken).toBeDefined();

		console.log({ paragraphToken, nestedTokens });
		const paragraphTokens = paragraphToken.tokens || [];
		const strongTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'strong');
		const emTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'em');

		expect(strongTokens.length).toBe(1);
		expect(strongTokens[0].text).toBe('bold');
		expect(emTokens.length).toBe(1);
		expect(emTokens[0].text).toBe('italic');
	});

	test('should parse blockquote with code spans and verify codespan tokens', () => {
		const tokens = lex('> Use `console.log()` for debugging.');
		const blockquoteToken = getFirstTokenByType(tokens, 'blockquote');

		expect(blockquoteToken).toBeDefined();
		const nestedTokens = blockquoteToken.tokens || [];
		const paragraphToken = nestedTokens.find((t: any) => t.type === 'paragraph');
		expect(paragraphToken).toBeDefined();

		const paragraphTokens = paragraphToken.tokens || [];
		const codespanTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'codespan');

		expect(codespanTokens.length).toBe(1);
		expect(codespanTokens[0].text).toBe('console.log()');
		expect(codespanTokens[0].raw).toBe('`console.log()`');
	});

	test('should parse blockquote with links and verify link tokens', () => {
		const tokens = lex('> Visit [Google](https://google.com) for more info.');
		const blockquoteToken = getFirstTokenByType(tokens, 'blockquote');

		expect(blockquoteToken).toBeDefined();
		const nestedTokens = blockquoteToken.tokens || [];
		const paragraphToken = nestedTokens.find((t: any) => t.type === 'paragraph');
		expect(paragraphToken).toBeDefined();

		const paragraphTokens = paragraphToken.tokens || [];
		const linkTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'link');

		expect(linkTokens.length).toBe(1);
		expect(linkTokens[0].href).toBe('https://google.com');
		expect(linkTokens[0].text).toBe('Google');
	});

	test('should parse nested blockquotes and verify structure', () => {
		const tokens = lex('> Outer blockquote\n> > Nested blockquote');
		const blockquoteTokens = getTokensByType(tokens, 'blockquote');

		expect(blockquoteTokens.length).toBe(1);
		const outerBlockquote = blockquoteTokens[0];
		expect(outerBlockquote).toBeDefined();

		// Check for nested blockquote within the outer one
		const nestedTokens = outerBlockquote.tokens || [];
		const nestedBlockquote = nestedTokens.find((t: any) => t.type === 'blockquote');
		expect(nestedBlockquote).toBeDefined();
	});

	test('should parse blockquote with multiple paragraphs', () => {
		const tokens = lex('> First paragraph in blockquote.\n>\n> Second paragraph in blockquote.');
		const blockquoteToken = getFirstTokenByType(tokens, 'blockquote');

		expect(blockquoteToken).toBeDefined();
		const nestedTokens = blockquoteToken.tokens || [];
		const paragraphTokens = nestedTokens.filter((t: any) => t.type === 'paragraph');

		expect(paragraphTokens.length).toBe(2);
		expect(paragraphTokens[0].text).toBe('First paragraph in blockquote.');
		expect(paragraphTokens[1].text).toBe('Second paragraph in blockquote.');
	});

	test('should parse blockquote with headings', () => {
		const tokens = lex('> # Heading in blockquote\n> Some content');
		const blockquoteToken = getFirstTokenByType(tokens, 'blockquote');

		expect(blockquoteToken).toBeDefined();
		const nestedTokens = blockquoteToken.tokens || [];
		const headingToken = nestedTokens.find((t: any) => t.type === 'heading');
		const paragraphToken = nestedTokens.find((t: any) => t.type === 'paragraph');

		expect(headingToken).toBeDefined();
		expect(headingToken.depth).toBe(1);
		expect(headingToken.text).toBe('Heading in blockquote');
		expect(paragraphToken).toBeDefined();
		expect(paragraphToken.text).toBe('Some content');
	});

	test('should parse blockquote with lists', () => {
		const tokens = lex('> - Item 1\n> - Item 2\n> - Item 3');
		const blockquoteToken = getFirstTokenByType(tokens, 'blockquote');

		expect(blockquoteToken).toBeDefined();
		const nestedTokens = blockquoteToken.tokens || [];
		const listToken = nestedTokens.find((t: any) => t.type === 'list');

		expect(listToken).toBeDefined();
		expect(listToken.ordered).toBe(false);
		expect(listToken.tokens).toBeDefined();
		expect(listToken.tokens.length).toBe(3);
	});

	test('should parse blockquote with lazy continuation (no > on every line)', () => {
		const tokens = lex('> This is a blockquote\nwith lazy continuation.');
		const blockquoteToken = getFirstTokenByType(tokens, 'blockquote');

		expect(blockquoteToken).toBeDefined();
		const nestedTokens = blockquoteToken.tokens || [];
		const paragraphToken = nestedTokens.find((t: any) => t.type === 'paragraph');

		expect(paragraphToken).toBeDefined();
		expect(paragraphToken.text).toBe('This is a blockquote\nwith lazy continuation.');
	});

	test('should handle blockquote with only > symbol (edge case)', () => {
		const tokens = lex('>');
		const blockquoteToken = getFirstTokenByType(tokens, 'blockquote');

		expect(blockquoteToken).toBeDefined();
		expect(blockquoteToken.raw).toBe('>');
	});

	test('should handle blockquote with whitespace after > (edge case)', () => {
		const tokens = lex('>   ');
		const blockquoteToken = getFirstTokenByType(tokens, 'blockquote');

		expect(blockquoteToken).toBeDefined();
		expect(blockquoteToken.raw).toBe('>   ');
	});

	test('should parse blockquote with strikethrough and verify del tokens', () => {
		const tokens = lex('> This text is ~~crossed out~~ in a blockquote.');
		const blockquoteToken = getFirstTokenByType(tokens, 'blockquote');

		expect(blockquoteToken).toBeDefined();
		const nestedTokens = blockquoteToken.tokens || [];
		const paragraphToken = nestedTokens.find((t: any) => t.type === 'paragraph');
		expect(paragraphToken).toBeDefined();

		const paragraphTokens = paragraphToken.tokens || [];
		const delTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'del');

		expect(delTokens.length).toBe(1);
		expect(delTokens[0].text).toBe('crossed out');
	});
});

describe('incomplete markdown', () => {
	test('should complete basic incomplete formatting in blockquotes', () => {
		const input = '> This blockquote has **bold and *italic';
		const result = parseIncompleteMarkdown(input);

		// Should complete incomplete formatters at end of entire string
		expect(result).toBe('> This blockquote has **bold and *italic***');
	});

	test('should handle line breaks with incomplete formatting in blockquotes', () => {
		const input = '> First line with **bold\n> Second line with *italic';
		const result = parseIncompleteMarkdown(input);

		// Should complete formatting at end of entire string
		expect(result).toBe('> First line with **bold**\n> Second line with *italic*');
	});

	test('should complete incomplete links and images in blockquotes', () => {
		const input = '> Visit [Google';
		const result = parseIncompleteMarkdown(input);

		// Should complete with incomplete markers at end
		expect(result).toBe('> Visit [Google](streamdown:incomplete-link)');
	});

	test('should handle nested blockquotes with incomplete formatting', () => {
		const input = '> Outer quote\n> > Nested with **incomplete';
		const result = parseIncompleteMarkdown(input);

		// Should complete formatting at end of entire string
		expect(result).toBe('> Outer quote\n> > Nested with **incomplete**');
	});
});
