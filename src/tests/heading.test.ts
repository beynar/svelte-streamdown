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
	test('should parse H1 heading with # and verify all properties', () => {
		const tokens = lex('# Main Title');
		const headingToken = getFirstTokenByType(tokens, 'heading');

		expect(headingToken).toBeDefined();
		expect(headingToken.type).toBe('heading');
		expect(headingToken.depth).toBe(1);
		expect(headingToken.text).toBe('Main Title');
		expect(headingToken.raw).toBe('# Main Title');
		expect(headingToken.tokens).toBeDefined();
	});

	test('should parse H2 heading with ## and verify all properties', () => {
		const tokens = lex('## Section Title');
		const headingToken = getFirstTokenByType(tokens, 'heading');

		expect(headingToken).toBeDefined();
		expect(headingToken.type).toBe('heading');
		expect(headingToken.depth).toBe(2);
		expect(headingToken.text).toBe('Section Title');
		expect(headingToken.raw).toBe('## Section Title');
		expect(headingToken.tokens).toBeDefined();
	});

	test('should parse H3 heading with ### and verify all properties', () => {
		const tokens = lex('### Subsection Title');
		const headingToken = getFirstTokenByType(tokens, 'heading');

		expect(headingToken).toBeDefined();
		expect(headingToken.type).toBe('heading');
		expect(headingToken.depth).toBe(3);
		expect(headingToken.text).toBe('Subsection Title');
		expect(headingToken.raw).toBe('### Subsection Title');
		expect(headingToken.tokens).toBeDefined();
	});

	test('should parse H4 heading with #### and verify all properties', () => {
		const tokens = lex('#### Sub-subsection Title');
		const headingToken = getFirstTokenByType(tokens, 'heading');

		expect(headingToken).toBeDefined();
		expect(headingToken.type).toBe('heading');
		expect(headingToken.depth).toBe(4);
		expect(headingToken.text).toBe('Sub-subsection Title');
		expect(headingToken.raw).toBe('#### Sub-subsection Title');
		expect(headingToken.tokens).toBeDefined();
	});

	test('should parse H5 heading with ##### and verify all properties', () => {
		const tokens = lex('##### Minor Heading');
		const headingToken = getFirstTokenByType(tokens, 'heading');

		expect(headingToken).toBeDefined();
		expect(headingToken.type).toBe('heading');
		expect(headingToken.depth).toBe(5);
		expect(headingToken.text).toBe('Minor Heading');
		expect(headingToken.raw).toBe('##### Minor Heading');
		expect(headingToken.tokens).toBeDefined();
	});

	test('should parse H6 heading with ###### and verify all properties', () => {
		const tokens = lex('###### Smallest Heading');
		const headingToken = getFirstTokenByType(tokens, 'heading');

		expect(headingToken).toBeDefined();
		expect(headingToken.type).toBe('heading');
		expect(headingToken.depth).toBe(6);
		expect(headingToken.text).toBe('Smallest Heading');
		expect(headingToken.raw).toBe('###### Smallest Heading');
		expect(headingToken.tokens).toBeDefined();
	});

	test('should parse setext H1 heading and verify all properties', () => {
		const tokens = lex('Main Title\n=========');
		const headingToken = getFirstTokenByType(tokens, 'heading');

		expect(headingToken).toBeDefined();
		expect(headingToken.type).toBe('heading');
		expect(headingToken.depth).toBe(1);
		expect(headingToken.text).toBe('Main Title');
		expect(headingToken.raw).toBe('Main Title\n=========');
		expect(headingToken.tokens).toBeDefined();
	});

	test('should parse setext H2 heading and verify all properties', () => {
		const tokens = lex('Section Title\n-------------');
		const headingToken = getFirstTokenByType(tokens, 'heading');

		expect(headingToken).toBeDefined();
		expect(headingToken.type).toBe('heading');
		expect(headingToken.depth).toBe(2);
		expect(headingToken.text).toBe('Section Title');
		expect(headingToken.raw).toBe('Section Title\n-------------');
		expect(headingToken.tokens).toBeDefined();
	});

	test('should parse heading with formatting inside and verify nested tokens', () => {
		const tokens = lex('# **Bold** and *Italic* Title');
		const headingToken = getFirstTokenByType(tokens, 'heading');

		expect(headingToken).toBeDefined();
		expect(headingToken.depth).toBe(1);
		expect(headingToken.tokens).toBeDefined();

		const headingTokens = headingToken.tokens || [];
		const strongTokens = headingTokens.filter((t: { type: string }) => t.type === 'strong');
		const emTokens = headingTokens.filter((t: { type: string }) => t.type === 'em');

		expect(strongTokens.length).toBe(1);
		expect(strongTokens[0].text).toBe('Bold');
		expect(emTokens.length).toBe(1);
		expect(emTokens[0].text).toBe('Italic');
	});

	test('should parse heading with code inside and verify codespan token', () => {
		const tokens = lex('## Using `console.log()` Function');
		const headingToken = getFirstTokenByType(tokens, 'heading');

		expect(headingToken).toBeDefined();
		expect(headingToken.depth).toBe(2);

		const headingTokens = headingToken.tokens || [];
		const codespanTokens = headingTokens.filter((t: { type: string }) => t.type === 'codespan');

		expect(codespanTokens.length).toBe(1);
		expect(codespanTokens[0].text).toBe('console.log()');
		expect(codespanTokens[0].raw).toBe('`console.log()`');
	});

	test('should parse heading with links inside and verify link token properties', () => {
		const tokens = lex('### See [Documentation](https://example.com)');
		const headingToken = getFirstTokenByType(tokens, 'heading');

		expect(headingToken).toBeDefined();
		expect(headingToken.depth).toBe(3);

		const headingTokens = headingToken.tokens || [];
		const linkTokens = headingTokens.filter((t: { type: string }) => t.type === 'link');

		expect(linkTokens.length).toBe(1);
		expect(linkTokens[0].href).toBe('https://example.com');
		expect(linkTokens[0].text).toBe('Documentation');
		expect(linkTokens[0].title).toBeNull();
		expect(linkTokens[0].tokens).toBeDefined();
	});

	test('should not parse heading without space after # (edge case)', () => {
		const tokens = lex('#NotAHeading');
		const headingTokens = getTokensByType(tokens, 'heading');

		expect(headingTokens.length).toBe(0);

		// Should be parsed as a paragraph instead
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');
		expect(paragraphToken).toBeDefined();
		expect(paragraphToken.text).toBe('#NotAHeading');
	});

	test('should handle heading with closing hashes (edge case)', () => {
		const tokens = lex('### Title ###');
		const headingToken = getFirstTokenByType(tokens, 'heading');

		expect(headingToken).toBeDefined();
		expect(headingToken.depth).toBe(3);
		expect(headingToken.text).toBe('Title');
		expect(headingToken.raw).toBe('### Title ###');
	});

	test('should handle heading with trailing spaces (edge case)', () => {
		const tokens = lex('## Title with spaces   ');
		const headingToken = getFirstTokenByType(tokens, 'heading');

		expect(headingToken).toBeDefined();
		expect(headingToken.depth).toBe(2);
		expect(headingToken.text).toBe('Title with spaces');
	});

	test('should parse multiple headings in sequence', () => {
		const tokens = lex('# Title\n## Section\n### Subsection');
		const headingTokens = getTokensByType(tokens, 'heading');

		expect(headingTokens.length).toBe(3);
		expect(headingTokens[0].depth).toBe(1);
		expect(headingTokens[0].text).toBe('Title');
		expect(headingTokens[1].depth).toBe(2);
		expect(headingTokens[1].text).toBe('Section');
		expect(headingTokens[2].depth).toBe(3);
		expect(headingTokens[2].text).toBe('Subsection');
	});

	test('should handle heading with special characters and emojis', () => {
		const tokens = lex('# 🚀 API & SDK @ Version 2.0!');
		const headingToken = getFirstTokenByType(tokens, 'heading');

		expect(headingToken).toBeDefined();
		expect(headingToken.depth).toBe(1);
		expect(headingToken.text).toBe('🚀 API & SDK @ Version 2.0!');
	});
});

describe('incomplete markdown', () => {
	test('should complete basic incomplete formatting in headings', () => {
		const input = '# Title with **bold and *italic';
		const result = parseIncompleteMarkdown(input);

		// Should complete formatting at end of line
		expect(result).toBe('# Title with **bold and *italic***');
	});

	test('should handle line breaks with incomplete formatting in headings', () => {
		const input = '## Section with **bold\n### Subsection with *italic';
		const result = parseIncompleteMarkdown(input);

		// Should complete formatting at end of lines
		expect(result).toBe('## Section with **bold**\n### Subsection with *italic*');
	});

	test('should handle different heading levels with incomplete formatting', () => {
		const input = '# H1 with **bold\n## H2 with *italic\n### H3 with `code';
		const result = parseIncompleteMarkdown(input);

		// Should complete at end of lines
		expect(result).toBe('# H1 with **bold**\n## H2 with *italic*\n### H3 with `code`');
	});

	test('should handle incomplete links and images in headings', () => {
		const input = '#### Heading with [link';
		const result = parseIncompleteMarkdown(input);

		// Should complete with incomplete markers
		expect(result).toBe('#### Heading with [link](streamdown:incomplete-link)');
	});
});
