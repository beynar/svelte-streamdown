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
	test('should parse center alignment block and verify all properties', () => {
		const tokens = lex('[center]\nThis is centered text.\n[/center]');
		const alignToken = getFirstTokenByType(tokens, 'align');

		expect(alignToken).toBeDefined();
		expect(alignToken.type).toBe('align');
		expect(alignToken.align).toBe('center');
		expect(alignToken.text).toBe('This is centered text.');
		expect(alignToken.raw).toBe('[center]\nThis is centered text.\n[/center]');
		expect(alignToken.tokens).toBeDefined();
	});

	test('should parse right alignment block and verify properties', () => {
		const tokens = lex('[right]\nThis is right-aligned text.\n[/right]');
		const alignToken = getFirstTokenByType(tokens, 'align');

		expect(alignToken).toBeDefined();
		expect(alignToken.type).toBe('align');
		expect(alignToken.align).toBe('right');
		expect(alignToken.text).toBe('This is right-aligned text.');
		expect(alignToken.raw).toBe('[right]\nThis is right-aligned text.\n[/right]');
		expect(alignToken.tokens).toBeDefined();
	});

	test('should parse alignment block with multiple lines', () => {
		const tokens = lex(
			'[center]\nFirst line of centered text.\nSecond line of centered text.\nThird line of centered text.\n[/center]'
		);
		const alignToken = getFirstTokenByType(tokens, 'align');

		expect(alignToken).toBeDefined();
		expect(alignToken.type).toBe('align');
		expect(alignToken.align).toBe('center');
		expect(alignToken.text).toBe(
			'First line of centered text.\nSecond line of centered text.\nThird line of centered text.'
		);
	});

	test('should parse alignment block with formatting inside', () => {
		const tokens = lex(
			'[center]\nThis centered text has **bold** and *italic* content.\n[/center]'
		);
		const alignToken = getFirstTokenByType(tokens, 'align');

		expect(alignToken).toBeDefined();
		expect(alignToken.tokens).toBeDefined();

		const alignTokens = alignToken.tokens || [];
		const paragraphToken = alignTokens.find((t: any) => t.type === 'paragraph');
		expect(paragraphToken).toBeDefined();

		const paragraphTokens = paragraphToken.tokens || [];
		const strongTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'strong');
		const emTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'em');

		expect(strongTokens.length).toBe(1);
		expect(strongTokens[0].text).toBe('bold');
		expect(emTokens.length).toBe(1);
		expect(emTokens[0].text).toBe('italic');
	});

	test('should parse alignment block with links inside', () => {
		const tokens = lex('[right]\nVisit [Google](https://google.com) for more info.\n[/right]');
		const alignToken = getFirstTokenByType(tokens, 'align');

		expect(alignToken).toBeDefined();
		expect(alignToken.tokens).toBeDefined();

		const alignTokens = alignToken.tokens || [];
		const paragraphToken = alignTokens.find((t: any) => t.type === 'paragraph');
		expect(paragraphToken).toBeDefined();

		const paragraphTokens = paragraphToken.tokens || [];
		const linkTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'link');

		expect(linkTokens.length).toBe(1);
		expect(linkTokens[0].href).toBe('https://google.com');
		expect(linkTokens[0].text).toBe('Google');
	});

	test('should parse alignment block with lists inside', () => {
		const tokens = lex(
			'[center]\nHere is a list:\n- First item\n- Second item\n- Third item\n[/center]'
		);
		const alignToken = getFirstTokenByType(tokens, 'align');

		expect(alignToken).toBeDefined();
		expect(alignToken.tokens).toBeDefined();

		const alignTokens = alignToken.tokens || [];
		const listToken = alignTokens.find((t: any) => t.type === 'list');
		expect(listToken).toBeDefined();
		expect(listToken.tokens.length).toBe(3);
	});

	test('should parse alignment block with code blocks inside', () => {
		const tokens = lex(
			'[right]\nExample code:\n```javascript\nconsole.log("Hello");\n```\n[/right]'
		);
		const alignToken = getFirstTokenByType(tokens, 'align');

		expect(alignToken).toBeDefined();
		expect(alignToken.tokens).toBeDefined();

		const alignTokens = alignToken.tokens || [];
		const codeToken = alignTokens.find((t: any) => t.type === 'code');
		expect(codeToken).toBeDefined();
		expect(codeToken.lang).toBe('javascript');
		expect(codeToken.text).toBe('console.log("Hello");');
	});

	test('should parse alignment block with math expressions inside', () => {
		const tokens = lex('[center]\nThe formula is $E = mc^2$.\n[/center]');
		const alignToken = getFirstTokenByType(tokens, 'align');

		expect(alignToken).toBeDefined();
		expect(alignToken.tokens).toBeDefined();

		const alignTokens = alignToken.tokens || [];
		const paragraphToken = alignTokens.find((t: any) => t.type === 'paragraph');
		expect(paragraphToken).toBeDefined();

		const paragraphTokens = paragraphToken.tokens || [];
		const mathTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'math');

		expect(mathTokens.length).toBe(1);
		expect(mathTokens[0].text).toBe('E = mc^2');
	});

	test('should parse alignment block with empty content', () => {
		const tokens = lex('[center]\n[/center]');
		const alignToken = getFirstTokenByType(tokens, 'align');

		expect(alignToken).toBeDefined();
		expect(alignToken.type).toBe('align');
		expect(alignToken.align).toBe('center');
		expect(alignToken.text).toBe('');
	});

	test('should parse multiple alignment blocks in sequence', () => {
		const tokens = lex(
			'[center]\nFirst centered block.\n[/center]\n\n[right]\nSecond right-aligned block.\n[/right]'
		);
		const alignTokens = getTokensByType(tokens, 'align');

		expect(alignTokens.length).toBe(2);
		expect(alignTokens[0].align).toBe('center');
		expect(alignTokens[0].text).toBe('First centered block.');
		expect(alignTokens[1].align).toBe('right');
		expect(alignTokens[1].text).toBe('Second right-aligned block.');
	});

	test('should not parse invalid alignment syntax (edge case)', () => {
		const tokens = lex('[invalid]\nThis should not be an alignment block.\n[/invalid]');
		const alignTokens = getTokensByType(tokens, 'align');

		// Should not create align tokens for invalid tags
		expect(alignTokens.length).toBe(0);
	});

	test('should not parse malformed alignment blocks (edge case)', () => {
		const tokens = lex('[center]\nThis is missing the closing tag');
		const alignTokens = getTokensByType(tokens, 'align');

		// Should not create align tokens for incomplete blocks
		expect(alignTokens.length).toBe(0);
	});

	test('should parse nested alignment blocks (edge case)', () => {
		const tokens = lex(
			'[center]\nThis is centered\n[right]\nThis is right-aligned inside centered\n[/right]\nMore centered text\n[/center]'
		);
		const alignTokens = getTokensByType(tokens, 'align');

		// Should create two separate alignment tokens
		expect(alignTokens.length).toBe(2);
		expect(alignTokens[0].align).toBe('center');
		expect(alignTokens[1].align).toBe('right');
	});
});

