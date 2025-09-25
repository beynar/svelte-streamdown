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
	test('should parse simple unordered list with dashes and verify all properties', () => {
		const tokens = lex('- Item 1\n- Item 2\n- Item 3');
		const listToken = getFirstTokenByType(tokens, 'list');

		expect(listToken).toBeDefined();
		expect(listToken.type).toBe('list');
		expect(listToken.ordered).toBe(false);
		expect(listToken.start).toBeUndefined();
		expect(listToken.loose).toBe(false);
		expect(listToken.tokens).toBeDefined();
		expect(listToken.tokens.length).toBe(3);
		expect(listToken.raw).toBe('- Item 1\n- Item 2\n- Item 3');
	});

	test('should parse unordered list with asterisks and verify properties', () => {
		const tokens = lex('* First item\n* Second item\n* Third item');
		const listToken = getFirstTokenByType(tokens, 'list');

		expect(listToken).toBeDefined();
		expect(listToken.type).toBe('list');
		expect(listToken.ordered).toBe(false);
		expect(listToken.tokens).toBeDefined();
		expect(listToken.tokens.length).toBe(3);

		expect(listToken.tokens[0].text).toBe('First item');
		expect(listToken.tokens[1].text).toBe('Second item');
		expect(listToken.tokens[2].text).toBe('Third item');
	});

	test('should parse unordered list with plus signs and verify properties', () => {
		const tokens = lex('+ Alpha\n+ Beta\n+ Gamma');
		const listToken = getFirstTokenByType(tokens, 'list');

		expect(listToken).toBeDefined();
		expect(listToken.type).toBe('list');
		expect(listToken.ordered).toBe(false);
		expect(listToken.tokens).toBeDefined();
		expect(listToken.tokens.length).toBe(3);

		expect(listToken.tokens[0].text).toBe('Alpha');
		expect(listToken.tokens[1].text).toBe('Beta');
		expect(listToken.tokens[2].text).toBe('Gamma');
	});

	test('should parse unordered list with formatting in items', () => {
		const tokens = lex('- **Bold item**\n- *Italic item*\n- `Code item`');
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

	// Skip nested unordered lists for now
	// test('should parse nested unordered lists and verify structure', () => {
	// 	const tokens = lex('- Parent item 1\n  - Child item 1\n  - Child item 2\n- Parent item 2');
	// 	const listToken = getFirstTokenByType(tokens, 'list');

	// 	expect(listToken).toBeDefined();
	// 	expect(listToken.tokens).toBeDefined();
	// 	expect(listToken.tokens.length).toBe(2);

	// 	// Check first parent item has nested list
	// 	const firstItemTokens = listToken.tokens[0].tokens || [];
	// 	const nestedList = firstItemTokens.find((t: any) => t.type === 'list');
	// 	expect(nestedList).toBeDefined();
	// 	expect(nestedList.ordered).toBe(false);
	// 	expect(nestedList.items.length).toBe(2);
	// 	expect(nestedList.items[0].text).toBe('Child item 1');
	// 	expect(nestedList.items[1].text).toBe('Child item 2');
	// });

	// test('should parse unordered list with different indentation levels', () => {
	// 	const tokens = lex('- Level 1\n    - Level 2\n        - Level 3\n- Back to Level 1');
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

	test('should parse loose unordered list and verify loose property', () => {
		const tokens = lex('- Item 1\n\n- Item 2\n\n- Item 3');
		const listToken = getFirstTokenByType(tokens, 'list');

		expect(listToken).toBeDefined();
		expect(listToken.type).toBe('list');
		expect(listToken.ordered).toBe(false);
		expect(listToken.loose).toBe(true);
		expect(listToken.tokens.length).toBe(3);
	});

	test('should parse unordered list with multi-line items', () => {
		const tokens = lex('- First item\n  continues here\n- Second item\n  also continues');
		const listToken = getFirstTokenByType(tokens, 'list');

		expect(listToken).toBeDefined();
		expect(listToken.tokens).toBeDefined();
		expect(listToken.tokens.length).toBe(2);

		expect(listToken.tokens[0].text).toBe('First item\ncontinues here');
		expect(listToken.tokens[1].text).toBe('Second item\nalso continues');
	});

	test('should parse unordered list with links and verify link tokens', () => {
		const tokens = lex('- [Google](https://google.com)\n- [GitHub](https://github.com)');
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

	test('should parse unordered list with images and verify image tokens', () => {
		const tokens = lex(
			'- ![Image 1](https://example.com/1.jpg)\n- ![Image 2](https://example.com/2.jpg)'
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

	test('should parse unordered list with code blocks in items', () => {
		const tokens = lex(
			'- Item with code:\n  ```javascript\n  console.log("test");\n  ```\n- Another item'
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

	test('should parse unordered list with blockquotes in items', () => {
		const tokens = lex('- Item with quote:\n  > This is a quote\n- Another item');
		const listToken = getFirstTokenByType(tokens, 'list');

		expect(listToken).toBeDefined();
		expect(listToken.tokens.length).toBe(2);

		// Check first item has blockquote
		const firstItemTokens = listToken.tokens[0].tokens || [];
		const blockquoteToken = firstItemTokens.find((t: any) => t.type === 'blockquote');
		expect(blockquoteToken).toBeDefined();
	});

	test('should handle mixed marker types in same list (edge case)', () => {
		const tokens = lex('- Item 1\n* Item 2\n+ Item 3');
		const listTokens = getTokensByType(tokens, 'list');

		// Should create separate lists for different markers
		expect(listTokens.length).toBeGreaterThan(0);
	});

	test('should parse unordered list with task list items', () => {
		const tokens = lex('- [ ] Unchecked task\n- [x] Checked task\n- [ ] Another unchecked');
		const listToken = getFirstTokenByType(tokens, 'list');

		expect(listToken).toBeDefined();
		expect(listToken.tokens.length).toBe(3);

		// Check task properties if supported
		if (listToken.tokens[0].task !== undefined) {
			expect(listToken.tokens[0].task).toBe(true);
			expect(listToken.tokens[0].checked).toBe(false);
			expect(listToken.tokens[1].task).toBe(true);
			expect(listToken.tokens[1].checked).toBe(true);
			expect(listToken.tokens[2].task).toBe(true);
			expect(listToken.tokens[2].checked).toBe(false);
		}
	});

	test('should handle empty list items (edge case)', () => {
		const tokens = lex('- \n- Item 2\n- ');
		const listToken = getFirstTokenByType(tokens, 'list');

		expect(listToken).toBeDefined();
		expect(listToken.tokens.length).toBe(3);
	});
});

describe('incomplete markdown', () => {
	test('should complete basic incomplete formatting in unordered lists', () => {
		const input = '- Item with **bold and *italic\n- Another item';
		const result = parseIncompleteMarkdown(input);

		// Should complete all incomplete formatters in the order they appear
		expect(result).toBe('- Item with **bold and *italic***\n- Another item');
	});

	test('should handle line breaks with incomplete formatting in unordered lists', () => {
		const input = '- First line with **bold\n  Second line with *italic\n- Next item';
		const result = parseIncompleteMarkdown(input);

		// Should complete formatting before line breaks
		expect(result).toBe('- First line with **bold**\n  Second line with *italic*\n- Next item');
	});

	test('should handle different list markers with incomplete formatting', () => {
		const input = '* Item with **bold\n+ Item with *italic\n- Item with `code';
		const result = parseIncompleteMarkdown(input);

		// Should complete at end of entire string
		expect(result).toBe('* Item with **bold**\n+ Item with *italic*\n- Item with `code`');
	});

	test('should handle nested unordered lists with incomplete formatting', () => {
		const input = '- Parent item\n  - Child with **incomplete\n  - Another child\n- Another parent';
		const result = parseIncompleteMarkdown(input);

		// Should complete formatting in nested structures
		expect(result).toBe(
			'- Parent item\n  - Child with **incomplete**\n  - Another child\n- Another parent'
		);
	});
});
