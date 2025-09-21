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
	test('should parse note alert and verify all properties', () => {
		const tokens = lex('> [!NOTE]\n> This is a note alert.');
		const alertToken = getFirstTokenByType(tokens, 'alert');

		expect(alertToken).toBeDefined();
		expect(alertToken.type).toBe('alert');
		expect(alertToken.variant).toBe('note');
		expect(alertToken.text).toBe('This is a note alert.');
		expect(alertToken.raw).toBe('> [!NOTE]\n> This is a note alert.');
		expect(alertToken.tokens).toBeDefined();
	});

	test('should parse tip alert and verify properties', () => {
		const tokens = lex('> [!TIP]\n> This is a tip alert.');
		const alertToken = getFirstTokenByType(tokens, 'alert');

		expect(alertToken).toBeDefined();
		expect(alertToken.type).toBe('alert');
		expect(alertToken.variant).toBe('tip');
		expect(alertToken.text).toBe('This is a tip alert.');
		expect(alertToken.tokens).toBeDefined();
	});

	test('should parse important alert and verify properties', () => {
		const tokens = lex('> [!IMPORTANT]\n> This is an important alert.');
		const alertToken = getFirstTokenByType(tokens, 'alert');

		expect(alertToken).toBeDefined();
		expect(alertToken.type).toBe('alert');
		expect(alertToken.variant).toBe('important');
		expect(alertToken.text).toBe('This is an important alert.');
	});

	test('should parse warning alert and verify properties', () => {
		const tokens = lex('> [!WARNING]\n> This is a warning alert.');
		const alertToken = getFirstTokenByType(tokens, 'alert');

		expect(alertToken).toBeDefined();
		expect(alertToken.type).toBe('alert');
		expect(alertToken.variant).toBe('warning');
		expect(alertToken.text).toBe('This is a warning alert.');
	});

	test('should parse caution alert and verify properties', () => {
		const tokens = lex('> [!CAUTION]\n> This is a caution alert.');
		const alertToken = getFirstTokenByType(tokens, 'alert');

		expect(alertToken).toBeDefined();
		expect(alertToken.type).toBe('alert');
		expect(alertToken.variant).toBe('caution');
		expect(alertToken.text).toBe('This is a caution alert.');
	});

	test('should parse alert with multiple lines', () => {
		const tokens = lex(
			'> [!TIP]\n> First line of tip.\n> Second line of tip.\n> Third line of tip.'
		);
		const alertToken = getFirstTokenByType(tokens, 'alert');

		expect(alertToken).toBeDefined();
		expect(alertToken.type).toBe('alert');
		expect(alertToken.variant).toBe('tip');
		expect(alertToken.text).toBe('First line of tip.\nSecond line of tip.\nThird line of tip.');
	});

	test('should parse alert with formatting inside', () => {
		const tokens = lex('> [!IMPORTANT]\n> This alert has **bold** and *italic* text.');
		const alertToken = getFirstTokenByType(tokens, 'alert');

		expect(alertToken).toBeDefined();
		expect(alertToken.tokens).toBeDefined();

		const alertTokens = alertToken.tokens || [];
		const paragraphToken = alertTokens.find((t: any) => t.type === 'paragraph');
		expect(paragraphToken).toBeDefined();

		const paragraphTokens = paragraphToken.tokens || [];
		const strongTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'strong');
		const emTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'em');

		expect(strongTokens.length).toBe(1);
		expect(strongTokens[0].text).toBe('bold');
		expect(emTokens.length).toBe(1);
		expect(emTokens[0].text).toBe('italic');
	});

	test('should parse alert with code spans inside', () => {
		const tokens = lex('> [!WARNING]\n> Use `console.log()` for debugging.');
		const alertToken = getFirstTokenByType(tokens, 'alert');

		expect(alertToken).toBeDefined();
		expect(alertToken.tokens).toBeDefined();

		const alertTokens = alertToken.tokens || [];
		const paragraphToken = alertTokens.find((t: any) => t.type === 'paragraph');
		expect(paragraphToken).toBeDefined();

		const paragraphTokens = paragraphToken.tokens || [];
		const codespanTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'codespan');

		expect(codespanTokens.length).toBe(1);
		expect(codespanTokens[0].text).toBe('console.log()');
	});

	test('should parse alert with links inside', () => {
		const tokens = lex('> [!NOTE]\n> Visit [Google](https://google.com) for more info.');
		const alertToken = getFirstTokenByType(tokens, 'alert');

		expect(alertToken).toBeDefined();
		expect(alertToken.tokens).toBeDefined();

		const alertTokens = alertToken.tokens || [];
		const paragraphToken = alertTokens.find((t: any) => t.type === 'paragraph');
		expect(paragraphToken).toBeDefined();

		const paragraphTokens = paragraphToken.tokens || [];
		const linkTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'link');

		expect(linkTokens.length).toBe(1);
		expect(linkTokens[0].href).toBe('https://google.com');
		expect(linkTokens[0].text).toBe('Google');
	});

	test('should parse alert with lists inside', () => {
		const tokens = lex(
			'> [!TIP]\n> Here are some tips:\n> - First tip\n> - Second tip\n> - Third tip'
		);
		const alertToken = getFirstTokenByType(tokens, 'alert');

		expect(alertToken).toBeDefined();
		expect(alertToken.tokens).toBeDefined();

		const alertTokens = alertToken.tokens || [];
		const listToken = alertTokens.find((t: any) => t.type === 'list');
		expect(listToken).toBeDefined();
		expect(listToken.tokens.length).toBe(3);
	});

	test('should parse alert with code blocks inside', () => {
		const tokens = lex(
			'> [!IMPORTANT]\n> Example code:\n> ```javascript\n> console.log("Hello");\n> ```'
		);
		const alertToken = getFirstTokenByType(tokens, 'alert');

		expect(alertToken).toBeDefined();
		expect(alertToken.tokens).toBeDefined();

		const alertTokens = alertToken.tokens || [];
		const codeToken = alertTokens.find((t: any) => t.type === 'code');
		expect(codeToken).toBeDefined();
		expect(codeToken.lang).toBe('javascript');
		expect(codeToken.text).toBe('console.log("Hello");');
	});

	test('should parse alert with math expressions inside', () => {
		const tokens = lex('> [!NOTE]\n> The formula is $E = mc^2$.');
		const alertToken = getFirstTokenByType(tokens, 'alert');

		expect(alertToken).toBeDefined();
		expect(alertToken.tokens).toBeDefined();

		const alertTokens = alertToken.tokens || [];
		const paragraphToken = alertTokens.find((t: any) => t.type === 'paragraph');
		expect(paragraphToken).toBeDefined();

		const paragraphTokens = paragraphToken.tokens || [];
		const mathTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'math');

		expect(mathTokens.length).toBe(1);
		expect(mathTokens[0].text).toBe('E = mc^2');
	});

	test('should parse alert with empty content', () => {
		const tokens = lex('> [!NOTE]\n>');
		const alertToken = getFirstTokenByType(tokens, 'alert');

		expect(alertToken).toBeDefined();
		expect(alertToken.type).toBe('alert');
		expect(alertToken.variant).toBe('note');
		expect(alertToken.text).toBe('');
	});

	test('should parse multiple alerts in sequence', () => {
		const tokens = lex('> [!NOTE]\n> First alert.\n\n> [!WARNING]\n> Second alert.');
		const alertTokens = getTokensByType(tokens, 'alert');

		expect(alertTokens.length).toBe(2);
		expect(alertTokens[0].variant).toBe('note');
		expect(alertTokens[0].text).toBe('First alert.');
		expect(alertTokens[1].variant).toBe('warning');
		expect(alertTokens[1].text).toBe('Second alert.');
	});

	test('should handle case-insensitive alert types', () => {
		const tokens = lex('> [!note]\n> Lowercase note alert.');
		const alertToken = getFirstTokenByType(tokens, 'alert');

		expect(alertToken).toBeDefined();
		expect(alertToken.type).toBe('alert');
		expect(alertToken.variant).toBe('note');
	});

	test('should parse alert with strikethrough inside', () => {
		const tokens = lex('> [!CAUTION]\n> This is ~~deprecated~~ functionality.');
		const alertToken = getFirstTokenByType(tokens, 'alert');

		expect(alertToken).toBeDefined();
		expect(alertToken.tokens).toBeDefined();

		const alertTokens = alertToken.tokens || [];
		const paragraphToken = alertTokens.find((t: any) => t.type === 'paragraph');
		expect(paragraphToken).toBeDefined();

		const paragraphTokens = paragraphToken.tokens || [];
		const delTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'del');

		expect(delTokens.length).toBe(1);
		expect(delTokens[0].text).toBe('deprecated');
	});

	test('should not parse regular blockquote as alert (edge case)', () => {
		const tokens = lex('> This is a regular blockquote\n> Not an alert');
		const alertTokens = getTokensByType(tokens, 'alert');
		const blockquoteTokens = getTokensByType(tokens, 'blockquote');

		// Should create blockquote, not alert
		expect(alertTokens.length).toBe(0);
		expect(blockquoteTokens.length).toBe(1);
	});

	test('should not parse invalid alert syntax (edge case)', () => {
		const tokens = lex('> [!INVALID]\n> This should not be an alert');
		const alertTokens = getTokensByType(tokens, 'alert');

		// Should not create alert for invalid type
		expect(alertTokens.length).toBe(0);
	});

	test('should parse alert with nested blockquotes', () => {
		const tokens = lex('> [!NOTE]\n> This is a note\n> > With nested quote');
		const alertToken = getFirstTokenByType(tokens, 'alert');

		expect(alertToken).toBeDefined();
		expect(alertToken.tokens).toBeDefined();

		const alertTokens = alertToken.tokens || [];
		const nestedBlockquote = alertTokens.find((t: any) => t.type === 'blockquote');
		expect(nestedBlockquote).toBeDefined();
	});
});

