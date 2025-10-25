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

describe('MDX tokenization', () => {
	test('should parse self-closing MDX component', () => {
		const tokens = lex('<MyComponent />');
		const mdxToken = getFirstTokenByType(tokens, 'mdx');

		expect(mdxToken).toBeDefined();
		expect(mdxToken.type).toBe('mdx');
		expect(mdxToken.tagName).toBe('MyComponent');
		expect(mdxToken.selfClosing).toBe(true);
		expect(mdxToken.attributes).toEqual({});
	});

	test('should parse self-closing MDX component with string attribute', () => {
		const tokens = lex('<Card title="Hello World" />');
		const mdxToken = getFirstTokenByType(tokens, 'mdx');

		expect(mdxToken).toBeDefined();
		expect(mdxToken.tagName).toBe('Card');
		expect(mdxToken.selfClosing).toBe(true);
		expect(mdxToken.attributes).toEqual({ title: 'Hello World' });
	});

	test('should parse self-closing MDX component with number attribute', () => {
		const tokens = lex('<Counter count={42} />');
		const mdxToken = getFirstTokenByType(tokens, 'mdx');

		expect(mdxToken).toBeDefined();
		expect(mdxToken.tagName).toBe('Counter');
		expect(mdxToken.attributes).toEqual({ count: 42 });
		expect(typeof mdxToken.attributes.count).toBe('number');
	});

	test('should parse self-closing MDX component with boolean attributes', () => {
		const tokens = lex('<Toggle enabled={true} disabled={false} />');
		const mdxToken = getFirstTokenByType(tokens, 'mdx');

		expect(mdxToken).toBeDefined();
		expect(mdxToken.tagName).toBe('Toggle');
		expect(mdxToken.attributes).toEqual({ enabled: true, disabled: false });
		expect(typeof mdxToken.attributes.enabled).toBe('boolean');
		expect(typeof mdxToken.attributes.disabled).toBe('boolean');
	});

	test('should parse self-closing MDX component with multiple mixed attributes', () => {
		const tokens = lex('<Button label="Click me" count={5} active={true} />');
		const mdxToken = getFirstTokenByType(tokens, 'mdx');

		expect(mdxToken).toBeDefined();
		expect(mdxToken.tagName).toBe('Button');
		expect(mdxToken.attributes).toEqual({
			label: 'Click me',
			count: 5,
			active: true
		});
	});

	test('should parse MDX component with children', () => {
		const tokens = lex('<Card>\nThis is content\n</Card>');
		const mdxToken = getFirstTokenByType(tokens, 'mdx');

		expect(mdxToken).toBeDefined();
		expect(mdxToken.tagName).toBe('Card');
		expect(mdxToken.selfClosing).toBe(false);
		expect(mdxToken.tokens).toBeDefined();
		expect(mdxToken.tokens.length).toBeGreaterThan(0);
	});

	test('should parse MDX component with markdown children', () => {
		const tokens = lex('<Alert>\n## Warning\nThis is **bold** text\n</Alert>');
		const mdxToken = getFirstTokenByType(tokens, 'mdx');

		expect(mdxToken).toBeDefined();
		expect(mdxToken.tagName).toBe('Alert');
		expect(mdxToken.tokens).toBeDefined();

		// Check that children were parsed as markdown
		const heading = mdxToken.tokens.find((t: any) => t.type === 'heading');
		expect(heading).toBeDefined();
		expect(heading.depth).toBe(2);

		const paragraph = mdxToken.tokens.find((t: any) => t.type === 'paragraph');
		expect(paragraph).toBeDefined();
	});

	test('should parse MDX component with attributes and children', () => {
		const tokens = lex('<Card title="My Card" count={3}>\nCard content here\n</Card>');
		const mdxToken = getFirstTokenByType(tokens, 'mdx');

		expect(mdxToken).toBeDefined();
		expect(mdxToken.tagName).toBe('Card');
		expect(mdxToken.selfClosing).toBe(false);
		expect(mdxToken.attributes).toEqual({ title: 'My Card', count: 3 });
		expect(mdxToken.tokens).toBeDefined();
		expect(mdxToken.tokens.length).toBeGreaterThan(0);
	});

	test('should parse nested MDX components', () => {
		const tokens = lex('<Container>\n<Card title="Inner">\nContent\n</Card>\n</Container>');
		const mdxTokens = getTokensByType(tokens, 'mdx');

		expect(mdxTokens.length).toBeGreaterThan(0);
		const containerToken = mdxTokens[0];
		expect(containerToken.tagName).toBe('Container');

		// Check for nested MDX token in children
		const nestedMdx = containerToken.tokens?.find((t: any) => t.type === 'mdx');
		expect(nestedMdx).toBeDefined();
		expect(nestedMdx.tagName).toBe('Card');
	});

	test('should parse MDX component with list children', () => {
		const tokens = lex('<Alert>\n- Item 1\n- Item 2\n- Item 3\n</Alert>');
		const mdxToken = getFirstTokenByType(tokens, 'mdx');

		expect(mdxToken).toBeDefined();
		expect(mdxToken.tokens).toBeDefined();

		const listToken = mdxToken.tokens.find((t: any) => t.type === 'list');
		expect(listToken).toBeDefined();
		expect(listToken.ordered).toBe(false);
		expect(listToken.tokens.length).toBe(3);
	});

	test('should parse MDX component with code block children', () => {
		const tokens = lex('<CodeExample>\n```javascript\nconst x = 1;\n```\n</CodeExample>');
		const mdxToken = getFirstTokenByType(tokens, 'mdx');

		expect(mdxToken).toBeDefined();
		expect(mdxToken.tokens).toBeDefined();

		const codeToken = mdxToken.tokens.find((t: any) => t.type === 'code');
		expect(codeToken).toBeDefined();
		expect(codeToken.lang).toBe('javascript');
	});

	test('should parse MDX component name with numbers', () => {
		const tokens = lex('<Component123 />');
		const mdxToken = getFirstTokenByType(tokens, 'mdx');

		expect(mdxToken).toBeDefined();
		expect(mdxToken.tagName).toBe('Component123');
	});

	test('should parse MDX component with floating point number attribute', () => {
		const tokens = lex('<Slider value={3.14} />');
		const mdxToken = getFirstTokenByType(tokens, 'mdx');

		expect(mdxToken).toBeDefined();
		expect(mdxToken.attributes.value).toBe(3.14);
		expect(typeof mdxToken.attributes.value).toBe('number');
	});

	test('should parse MDX component with negative number attribute', () => {
		const tokens = lex('<Temperature degrees={-5} />');
		const mdxToken = getFirstTokenByType(tokens, 'mdx');

		expect(mdxToken).toBeDefined();
		expect(mdxToken.attributes.degrees).toBe(-5);
		expect(typeof mdxToken.attributes.degrees).toBe('number');
	});

	test('should parse empty MDX component', () => {
		const tokens = lex('<Empty></Empty>');
		const mdxToken = getFirstTokenByType(tokens, 'mdx');

		expect(mdxToken).toBeDefined();
		expect(mdxToken.tagName).toBe('Empty');
		expect(mdxToken.selfClosing).toBe(false);
		expect(mdxToken.tokens).toEqual([]);
	});

	test('should parse multiple MDX components in sequence', () => {
		const tokens = lex('<Card1 />\n\n<Card2 />\n\n<Card3 />');
		const mdxTokens = getTokensByType(tokens, 'mdx');

		expect(mdxTokens.length).toBe(3);
		expect(mdxTokens[0].tagName).toBe('Card1');
		expect(mdxTokens[1].tagName).toBe('Card2');
		expect(mdxTokens[2].tagName).toBe('Card3');
	});

	test('should parse MDX component with empty string attribute', () => {
		const tokens = lex('<Input value="" />');
		const mdxToken = getFirstTokenByType(tokens, 'mdx');

		expect(mdxToken).toBeDefined();
		expect(mdxToken.attributes.value).toBe('');
	});

	test('should parse MDX component with expression attribute (variable reference)', () => {
		const tokens = lex('<Display value={myVariable} />');
		const mdxToken = getFirstTokenByType(tokens, 'mdx');

		expect(mdxToken).toBeDefined();
		expect(mdxToken.attributes.value).toBe('myVariable');
	});

	test('should parse nested MDX components with same tag name', () => {
		const tokens = lex('<Box id="outer">\n<Box id="inner">\nNested content\n</Box>\n</Box>');
		const mdxTokens = getTokensByType(tokens, 'mdx');

		expect(mdxTokens.length).toBeGreaterThan(0);
		const outerBox = mdxTokens[0];
		expect(outerBox.tagName).toBe('Box');
		expect(outerBox.attributes.id).toBe('outer');

		// Check that inner Box is in the children tokens
		const innerBox = outerBox.tokens?.find((t: any) => t.type === 'mdx');
		expect(innerBox).toBeDefined();
		expect(innerBox.tagName).toBe('Box');
		expect(innerBox.attributes.id).toBe('inner');

		// Check that nested content is in the inner box
		const innerContent = innerBox.tokens?.find((t: any) => t.type === 'paragraph');
		expect(innerContent).toBeDefined();
	});

	test('should not parse lowercase component as MDX', () => {
		const tokens = lex('<lowercase />');
		const mdxTokens = getTokensByType(tokens, 'mdx');

		// Lowercase tags should not be parsed as MDX (must start with capital)
		expect(mdxTokens.length).toBe(0);
	});

	test('should parse MDX component with inline markdown children', () => {
		const tokens = lex('<Callout>This is *italic* and **bold**</Callout>');
		const mdxToken = getFirstTokenByType(tokens, 'mdx');

		expect(mdxToken).toBeDefined();
		expect(mdxToken.tokens).toBeDefined();

		const paragraphToken = mdxToken.tokens.find((t: any) => t.type === 'paragraph');
		expect(paragraphToken).toBeDefined();
	});
});

