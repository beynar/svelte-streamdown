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
	test('should parse horizontal rule with three dashes and verify all properties', () => {
		const tokens = lex('---');
		const hrToken = getFirstTokenByType(tokens, 'hr');

		expect(hrToken).toBeDefined();
		expect(hrToken.type).toBe('hr');
		expect(hrToken.raw).toBe('---');
	});

	test('should parse horizontal rule with three asterisks and verify properties', () => {
		const tokens = lex('***');
		const hrToken = getFirstTokenByType(tokens, 'hr');

		expect(hrToken).toBeDefined();
		expect(hrToken.type).toBe('hr');
		expect(hrToken.raw).toBe('***');
	});

	test('should parse horizontal rule with three underscores and verify properties', () => {
		const tokens = lex('___');
		const hrToken = getFirstTokenByType(tokens, 'hr');

		expect(hrToken).toBeDefined();
		expect(hrToken.type).toBe('hr');
		expect(hrToken.raw).toBe('___');
	});

	test('should parse horizontal rule with more than three dashes', () => {
		const tokens = lex('-----');
		const hrToken = getFirstTokenByType(tokens, 'hr');

		expect(hrToken).toBeDefined();
		expect(hrToken.type).toBe('hr');
		expect(hrToken.raw).toBe('-----');
	});

	test('should parse horizontal rule with more than three asterisks', () => {
		const tokens = lex('*****');
		const hrToken = getFirstTokenByType(tokens, 'hr');

		expect(hrToken).toBeDefined();
		expect(hrToken.type).toBe('hr');
		expect(hrToken.raw).toBe('*****');
	});

	test('should parse horizontal rule with more than three underscores', () => {
		const tokens = lex('_____');
		const hrToken = getFirstTokenByType(tokens, 'hr');

		expect(hrToken).toBeDefined();
		expect(hrToken.type).toBe('hr');
		expect(hrToken.raw).toBe('_____');
	});

	test('should parse horizontal rule with spaces between dashes', () => {
		const tokens = lex('- - -');
		const hrToken = getFirstTokenByType(tokens, 'hr');

		console.log(tokens);

		expect(hrToken).toBeDefined();
		expect(hrToken.type).toBe('hr');
		expect(hrToken.raw).toBe('- - -');
	});

	test('should parse horizontal rule with spaces between asterisks', () => {
		const tokens = lex('* * *');
		const hrToken = getFirstTokenByType(tokens, 'hr');

		expect(hrToken).toBeDefined();
		expect(hrToken.type).toBe('hr');
		expect(hrToken.raw).toBe('* * *');
	});

	test('should parse horizontal rule with spaces between underscores', () => {
		const tokens = lex('_ _ _');
		const hrToken = getFirstTokenByType(tokens, 'hr');

		expect(hrToken).toBeDefined();
		expect(hrToken.type).toBe('hr');
		expect(hrToken.raw).toBe('_ _ _');
	});

	test('should parse horizontal rule with mixed spacing', () => {
		const tokens = lex('---  ---  ---');
		const hrToken = getFirstTokenByType(tokens, 'hr');

		expect(hrToken).toBeDefined();
		expect(hrToken.type).toBe('hr');
		expect(hrToken.raw).toBe('---  ---  ---');
	});

	test('should parse horizontal rule between paragraphs', () => {
		const tokens = lex('First paragraph.\n\n---\n\nSecond paragraph.');
		const hrToken = getFirstTokenByType(tokens, 'hr');
		const paragraphTokens = getTokensByType(tokens, 'paragraph');
		expect(hrToken).toBeDefined();
		expect(hrToken.type).toBe('hr');
		expect(paragraphTokens.length).toBe(2);
		expect(paragraphTokens[0].text).toBe('First paragraph.');
		expect(paragraphTokens[1].text).toBe('Second paragraph.');
	});

	test('should parse multiple horizontal rules', () => {
		const tokens = lex('---\n\n***\n\n___');
		const hrTokens = getTokensByType(tokens, 'hr');

		expect(hrTokens.length).toBe(3);
		expect(hrTokens[0].raw).toBe('---');
		expect(hrTokens[1].raw).toBe('***');
		expect(hrTokens[2].raw).toBe('___');
	});

	test('should parse horizontal rule with leading spaces', () => {
		const tokens = lex('   ---');
		const hrToken = getFirstTokenByType(tokens, 'hr');

		expect(hrToken).toBeDefined();
		expect(hrToken.type).toBe('hr');
		expect(hrToken.raw).toBe('   ---');
	});

	test('should parse horizontal rule with trailing spaces', () => {
		const tokens = lex('---   ');
		const hrToken = getFirstTokenByType(tokens, 'hr');

		expect(hrToken).toBeDefined();
		expect(hrToken.type).toBe('hr');
		expect(hrToken.raw).toBe('---   ');
	});

	test('should not parse horizontal rule with less than three characters (edge case)', () => {
		const tokens = lex('--');
		const hrTokens = getTokensByType(tokens, 'hr');

		// Should not create hr token for less than 3 characters
		expect(hrTokens.length).toBe(0);

		// Should be parsed as paragraph instead
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');
		expect(paragraphToken).toBeDefined();
	});

	test('should not parse horizontal rule with mixed characters (edge case)', () => {
		const tokens = lex('--*');
		const hrTokens = getTokensByType(tokens, 'hr');

		// Should not create hr token for mixed characters
		expect(hrTokens.length).toBe(0);

		// Should be parsed as paragraph instead
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');
		expect(paragraphToken).toBeDefined();
	});

	test('should not parse horizontal rule with text on same line (edge case)', () => {
		const tokens = lex('--- some text');
		const hrTokens = getTokensByType(tokens, 'hr');

		// Should not create hr token when text follows
		expect(hrTokens.length).toBe(0);

		// Should be parsed as paragraph instead
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');
		expect(paragraphToken).toBeDefined();
	});

	test('should parse horizontal rule in different contexts', () => {
		const markdown = `
# Heading

Some content.

---

More content.

## Another Heading

---

Final content.
		`.trim();

		const tokens = lex(markdown);
		const hrTokens = getTokensByType(tokens, 'hr');
		const headingTokens = getTokensByType(tokens, 'heading');
		const paragraphTokens = getTokensByType(tokens, 'paragraph');

		expect(hrTokens.length).toBe(2);
		expect(headingTokens.length).toBe(2);
		expect(paragraphTokens.length).toBe(3);
	});

	test('should handle horizontal rule at start of document', () => {
		const tokens = lex('---\n\nContent after hr.');
		const hrToken = getFirstTokenByType(tokens, 'hr');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(hrToken).toBeDefined();
		expect(hrToken.type).toBe('hr');
		expect(paragraphToken).toBeDefined();
		expect(paragraphToken.text).toBe('Content after hr.');
	});

	test('should handle horizontal rule at end of document', () => {
		const tokens = lex('Content before hr.\n\n---');
		const hrToken = getFirstTokenByType(tokens, 'hr');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(hrToken).toBeDefined();
		expect(hrToken.type).toBe('hr');
		expect(paragraphToken).toBeDefined();
		expect(paragraphToken.text).toBe('Content before hr.');
	});

	test('should parse horizontal rule with very long line', () => {
		const longHr = '-'.repeat(50);
		const tokens = lex(longHr);
		const hrToken = getFirstTokenByType(tokens, 'hr');

		expect(hrToken).toBeDefined();
		expect(hrToken.type).toBe('hr');
		expect(hrToken.raw).toBe(longHr);
	});

	test('should handle horizontal rule with tabs', () => {
		const tokens = lex('-\t-\t-');
		const hrToken = getFirstTokenByType(tokens, 'hr');

		expect(hrToken).toBeDefined();
		expect(hrToken.type).toBe('hr');
		expect(hrToken.raw).toBe('-\t-\t-');
	});

	test('should not confuse setext heading underline with hr (edge case)', () => {
		const tokens = lex('Heading\n---');
		const hrTokens = getTokensByType(tokens, 'hr');
		const headingTokens = getTokensByType(tokens, 'heading');

		// Should create heading, not hr
		expect(hrTokens.length).toBe(0);
		expect(headingTokens.length).toBe(1);
		expect(headingTokens[0].text).toBe('Heading');
		expect(headingTokens[0].depth).toBe(2);
	});

	test('should parse horizontal rule after blank line following text', () => {
		const tokens = lex('Some text.\n\n---');
		const hrToken = getFirstTokenByType(tokens, 'hr');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(hrToken).toBeDefined();
		expect(hrToken.type).toBe('hr');
		expect(paragraphToken).toBeDefined();
		expect(paragraphToken.text).toBe('Some text.');
	});
});

