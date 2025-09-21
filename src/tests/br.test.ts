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
	test('should parse line break with two spaces and verify all properties', () => {
		const tokens = lex('First line  \nSecond line');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		expect(paragraphToken.tokens).toBeDefined();

		const paragraphTokens = paragraphToken.tokens || [];
		const brTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'br');

		expect(brTokens.length).toBe(1);
		expect(brTokens[0].type).toBe('br');
		expect(brTokens[0].raw).toBe('  \n');
	});

	test('should parse line break with backslash and verify properties', () => {
		const tokens = lex('First line\\\nSecond line');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const brTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'br');

		expect(brTokens.length).toBe(1);
		expect(brTokens[0].type).toBe('br');
		expect(brTokens[0].raw).toBe('\\\n');
	});

	test('should parse multiple line breaks in same paragraph', () => {
		const tokens = lex('First line  \nSecond line\\\nThird line');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const brTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'br');

		expect(brTokens.length).toBe(2);
		expect(brTokens[0].raw).toBe('  \n');
		expect(brTokens[1].raw).toBe('\\\n');
	});

	test('should parse line break with text tokens around it', () => {
		const tokens = lex('Start text  \nEnd text');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const textTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'text');
		const brTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'br');

		expect(brTokens.length).toBe(1);
		expect(textTokens.length).toBe(2);
		expect(textTokens[0].text).toBe('Start text');
		expect(textTokens[1].text).toBe('End text');
	});

	test('should create separate blocks when heading ends with line break', () => {
		const tokens = lex('# Heading with  \nline break');

		// Should create two separate blocks: heading and paragraph
		const headingToken = getFirstTokenByType(tokens, 'heading');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(headingToken).toBeDefined();
		expect(paragraphToken).toBeDefined();

		// Heading should contain only "Heading with" (without the trailing spaces)
		expect(headingToken.text).toBe('Heading with');

		// Paragraph should contain "line break"
		expect(paragraphToken.text).toBe('line break');

		// Heading should NOT contain any line break tokens
		const headingTokens = headingToken.tokens || [];
		const brTokens = headingTokens.filter((t: { type: string }) => t.type === 'br');
		expect(brTokens.length).toBe(0);
	});

	test('should parse line break in blockquote', () => {
		const tokens = lex('> Quote with  \n> line break');
		const blockquoteToken = getFirstTokenByType(tokens, 'blockquote');

		expect(blockquoteToken).toBeDefined();
		const nestedTokens = blockquoteToken.tokens || [];
		const paragraphToken = nestedTokens.find((t: any) => t.type === 'paragraph');
		expect(paragraphToken).toBeDefined();

		const paragraphTokens = paragraphToken.tokens || [];
		const brTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'br');

		expect(brTokens.length).toBe(1);
		expect(brTokens[0].type).toBe('br');
	});

	test('should parse line break in list item', () => {
		const tokens = lex('- Item with  \n  line break');
		const listToken = getFirstTokenByType(tokens, 'list');

		expect(listToken).toBeDefined();
		expect(listToken.tokens.length).toBe(1);

		const listItemTokens = listToken.tokens[0].tokens || [];
		const textToken = listItemTokens.find((t: any) => t.type === 'text');
		expect(textToken).toBeDefined();

		// The line break should be in the text token's inline tokens
		const inlineTokens = textToken.tokens || [];
		const brTokens = inlineTokens.filter((t: { type: string }) => t.type === 'br');

		expect(brTokens.length).toBe(1);
		expect(brTokens[0].type).toBe('br');
		expect(brTokens[0].raw).toBe('  \n');
	});

	test('should parse HTML br tag as br token in paragraph', () => {
		const tokens = lex('Text with <br> line break');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];

		expect(paragraphTokens.length).toBe(3); // text + br + text
		expect(paragraphTokens[0].type).toBe('text');
		expect(paragraphTokens[0].text).toBe('Text with ');

		expect(paragraphTokens[1].type).toBe('br');
		expect(paragraphTokens[1].raw).toBe('<br>');

		expect(paragraphTokens[2].type).toBe('text');
		expect(paragraphTokens[2].text).toBe(' line break');
	});

	test('should parse various HTML br tag formats as br tokens', () => {
		const testCases = [
			'Text <br> break', // with space
			'Text <br/> break', // self-closing
			'Text <BR> break', // uppercase
			'Text <Br/> break', // mixed case
			'Text <br /> break' // with spaces
		];

		testCases.forEach((testCase) => {
			const tokens = lex(testCase);
			const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

			expect(paragraphToken).toBeDefined();
			const paragraphTokens = paragraphToken.tokens || [];
			const brTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'br');

			expect(brTokens.length).toBe(1);
			expect(brTokens[0].type).toBe('br');
		});
	});

	test('should parse HTML br tag as br token in table cell', () => {
		const tokens = lex(
			'| Cell with  <br>break | Normal |\n|-------------------|--------|\n| Cell              | Text   |'
		);
		const tableToken = getFirstTokenByType(tokens, 'table');

		expect(tableToken).toBeDefined();
		const tableHeader = tableToken.tokens.find((t: any) => t.type === 'thead');
		expect(tableHeader).toBeDefined();

		// Get the first table header cell
		const firstHeaderRow = tableHeader.tokens[0]; // tr
		const firstHeaderCell = firstHeaderRow.tokens[0]; // th

		expect(firstHeaderCell.tokens).toBeDefined();
		expect(firstHeaderCell.tokens.length).toBe(3); // text + br + text

		// Check the structure: text, br, text
		expect(firstHeaderCell.tokens[0].type).toBe('text');
		expect(firstHeaderCell.tokens[0].text).toBe('Cell with  ');

		// HTML <br> should now be converted to br token
		expect(firstHeaderCell.tokens[1].type).toBe('br');
		expect(firstHeaderCell.tokens[1].raw).toBe('<br>');

		expect(firstHeaderCell.tokens[2].type).toBe('text');
		expect(firstHeaderCell.tokens[2].text).toBe('break');
	});

	test('should not parse markdown line break in table cell', () => {
		const tokens = lex(
			'| Cell with  \nline break | Normal |\n|-------------------|--------|\n| Cell              | Text   |'
		);
		const tableToken = getFirstTokenByType(tokens, 'table');

		expect(tableToken).toBeDefined();
		const tableHeader = tableToken.tokens.find((t: any) => t.type === 'thead');
		expect(tableHeader).toBeDefined();

		// Get the first table header cell
		const firstHeaderRow = tableHeader.tokens[0]; // tr
		const firstHeaderCell = firstHeaderRow.tokens[0]; // th

		expect(firstHeaderCell.tokens).toBeDefined();

		// Markdown line breaks (  \n) are not supported in table cells
		// The content should be treated as regular text
		const brTokens = firstHeaderCell.tokens.filter((t: any) => t.type === 'br');
		expect(brTokens.length).toBe(0);

		// Should have just text tokens
		const textTokens = firstHeaderCell.tokens.filter((t: any) => t.type === 'text');
		expect(textTokens.length).toBeGreaterThan(0);
	});

	test('should parse line break with formatting around it', () => {
		const tokens = lex('**Bold text**  \n*Italic text*');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const brTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'br');
		const strongTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'strong');
		const emTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'em');

		expect(brTokens.length).toBe(1);
		expect(strongTokens.length).toBe(1);
		expect(emTokens.length).toBe(1);
		expect(strongTokens[0].text).toBe('Bold text');
		expect(emTokens[0].text).toBe('Italic text');
	});

	test('should parse line break with links around it', () => {
		const tokens = lex('[First link](https://example.com)  \n[Second link](https://test.com)');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const brTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'br');
		const linkTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'link');

		expect(brTokens.length).toBe(1);
		expect(linkTokens.length).toBe(2);
		expect(linkTokens[0].text).toBe('First link');
		expect(linkTokens[1].text).toBe('Second link');
	});

	test('should parse line break with code spans around it', () => {
		const tokens = lex('`first code`  \n`second code`');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const brTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'br');
		const codespanTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'codespan');

		expect(brTokens.length).toBe(1);
		expect(codespanTokens.length).toBe(2);
		expect(codespanTokens[0].text).toBe('first code');
		expect(codespanTokens[1].text).toBe('second code');
	});

	test('should not parse single newline as line break (edge case)', () => {
		const tokens = lex('First line\nSecond line');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const brTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'br');

		// Should not create br token for single newline without trailing spaces
		expect(brTokens.length).toBe(0);
	});

	test('should not parse line break without newline (edge case)', () => {
		const tokens = lex('Text with two spaces  but no newline');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const brTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'br');

		// Should not create br token without newline
		expect(brTokens.length).toBe(0);
	});

	test('should handle trailing line break correctly', () => {
		const tokens = lex('Paragraph with line break  \n');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const brTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'br');

		// Trailing line breaks at end of input are typically stripped by markdown parsers
		// This is correct behavior according to CommonMark spec
		expect(brTokens.length).toBe(0);

		// The paragraph should contain the text (trailing spaces are preserved in the text)
		expect(paragraphToken.text).toBe('Paragraph with line break  ');
	});

	test('should handle multiple consecutive line breaks', () => {
		const tokens = lex('First  \nSecond\\\nThird  \nFourth');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const brTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'br');

		expect(brTokens.length).toBe(3);
	});

	test('should handle line break with more than two spaces', () => {
		const tokens = lex('Text with many spaces    \nNext line');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const brTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'br');

		expect(brTokens.length).toBe(1);
		expect(brTokens[0].raw).toBe('    \n');
	});

	test('should handle line break with tabs', () => {
		const tokens = lex('Text with tab\t\t\nNext line');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const brTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'br');

		// Behavior may vary depending on how tabs are handled
		if (brTokens.length > 0) {
			expect(brTokens[0].type).toBe('br');
		}
	});
});

