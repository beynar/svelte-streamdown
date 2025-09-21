import { describe, test, expect } from 'vitest';
import { parseIncompleteMarkdown } from '$lib/utils/parse-incomplete-markdown';

describe('weird cases for images and links', () => {
	test('should handle image alt text with special characters', () => {
		const input = 'Check out this ![Image with spaces & symbols!@#] and ![Another image';
		const result = parseIncompleteMarkdown(input);

		expect(result).toBe(
			'Check out this ![Image with spaces & symbols!@#] and ![Another image](streamdown:incomplete-image)'
		);
	});

	test('should handle nested brackets in image alt text', () => {
		const input = 'Image: ![Alt [nested] text] and ![Incomplete [nested]';
		const result = parseIncompleteMarkdown(input);

		expect(result).toBe('Image: ![Alt [nested] text] and ![Incomplete [nested]');
	});

	test('should handle image with exclamation marks in alt text', () => {
		const input = 'Wow: ![Amazing!!! Image] and ![Wow!!';
		const result = parseIncompleteMarkdown(input);

		expect(result).toBe('Wow: ![Amazing!!! Image] and ![Wow!!](streamdown:incomplete-image)');
	});

	test('should handle link text with image syntax', () => {
		const input = 'Link: [This looks like ![an image]] and [Incomplete ![image]';
		const result = parseIncompleteMarkdown(input);

		expect(result).toBe('Link: [This looks like ![an image]] and [Incomplete ![image]');
	});

	test('should handle mixed images and links on same line', () => {
		const input = 'Complex: ![Image] [link] ![another image] [another link';
		const result = parseIncompleteMarkdown(input);

		expect(result).toBe(
			'Complex: ![Image] [link] ![another image] [another link](streamdown:incomplete-link)'
		);
	});

	test('should handle images with URLs containing special characters', () => {
		const input =
			'Image: ![Alt](https://example.com/image with spaces.jpg) and ![Incomplete](https://example.com/image with spaces';
		const result = parseIncompleteMarkdown(input);

		expect(result).toBe(
			'Image: ![Alt](https://example.com/image with spaces.jpg) and ![Incomplete](https://example.com/image with spaces)'
		);
	});

	test('should handle links with parentheses in text', () => {
		const input = 'Link: [Text (with parens)] and [Incomplete (with parens';
		const result = parseIncompleteMarkdown(input);

		expect(result).toBe(
			'Link: [Text (with parens)] and [Incomplete (with parens](streamdown:incomplete-link)'
		);
	});

	test('should handle images with quotes in alt text', () => {
		const input = 'Image: !["Quoted alt text"] and !["Incomplete quote';
		const result = parseIncompleteMarkdown(input);

		expect(result).toBe(
			'Image: !["Quoted alt text"] and !["Incomplete quote](streamdown:incomplete-image)'
		);
	});

	test('should handle very long alt text/image names', () => {
		const input = `Image: ![This is a very very very very very very very very very very very very very very very very very very very very very very very long alt text] and ![Short`;
		const result = parseIncompleteMarkdown(input);

		expect(result).toBe(
			`Image: ![This is a very very very very very very very very very very very very very very very very very very very very very very very long alt text] and ![Short](streamdown:incomplete-image)`
		);
	});

	test('should handle images/links with unicode characters', () => {
		const input = 'Unicode: ![🚀 Rocket] [🌟 Star] ![🚀 Incomplete] [🌟 Incomplete';
		const result = parseIncompleteMarkdown(input);

		expect(result).toBe(
			'Unicode: ![🚀 Rocket] [🌟 Star] ![🚀 Incomplete] [🌟 Incomplete](streamdown:incomplete-link)'
		);
	});

	test('should handle images with file extensions in alt text', () => {
		const input = 'Image: ![photo.jpg] [document.pdf] ![screenshot.png] [readme';
		const result = parseIncompleteMarkdown(input);

		expect(result).toBe(
			'Image: ![photo.jpg] [document.pdf] ![screenshot.png] [readme](streamdown:incomplete-link)'
		);
	});

	test('should handle nested markdown in image alt text', () => {
		const input = 'Complex: ![**Bold** *italic* `code`] and ![Incomplete **bold*';
		const result = parseIncompleteMarkdown(input);

		expect(result).toBe(
			'Complex: ![**Bold** *italic* `code`] and ![Incomplete **bold**](streamdown:incomplete-image)'
		);
	});

	test('should handle images/links with numbers', () => {
		const input = 'Version: ![1.0] [2.0] ![3.0] [4.0';
		const result = parseIncompleteMarkdown(input);

		expect(result).toBe('Version: ![1.0] [2.0] ![3.0] [4.0](streamdown:incomplete-link)');
	});

	test('should handle images with empty alt text', () => {
		const input = 'Empty: ![] and ![Alt] and ![] and ![Incomplete';
		const result = parseIncompleteMarkdown(input);

		expect(result).toBe('Empty: ![] and ![Alt] and ![] and ![Incomplete](streamdown:incomplete-image)');
	});

	test('should handle links with empty text', () => {
		const input = 'Empty: [] and [text] and [] and [incomplete';
		const result = parseIncompleteMarkdown(input);

		expect(result).toBe('Empty: [] and [text] and [] and [incomplete](streamdown:incomplete-link)');
	});

	test('should handle mixed complete and incomplete on same line', () => {
		const input = 'Mixed: ![Complete](url.jpg) [Complete](url.com) ![Incomplete] [Incomplete';
		const result = parseIncompleteMarkdown(input);

		expect(result).toBe('Mixed: ![Complete](url.jpg) [Complete](url.com) ![Incomplete] [Incomplete');
	});

	test('should handle images/links with HTML entities', () => {
		const input = 'HTML: ![&lt;tag&gt;] [&amp; entity] ![&lt;incomplete&gt;] [&amp; incomplete';
		const result = parseIncompleteMarkdown(input);

		expect(result).toBe('HTML: ![&lt;tag&gt;] [&amp; entity] ![&lt;incomplete&gt;] [&amp; incomplete](streamdown:incomplete-link)');
	});

	test('should handle images with newlines in alt text (edge case)', () => {
		const input = 'Image: ![Alt\ntext] and ![Incomplete\nalt';
		const result = parseIncompleteMarkdown(input);

		// This should handle the newline case properly
		expect(result).toBe('Image: ![Alt\ntext] and ![Incomplete\nalt](streamdown:incomplete-image)');
	});

	test('should handle extremely nested brackets', () => {
		const input = 'Nested: [[[[deep]]]] [[[[incomplete]]]';
		const result = parseIncompleteMarkdown(input);

		expect(result).toBe('Nested: [[[[deep]]]] [[[[incomplete]]]');
	});
});
