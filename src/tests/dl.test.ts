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
			const input = ': **Bold and *italic and `code';
			const result = parseIncompleteMarkdown(input);
			expect(result).toBe(': **Bold and *italic and `code`:');
		});

		test('should complete description list with links', () => {
			const input = ': [Link text](incomplete-url';
			const result = parseIncompleteMarkdown(input);
			expect(result).toBe(': [Link text](streamdown:incomplete-link):');
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

		test('should handle fenced code blocks with different indentation', () => {
			const input = '  ```\n  : This should not be modified\n  ```';
			const result = parseIncompleteMarkdown(input);
			expect(result).toBe('  ```\n  : This should not be modified\n  ```');
		});

		test('should process description list lines outside fenced code blocks', () => {
			const input = '```\n: This should not be modified\n```\n: **This should be processed**';
			const result = parseIncompleteMarkdown(input);
			expect(result).toBe(
				'```\n: This should not be modified\n```\n: **This should be processed**:'
			);
		});

		test('should apply formatters in correct order: bold-italic first', () => {
			const input = ': ***Bold and italic***';
			const result = parseIncompleteMarkdown(input);
			expect(result).toBe(': ***Bold and italic***:');
		});

		test('should apply formatters in correct order: bold second', () => {
			const input = ': **Bold**';
			const result = parseIncompleteMarkdown(input);
			expect(result).toBe(': **Bold**:');
		});

		test('should apply formatters in correct order: double underscore italic third', () => {
			const input = ': __Italic__';
			const result = parseIncompleteMarkdown(input);
			expect(result).toBe(': __Italic__:');
		});

		test('should apply formatters in correct order: strikethrough fourth', () => {
			const input = ': ~~Strike~~';
			const result = parseIncompleteMarkdown(input);
			expect(result).toBe(': ~~Strike~~:');
		});

		test('should apply formatters in correct order: inline code fifth', () => {
			const input = ': `Code`';
			const result = parseIncompleteMarkdown(input);
			expect(result).toBe(': `Code`:');
		});

		test('should apply formatters in correct order: single asterisk italic sixth', () => {
			const input = ': *Italic*';
			const result = parseIncompleteMarkdown(input);
			expect(result).toBe(': *Italic*:');
		});

		test('should apply formatters in correct order: single underscore italic seventh', () => {
			const input = ': _Italic_';
			const result = parseIncompleteMarkdown(input);
			expect(result).toBe(': _Italic_:');
		});

		test('should apply formatters in correct order: subscript eighth', () => {
			const input = ': ~Sub~';
			const result = parseIncompleteMarkdown(input);
			expect(result).toBe(': ~Sub~:');
		});

		test('should apply formatters in correct order: superscript ninth', () => {
			const input = ': ^Sup^';
			const result = parseIncompleteMarkdown(input);
			expect(result).toBe(': ^Sup^:');
		});

		test('should apply formatters in correct order: block katex tenth', () => {
			const input = ': $$Math$$';
			const result = parseIncompleteMarkdown(input);
			expect(result).toBe(': $$Math$$:');
		});

		test('should apply formatters in correct order: inline math eleventh', () => {
			const input = ': $Math$';
			const result = parseIncompleteMarkdown(input);
			expect(result).toBe(': $Math$:');
		});

		test('should apply formatters in correct order: links last', () => {
			const input = ': [Link](url';
			const result = parseIncompleteMarkdown(input);
			expect(result).toBe(': [Link](streamdown:incomplete-link):');
		});

		test('should handle fence detection with backticks', () => {
			const input = '```\n: **Topic\n```';
			const result = parseIncompleteMarkdown(input);
			expect(result).toBe('```\n: **Topic\n```');
		});

		test('should handle fence detection with tildes', () => {
			const input = '~~~\n: **Topic\n~~~';
			const result = parseIncompleteMarkdown(input);
			expect(result).toBe('~~~\n: **Topic**\n~~~');
		});

		test('should handle fence detection with indentation', () => {
			const input = '  ```\n  : **Topic\n  ```';
			const result = parseIncompleteMarkdown(input);
			expect(result).toBe('  ```\n  : **Topic\n  ```');
		});

		test('should handle fence detection with mixed content', () => {
			const input = '```\n: **Topic in fence\n```\n: **Topic outside fence**';
			const result = parseIncompleteMarkdown(input);
			expect(result).toBe('```\n: **Topic in fence\n```\n: **Topic outside fence**:');
		});
	});
});