describe('incomplete markdown', () => {
	test('should handle incomplete alert with missing content', () => {
		const input = '> [!NOTE]';
		const result = parseIncompleteMarkdown(input);

		// Should remain unchanged as alert structure is incomplete
		expect(result).toBe('> [!NOTE]');
	});

	test('should handle incomplete alert with partial content', () => {
		const input = '> [!WARNING]\n> Partial content';
		const result = parseIncompleteMarkdown(input);

		// Should remain unchanged as alert is complete
		expect(result).toBe('> [!WARNING]\n> Partial content');
	});

	test('should handle incomplete formatting inside alert', () => {
		const input = '> [!NOTE]\n> This alert has **incomplete bold';
		const result = parseIncompleteMarkdown(input);

		// Should complete the bold formatting inside alert
		expect(result).toBe('> [!NOTE]\n> This alert has **incomplete bold**');
	});

	test('should handle incomplete italic formatting inside alert', () => {
		const input = '> [!TIP]\n> This alert has *incomplete italic';
		const result = parseIncompleteMarkdown(input);

		// Should complete the italic formatting inside alert
		expect(result).toBe('> [!TIP]\n> This alert has *incomplete italic*');
	});

	test('should handle incomplete code span inside alert', () => {
		const input = '> [!WARNING]\n> Use `incomplete code';
		const result = parseIncompleteMarkdown(input);

		// Should complete the code formatting inside alert
		expect(result).toBe('> [!WARNING]\n> Use `incomplete code`');
	});

	test('should handle incomplete strikethrough inside alert', () => {
		const input = '> [!CAUTION]\n> This is ~~incomplete strikethrough';
		const result = parseIncompleteMarkdown(input);

		// Should complete the strikethrough formatting inside alert
		expect(result).toBe('> [!CAUTION]\n> This is ~~incomplete strikethrough~~');
	});

	test('should handle incomplete link inside alert', () => {
		const input = '> [!IMPORTANT]\n> Visit [Google';
		const result = parseIncompleteMarkdown(input);

		// Should complete the link inside alert
		expect(result).toBe('> [!IMPORTANT]\n> Visit [Google](streamdown:incomplete-link)');
	});

	test('should handle incomplete image inside alert', () => {
		const input = '> [!NOTE]\n> Image: ![Alt text';
		const result = parseIncompleteMarkdown(input);

		// Should remove incomplete image inside alert
		expect(result).toBe('> [!NOTE]\n> Image: ![Alt text](streamdown:incomplete-image)');
	});

	test('should handle incomplete math inside alert', () => {
		const input = '> [!NOTE]\n> The formula is $E = mc^2';
		const result = parseIncompleteMarkdown(input);

		// Should complete the math formatting inside alert
		expect(result).toBe('> [!NOTE]\n> The formula is $E = mc^2$');
	});

	test('should handle multiple incomplete formatting inside alert', () => {
		const input = '> [!WARNING]\n> Text with **bold** and *italic and `code';
		const result = parseIncompleteMarkdown(input);

		// Should complete both incomplete formatters inside alert
		expect(result).toBe('> [!WARNING]\n> Text with **bold** and *italic and `code*`');
	});

	test('should handle incomplete alert with multi-line content', () => {
		const input = '> [!TIP]\n> First line with **incomplete\n> Second line continues';
		const result = parseIncompleteMarkdown(input);

		// Should complete formatting at end of lines
		expect(result).toBe('> [!TIP]\n> First line with **incomplete**\n> Second line continues');
	});

	test('should handle incomplete subscript inside alert', () => {
		const input = '> [!NOTE]\n> Chemical formula H~2';
		const result = parseIncompleteMarkdown(input);

		// Should complete the subscript formatting inside alert
		expect(result).toBe('> [!NOTE]\n> Chemical formula H~2~');
	});

	test('should handle incomplete superscript inside alert', () => {
		const input = '> [!IMPORTANT]\n> Energy formula E = mc^2';
		const result = parseIncompleteMarkdown(input);

		// Should complete the superscript formatting inside alert
		expect(result).toBe('> [!IMPORTANT]\n> Energy formula E = mc^2^');
	});

	test('should handle incomplete double underscore formatting inside alert', () => {
		const input = '> [!CAUTION]\n> Text with __incomplete strong';
		const result = parseIncompleteMarkdown(input);

		// Should complete the strong formatting inside alert
		expect(result).toBe('> [!CAUTION]\n> Text with __incomplete strong__');
	});

	test('should handle incomplete triple asterisk formatting inside alert', () => {
		const input = '> [!WARNING]\n> Text with ***incomplete bold-italic';
		const result = parseIncompleteMarkdown(input);

		// Should complete the bold-italic formatting inside alert
		expect(result).toBe('> [!WARNING]\n> Text with ***incomplete bold-italic***');
	});

	test('should preserve alert structure while fixing incomplete formatting', () => {
		const input = '> [!NOTE]\n> Complete **bold** text\n> Incomplete *italic';
		const result = parseIncompleteMarkdown(input);

		// Should preserve complete formatting and fix incomplete
		expect(result).toBe('> [!NOTE]\n> Complete **bold** text\n> Incomplete *italic*');
	});

	test('should handle incomplete formatting in alert with custom title', () => {
		const input = '> [!TIP] Custom Title\n> Text with `incomplete';
		const result = parseIncompleteMarkdown(input);

		// Should complete the code formatting while preserving custom title
		expect(result).toBe('> [!TIP] Custom Title\n> Text with `incomplete`');
	});

	test('should handle incomplete formatting in nested alert content', () => {
		const input = '> [!IMPORTANT]\n> Alert with list:\n> - Item with **incomplete';
		const result = parseIncompleteMarkdown(input);

		// Should complete the bold formatting in nested list
		expect(result).toBe('> [!IMPORTANT]\n> Alert with list:\n> - Item with **incomplete**');
	});

	test('should handle incomplete alert followed by other content', () => {
		const input = '> [!NOTE]\n> Alert content with **incomplete\n\nRegular paragraph';
		const result = parseIncompleteMarkdown(input);

		// Should complete formatting at end of lines
		expect(result).toBe('> [!NOTE]\n> Alert content with **incomplete**\n\nRegular paragraph');
	});

	test('should handle multiple alerts with incomplete formatting', () => {
		const input =
			'> [!NOTE]\n> First alert with *incomplete\n\n> [!WARNING]\n> Second alert with `incomplete';
		const result = parseIncompleteMarkdown(input);

		// Should complete formatting at end of lines
		expect(result).toBe(
			'> [!NOTE]\n> First alert with *incomplete*\n\n> [!WARNING]\n> Second alert with `incomplete`'
		);
	});

	test('should handle incomplete formatting at end of alert', () => {
		const input = '> [!CAUTION]\n> Final text with ~~incomplete';
		const result = parseIncompleteMarkdown(input);

		// Should complete the strikethrough formatting
		expect(result).toBe('> [!CAUTION]\n> Final text with ~~incomplete~~');
	});

	test('should handle incomplete alert with code block', () => {
		const input = '> [!TIP]\n> Code example:\n> ```javascript\n> console.log("incomplete");';
		const result = parseIncompleteMarkdown(input);

		// Should leave incomplete code block unchanged
		expect(result).toBe(
			'> [!TIP]\n> Code example:\n> ```javascript\n> console.log("incomplete");\n```'
		);
	});

	test('should handle complex alert with multiple incomplete elements', () => {
		const input =
			'> [!IMPORTANT]\n> Complex alert with **bold**, *italic, `code, [link, and ~~strike';
		const result = parseIncompleteMarkdown(input);

		// Should complete all incomplete formatting inside alert
		expect(result).toBe(
			'> [!IMPORTANT]\n> Complex alert with **bold**, *italic, `code, [link, and ~~strike*`~~](streamdown:incomplete-link)'
		);
	});
});
