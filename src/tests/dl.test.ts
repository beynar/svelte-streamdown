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
