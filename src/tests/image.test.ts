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
	test('should parse simple image and verify all properties', () => {
		const tokens = lex('![Alt text](https://example.com/image.jpg)');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		expect(paragraphToken.tokens).toBeDefined();

		const paragraphTokens = paragraphToken.tokens || [];
		const imageTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'image');

		expect(imageTokens.length).toBe(1);
		expect(imageTokens[0].type).toBe('image');
		expect(imageTokens[0].href).toBe('https://example.com/image.jpg');
		expect(imageTokens[0].text).toBe('Alt text');
		expect(imageTokens[0].title).toBeNull();
		expect(imageTokens[0].raw).toBe('![Alt text](https://example.com/image.jpg)');
	});

	test('should parse image with title and verify title property', () => {
		const tokens = lex('![Alt text](https://example.com/image.jpg "Image Title")');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const imageTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'image');

		expect(imageTokens.length).toBe(1);
		expect(imageTokens[0].href).toBe('https://example.com/image.jpg');
		expect(imageTokens[0].text).toBe('Alt text');
		expect(imageTokens[0].title).toBe('Image Title');
		expect(imageTokens[0].raw).toBe('![Alt text](https://example.com/image.jpg "Image Title")');
	});

	test('should parse image with empty alt text', () => {
		const tokens = lex('![](https://example.com/image.jpg)');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const imageTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'image');

		expect(imageTokens.length).toBe(1);
		expect(imageTokens[0].text).toBe('');
		expect(imageTokens[0].href).toBe('https://example.com/image.jpg');
	});

	test('should parse image with complex alt text', () => {
		const tokens = lex(
			'![Complex alt text with **bold** and *italic*](https://example.com/image.jpg)'
		);
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const imageTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'image');

		expect(imageTokens.length).toBe(1);
		expect(imageTokens[0].text).toBe('Complex alt text with **bold** and *italic*');
		expect(imageTokens[0].href).toBe('https://example.com/image.jpg');
	});

	test('should parse image with relative URL', () => {
		const tokens = lex('![Local image](./images/local.png)');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const imageTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'image');

		expect(imageTokens.length).toBe(1);
		expect(imageTokens[0].href).toBe('./images/local.png');
		expect(imageTokens[0].text).toBe('Local image');
	});

	test('should parse image with absolute path', () => {
		const tokens = lex('![Absolute image](/assets/image.svg)');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const imageTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'image');

		expect(imageTokens.length).toBe(1);
		expect(imageTokens[0].href).toBe('/assets/image.svg');
		expect(imageTokens[0].text).toBe('Absolute image');
	});

	test('should parse image with data URL', () => {
		const tokens = lex(
			'![Data image](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==)'
		);
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const imageTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'image');

		expect(imageTokens.length).toBe(1);
		expect(imageTokens[0].text).toBe('Data image');
		expect(imageTokens[0].href).toContain('data:image/png;base64,');
	});

	test('should parse multiple images in same paragraph', () => {
		const tokens = lex('![Image 1](img1.jpg) and ![Image 2](img2.jpg)');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const imageTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'image');

		expect(imageTokens.length).toBe(2);
		expect(imageTokens[0].text).toBe('Image 1');
		expect(imageTokens[0].href).toBe('img1.jpg');
		expect(imageTokens[1].text).toBe('Image 2');
		expect(imageTokens[1].href).toBe('img2.jpg');
	});

	test('should parse image in heading', () => {
		const tokens = lex('# Heading with ![Icon](icon.png)');
		const headingToken = getFirstTokenByType(tokens, 'heading');

		expect(headingToken).toBeDefined();
		expect(headingToken.tokens).toBeDefined();

		const headingTokens = headingToken.tokens || [];
		const imageTokens = headingTokens.filter((t: { type: string }) => t.type === 'image');

		expect(imageTokens.length).toBe(1);
		expect(imageTokens[0].text).toBe('Icon');
		expect(imageTokens[0].href).toBe('icon.png');
	});

	test('should parse image in blockquote', () => {
		const tokens = lex('> Quote with ![Image](quote-image.jpg)');
		const blockquoteToken = getFirstTokenByType(tokens, 'blockquote');

		expect(blockquoteToken).toBeDefined();
		const nestedTokens = blockquoteToken.tokens || [];
		const paragraphToken = nestedTokens.find((t: any) => t.type === 'paragraph');
		expect(paragraphToken).toBeDefined();

		const paragraphTokens = paragraphToken.tokens || [];
		const imageTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'image');

		expect(imageTokens.length).toBe(1);
		expect(imageTokens[0].text).toBe('Image');
		expect(imageTokens[0].href).toBe('quote-image.jpg');
	});

	test('should parse image in list item', () => {
		const tokens = lex('- Item with ![Image](list-image.png)');
		const listToken = getFirstTokenByType(tokens, 'list');

		expect(listToken).toBeDefined();
		expect(listToken.tokens.length).toBe(1);

		const listItemTokens = listToken.tokens[0].tokens || [];
		const paragraphToken = listItemTokens.find((t: any) => t.type === 'text');
		expect(paragraphToken).toBeDefined();

		const paragraphTokens = paragraphToken.tokens || [];
		const imageTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'image');

		expect(imageTokens.length).toBe(1);
		expect(imageTokens[0].text).toBe('Image');
		expect(imageTokens[0].href).toBe('list-image.png');
	});

	test('should parse image with special characters in alt text', () => {
		const tokens = lex('![Alt with & < > " \' symbols](image.jpg)');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const imageTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'image');

		expect(imageTokens.length).toBe(1);
		expect(imageTokens[0].text).toBe('Alt with & < > " \' symbols');
	});

	test('should parse image with query parameters in URL', () => {
		const tokens = lex('![Image](https://example.com/image.jpg?width=300&height=200)');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const imageTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'image');

		expect(imageTokens.length).toBe(1);
		expect(imageTokens[0].href).toBe('https://example.com/image.jpg?width=300&height=200');
	});

	test('should parse image with fragment in URL', () => {
		const tokens = lex('![SVG part](image.svg#part1)');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const imageTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'image');

		expect(imageTokens.length).toBe(1);
		expect(imageTokens[0].href).toBe('image.svg#part1');
	});

	test('should handle image with brackets in alt text (edge case)', () => {
		const tokens = lex('![Alt [with] brackets](image.jpg)');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const imageTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'image');

		expect(imageTokens.length).toBe(1);
		expect(imageTokens[0].text).toBe('Alt [with] brackets');
	});

	test('should handle image with parentheses in URL (edge case)', () => {
		const tokens = lex('![Image](https://example.com/image(1).jpg)');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const imageTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'image');

		expect(imageTokens.length).toBe(1);
		expect(imageTokens[0].href).toBe('https://example.com/image(1).jpg');
	});

	test('should parse reference-style image', () => {
		const tokens = lex('![Alt text][image-ref]\n\n[image-ref]: https://example.com/image.jpg');
		const paragraphToken = getFirstTokenByType(tokens, 'paragraph');

		expect(paragraphToken).toBeDefined();
		const paragraphTokens = paragraphToken.tokens || [];
		const imageTokens = paragraphTokens.filter((t: { type: string }) => t.type === 'image');

		expect(imageTokens.length).toBe(1);
		expect(imageTokens[0].text).toBe('Alt text');
		expect(imageTokens[0].href).toBe('https://example.com/image.jpg');
	});
});