describe('MDX incomplete markdown', () => {
	test('should escape incomplete opening tag', () => {
		const input = '<Component';
		const result = parseIncompleteMarkdown(input);

		// Should be escaped with backticks to prevent tokenization
		expect(result).toBe('`<Component`');
	});

	test('should escape incomplete opening tag with partial attribute', () => {
		const input = '<Component attr';
		const result = parseIncompleteMarkdown(input);

		// Should escape incomplete attribute
		expect(result).toBe('`<Component attr`');
	});

	test('should escape incomplete attribute with unclosed quote', () => {
		const input = '<Component title="incomplete';
		const result = parseIncompleteMarkdown(input);

		// Should escape due to unclosed quote
		expect(result).toBe('`<Component title="incomplete`');
	});

	test('should escape incomplete attribute with unclosed brace', () => {
		const input = '<Component count={42';
		const result = parseIncompleteMarkdown(input);

		// Should escape due to unclosed brace
		expect(result).toBe('`<Component count={42`');
	});

	test('should complete unclosed component tag', () => {
		const input = '<Card>\nContent here';
		const result = parseIncompleteMarkdown(input);

		// Should add closing tag
		expect(result).toBe('<Card>\nContent here\n</Card>');
	});

	test('should complete multiple nested unclosed tags', () => {
		const input = '<Container>\n<Card>\nContent';
		const result = parseIncompleteMarkdown(input);

		// Should close tags in reverse order
		expect(result).toBe('<Container>\n<Card>\nContent\n</Card>\n</Container>');
	});

	test('should not modify complete self-closing tag', () => {
		const input = '<Component />';
		const result = parseIncompleteMarkdown(input);

		// Should remain unchanged
		expect(result).toBe('<Component />');
	});

	test('should not modify complete component with children', () => {
		const input = '<Card>\nContent\n</Card>';
		const result = parseIncompleteMarkdown(input);

		// Should remain unchanged
		expect(result).toBe('<Card>\nContent\n</Card>');
	});

	test('should handle complete component with attributes', () => {
		const input = '<Button label="Click" count={5} />';
		const result = parseIncompleteMarkdown(input);

		// Should remain unchanged
		expect(result).toBe('<Button label="Click" count={5} />');
	});

	test('should escape incomplete tag in paragraph', () => {
		const input = 'Some text <Component attr';
		const result = parseIncompleteMarkdown(input);

		// Should only escape the incomplete part
		expect(result).toBe('Some text `<Component attr`');
	});

	test('should complete unclosed tag with markdown children', () => {
		const input = '<Alert>\n## Heading\n**Bold** text';
		const result = parseIncompleteMarkdown(input);

		// Should add closing tag
		expect(result).toBe('<Alert>\n## Heading\n**Bold** text\n</Alert>');
	});

	test('should handle mixed complete and incomplete components', () => {
		const input = '<Card1 />\n<Card2>\nContent';
		const result = parseIncompleteMarkdown(input);

		// Complete component unchanged, incomplete completed
		expect(result).toBe('<Card1 />\n<Card2>\nContent\n</Card2>');
	});

	test('should escape incomplete tag after complete tag', () => {
		const input = '<Card />\n<Component attr';
		const result = parseIncompleteMarkdown(input);

		// First complete, second escaped
		expect(result).toBe('<Card />\n`<Component attr`');
	});

	test('should complete deeply nested unclosed tags', () => {
		const input = '<Level1>\n<Level2>\n<Level3>\nContent';
		const result = parseIncompleteMarkdown(input);

		// Should close all three levels
		expect(result).toBe('<Level1>\n<Level2>\n<Level3>\nContent\n</Level3>\n</Level2>\n</Level1>');
	});

	test('should handle incomplete tag with complete inner tag', () => {
		const input = '<Container>\n<Card />';
		const result = parseIncompleteMarkdown(input);

		// Inner tag complete, outer tag needs closing
		expect(result).toBe('<Container>\n<Card />\n</Container>');
	});

	test('should not escape complete tag with closing bracket', () => {
		const input = '<Component title="test">';
		const result = parseIncompleteMarkdown(input);

		// Opening tag is incomplete without closing tag
		expect(result).toBe('<Component title="test">\n</Component>');
	});

	test('should escape partial attribute name', () => {
		const input = '<Component tit';
		const result = parseIncompleteMarkdown(input);

		// Should escape incomplete syntax
		expect(result).toBe('`<Component tit`');
	});

	test('should handle unclosed tag with list children', () => {
		const input = '<Alert>\n- Item 1\n- Item 2';
		const result = parseIncompleteMarkdown(input);

		// Should add closing tag
		expect(result).toBe('<Alert>\n- Item 1\n- Item 2\n</Alert>');
	});

	test('should handle unclosed tag with code block children', () => {
		const input = '<Example>\n```js\ncode\n```';
		const result = parseIncompleteMarkdown(input);

		// Should add closing tag
		expect(result).toBe('<Example>\n```js\ncode\n```\n</Example>');
	});

	test('should not affect lowercase HTML tags', () => {
		const input = '<div>content</div>';
		const result = parseIncompleteMarkdown(input);

		// Lowercase tags are not MDX components
		expect(result).toBe('<div>content</div>');
	});

	test('should handle component name with numbers', () => {
		const input = '<Component123>\nContent';
		const result = parseIncompleteMarkdown(input);

		// Should add closing tag with correct name
		expect(result).toBe('<Component123>\nContent\n</Component123>');
	});

	test('should escape empty incomplete tag', () => {
		const input = '<C';
		const result = parseIncompleteMarkdown(input);

		// Should escape minimal incomplete tag
		expect(result).toBe('`<C`');
	});

	test('should handle multiple incomplete tags on same line', () => {
		const input = '<Card1> content <Card2';
		const result = parseIncompleteMarkdown(input);

		// First opens, second incomplete
		expect(result).toBe('<Card1> content `<Card2`\n</Card1>');
	});

	test('should complete tag and preserve formatting', () => {
		const input = '<Card title="test">\n\nParagraph 1\n\nParagraph 2';
		const result = parseIncompleteMarkdown(input);

		// Should preserve spacing and add closing tag
		expect(result).toBe('<Card title="test">\n\nParagraph 1\n\nParagraph 2\n</Card>');
	});

	test('should handle attribute with special characters in string', () => {
		const input = '<Component text="Hello, World!" />';
		const result = parseIncompleteMarkdown(input);

		// Should remain unchanged
		expect(result).toBe('<Component text="Hello, World!" />');
	});

	test('should escape incomplete self-closing tag', () => {
		const input = '<Component /';
		const result = parseIncompleteMarkdown(input);

		// Missing closing bracket
		expect(result).toBe('`<Component /`');
	});
});
