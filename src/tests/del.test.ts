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
	test('should parse simple strikethrough text with double tildes and verify all properties', () => {
		const tokens = lex('This is ~~strikethrough~~ text.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		expect(paragraphToken.tokens).toBeDefined();

		const paragraphTokens = paragraphToken.tokens || [];
		const delTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'del');

		expect(delTokens.length).toBe(1);
		expect(delTokens[0].type).toBe('del');
		expect(delTokens[0].text).toBe('strikethrough');
		expect(delTokens[0].raw).toBe('~~strikethrough~~');
		expect(delTokens[0].tokens).toBeDefined();
	});

	test('should parse multiple strikethrough texts in same paragraph', () => {
		const tokens = lex('This has ~~first strike~~ and ~~second strike~~ text.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const delTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'del');

		expect(delTokens.length).toBe(2);
		expect(delTokens[0].text).toBe('first strike');
		expect(delTokens[0].raw).toBe('~~first strike~~');
		expect(delTokens[1].text).toBe('second strike');
		expect(delTokens[1].raw).toBe('~~second strike~~');
	});

	test('should parse strikethrough text with nested formatting', () => {
		const tokens = lex('This is ~~strike with **bold** inside~~ text.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const delTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'del');

		expect(delTokens.length).toBe(1);
		expect(delTokens[0].tokens).toBeDefined();

		const delNestedTokens = delTokens[0].tokens || [];
		const strongTokens = delNestedTokens.filter((t: { type: string }) => t.type === 'strong');

		expect(strongTokens.length).toBe(1);
		expect(strongTokens[0].text).toBe('bold');
	});

	test('should parse strikethrough text with code spans inside', () => {
		const tokens = lex('This is ~~strike with `code` inside~~ text.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const delTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'del');

		expect(delTokens.length).toBe(1);
		expect(delTokens[0].tokens).toBeDefined();

		const delNestedTokens = delTokens[0].tokens || [];
		const codespanTokens = delNestedTokens.filter((t: { type: string }) => t.type === 'codespan');

		expect(codespanTokens.length).toBe(1);
		expect(codespanTokens[0].text).toBe('code');
	});

	test('should parse strikethrough text in heading', () => {
		const tokens = lex('# Heading with ~~strikethrough~~ text');
		const headingToken = getFirstTokenByType(tokens, 'heading');

		expect(headingToken).toBeDefined();
		expect(headingToken.tokens).toBeDefined();

		const headingTokens = headingToken.tokens || [];
		const delTokens = headingTokens.filter((t: { type: string }) => t.type === 'del');

		expect(delTokens.length).toBe(1);
		expect(delTokens[0].text).toBe('strikethrough');
	});

	test('should parse strikethrough text in blockquote', () => {
		const tokens = lex('> Quote with ~~strikethrough~~ text');
		const blockquoteToken = getFirstTokenByType(tokens, 'blockquote');

		expect(blockquoteToken).toBeDefined();
		const nestedTokens = blockquoteToken.tokens || [];
		const paragraphToken = nestedTokens.find((t: any) => t.type === 'paragraph');
		expect(paragraphToken).toBeDefined();

		const paragraphTokens = paragraphToken.tokens || [];
		const delTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'del');

		expect(delTokens.length).toBe(1);
		expect(delTokens[0].text).toBe('strikethrough');
	});

	test('should parse strikethrough text in list item', () => {
		const tokens = lex('- Item with ~~strikethrough~~ text');
		const listToken = getFirstTokenByType(tokens, 'list');

		expect(listToken).toBeDefined();
		expect(listToken.tokens.length).toBe(1);

		const listItemTokens = listToken.tokens[0].tokens || [];
		const paragraphToken = listItemTokens.find((t: any) => t.type === 'text');
		expect(paragraphToken).toBeDefined();

		const paragraphTokens = paragraphToken.tokens || [];
		const delTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'del');

		expect(delTokens.length).toBe(1);
		expect(delTokens[0].text).toBe('strikethrough');
	});

	test('should parse strikethrough text in table cell', () => {
		const tokens = lex('| ~~Strike~~ | Normal |\n|------------|--------|\n| Cell       | Text   |');
		const tableToken = getFirstTokenByType(tokens, 'table');

		expect(tableToken).toBeDefined();
		const tableHeader = tableToken.tokens.find((t: any) => t.type === 'thead');
		expect(tableHeader).toBeDefined();
		expect(tableHeader.tokens).toBeDefined();
		const delTokens = tableHeader.tokens[0].tokens[0].tokens.filter(
			(t: { type: string }) => t.type === 'del'
		);

		expect(delTokens.length).toBe(1);
		expect(delTokens[0].text).toBe('Strike');
	});

	test('should parse strikethrough text with links inside', () => {
		const tokens = lex('This is ~~strike with [link](https://example.com) inside~~ text.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const delTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'del');

		expect(delTokens.length).toBe(1);
		expect(delTokens[0].tokens).toBeDefined();

		const delNestedTokens = delTokens[0].tokens || [];
		const linkTokens = delNestedTokens.filter((t: { type: string }) => t.type === 'link');

		expect(linkTokens.length).toBe(1);
		expect(linkTokens[0].href).toBe('https://example.com');
		expect(linkTokens[0].text).toBe('link');
	});

	test('should parse strikethrough text with special characters', () => {
		const tokens = lex('This is ~~strike & < > " \' text~~ here.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const delTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'del');

		expect(delTokens.length).toBe(1);
		expect(delTokens[0].text).toBe('strike & < > " \' text');
	});

	test('should parse strikethrough text with numbers and symbols', () => {
		const tokens = lex('Version ~~1.0.0~~ is deprecated.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const delTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'del');

		expect(delTokens.length).toBe(1);
		expect(delTokens[0].text).toBe('1.0.0');
	});

	test('should handle strikethrough text at start of paragraph', () => {
		const tokens = lex('~~Strike start~~ of paragraph.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const delTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'del');

		expect(delTokens.length).toBe(1);
		expect(delTokens[0].text).toBe('Strike start');
	});

	test('should handle strikethrough text at end of paragraph', () => {
		const tokens = lex('End with ~~strikethrough text~~.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const delTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'del');

		expect(delTokens.length).toBe(1);
		expect(delTokens[0].text).toBe('strikethrough text');
	});

	test('should handle strikethrough text spanning multiple words', () => {
		const tokens = lex('This is ~~very long strikethrough text~~ here.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const delTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'del');

		expect(delTokens.length).toBe(1);
		expect(delTokens[0].text).toBe('very long strikethrough text');
	});

	test('should not parse single tildes as strikethrough (edge case)', () => {
		const tokens = lex('This is ~not strikethrough~ text.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const delTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'del');

		// Should not create del tokens for single tildes
		expect(delTokens.length).toBe(0);
	});

	test('should handle strikethrough with emphasis and strong formatting', () => {
		const tokens = lex('This is ~~strike with **bold** and *italic*~~ text.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const delTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'del');

		expect(delTokens.length).toBe(1);
		expect(delTokens[0].tokens).toBeDefined();

		const delNestedTokens = delTokens[0].tokens || [];
		const strongTokens = delNestedTokens.filter((t: { type: string }) => t.type === 'strong');
		const emTokens = delNestedTokens.filter((t: { type: string }) => t.type === 'em');

		expect(strongTokens.length).toBe(1);
		expect(emTokens.length).toBe(1);
	});

	test('should handle empty strikethrough text (edge case)', () => {
		const tokens = lex('This has ~~~~ empty strikethrough.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const delTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'del');

		// Behavior may vary - either no del token or empty del token
		if (delTokens.length > 0) {
			expect(delTokens[0].text).toBe('');
		}
	});

	test('should handle strikethrough text with line breaks inside', () => {
		const tokens = lex('This is ~~strike\nwith line break~~ text.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const delTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'del');

		expect(delTokens.length).toBe(1);
		expect(delTokens[0].text).toBe('strike\nwith line break');
	});

	test('should handle strikethrough in task list items', () => {
		const tokens = lex('- [x] ~~Completed~~ task\n- [ ] Active task');
		const listToken = getFirstTokenByType(tokens, 'list');

		expect(listToken).toBeDefined();
		expect(listToken.tokens.length).toBe(2);

		const firstItemTokens = listToken.tokens[0].tokens || [];
		const paragraphToken = firstItemTokens.find((t: any) => t.type === 'text');
		expect(paragraphToken).toBeDefined();

		const paragraphTokens = paragraphToken.tokens || [];
		const delTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'del');

		expect(delTokens.length).toBe(1);
		expect(delTokens[0].text).toBe('Completed');
	});

	test('should handle strikethrough with subscript and superscript', () => {
		const tokens = lex('Formula ~~H~2~O and E = mc^2^~~ is crossed out.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const delTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'del');

		expect(delTokens.length).toBe(1);
		expect(delTokens[0].tokens).toBeDefined();

		const delNestedTokens = delTokens[0].tokens || [];
		const subTokens = delNestedTokens.filter((t: { type: string }) => t.type === 'sub');
		const supTokens = delNestedTokens.filter((t: { type: string }) => t.type === 'sup');

		expect(subTokens.length).toBe(1);
		expect(supTokens.length).toBe(1);
	});
});

describe('incomplete markdown', () => {
	test('should complete basic incomplete strikethrough formatting', () => {
		const input = 'This text has ~~strikethrough and ~~another';
		const result = parseIncompleteMarkdown(input);

		// Should complete incomplete strikethrough at end of string
		expect(result).toBe('This text has ~~strikethrough and ~~another');
	});

	test('should handle line breaks with incomplete strikethrough', () => {
		const input = 'First line with ~~strikethrough\nSecond line with ~~another';
		const result = parseIncompleteMarkdown(input);

		// Should complete formatting at end of entire string
		expect(result).toBe('First line with ~~strikethrough\nSecond line with ~~another');
	});

	test('should handle strikethrough in different contexts', () => {
		const input = '# Heading with ~~strikethrough\n\n> Blockquote with ~~another';
		const result = parseIncompleteMarkdown(input);

		// Should complete strikethrough at end of entire string
		expect(result).toBe('# Heading with ~~strikethrough\n\n> Blockquote with ~~another');
	});
});
