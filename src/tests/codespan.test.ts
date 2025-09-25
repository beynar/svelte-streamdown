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
	test('should parse simple codespan and verify all properties', () => {
		const tokens = lex('Use `console.log()` for debugging.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		expect(paragraphToken.tokens).toBeDefined();

		const paragraphTokens = paragraphToken.tokens || [];
		const codespanTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'codespan');

		expect(codespanTokens.length).toBe(1);
		expect(codespanTokens[0].type).toBe('codespan');
		expect(codespanTokens[0].text).toBe('console.log()');
		expect(codespanTokens[0].raw).toBe('`console.log()`');
	});

	test('should parse multiple codespans in same paragraph', () => {
		const tokens = lex('Use `console.log()` and `console.error()` for debugging.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const codespanTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'codespan');

		expect(codespanTokens.length).toBe(2);
		expect(codespanTokens[0].text).toBe('console.log()');
		expect(codespanTokens[0].raw).toBe('`console.log()`');
		expect(codespanTokens[1].text).toBe('console.error()');
		expect(codespanTokens[1].raw).toBe('`console.error()`');
	});

	test('should parse codespan with special characters', () => {
		const tokens = lex('The regex `[a-zA-Z0-9]+` matches alphanumeric characters.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const codespanTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'codespan');

		expect(codespanTokens.length).toBe(1);
		expect(codespanTokens[0].text).toBe('[a-zA-Z0-9]+');
		expect(codespanTokens[0].raw).toBe('`[a-zA-Z0-9]+`');
	});

	test('should parse codespan with spaces', () => {
		const tokens = lex('Use `npm install package-name` to install packages.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const codespanTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'codespan');

		expect(codespanTokens.length).toBe(1);
		expect(codespanTokens[0].text).toBe('npm install package-name');
		expect(codespanTokens[0].raw).toBe('`npm install package-name`');
	});

	test('should parse codespan with backticks escaped inside', () => {
		const tokens = lex('Use `` `backtick` `` to include backticks in code.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const codespanTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'codespan');

		expect(codespanTokens.length).toBe(1);
		expect(codespanTokens[0].text).toBe('`backtick`');
		expect(codespanTokens[0].raw).toBe('`` `backtick` ``');
	});

	test('should parse codespan in headings', () => {
		const tokens = lex('# Using `console.log()` Function');
		const headingToken = getFirstTokenByType(tokens, 'heading');

		expect(headingToken).toBeDefined();
		expect(headingToken.tokens).toBeDefined();

		const headingTokens = headingToken.tokens || [];
		const codespanTokens = headingTokens.filter((t: { type: string }) => t.type === 'codespan');

		expect(codespanTokens.length).toBe(1);
		expect(codespanTokens[0].text).toBe('console.log()');
		expect(codespanTokens[0].raw).toBe('`console.log()`');
	});

	test('should parse codespan in blockquotes', () => {
		const tokens = lex('> Use `git commit` to save changes.');
		const blockquoteToken = getFirstTokenByType(tokens, 'blockquote');

		expect(blockquoteToken).toBeDefined();
		const nestedTokens = blockquoteToken.tokens || [];
		const paragraphToken = nestedTokens.find((t: any) => t.type === 'paragraph');
		expect(paragraphToken).toBeDefined();

		const paragraphTokens = paragraphToken.tokens || [];
		const codespanTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'codespan');

		expect(codespanTokens.length).toBe(1);
		expect(codespanTokens[0].text).toBe('git commit');
	});

	test('should parse codespan in list items', () => {
		const tokens = lex('- Use `npm start` to run the app\n- Use `npm test` to run tests');
		const listToken = getFirstTokenByType(tokens, 'list');

		expect(listToken).toBeDefined();
		expect(listToken.tokens).toBeDefined();
		expect(listToken.tokens.length).toBe(2);

		// Check first item
		const firstItemTokens = listToken.tokens[0].tokens || [];
		const firstText = firstItemTokens.find((t: any) => t.type === 'text');

		expect(firstText).toBeDefined();

		const firstCodespans = (firstText.tokens || []).filter(
			(t: { type: string }) => t.type === 'codespan'
		);
		expect(firstCodespans.length).toBe(1);
		expect(firstCodespans[0].text).toBe('npm start');

		// Check second item
		const secondItemTokens = listToken.tokens[1].tokens || [];
		const secondText = secondItemTokens.find((t: any) => t.type === 'text');
		expect(secondText).toBeDefined();

		const secondCodespans = (secondText.tokens || []).filter(
			(t: { type: string }) => t.type === 'codespan'
		);
		expect(secondCodespans.length).toBe(1);
		expect(secondCodespans[0].text).toBe('npm test');
	});

	test('should parse codespan with mixed formatting', () => {
		const tokens = lex('This has **bold**, *italic*, and `code` formatting.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];

		const strongTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'strong');
		const emTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'em');
		const codespanTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'codespan');

		expect(strongTokens.length).toBe(1);
		expect(emTokens.length).toBe(1);
		expect(codespanTokens.length).toBe(1);
		expect(codespanTokens[0].text).toBe('code');
	});

	test('should parse codespan with numbers and symbols', () => {
		const tokens = lex('The variable `x = 42` stores a number.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const codespanTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'codespan');

		expect(codespanTokens.length).toBe(1);
		expect(codespanTokens[0].text).toBe('x = 42');
	});

	test('should escape empty codespan', () => {
		const tokens = lex('Empty code: `` and more text.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();

		const paragraphTokens = paragraphToken.tokens || [];
		const codespanTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'codespan');

		expect(codespanTokens.length).toBe(0);
	});

	test('should handle codespan with only whitespace', () => {
		const tokens = lex('Whitespace code: `   ` and more text.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const codespanTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'codespan');

		expect(codespanTokens.length).toBe(1);
		expect(codespanTokens[0].text).toBe('   ');
	});

	test('should not parse single backtick as codespan (edge case)', () => {
		const tokens = lex('This has a single ` backtick.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const codespanTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'codespan');

		// Should not create codespan for single backtick
		expect(codespanTokens.length).toBe(0);
	});

	test('should parse codespan with HTML entities', () => {
		const tokens = lex('Use `&lt;div&gt;` for HTML elements.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const codespanTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'codespan');

		expect(codespanTokens.length).toBe(1);
		expect(codespanTokens[0].text).toBe('&lt;div&gt;');
	});
});

describe('incomplete markdown', () => {
	test('should complete basic incomplete codespan formatting', () => {
		const input = 'Use `console.log() and `another function';
		const result = parseIncompleteMarkdown(input);

		// Should complete incomplete codespans at end of string
		expect(result).toBe('Use `console.log() and `another function');
	});

	test('should handle line breaks with incomplete codespan', () => {
		const input = 'First line with `code\nSecond line with `more code';
		const result = parseIncompleteMarkdown(input);

		// Should complete codespan at end of entire string
		expect(result).toBe('First line with `code`\nSecond line with `more code`');
	});

	test('should handle codespan with special content', () => {
		const input = 'Code with `[array]` and `function()';
		const result = parseIncompleteMarkdown(input);

		// Should complete codespan at end of string
		expect(result).toBe('Code with `[array]` and `function()`');
	});

	test('should handle codespan in different contexts', () => {
		const input = '# Heading with `code\n\n> Blockquote with `more code';
		const result = parseIncompleteMarkdown(input);

		// Should complete codespan at end of entire string
		expect(result).toBe('# Heading with `code`\n\n> Blockquote with `more code`');
	});
});
