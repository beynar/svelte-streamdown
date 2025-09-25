import { describe, test, expect } from 'vitest';
import { parseIncompleteMarkdown } from '../lib/utils/parse-incomplete-markdown.js';
import { lex } from '$lib/index.js';

function getFirstTokenByType(tokens: any[], type: string) {
	return tokens.find((token) => token.type === type);
}

describe('tokenizing', () => {
	test('should not tokenize description list items', () => {
		const input =
			'- **Original Streamdown**: [Vercel](https://vercel.com) for creating the original React component';

		const tokens = lex(input);
		const listToken = getFirstTokenByType(tokens, 'list');
		const listItemToken = getFirstTokenByType(listToken.tokens, 'list_item');

		expect(listToken).toBeDefined();
		expect(listItemToken).toBeDefined();
		console.dir(listItemToken.tokens[0], { depth: null });
		expect(listItemToken.tokens[0].tokens[0].type).toBe('strong');
		expect(listItemToken.tokens[0].tokens[1].type).not.toBe('description');
	});

	test('should tokenize description list with single item', () => {
		const input = ': Term: Description';

		const tokens = lex(input);
		const dlToken = getFirstTokenByType(tokens, 'descriptionList');

		expect(dlToken).toBeDefined();
		expect(dlToken.type).toBe('descriptionList');
		expect(dlToken.tokens).toHaveLength(1);

		const descToken = dlToken.tokens[0];
		expect(descToken.type).toBe('description');
		expect(descToken.tokens).toHaveLength(2);

		const termToken = descToken.tokens[0];
		expect(termToken.type).toBe('descriptionTerm');
		expect(termToken.raw).toBe('Term');

		const detailToken = descToken.tokens[1];
		expect(detailToken.type).toBe('descriptionDetail');
		expect(detailToken.raw).toBe('Description');
	});

	test('should tokenize description list with multiple items', () => {
		const input = ': First Term: First Description\n: Second Term: Second Description';

		const tokens = lex(input);
		const dlToken = getFirstTokenByType(tokens, 'descriptionList');

		expect(dlToken).toBeDefined();
		expect(dlToken.type).toBe('descriptionList');
		expect(dlToken.tokens).toHaveLength(2);

		// Check first description
		const firstDesc = dlToken.tokens[0];
		expect(firstDesc.type).toBe('description');
		expect(firstDesc.tokens[0].raw).toBe('First Term');
		expect(firstDesc.tokens[1].raw).toBe('First Description');

		// Check second description
		const secondDesc = dlToken.tokens[1];
		expect(secondDesc.type).toBe('description');
		expect(secondDesc.tokens[0].raw).toBe('Second Term');
		expect(secondDesc.tokens[1].raw).toBe('Second Description');
	});
});
describe('description list parsing', () => {
	describe('incomplete markdown', () => {
		test('should complete incomplete description list items', () => {
			const input = ': Topic 3';
			const result = parseIncompleteMarkdown(input);
			expect(result).toBe(': Topic 3:');
		});

		test('should complete multiple incomplete description list items', () => {
			const input = ': Topic 1\n: Topic 2\n: Topic 3';
			const result = parseIncompleteMarkdown(input);
			expect(result).toBe(': Topic 1:\n: Topic 2:\n: Topic 3:');
		});

		test('should not modify complete description list items', () => {
			const input = ': Topic 1: Description here\n: Topic 2: Another description';
			const result = parseIncompleteMarkdown(input);
			expect(result).toBe(': Topic 1: Description here\n: Topic 2: Another description');
		});

		test('should handle description list items with whitespace', () => {
			const input = '  : Topic 3';
			const result = parseIncompleteMarkdown(input);
			expect(result).toBe('  : Topic 3:');
		});

		test('should not complete if content contains colons', () => {
			const input = ': Topic: with colon in middle';
			const result = parseIncompleteMarkdown(input);
			expect(result).toBe(': Topic: with colon in middle');
		});

		test('should not modify description list lines inside fenced code blocks', () => {
			const input = '```\n: This should not be modified\n```';
			const result = parseIncompleteMarkdown(input);
			expect(result).toBe('```\n: This should not be modified\n```');
		});

		test('should not modify description list lines inside fenced code blocks with tildes', () => {
			const input = '~~~\n: This should not be modified\n~~~';
			const result = parseIncompleteMarkdown(input);
			expect(result).toBe('~~~\n: This should not be modified\n~~~');
		});

		test('should process description list lines outside fenced code blocks', () => {
			const input = '```\n: This should not be modified\n```\n: This should be processed';
			const result = parseIncompleteMarkdown(input);
			expect(result).toBe('```\n: This should not be modified\n```\n: This should be processed:');
		});
	});
});