describe('incomplete markdown', () => {
	test('should handle horizontal rules with different characters', () => {
		const input = 'Text before\n\n---\n\n***\n\n___\n\nText after';
		const result = parseIncompleteMarkdown(input);

		console.log({ result });
		// Should leave valid horizontal rules unchanged
		expect(result).toBe('Text before\n\n---\n\n***\n\n___\n\nText after');
	});

	test('should handle horizontal rules with spaces', () => {
		const input = 'Before\n\n- - -\n\n* * *\n\nAfter';
		const result = parseIncompleteMarkdown(input);

		// Should leave valid horizontal rules with spaces unchanged
		expect(result).toBe('Before\n\n- - -\n\n* * *\n\nAfter');
	});

	test('should handle horizontal rules mixed with incomplete formatting', () => {
		const input = 'Text **incomplete\n\n---\n\nMore *incomplete';
		const result = parseIncompleteMarkdown(input);

		// Should complete formatting and leave horizontal rule unchanged
		expect(result).toBe('Text **incomplete**\n\n---\n\nMore *incomplete*');
	});

	test('should handle horizontal rules in different contexts', () => {
		const input = '# Heading\n\n---\n\n> Blockquote\n\n***\n\n- List item';
		const result = parseIncompleteMarkdown(input);

		// Should work with horizontal rules in different markdown contexts
		expect(result).toBe('# Heading\n\n---\n\n> Blockquote\n\n***\n\n- List item');
	});
});