describe('incomplete markdown', () => {
	test('should handle incomplete alignment block with missing content', () => {
		const input = '[center]';
		const result = parseIncompleteMarkdown(input);

		// Should remain unchanged as alignment structure is incomplete
		expect(result).toBe('[center]');
	});

	test('should handle incomplete alignment block with partial content', () => {
		const input = '[right]\nPartial content';
		const result = parseIncompleteMarkdown(input);

		// Should add closing tag
		expect(result).toBe('[right]\nPartial content\n[/right]');
	});

	test('should handle incomplete formatting inside alignment block', () => {
		const input = '[center]\nThis text has **incomplete bold';
		const result = parseIncompleteMarkdown(input);

		// Should complete the bold formatting inside alignment
		expect(result).toBe('[center]\nThis text has **incomplete bold**\n[/center]');
	});

	test('should handle incomplete italic formatting inside alignment block', () => {
		const input = '[right]\nThis text has *incomplete italic';
		const result = parseIncompleteMarkdown(input);

		// Should complete the italic formatting inside alignment
		expect(result).toBe('[right]\nThis text has *incomplete italic*\n[/right]');
	});

	test('should handle incomplete code span inside alignment block', () => {
		const input = '[center]\nUse `incomplete code';
		const result = parseIncompleteMarkdown(input);

		// Should complete the code formatting inside alignment
		expect(result).toBe('[center]\nUse `incomplete code`\n[/center]');
	});

	test('should handle incomplete link inside alignment block', () => {
		const input = '[right]\nVisit [Google';
		const result = parseIncompleteMarkdown(input);

		// Should complete the link inside alignment
		expect(result).toBe('[right]\nVisit [Google](streamdown:incomplete-link)\n[/right]');
	});

	test('should handle multiple incomplete formatting inside alignment block', () => {
		const input = '[center]\nText with **bold** and *italic and `code';
		const result = parseIncompleteMarkdown(input);

		// Should complete both incomplete formatters inside alignment
		expect(result).toBe('[center]\nText with **bold** and *italic and `code*`\n[/center]');
	});

	test('should preserve alignment structure while fixing incomplete formatting', () => {
		const input = '[right]\nComplete **bold** text\nIncomplete *italic';
		const result = parseIncompleteMarkdown(input);

		// Should preserve complete formatting and fix incomplete
		expect(result).toBe('[right]\nComplete **bold** text\nIncomplete *italic*\n[/right]');
	});

	test('should handle incomplete formatting in nested alignment content', () => {
		const input = '[center]\nAlignment with list:\n- Item with **incomplete';
		const result = parseIncompleteMarkdown(input);

		// Should complete the bold formatting in nested list
		expect(result).toBe('[center]\nAlignment with list:\n- Item with **incomplete**\n[/center]');
	});

	test('should handle incomplete alignment with code block', () => {
		const input = '[right]\nCode example:\n```javascript\nconsole.log("incomplete");';
		const result = parseIncompleteMarkdown(input);

		// Should add closing tag for alignment
		expect(result).toBe(
			'[right]\nCode example:\n```javascript\nconsole.log("incomplete");\n```\n[/right]'
		);
	});
});
