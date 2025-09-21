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
	test('should parse simple table and verify all properties', () => {
		const tokens = lex('| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |');
		const tableToken = getFirstTokenByType(tokens, 'table');

		expect(tableToken).toBeDefined();
		expect(tableToken.type).toBe('table');
		expect(tableToken.raw).toBe(
			'| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |'
		);

		// Check table structure
		const tableHeader = tableToken.tokens.find((t: any) => t.type === 'thead');
		const tableBody = tableToken.tokens.find((t: any) => t.type === 'tbody');
		expect(tableHeader).toBeDefined();
		expect(tableBody).toBeDefined();
	});

	test('should parse table header and verify header properties', () => {
		const tokens = lex('| Name | Age | City |\n|------|-----|------|\n| John | 25  | NYC  |');
		const tableToken = getFirstTokenByType(tokens, 'table');

		expect(tableToken).toBeDefined();
		const tableHeader = tableToken.tokens.find((t: any) => t.type === 'thead');
		expect(tableHeader).toBeDefined();

		// Get header row and cells
		const headerRow = tableHeader.tokens[0]; // tr
		expect(headerRow.tokens.length).toBe(3);

		expect(headerRow.tokens[0].text).toBe('Name');
		expect(headerRow.tokens[1].text).toBe('Age');
		expect(headerRow.tokens[2].text).toBe('City');

		// Check header cell properties
		expect(headerRow.tokens[0].tokens).toBeDefined();
		expect(headerRow.tokens[0].type).toBe('th');
	});

	test('should parse table rows and verify row properties', () => {
		const tokens = lex('| Name | Age |\n|------|-----|\n| John | 25  |\n| Jane | 30  |');
		const tableToken = getFirstTokenByType(tokens, 'table');

		expect(tableToken).toBeDefined();
		const tableBody = tableToken.tokens.find((t: any) => t.type === 'tbody');
		expect(tableBody).toBeDefined();
		expect(tableBody.tokens.length).toBe(2);

		// Check first row
		const firstRow = tableBody.tokens[0]; // tr
		expect(firstRow.tokens.length).toBe(2);
		expect(firstRow.tokens[0].text).toBe('John');
		expect(firstRow.tokens[1].text).toBe('25');

		// Check second row
		const secondRow = tableBody.tokens[1]; // tr
		expect(secondRow.tokens.length).toBe(2);
		expect(secondRow.tokens[0].text).toBe('Jane');
		expect(secondRow.tokens[1].text).toBe('30');

		// Check cell properties
		expect(firstRow.tokens[0].type).toBe('td');
		expect(firstRow.tokens[0].tokens).toBeDefined();
	});

	test('should parse table alignment and verify align properties', () => {
		const tokens = lex(
			'| Left | Center | Right |\n|:-----|:------:|------:|\n| L1   | C1     | R1    |'
		);
		const tableToken = getFirstTokenByType(tokens, 'table');

		const tableHeader = tableToken.tokens.find((t: any) => t.type === 'thead');
		const tableFirstRow = tableHeader.tokens.find((t: any) => t.type === 'tr');
		const tableCells = tableFirstRow.tokens.filter((t: any) => t.type === 'th');
		expect(tableHeader).toBeDefined();
		expect(tableFirstRow).toBeDefined();
		expect(tableCells.length).toBe(3);
		console.log(tableHeader);

		expect(tableCells[0].align).toBe('left');
		expect(tableCells[1].align).toBe('center');
		expect(tableCells[2].align).toBe('right');
	});

	test('should parse table with formatting in cells', () => {
		const tokens = lex(
			'| **Bold** | *Italic* | `Code` |\n|----------|----------|--------|\n| Normal   | Text     | Here   |'
		);
		const tableToken = getFirstTokenByType(tokens, 'table');

		expect(tableToken).toBeDefined();
		const tableHeader = tableToken.tokens.find((t: any) => t.type === 'thead');
		expect(tableHeader).toBeDefined();

		// Get header row and cells
		const headerRow = tableHeader.tokens[0]; // tr

		// Check header formatting
		const boldHeader = headerRow.tokens[0]; // th
		expect(boldHeader.tokens).toBeDefined();
		const strongTokens = boldHeader.tokens.filter((t: { type: string }) => t.type === 'strong');
		expect(strongTokens.length).toBe(1);
		expect(strongTokens[0].text).toBe('Bold');

		const italicHeader = headerRow.tokens[1]; // th
		const emTokens = italicHeader.tokens.filter((t: { type: string }) => t.type === 'em');
		expect(emTokens.length).toBe(1);
		expect(emTokens[0].text).toBe('Italic');

		const codeHeader = headerRow.tokens[2]; // th
		const codespanTokens = codeHeader.tokens.filter((t: { type: string }) => t.type === 'codespan');
		expect(codespanTokens.length).toBe(1);
		expect(codespanTokens[0].text).toBe('Code');
	});

	test('should parse table with links in cells', () => {
		const tokens = lex('| Site | URL |\n|------|-----|\n| Google | [Link](https://google.com) |');
		const tableToken = getFirstTokenByType(tokens, 'table');

		expect(tableToken).toBeDefined();
		const tableBody = tableToken.tokens.find((t: any) => t.type === 'tbody');
		expect(tableBody).toBeDefined();
		expect(tableBody.tokens.length).toBe(1);

		const firstRow = tableBody.tokens[0]; // tr
		const linkCell = firstRow.tokens[1]; // td (second cell)
		expect(linkCell.tokens).toBeDefined();
		const linkTokens = linkCell.tokens.filter((t: { type: string }) => t.type === 'link');
		expect(linkTokens.length).toBe(1);
		expect(linkTokens[0].href).toBe('https://google.com');
		expect(linkTokens[0].text).toBe('Link');
	});

	test('should parse table with images in cells', () => {
		const tokens = lex(
			'| Description | Image |\n|-------------|-------|\n| Logo | ![Alt](https://example.com/logo.png) |'
		);
		const tableToken = getFirstTokenByType(tokens, 'table');

		expect(tableToken).toBeDefined();
		const tableBody = tableToken.tokens.find((t: any) => t.type === 'tbody');
		expect(tableBody).toBeDefined();
		expect(tableBody.tokens.length).toBe(1);

		const firstRow = tableBody.tokens[0]; // tr
		const imageCell = firstRow.tokens[1]; // td (second cell)
		expect(imageCell.tokens).toBeDefined();
		const imageTokens = imageCell.tokens.filter((t: { type: string }) => t.type === 'image');
		expect(imageTokens.length).toBe(1);
		expect(imageTokens[0].href).toBe('https://example.com/logo.png');
		expect(imageTokens[0].text).toBe('Alt');
	});

	test('should parse table without outer pipes', () => {
		const tokens = lex('Header 1 | Header 2\n---------|----------\nCell 1   | Cell 2');
		const tableToken = getFirstTokenByType(tokens, 'table');

		expect(tableToken).toBeDefined();
		const tableHeader = tableToken.tokens.find((t: any) => t.type === 'thead');
		const tableBody = tableToken.tokens.find((t: any) => t.type === 'tbody');
		expect(tableHeader).toBeDefined();
		expect(tableBody).toBeDefined();

		const headerRow = tableHeader.tokens[0]; // tr
		expect(headerRow.tokens.length).toBe(2);
		expect(headerRow.tokens[0].text).toBe('Header 1');
		expect(headerRow.tokens[1].text).toBe('Header 2');
	});

	test('should parse table with empty cells', () => {
		const tokens = lex(
			'| Name | Age | City |\n|------|-----|------|\n| John |     | NYC  |\n|      | 30  |      |'
		);
		const tableToken = getFirstTokenByType(tokens, 'table');

		expect(tableToken).toBeDefined();
		const tableBody = tableToken.tokens.find((t: any) => t.type === 'tbody');
		expect(tableBody).toBeDefined();
		expect(tableBody.tokens.length).toBe(2);

		// Check empty cells
		const firstRow = tableBody.tokens[0]; // tr
		const secondRow = tableBody.tokens[1]; // tr
		expect(firstRow.tokens[1].text).toBe('');
		expect(secondRow.tokens[0].text).toBe('');
		expect(secondRow.tokens[2].text).toBe('');
	});

	test('should parse table with different column counts (edge case)', () => {
		const tokens = lex('| A | B | C |\n|---|---|---|\n| 1 | 2 |\n| X | Y | Z | Extra |');
		const tableToken = getFirstTokenByType(tokens, 'table');

		expect(tableToken).toBeDefined();
		const tableHeader = tableToken.tokens.find((t: any) => t.type === 'thead');
		const tableBody = tableToken.tokens.find((t: any) => t.type === 'tbody');
		expect(tableHeader).toBeDefined();
		expect(tableBody).toBeDefined();

		const headerRow = tableHeader.tokens[0]; // tr
		expect(headerRow.tokens.length).toBe(3);
		expect(tableBody.tokens.length).toBe(2);

		// First row should have 2 cells (missing third)
		const firstRow = tableBody.tokens[0]; // tr
		expect(firstRow.tokens.length).toBeLessThanOrEqual(3);
		// Second row might have extra cells or be truncated
		const secondRow = tableBody.tokens[1]; // tr
		expect(secondRow.tokens.length).toBeGreaterThanOrEqual(3);
	});

	test('should parse table with special characters in cells', () => {
		const tokens = lex(
			'| Symbol | Meaning |\n|--------|----------|\n| & | Ampersand |\n| < | Less than |\n| > | Greater than |'
		);
		const tableToken = getFirstTokenByType(tokens, 'table');

		expect(tableToken).toBeDefined();
		const tableBody = tableToken.tokens.find((t: any) => t.type === 'tbody');
		expect(tableBody).toBeDefined();
		expect(tableBody.tokens.length).toBe(3);

		expect(tableBody.tokens[0].tokens[0].text).toBe('&');
		expect(tableBody.tokens[1].tokens[0].text).toBe('<');
		expect(tableBody.tokens[2].tokens[0].text).toBe('>');
	});

	test('should parse table with strikethrough in cells', () => {
		const tokens = lex('| Status | Item |\n|--------|------|\n| ~~Done~~ | Task 1 |');
		const tableToken = getFirstTokenByType(tokens, 'table');

		expect(tableToken).toBeDefined();
		const tableBody = tableToken.tokens.find((t: any) => t.type === 'tbody');
		expect(tableBody).toBeDefined();

		const firstRow = tableBody.tokens[0]; // tr
		const strikeCell = firstRow.tokens[0]; // td
		expect(strikeCell.tokens).toBeDefined();
		const delTokens = strikeCell.tokens.filter((t: { type: string }) => t.type === 'del');
		expect(delTokens.length).toBe(1);
		expect(delTokens[0].text).toBe('Done');
	});

	test('should parse table with subscript and superscript in cells', () => {
		const tokens = lex(
			'| Formula | Description |\n|---------|-------------|\n| H~2~O | Water |\n| E = mc^2^ | Energy |'
		);
		const tableToken = getFirstTokenByType(tokens, 'table');

		expect(tableToken).toBeDefined();

		// Check superscript in second row
		const firstRow = tableToken.tokens[1].tokens[0]; // tr
		const supCellFirstRow = firstRow.tokens[0]; // td
		expect(supCellFirstRow.tokens).toBeDefined();
		const supTokenFirstRow = supCellFirstRow.tokens.find((t: { type: string }) => t.type === 'sub');
		expect(supTokenFirstRow).toBeDefined();
		expect(supCellFirstRow.tokens[0].text).toBe('H');
		expect(supTokenFirstRow.text).toBe('2');

		// Check superscript in second row
		const secondRow = tableToken.tokens[1].tokens[1]; // tr
		const supCellSecondRow = secondRow.tokens[0]; // td
		expect(supCellSecondRow.tokens).toBeDefined();
		const supTokenSecondRow = supCellSecondRow.tokens.find(
			(t: { type: string }) => t.type === 'sup'
		);
		expect(supTokenSecondRow).toBeDefined();
		expect(supCellSecondRow.tokens[0].text).toBe('E = mc');
		expect(supTokenSecondRow.text).toBe('2');
	});

	test('should handle table with only header (edge case)', () => {
		const tokens = lex('| Header 1 | Header 2 |\n|----------|----------|');
		const tableToken = getFirstTokenByType(tokens, 'table');

		expect(tableToken).toBeDefined();
		const tableHeader = tableToken.tokens.find((t: any) => t.type === 'thead');
		const tableBody = tableToken.tokens.find((t: any) => t.type === 'tbody');
		expect(tableHeader).toBeDefined();

		const headerRow = tableHeader.tokens[0]; // tr
		expect(headerRow.tokens.length).toBe(2);

		// Table body might not exist or be empty for header-only tables
		if (tableBody) {
			expect(tableBody.tokens.length).toBe(0);
		}
	});

	test('should parse table with mixed alignment', () => {
		const tokens = lex(
			'| Default | Left | Center | Right |\n|---------|:-----|:------:|------:|\n| D1 | L1 | C1 | R1 |'
		);
		const tableToken = getFirstTokenByType(tokens, 'table');

		expect(tableToken).toBeDefined();
		expect(tableToken.align.length).toBe(4);
		expect(tableToken.align[0]).toBeNull(); // Default alignment
		expect(tableToken.align[1]).toBe('left');
		expect(tableToken.align[2]).toBe('center');
		expect(tableToken.align[3]).toBe('right');
	});
});