describe('incomplete markdown', () => {
	test('should complete basic incomplete image formatting', () => {
		const input = 'Show ![Image1 and ![Image2';
		const result = parseIncompleteMarkdown(input);

		// Should complete incomplete images at end
		expect(result).toBe('Show ![Image1 and ![Image2](streamdown:incomplete-image)');
	});

	test('should handle line breaks with incomplete images', () => {
		const input = 'First line ![Image1\nSecond line ![Image2](';
		const result = parseIncompleteMarkdown(input);

		// Should complete images at end of lines
		expect(result).toBe('First line ![Image1\nSecond line ![Image2](streamdown:incomplete-image)');
	});

	test('should handle complete and incomplete images together', () => {
		const input = 'Complete ![Image](image.jpg) and incomplete ![Alt';
		const result = parseIncompleteMarkdown(input);

		// Should preserve complete image and complete incomplete one
		expect(result).toBe('Complete ![Image](image.jpg) and incomplete ![Alt');
	});

	test('should handle images in different contexts', () => {
		const input = '# Heading with ![Image\n\n> Blockquote with ![Another](';
		const result = parseIncompleteMarkdown(input);

		// Should complete images at end of lines
		expect(result).toBe(
			'# Heading with ![Image](streamdown:incomplete-image)\n\n> Blockquote with ![Another]('
		);
	});
});
