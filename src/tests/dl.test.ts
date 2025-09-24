import { describe, test, expect } from 'vitest';
import { parseIncompleteMarkdown } from '../lib/utils/parse-incomplete-markdown.js';

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

		test('should complete incomplete bold formatting inside description list', () => {
			const input = ': **Topic';
			const result = parseIncompleteMarkdown(input);
			expect(result).toBe(': **Topic**:');
		});

		test('should complete incomplete italic formatting inside description list', () => {
			const input = ': *Topic';
			const result = parseIncompleteMarkdown(input);
			expect(result).toBe(': *Topic*:');
		});

		test('should complete incomplete code formatting inside description list', () => {
			const input = ': `Topic';
			const result = parseIncompleteMarkdown(input);
			expect(result).toBe(': `Topic`:');
		});

		test('should complete multiple incomplete formatting inside description list', () => {
			const input = ': **Bold and *italic* and `code';
			const result = parseIncompleteMarkdown(input);
			expect(result).toBe(': **Bold and *italic* and `code`**:');
		});

		test('should complete description list with links', () => {
			const input = ': [Link text](incomplete-url';
			const result = parseIncompleteMarkdown(input);
			expect(result).toBe(': [Link text](streamdown:incomplete-link):');
		});
	});
});