describe('incomplete markdown', () => {
	test('should complete basic incomplete formatting in table cells', () => {
		const input =
			'| **Bold** | *Incomplete |\n|----------|-------------|\n| Cell 1   | Cell 2      |';
		const result = parseIncompleteMarkdown(input);

		// Should complete incomplete formatters in table cells
		expect(result).toBe(
			'| **Bold** | *Incomplete* |\n|----------|-------------|\n| Cell 1   | Cell 2      |'
		);
	});

	test('should handle line breaks with incomplete formatting in tables', () => {
		const input =
			'| Header 1 | Header 2 |\n|----------|----------|\n| **Bold\n   text** | Normal |';
		const result = parseIncompleteMarkdown(input);

		// Should complete formatting that spans lines in table cells
		expect(result).toBe(
			'| Header 1 | Header 2 |\n|----------|----------|\n| **Bold\n   text** | Normal |'
		);
	});

	test('should handle different table formats with incomplete formatting', () => {
		const input = 'Name | **Incomplete\n----|-------------\nJohn | Normal';
		const result = parseIncompleteMarkdown(input);

		// Should work with different table formats
		expect(result).toBe('Name | **Incomplete**\n----|-------------\nJohn | Normal');
	});

	test('should handle complex tables with multiple incomplete elements', () => {
		const input =
			'| **Bold** | *Italic | `Code | [Link |\n|----------|---------|-------|-------|\n| Cell 1   | Cell 2  | Cell 3 | Cell 4 |';
		const result = parseIncompleteMarkdown(input);

		// Should complete incomplete formatters at end of string
		expect(result).toBe(
			'| **Bold** | *Italic | `Code | [Link |*`](streamdown:incomplete-link)\n|----------|---------|-------|-------|\n| Cell 1   | Cell 2  | Cell 3 | Cell 4 |'
		);
	});
});
