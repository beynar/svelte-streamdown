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

// Tests for literal asterisks in text (not markdown formatting)
test('single asterisk at end of sentence', () => {
	const result = parseIncompleteMarkdown('I am using an asterisk like this*');

	console.log(result);
	expect(result).toBe('I am using an asterisk like this*'); // Should remain unchanged
});

test('asterisk in middle of word', () => {
	const result = parseIncompleteMarkdown('The variable is named test*var');

	console.log(result);
	expect(result).toBe('The variable is named test*var'); // Should remain unchanged
});

test('multiple asterisks in text', () => {
	const result = parseIncompleteMarkdown('Math: 2*3*4=24');

	console.log(result);
	expect(result).toBe('Math: 2*3*4=24'); // Should remain unchanged
});

test('asterisk after punctuation', () => {
	const result = parseIncompleteMarkdown('Note: This is important! *');

	console.log(result);
	expect(result).toBe('Note: This is important! *'); // Should remain unchanged
});

test('asterisk in filename', () => {
	const result = parseIncompleteMarkdown('The file is config*.txt');

	console.log(result);
	expect(result).toBe('The file is config*.txt'); // Should remain unchanged
});

test('asterisk in code-like text', () => {
	const result = parseIncompleteMarkdown('Use git* to clone repositories');

	console.log(result);
	expect(result).toBe('Use git* to clone repositories'); // Should remain unchanged
});

test('asterisk in middle of sentence', () => {
	const result = parseIncompleteMarkdown('The price is $5* per item');

	console.log(result);
	expect(result).toBe('The price is $5* per item'); // Should remain unchanged
});

test('asterisk at start of line', () => {
	const result = parseIncompleteMarkdown('* This is not a list item');

	console.log(result);
	expect(result).toBe('* This is not a list item'); // Should remain unchanged (no space after *)
});

test('asterisk in quoted text', () => {
	const result = parseIncompleteMarkdown('He said "use the asterisk*" for multiplication');

	console.log(result);
	expect(result).toBe('He said "use the asterisk*" for multiplication'); // Should remain unchanged
});

test('asterisk in technical notation', () => {
	const result = parseIncompleteMarkdown('The complexity is O(n*)');

	console.log(result);
	expect(result).toBe('The complexity is O(n*)'); // Should remain unchanged
});
