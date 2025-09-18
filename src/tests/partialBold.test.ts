import { expect, test } from 'vitest';
import { parseIncompleteMarkdown } from '../lib/utils/parse-incomplete-markdown.js';

test('partial bold', () => {
	const result = parseIncompleteMarkdown('**Hello');

	console.log(result);
	expect(result).toBe('**Hello**');
});

test('partial bold', () => {
	const result = parseIncompleteMarkdown('*Hello');

	console.log(result);
	expect(result).toBe('*Hello*');
});

test('partial bold', () => {
	const result = parseIncompleteMarkdown('- Basic text marks: **bold*');

	console.log(result);
	expect(result).toBe('- Basic text marks: **bold**');
	// TODO: fix this it is actually '- Basic text marks: **bold*'
});
