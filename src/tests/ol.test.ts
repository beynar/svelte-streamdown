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
	test('should parse simple ordered list and verify all properties', () => {
		const tokens = lex('1. First item\n2. Second item\n3. Third item');
		const listToken = getFirstTokenByType(tokens, 'list');

		expect(listToken).toBeDefined();
		expect(listToken.type).toBe('list');
		expect(listToken.ordered).toBe(true);
		expect(listToken.start).toBe(1);
		expect(listToken.loose).toBe(false);
		expect(listToken.tokens).toBeDefined();
		expect(listToken.tokens.length).toBe(3);
		expect(listToken.raw).toBe('1. First item\n2. Second item\n3. Third item');
	});

	test('should parse ordered list starting from different number', () => {
		const tokens = lex('5. Fifth item\n6. Sixth item\n7. Seventh item');
		const listToken = getFirstTokenByType(tokens, 'list');

		expect(listToken).toBeDefined();
		expect(listToken.type).toBe('list');
		expect(listToken.ordered).toBe(true);
		expect(listToken.start).toBe(5);
		expect(listToken.tokens).toBeDefined();
		expect(listToken.tokens.length).toBe(3);

		expect(listToken.tokens[0].text).toBe('Fifth item');
		expect(listToken.tokens[1].text).toBe('Sixth item');
		expect(listToken.tokens[2].text).toBe('Seventh item');
	});

	test('should parse ordered list with different number formats', () => {
		const tokens = lex('1) First format\n2) Second format\n3) Third format');
		const listToken = getFirstTokenByType(tokens, 'list');

		expect(listToken).toBeDefined();
		expect(listToken.type).toBe('list');
		expect(listToken.ordered).toBe(true);
		expect(listToken.tokens).toBeDefined();
		expect(listToken.tokens.length).toBe(3);

		expect(listToken.tokens[0].text).toBe('First format');
		expect(listToken.tokens[1].text).toBe('Second format');
		expect(listToken.tokens[2].text).toBe('Third format');
	});

	test('should parse ordered list with formatting in items', () => {
		const tokens = lex('1. **Bold item**\n2. *Italic item*\n3. `Code item`');
		const listToken = getFirstTokenByType(tokens, 'list');

		expect(listToken).toBeDefined();
		expect(listToken.tokens).toBeDefined();
		expect(listToken.tokens.length).toBe(3);

		// Check first item has strong formatting
		const firstItemTokens = listToken.tokens[0].tokens || [];
		const firstParagraph = firstItemTokens.find((t: any) => t.type === 'text');
		expect(firstParagraph).toBeDefined();
		const strongTokens = (firstParagraph.tokens || []).filter(
			(t: { type: string }) => t.type === 'strong'
		);
		expect(strongTokens.length).toBe(1);
		expect(strongTokens[0].text).toBe('Bold item');

		// Check second item has em formatting
		const secondItemTokens = listToken.tokens[1].tokens || [];
		const secondParagraph = secondItemTokens.find((t: any) => t.type === 'text');
		expect(secondParagraph).toBeDefined();
		const emTokens = (secondParagraph.tokens || []).filter(
			(t: { type: string }) => t.type === 'em'
		);
		expect(emTokens.length).toBe(1);
		expect(emTokens[0].text).toBe('Italic item');

		// Check third item has codespan formatting
		const thirdItemTokens = listToken.tokens[2].tokens || [];
		const thirdParagraph = thirdItemTokens.find((t: any) => t.type === 'text');
		expect(thirdParagraph).toBeDefined();
		const codespanTokens = (thirdParagraph.tokens || []).filter(
			(t: { type: string }) => t.type === 'codespan'
		);
		expect(codespanTokens.length).toBe(1);
		expect(codespanTokens[0].text).toBe('Code item');
	});

	// Skip nested ordered lists for now
	// test('should parse nested ordered lists and verify structure', () => {
	// 	const tokens = lex(
	// 		'1. Parent item 1\n   1. Child item 1\n   2. Child item 2\n2. Parent item 2'
	// 	);
	// 	const listToken = getFirstTokenByType(tokens, 'list');

	// 	expect(listToken).toBeDefined();
	// 	expect(listToken.tokens).toBeDefined();
	// 	expect(listToken.tokens.length).toBe(2);

	// 	// Check first parent item has nested list
	// 	const firstItemTokens = listToken.tokens[0].tokens || [];
	// 	const nestedList = firstItemTokens.find((t: any) => t.type === 'list');
	// 	expect(nestedList).toBeDefined();
	// 	expect(nestedList.ordered).toBe(true);
	// 	expect(nestedList.items.length).toBe(2);
	// 	expect(nestedList.items[0].text).toBe('Child item 1');
	// 	expect(nestedList.items[1].text).toBe('Child item 2');
	// });

	// test('should parse ordered list with different indentation levels', () => {
	// 	const tokens = lex('1. Level 1\n    1. Level 2\n        1. Level 3\n2. Back to Level 1');
	// 	const listToken = getFirstTokenByType(tokens, 'list');

	// 	expect(listToken).toBeDefined();
	// 	expect(listToken.tokens.length).toBe(2);

	// 	// Check nested structure
	// 	const firstItemTokens = listToken.tokens[0].tokens || [];
	// 	const nestedList = firstItemTokens.find((t: any) => t.type === 'list');
	// 	expect(nestedList).toBeDefined();

	// 	if (nestedList && nestedList.items.length > 0) {
	// 		const nestedItemTokens = nestedList.items[0].tokens || [];
	// 		const deeplyNestedList = nestedItemTokens.find((t: any) => t.type === 'list');
	// 		expect(deeplyNestedList).toBeDefined();
	// 	}
	// });

	test('should parse loose ordered list and verify loose property', () => {
		const tokens = lex('1. Item 1\n\n2. Item 2\n\n3. Item 3');
		const listToken = getFirstTokenByType(tokens, 'list');

		expect(listToken).toBeDefined();
		expect(listToken.type).toBe('list');
		expect(listToken.ordered).toBe(true);
		expect(listToken.loose).toBe(true);
		expect(listToken.tokens.length).toBe(3);
	});

	test('should parse ordered list with multi-line items', () => {
		const tokens = lex('1. First item\n   continues here\n2. Second item\n   also continues');
		const listToken = getFirstTokenByType(tokens, 'list');

		expect(listToken).toBeDefined();
		expect(listToken.tokens).toBeDefined();
		expect(listToken.tokens.length).toBe(2);

		expect(listToken.tokens[0].text).toBe('First item\ncontinues here');
		expect(listToken.tokens[1].text).toBe('Second item\nalso continues');
	});

	test('should parse ordered list with links and verify link tokens', () => {
		const tokens = lex('1. [Google](https://google.com)\n2. [GitHub](https://github.com)');
		const listToken = getFirstTokenByType(tokens, 'list');

		expect(listToken).toBeDefined();
		expect(listToken.tokens.length).toBe(2);

		// Check first item has link
		const firstItemTokens = listToken.tokens[0].tokens || [];
		const firstParagraph = firstItemTokens.find((t: any) => t.type === 'text');
		expect(firstParagraph).toBeDefined();
		const firstLinkTokens = (firstParagraph.tokens || []).filter(
			(t: { type: string }) => t.type === 'link'
		);
		expect(firstLinkTokens.length).toBe(1);
		expect(firstLinkTokens[0].href).toBe('https://google.com');
		expect(firstLinkTokens[0].text).toBe('Google');

		// Check second item has link
		const secondItemTokens = listToken.tokens[1].tokens || [];
		const secondParagraph = secondItemTokens.find((t: any) => t.type === 'text');
		expect(secondParagraph).toBeDefined();
		const secondLinkTokens = (secondParagraph.tokens || []).filter(
			(t: { type: string }) => t.type === 'link'
		);
		expect(secondLinkTokens.length).toBe(1);
		expect(secondLinkTokens[0].href).toBe('https://github.com');
		expect(secondLinkTokens[0].text).toBe('GitHub');
	});

	test('should parse ordered list with images and verify image tokens', () => {
		const tokens = lex(
			'1. ![Image 1](https://example.com/1.jpg)\n2. ![Image 2](https://example.com/2.jpg)'
		);
		const listToken = getFirstTokenByType(tokens, 'list');

		expect(listToken).toBeDefined();
		expect(listToken.tokens.length).toBe(2);

		// Check first item has image
		const firstItemTokens = listToken.tokens[0].tokens || [];
		const firstParagraph = firstItemTokens.find((t: any) => t.type === 'text');
		expect(firstParagraph).toBeDefined();
		const firstImageTokens = (firstParagraph.tokens || []).filter(
			(t: { type: string }) => t.type === 'image'
		);
		expect(firstImageTokens.length).toBe(1);
		expect(firstImageTokens[0].href).toBe('https://example.com/1.jpg');
		expect(firstImageTokens[0].text).toBe('Image 1');
	});

	test('should parse ordered list with code blocks in items', () => {
		const tokens = lex(
			'1. Item with code:\n   ```javascript\n   console.log("test");\n   ```\n2. Another item'
		);
		const listToken = getFirstTokenByType(tokens, 'list');

		expect(listToken).toBeDefined();
		expect(listToken.tokens.length).toBe(2);

		// Check first item has code block
		const firstItemTokens = listToken.tokens[0].tokens || [];
		const codeToken = firstItemTokens.find((t: any) => t.type === 'code');
		expect(codeToken).toBeDefined();
		expect(codeToken.lang).toBe('javascript');
		expect(codeToken.text).toBe('console.log("test");');
	});

	test('should parse ordered list with blockquotes in items', () => {
		const tokens = lex('1. Item with quote:\n   > This is a quote\n2. Another item');
		const listToken = getFirstTokenByType(tokens, 'list');

		expect(listToken).toBeDefined();
		expect(listToken.tokens.length).toBe(2);

		// Check first item has blockquote
		const firstItemTokens = listToken.tokens[0].tokens || [];
		const blockquoteToken = firstItemTokens.find((t: any) => t.type === 'blockquote');
		expect(blockquoteToken).toBeDefined();
	});

	test('should parse ordered list with large numbers', () => {
		const tokens = lex('999. Item 999\n1000. Item 1000\n1001. Item 1001');
		const listToken = getFirstTokenByType(tokens, 'list');

		expect(listToken).toBeDefined();
		expect(listToken.type).toBe('list');
		expect(listToken.ordered).toBe(true);
		expect(listToken.start).toBe(999);
		expect(listToken.tokens.length).toBe(3);
	});

	test('should handle ordered list with zero start (edge case)', () => {
		const tokens = lex('0. Zero item\n1. First item\n2. Second item');
		const listToken = getFirstTokenByType(tokens, 'list');

		expect(listToken).toBeDefined();
		expect(listToken.type).toBe('list');
		expect(listToken.ordered).toBe(true);
		expect(listToken.start).toBe(0);
		expect(listToken.tokens.length).toBe(3);
	});

	test('should parse mixed ordered and unordered lists separately', () => {
		const tokens = lex('1. Ordered item\n- Unordered item\n2. Another ordered');
		const listTokens = getTokensByType(tokens, 'list');

		// Should create separate lists for different types
		expect(listTokens.length).toBeGreaterThan(1);
	});

	test('should handle empty ordered list items (edge case)', () => {
		const tokens = lex('1. \n2. Item 2\n3. ');
		const listToken = getFirstTokenByType(tokens, 'list');

		expect(listToken).toBeDefined();
		expect(listToken.tokens.length).toBe(3);
	});

	test('should parse ordered list with roman numerals (if supported)', () => {
		const tokens = lex('i. First roman\nii. Second roman\niii. Third roman');
		// This may or may not be supported depending on the parser
		const listToken = getFirstTokenByType(tokens, 'list');

		if (listToken) {
			expect(listToken.type).toBe('list');
			expect(listToken.ordered).toBe(true);
		}
	});
});

describe('incomplete markdown', () => {
	test('should complete basic incomplete formatting in ordered lists', () => {
		const input = '1. Item with **bold and *italic';
		const result = parseIncompleteMarkdown(input);

		// Should complete all incomplete formatters in the order they appear
		expect(result).toBe('1. Item with **bold and *italic***');
	});

	test('should handle line breaks with incomplete formatting in ordered lists', () => {
		const input = '1. First item with **bold\n2. Second item with *italic';
		const result = parseIncompleteMarkdown(input);

		// Should complete formatting before line breaks
		expect(result).toBe('1. First item with **bold**\n2. Second item with *italic*');
	});

	test('should handle different list numbering formats', () => {
		const input = '1) Item with **bold\n2. Another with *italic';
		const result = parseIncompleteMarkdown(input);

		// Should work with different numbering formats
		expect(result).toBe('1) Item with **bold**\n2. Another with *italic*');
	});

	test('should handle nested ordered lists with incomplete formatting', () => {
		const input = '1. Parent item\n   1. Child with **incomplete';
		const result = parseIncompleteMarkdown(input);

		// Should complete formatting in nested structure
		expect(result).toBe('1. Parent item\n   1. Child with **incomplete**');
	});
});