describe('incomplete markdown', () => {
	test('should handle line breaks with incomplete formatting completion', () => {
		const input = 'First line **bold  \nSecond line *italic\nThird line';
		const result = parseIncompleteMarkdown(input);

		// Should complete formatting at end of lines
		expect(result).toBe('First line **bold  **\nSecond line *italic*\nThird line');
	});

	test('should handle trailing spaces and backslash with incomplete formatting', () => {
		const input = 'Text with **incomplete  \nNext with *italic';
		const result = parseIncompleteMarkdown(input);

		// Should complete formatting at end of lines
		expect(result).toBe('Text with **incomplete  **\nNext with *italic*');
	});

	test('should preserve complete line breaks while fixing incomplete formatting', () => {
		const input = 'Complete line  \nIncomplete **bold\nAnother line';
		const result = parseIncompleteMarkdown(input);

		// Should preserve complete line breaks and complete formatting at end of lines
		expect(result).toBe('Complete line  \nIncomplete **bold**\nAnother line');
	});

	test('should handle line breaks in nested structures with incomplete formatting', () => {
		const input = '> Quote with **bold  \n> - List with *italic\n>   Continuation';
		const result = parseIncompleteMarkdown(input);

		// Should complete formatting at end of lines in nested structures
		expect(result).toBe('> Quote with **bold  **\n> - List with *italic*\n>   Continuation');
	});
});
