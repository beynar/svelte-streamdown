import { expect, describe, test } from 'vitest';
import { lex } from '../lib/marked/index.js';
import { parseIncompleteMarkdown } from '../lib/utils/parse-incomplete-markdown.js';

function getTokensByType(tokens: any[], type: string) {
	return tokens.filter((token) => token.type === type);
}

function getFirstTokenByType(tokens: any[], type: string) {
	return tokens.find((token) => token.type === type);
}

describe('citations', () => {
	test('should parse single citation [1]', () => {
		const tokens = lex('This is a citation [1]');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const citationTokens = paragraphTokens.filter(
			(t: { type: string }) => t.type === 'inline-citations'
		);

		expect(citationTokens.length).toBe(1);
		expect(citationTokens[0].keys).toEqual(['1']);
		expect(citationTokens[0].text).toBe('[1]');
		expect(citationTokens[0].raw).toBe('[1]');
	});

	test('should parse multiple consecutive citations [1] [2] [3]', () => {
		const tokens = lex('This has multiple citations [1] [2] [3]');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const citationTokens = paragraphTokens.filter(
			(t: { type: string }) => t.type === 'inline-citations'
		);

		expect(citationTokens.length).toBe(1);
		expect(citationTokens[0].keys).toEqual(['1', '2', '3']);
		expect(citationTokens[0].text).toBe('[1] [2] [3]');
		expect(citationTokens[0].raw).toBe('[1] [2] [3]');
	});

	test('should parse citations with different numbers', () => {
		const tokens = lex('Citations [5] [12] [42]');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const citationTokens = paragraphTokens.filter(
			(t: { type: string }) => t.type === 'inline-citations'
		);

		expect(citationTokens.length).toBe(1);
		expect(citationTokens[0].keys).toEqual(['5', '12', '42']);
		expect(citationTokens[0].text).toBe('[5] [12] [42]');
	});

	test('should parse citations with spaces between them', () => {
		const tokens = lex('Multiple citations [1]  [2]   [3]');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const citationTokens = paragraphTokens.filter(
			(t: { type: string }) => t.type === 'inline-citations'
		);

		expect(citationTokens.length).toBe(1);
		expect(citationTokens[0].keys).toEqual(['1', '2', '3']);
	});

	test('should parse text-based citations', () => {
		const tokens = lex('This has text citations [ref] [ref2]');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const citationTokens = paragraphTokens.filter(
			(t: { type: string }) => t.type === 'inline-citations'
		);

		expect(citationTokens.length).toBe(1);
		expect(citationTokens[0].keys).toEqual(['ref', 'ref2']);
		expect(citationTokens[0].text).toBe('[ref] [ref2]');
	});

	test('should parse space-separated citations in single brackets', () => {
		const tokens = lex('This has citations [ref ref2]');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const citationTokens = paragraphTokens.filter(
			(t: { type: string }) => t.type === 'inline-citations'
		);

		expect(citationTokens.length).toBe(1);
		expect(citationTokens[0].keys).toEqual(['ref', 'ref2']);
		expect(citationTokens[0].text).toBe('[ref ref2]');
	});

	test('should parse comma-separated citations in single brackets', () => {
		const tokens = lex('This has citations [ref, ref2]');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const citationTokens = paragraphTokens.filter(
			(t: { type: string }) => t.type === 'inline-citations'
		);

		expect(citationTokens.length).toBe(1);
		expect(citationTokens[0].keys).toEqual(['ref', 'ref2']);
		expect(citationTokens[0].text).toBe('[ref, ref2]');
	});

	test('should parse semicolon-separated citations in single brackets', () => {
		const tokens = lex('This has citations [ref; ref2]');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const citationTokens = paragraphTokens.filter(
			(t: { type: string }) => t.type === 'inline-citations'
		);

		expect(citationTokens.length).toBe(1);
		expect(citationTokens[0].keys).toEqual(['ref', 'ref2']);
		expect(citationTokens[0].text).toBe('[ref; ref2]');
	});

	test('should parse citations in the middle of text', () => {
		const tokens = lex('Start text [1] middle text [2] end text');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];

		// Should have text, citations, text, citations, text
		expect(paragraphTokens.length).toBe(5);
		expect(paragraphTokens[0].type).toBe('text');
		expect(paragraphTokens[0].text).toBe('Start text ');

		expect(paragraphTokens[1].type).toBe('inline-citations');
		expect(paragraphTokens[1].keys).toEqual(['1']);

		expect(paragraphTokens[2].type).toBe('text');
		expect(paragraphTokens[2].text).toBe(' middle text ');

		expect(paragraphTokens[3].type).toBe('inline-citations');
		expect(paragraphTokens[3].keys).toEqual(['2']);

		expect(paragraphTokens[4].type).toBe('text');
		expect(paragraphTokens[4].text).toBe(' end text');
	});

	test('should parse merged citations in middle of text', () => {
		const tokens = lex('Text [1] [2] [3] more text');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];

		// Should have text, citations, text
		expect(paragraphTokens.length).toBe(3);
		expect(paragraphTokens[0].type).toBe('text');
		expect(paragraphTokens[0].text).toBe('Text ');

		expect(paragraphTokens[1].type).toBe('inline-citations');
		expect(paragraphTokens[1].keys).toEqual(['1', '2', '3']);

		expect(paragraphTokens[2].type).toBe('text');
		expect(paragraphTokens[2].text).toBe(' more text');
	});

	test('should handle citations at start of text', () => {
		const tokens = lex('[1] [2] Start of text');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];

		expect(paragraphTokens.length).toBe(2);
		expect(paragraphTokens[0].type).toBe('inline-citations');
		expect(paragraphTokens[0].keys).toEqual(['1', '2']);

		expect(paragraphTokens[1].type).toBe('text');
		expect(paragraphTokens[1].text).toBe(' Start of text');
	});

	test('should handle citations at end of text', () => {
		const tokens = lex('End of text [1] [2]');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];

		expect(paragraphTokens.length).toBe(2);
		expect(paragraphTokens[0].type).toBe('text');
		expect(paragraphTokens[0].text).toBe('End of text ');

		expect(paragraphTokens[1].type).toBe('inline-citations');
		expect(paragraphTokens[1].keys).toEqual(['1', '2']);
	});

	test('should not treat task list items as citations', () => {
		const tokens = lex('- [ ] Task item\n- [x] Completed task\n- [X] Another completed task');
		const listToken = getFirstTokenByType(tokens, 'list');

		expect(listToken).toBeDefined();
		expect(listToken.tokens.length).toBe(3);

		// Check that none of the list items contain citation tokens
		listToken.tokens.forEach((listItem: any) => {
			expect(listItem.tokens).toBeDefined();
			const citationTokens = listItem.tokens.filter((t: any) => t.type === 'inline-citations');
			expect(citationTokens.length).toBe(0);
		});
	});

	test('should not treat markdown links as citations', () => {
		const tokens = lex('This is a [link](https://example.com) and some text');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const citationTokens = paragraphTokens.filter(
			(t: { type: string }) => t.type === 'inline-citations'
		);

		expect(citationTokens.length).toBe(0);
	});

	test('should not treat markdown images as citations', () => {
		const tokens = lex('This is an ![image](photo.jpg) and some text');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const citationTokens = paragraphTokens.filter(
			(t: { type: string }) => t.type === 'inline-citations'
		);

		expect(citationTokens.length).toBe(0);
	});

	test('should parse citations alongside links', () => {
		const tokens = lex('Check this [link](url) and see [ref] citation');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const citationTokens = paragraphTokens.filter(
			(t: { type: string }) => t.type === 'inline-citations'
		);
		const linkTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'link');

		expect(linkTokens.length).toBe(1);
		expect(citationTokens.length).toBe(1);
		expect(citationTokens[0].keys).toEqual(['ref']);
	});
});

describe('incomplete markdown', () => {
	test('should complete incomplete citations', () => {
		const input = 'This has an incomplete citation [ref';
		const result = parseIncompleteMarkdown(input);

		expect(result).toBe('This has an incomplete citation [ref]');
	});

	test('should complete incomplete citations with spaces', () => {
		const input = 'Citation with spaces [ref ref2';
		const result = parseIncompleteMarkdown(input);

		expect(result).toBe('Citation with spaces [ref ref2]');
	});

	test('should not complete citations that are part of markdown links', () => {
		const input = 'This is a link [text](url';
		const result = parseIncompleteMarkdown(input);

		// Should not add ] to link syntax
		expect(result).toBe('This is a link [text](streamdown:incomplete-link)');
	});

	test('should not complete task list items', () => {
		const input = '- [ ] Task item\n- [x';
		const result = parseIncompleteMarkdown(input);

		// Should not complete task list syntax
		expect(result).toBe('- [ ] Task item\n- [x]');
	});

	test('should handle multiple incomplete citations on the same line', () => {
		const input = 'Multiple citations [ref1 and [ref2';
		const result = parseIncompleteMarkdown(input);

		expect(result).toBe('Multiple citations [ref1] and [ref2]');
	});
});
