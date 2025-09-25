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
	test('should parse simple link and verify all properties', () => {
		const tokens = lex('[Google](https://google.com)');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		expect(paragraphToken.tokens).toBeDefined();

		const paragraphTokens = paragraphToken.tokens || [];
		const linkTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'link');

		expect(linkTokens.length).toBe(1);
		expect(linkTokens[0].type).toBe('link');
		expect(linkTokens[0].href).toBe('https://google.com');
		expect(linkTokens[0].text).toBe('Google');
		expect(linkTokens[0].title).toBeNull();
		expect(linkTokens[0].raw).toBe('[Google](https://google.com)');
		expect(linkTokens[0].tokens).toBeDefined();
	});

	test('should parse link with title and verify title property', () => {
		const tokens = lex('[Google](https://google.com "Search Engine")');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const linkTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'link');

		expect(linkTokens.length).toBe(1);
		expect(linkTokens[0].href).toBe('https://google.com');
		expect(linkTokens[0].text).toBe('Google');
		expect(linkTokens[0].title).toBe('Search Engine');
		expect(linkTokens[0].raw).toBe('[Google](https://google.com "Search Engine")');
	});

	test('should parse link with formatting in text and verify nested tokens', () => {
		const tokens = lex('[**Bold** and *italic* link](https://example.com)');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const linkTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'link');

		expect(linkTokens.length).toBe(1);
		expect(linkTokens[0].tokens).toBeDefined();

		const linkNestedTokens = linkTokens[0].tokens || [];
		const strongTokens = linkNestedTokens.filter((t: { type: string }) => t.type === 'strong');
		const emTokens = linkNestedTokens.filter((t: { type: string }) => t.type === 'em');

		expect(strongTokens.length).toBe(1);
		expect(strongTokens[0].text).toBe('Bold');
		expect(emTokens.length).toBe(1);
		expect(emTokens[0].text).toBe('italic');
	});

	test('should parse link with code span in text', () => {
		const tokens = lex('[Link with `code`](https://example.com)');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const linkTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'link');

		expect(linkTokens.length).toBe(1);
		expect(linkTokens[0].tokens).toBeDefined();

		const linkNestedTokens = linkTokens[0].tokens || [];
		const codespanTokens = linkNestedTokens.filter((t: { type: string }) => t.type === 'codespan');

		expect(codespanTokens.length).toBe(1);
		expect(codespanTokens[0].text).toBe('code');
	});

	test('should parse link with relative URL', () => {
		const tokens = lex('[Local page](./page.html)');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const linkTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'link');

		expect(linkTokens.length).toBe(1);
		expect(linkTokens[0].href).toBe('./page.html');
		expect(linkTokens[0].text).toBe('Local page');
	});

	test('should parse link with absolute path', () => {
		const tokens = lex('[About page](/about)');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const linkTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'link');

		expect(linkTokens.length).toBe(1);
		expect(linkTokens[0].href).toBe('/about');
		expect(linkTokens[0].text).toBe('About page');
	});

	test('should parse link with fragment', () => {
		const tokens = lex('[Section](#section-1)');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const linkTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'link');

		expect(linkTokens.length).toBe(1);
		expect(linkTokens[0].href).toBe('#section-1');
		expect(linkTokens[0].text).toBe('Section');
	});

	test('should parse link with query parameters', () => {
		const tokens = lex('[Search](https://example.com/search?q=test&page=1)');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const linkTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'link');

		expect(linkTokens.length).toBe(1);
		expect(linkTokens[0].href).toBe('https://example.com/search?q=test&page=1');
		expect(linkTokens[0].text).toBe('Search');
	});

	test('should parse multiple links in same paragraph', () => {
		const tokens = lex('Visit [Google](https://google.com) or [GitHub](https://github.com)');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const linkTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'link');

		expect(linkTokens.length).toBe(2);
		expect(linkTokens[0].text).toBe('Google');
		expect(linkTokens[0].href).toBe('https://google.com');
		expect(linkTokens[1].text).toBe('GitHub');
		expect(linkTokens[1].href).toBe('https://github.com');
	});

	test('should parse link in heading', () => {
		const tokens = lex('# Heading with [Link](https://example.com)');
		const headingToken = getFirstTokenByType(tokens, 'heading');

		expect(headingToken).toBeDefined();
		expect(headingToken.tokens).toBeDefined();

		const headingTokens = headingToken.tokens || [];
		const linkTokens = headingTokens.filter((t: { type: string }) => t.type === 'link');

		expect(linkTokens.length).toBe(1);
		expect(linkTokens[0].text).toBe('Link');
		expect(linkTokens[0].href).toBe('https://example.com');
	});

	test('should parse link in blockquote', () => {
		const tokens = lex('> Quote with [Link](https://example.com)');
		const blockquoteToken = getFirstTokenByType(tokens, 'blockquote');

		expect(blockquoteToken).toBeDefined();
		const nestedTokens = blockquoteToken.tokens || [];
		const paragraphToken = nestedTokens.find((t: any) => t.type === 'paragraph');
		expect(paragraphToken).toBeDefined();

		const paragraphTokens = paragraphToken.tokens || [];
		const linkTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'link');

		expect(linkTokens.length).toBe(1);
		expect(linkTokens[0].text).toBe('Link');
		expect(linkTokens[0].href).toBe('https://example.com');
	});

	test('should parse link in list item', () => {
		const tokens = lex('- Item with [Link](https://example.com)');
		const listToken = getFirstTokenByType(tokens, 'list');

		expect(listToken).toBeDefined();
		expect(listToken.tokens.length).toBe(1);

		const listItemTokens = listToken.tokens[0].tokens || [];
		const paragraphToken = listItemTokens.find((t: any) => t.type === 'text');
		expect(paragraphToken).toBeDefined();

		const paragraphTokens = paragraphToken.tokens || [];
		const linkTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'link');

		expect(linkTokens.length).toBe(1);
		expect(linkTokens[0].text).toBe('Link');
		expect(linkTokens[0].href).toBe('https://example.com');
	});

	test('should parse autolink and verify properties', () => {
		const tokens = lex('<https://example.com>');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const linkTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'link');

		expect(linkTokens.length).toBe(1);
		expect(linkTokens[0].href).toBe('https://example.com');
		expect(linkTokens[0].text).toBe('https://example.com');
	});

	test('should parse email autolink', () => {
		const tokens = lex('<user@example.com>');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const linkTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'link');

		expect(linkTokens.length).toBe(1);
		expect(linkTokens[0].href).toBe('mailto:user@example.com');
		expect(linkTokens[0].text).toBe('user@example.com');
	});

	test('should parse reference-style link', () => {
		const tokens = lex('[Link text][ref]\n\n[ref]: https://example.com');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const linkTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'link');

		expect(linkTokens.length).toBe(1);
		expect(linkTokens[0].text).toBe('Link text');
		expect(linkTokens[0].href).toBe('https://example.com');
	});

	test('should parse link with special characters in text', () => {
		const tokens = lex('[Link & < > " \' text](https://example.com)');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const linkTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'link');

		expect(linkTokens.length).toBe(1);
		expect(linkTokens[0].text).toBe('Link & < > " \' text');
	});

	test('should handle link with brackets in text (edge case)', () => {
		const tokens = lex('[Link [with] brackets](https://example.com)');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const linkTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'link');

		expect(linkTokens.length).toBe(1);
		expect(linkTokens[0].text).toBe('Link [with] brackets');
	});

	test('should handle link with parentheses in URL (edge case)', () => {
		const tokens = lex('[Link](https://example.com/page(1))');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const linkTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'link');

		expect(linkTokens.length).toBe(1);
		expect(linkTokens[0].href).toBe('https://example.com/page(1)');
	});

	test('should parse link with empty text', () => {
		const tokens = lex('[](https://example.com)');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const linkTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'link');

		expect(linkTokens.length).toBe(1);
		expect(linkTokens[0].text).toBe('');
		expect(linkTokens[0].href).toBe('https://example.com');
	});
});

describe('incomplete markdown', () => {
	test('should complete basic incomplete link formatting', () => {
		const input = 'Visit [GitHub';
		const result = parseIncompleteMarkdown(input);

		// Should complete incomplete links at end
		expect(result).toBe('Visit [GitHub](streamdown:incomplete-link)');
	});

	test('should handle complete and incomplete links together', () => {
		const input = 'Complete [Google](https://google.com) and incomplete [GitHub';
		const result = parseIncompleteMarkdown(input);

		// Should preserve complete link and complete incomplete one
		expect(result).toBe('Complete [Google](https://google.com) and incomplete [GitHub');
	});
});
