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
	test('should parse simple subscript and verify all properties', () => {
		const tokens = lex('Water formula H~2~O.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		expect(paragraphToken.tokens).toBeDefined();

		const paragraphTokens = paragraphToken.tokens || [];
		const subTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'sub');

		expect(subTokens.length).toBe(1);
		expect(subTokens[0].type).toBe('sub');
		expect(subTokens[0].text).toBe('2');
		expect(subTokens[0].raw).toBe('~2~');
	});

	test('should parse subscript with multiple characters', () => {
		const tokens = lex('Chemical formula C~6~H~12~O~6~.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const subTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'sub');

		expect(subTokens.length).toBe(3);
		expect(subTokens[0].text).toBe('6');
		expect(subTokens[0].raw).toBe('~6~');
		expect(subTokens[1].text).toBe('12');
		expect(subTokens[1].raw).toBe('~12~');
		expect(subTokens[2].text).toBe('6');
		expect(subTokens[2].raw).toBe('~6~');
	});

	test('should parse multiple subscripts in same paragraph', () => {
		const tokens = lex('Molecules: H~2~O and CO~2~.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const subTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'sub');

		expect(subTokens.length).toBe(2);
		expect(subTokens[0].text).toBe('2');
		expect(subTokens[0].raw).toBe('~2~');
		expect(subTokens[1].text).toBe('2');
		expect(subTokens[1].raw).toBe('~2~');
	});

	test('should parse subscript in heading', () => {
		const tokens = lex('# Water Formula H~2~O');
		const headingToken = getFirstTokenByType(tokens, 'heading');

		expect(headingToken).toBeDefined();
		expect(headingToken.tokens).toBeDefined();

		const headingTokens = headingToken.tokens || [];
		const subTokens = headingTokens.filter((t: { type: string }) => t.type === 'sub');

		expect(subTokens.length).toBe(1);
		expect(subTokens[0].text).toBe('2');
	});

	test('should parse subscript in blockquote', () => {
		const tokens = lex('> The water molecule is H~2~O');
		const blockquoteToken = getFirstTokenByType(tokens, 'blockquote');

		expect(blockquoteToken).toBeDefined();
		const nestedTokens = blockquoteToken.tokens || [];
		const paragraphToken = nestedTokens.find((t: any) => t.type === 'paragraph');
		expect(paragraphToken).toBeDefined();

		const paragraphTokens = paragraphToken.tokens || [];
		const subTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'sub');

		expect(subTokens.length).toBe(1);
		expect(subTokens[0].text).toBe('2');
	});

	test('should parse subscript in list item', () => {
		const tokens = lex('- Water: H~2~O\n- Carbon dioxide: CO~2~');
		const listToken = getFirstTokenByType(tokens, 'list');

		expect(listToken).toBeDefined();
		expect(listToken.tokens.length).toBe(2);

		// Check first item
		const firstItemTokens = listToken.tokens[0].tokens || [];
		const firstParagraph = firstItemTokens.find((t: any) => t.type === 'text');
		console.dir({ firstParagraph }, { depth: null });
		expect(firstParagraph).toBeDefined();

		const firstSubTokens = (firstParagraph.tokens || []).filter(
			(t: { type: string }) => t.type === 'sub'
		);
		expect(firstSubTokens.length).toBe(1);
		expect(firstSubTokens[0].text).toBe('2');

		// Check second item
		const secondItemTokens = listToken.tokens[1].tokens || [];
		const secondParagraph = secondItemTokens.find((t: any) => t.type === 'text');
		expect(secondParagraph).toBeDefined();

		const secondSubTokens = (secondParagraph.tokens || []).filter(
			(t: { type: string }) => t.type === 'sub'
		);
		expect(secondSubTokens.length).toBe(1);
		expect(secondSubTokens[0].text).toBe('2');
	});

	test('should parse subscript in table cell', () => {
		const tokens = lex('| Molecule | H~2~O |\n|----------|-------|\n| Type     | Water |');
		const tableToken = getFirstTokenByType(tokens, 'table');

		expect(tableToken).toBeDefined();
		const tableHeader = tableToken.tokens.find((t: any) => t.type === 'thead');
		expect(tableHeader).toBeDefined();

		// Get the second table header cell (th)
		const firstHeaderRow = tableHeader.tokens[0]; // tr
		const secondHeaderCell = firstHeaderRow.tokens[1]; // th (second cell)
		expect(secondHeaderCell.tokens).toBeDefined();
		const subTokens = secondHeaderCell.tokens.filter((t: { type: string }) => t.type === 'sub');

		expect(subTokens.length).toBe(1);
		expect(subTokens[0].text).toBe('2');
	});

	test('should parse subscript with letters', () => {
		const tokens = lex('Variable x~n~ in equation.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const subTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'sub');

		expect(subTokens.length).toBe(1);
		expect(subTokens[0].text).toBe('n');
		expect(subTokens[0].raw).toBe('~n~');
	});

	test('should parse subscript with mixed characters', () => {
		const tokens = lex('Complex subscript: x~i+1~.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const subTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'sub');

		expect(subTokens.length).toBe(1);
		expect(subTokens[0].text).toBe('i+1');
		expect(subTokens[0].raw).toBe('~i+1~');
	});

	test('should parse subscript with formatting around it', () => {
		const tokens = lex('**Bold** H~2~O and *italic* text.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const subTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'sub');
		const strongTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'strong');
		const emTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'em');

		expect(subTokens.length).toBe(1);
		expect(strongTokens.length).toBe(1);
		expect(emTokens.length).toBe(1);
		expect(subTokens[0].text).toBe('2');
	});

	test('should parse subscript with links around it', () => {
		const tokens = lex('[Water](https://example.com) H~2~O molecule.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const subTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'sub');
		const linkTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'link');

		expect(subTokens.length).toBe(1);
		expect(linkTokens.length).toBe(1);
		expect(subTokens[0].text).toBe('2');
		expect(linkTokens[0].text).toBe('Water');
	});

	test('should parse subscript with code spans around it', () => {
		const tokens = lex('`water` H~2~O formula.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const subTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'sub');
		const codespanTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'codespan');

		expect(subTokens.length).toBe(1);
		expect(codespanTokens.length).toBe(1);
		expect(subTokens[0].text).toBe('2');
		expect(codespanTokens[0].text).toBe('water');
	});

	test('should parse subscript at start of paragraph', () => {
		const tokens = lex('~2~ is the subscript of 2.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const subTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'sub');

		expect(subTokens.length).toBe(1);
		expect(subTokens[0].text).toBe('2');
	});

	test('should parse subscript at end of paragraph', () => {
		const tokens = lex('The index is x~n~.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const subTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'sub');

		expect(subTokens.length).toBe(1);
		expect(subTokens[0].text).toBe('n');
	});

	test('should not parse single tilde as subscript (edge case)', () => {
		const tokens = lex('This has a single ~ tilde.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const subTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'sub');

		// Should not create sub tokens for single tilde
		expect(subTokens.length).toBe(0);
	});

	test('should handle empty subscript (edge case)', () => {
		const tokens = lex('Empty subscript: ~~.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const subTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'sub');

		// Behavior may vary - either no sub token or empty sub token
		if (subTokens.length > 0) {
			expect(subTokens[0].text).toBe('');
		}
	});

	test('should parse subscript with special characters', () => {
		const tokens = lex('Notation: x~(i-1)~.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const subTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'sub');

		expect(subTokens.length).toBe(1);
		expect(subTokens[0].text).toBe('(i-1)');
	});

	test('should parse subscript with superscript nearby', () => {
		const tokens = lex('Formula: H~2~O and E = mc^2^.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const subTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'sub');
		const supTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'sup');

		expect(subTokens.length).toBe(1);
		expect(supTokens.length).toBe(1);
		expect(subTokens[0].text).toBe('2');
		expect(supTokens[0].text).toBe('2');
	});

	test('should not confuse with strikethrough (edge case)', () => {
		const tokens = lex('Subscript H~2~O not ~~strikethrough~~.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const subTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'sub');
		const delTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'del');

		expect(subTokens.length).toBe(1);
		expect(delTokens.length).toBe(1);
		expect(subTokens[0].text).toBe('2');
		expect(delTokens[0].text).toBe('strikethrough');
	});

	test('should parse subscript with math expressions', () => {
		const tokens = lex('Math: $H_2O$ and text H~2~O.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const subTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'sub');
		const mathTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'math');

		expect(subTokens.length).toBe(1);
		expect(mathTokens.length).toBe(1);
		expect(subTokens[0].text).toBe('2');
		expect(mathTokens[0].text).toBe('H_2O');
	});

	test('should parse complex chemical formulas', () => {
		const tokens = lex('Glucose: C~6~H~12~O~6~ and sulfuric acid: H~2~SO~4~.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const subTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'sub');

		expect(subTokens.length).toBe(5);
		expect(subTokens[0].text).toBe('6'); // C6
		expect(subTokens[1].text).toBe('12'); // H12
		expect(subTokens[2].text).toBe('6'); // O6
		expect(subTokens[3].text).toBe('2'); // H2
		expect(subTokens[4].text).toBe('4'); // SO4
	});

	test('should parse subscript in mathematical notation', () => {
		const tokens = lex('Sequence: a~1~, a~2~, a~3~, ..., a~n~.');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const subTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'sub');

		expect(subTokens.length).toBe(4);
		expect(subTokens[0].text).toBe('1');
		expect(subTokens[1].text).toBe('2');
		expect(subTokens[2].text).toBe('3');
		expect(subTokens[3].text).toBe('n');
	});
});

describe('incomplete markdown', () => {
	test('should complete basic incomplete subscript', () => {
		const input = 'Water formula H~2';
		const result = parseIncompleteMarkdown(input);

		// Should complete the subscript formatting
		expect(result).toBe('Water formula H~2~');
	});

	test('should handle line breaks with incomplete subscript', () => {
		const input = 'First line H~2\nSecond line';
		const result = parseIncompleteMarkdown(input);

		// Should complete subscript before line break
		expect(result).toBe('First line H~2~\nSecond line');
	});

	test('should not complete empty or whitespace-only subscript', () => {
		const input = 'Empty subscript: ~';
		const result = parseIncompleteMarkdown(input);

		// Should not complete if no content after tilde
		expect(result).toBe('Empty subscript: ~');
	});
});
