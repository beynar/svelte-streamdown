import { expect, describe, test } from 'vitest';
import { lex, compileTags } from '../lib/marked/index.js';
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

	test('should handle self-closing component inside paired component with same tag name', () => {
		const tokens = lex('<Card>\n<Card disabled={true} />\nContent\n</Card>');
		const mdxTokens = getTokensByType(tokens, 'mdx');

		expect(mdxTokens.length).toBeGreaterThan(0);
		const outerCard = mdxTokens[0];
		expect(outerCard.tagName).toBe('Card');
		expect(outerCard.selfClosing).toBe(false);

		// Check that inner self-closing Card is in the children tokens
		const innerCard = outerCard.tokens?.find((t: any) => t.type === 'mdx');
		expect(innerCard).toBeDefined();
		expect(innerCard.tagName).toBe('Card');
		expect(innerCard.selfClosing).toBe(true);
		expect(innerCard.attributes.disabled).toBe(true);

		// Check that "Content" is also in the outer card
		const content = outerCard.tokens?.find((t: any) => t.type === 'paragraph');
		expect(content).toBeDefined();
	});

	test('should handle multiple self-closing components inside paired component', () => {
		const tokens = lex(
			'<Container>\n<Icon name="star" />\n<Icon name="heart" />\nText content\n</Container>'
		);
		const mdxTokens = getTokensByType(tokens, 'mdx');

		expect(mdxTokens.length).toBeGreaterThan(0);
		const container = mdxTokens[0];
		expect(container.tagName).toBe('Container');
		expect(container.selfClosing).toBe(false);

		// Check that both self-closing Icons are in the children
		const icons = container.tokens?.filter((t: any) => t.type === 'mdx');
		expect(icons).toBeDefined();
		expect(icons.length).toBe(2);
		expect(icons[0].tagName).toBe('Icon');
		expect(icons[0].selfClosing).toBe(true);
		expect(icons[0].attributes.name).toBe('star');
		expect(icons[1].tagName).toBe('Icon');
		expect(icons[1].selfClosing).toBe(true);
		expect(icons[1].attributes.name).toBe('heart');
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
	test('should remove incomplete opening tag', () => {
		const input = '<Component';
		const result = parseIncompleteMarkdown(input);

		// Should be removed to prevent tokenization
		expect(result).toBe('');
	});

	test('should remove incomplete opening tag with partial attribute', () => {
		const input = '<Component attr';
		const result = parseIncompleteMarkdown(input);

		// Should remove incomplete attribute
		expect(result).toBe('');
	});

	test('should remove incomplete attribute with unclosed quote', () => {
		const input = '<Component title="incomplete';
		const result = parseIncompleteMarkdown(input);

		// Should remove due to unclosed quote
		expect(result).toBe('');
	});

	test('should remove incomplete attribute with unclosed brace', () => {
		const input = '<Component count={42';
		const result = parseIncompleteMarkdown(input);

		// Should remove due to unclosed brace
		expect(result).toBe('');
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

	test('should remove incomplete tag in paragraph', () => {
		const input = 'Some text <Component attr';
		const result = parseIncompleteMarkdown(input);

		// Should only remove the incomplete part
		expect(result).toBe('Some text ');
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

	test('should remove incomplete tag after complete tag', () => {
		const input = '<Card />\n<Component attr';
		const result = parseIncompleteMarkdown(input);

		// First complete, second removed
		expect(result).toBe('<Card />\n');
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

	test('should remove partial attribute name', () => {
		const input = '<Component tit';
		const result = parseIncompleteMarkdown(input);

		// Should remove incomplete syntax
		expect(result).toBe('');
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

	test('should remove empty incomplete tag', () => {
		const input = '<C';
		const result = parseIncompleteMarkdown(input);

		// Should remove minimal incomplete tag
		expect(result).toBe('');
	});

	test('should handle multiple incomplete tags on same line', () => {
		const input = '<Card1> content <Card2';
		const result = parseIncompleteMarkdown(input);

		// First opens, second removed
		expect(result).toBe('<Card1> content \n</Card1>');
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

	test('should remove incomplete self-closing tag', () => {
		const input = '<Component /';
		const result = parseIncompleteMarkdown(input);

		// Missing closing bracket
		expect(result).toBe('');
	});
});

describe('regression: nested same-name components', () => {
	test('outer component spans to its matching close (depth counting)', () => {
		const src = '<Card>outer\n\n<Card>inner</Card>\n\nrest</Card>';
		const tokens = lex(src) as any[];

		expect(tokens.length).toBe(1);
		expect(tokens[0].type).toBe('mdx');
		expect(tokens[0].raw).toBe(src);

		// The inner same-name component nests as its own mdx token
		const inner = tokens[0].tokens.find((t: any) => t.type === 'mdx');
		expect(inner).toBeDefined();
		expect(inner.tagName).toBe('Card');
		expect(inner.text).toBe('inner');
	});

	test('incomplete parser closes nested same-name tags in LIFO order', () => {
		// The literal </A> closes the INNER A; auto-closers must then be </B></A>
		// (innermost first). Matching the close against the first open used to
		// leave the remaining stack out of order, appending </A></B> instead.
		const input = '<A>\n<B>\n<A>text</A>\nstreaming';
		const result = parseIncompleteMarkdown(input);

		expect(result.endsWith('</B>\n</A>')).toBe(true);
		expect(result.endsWith('</A>\n</B>')).toBe(false);
	});
});

// fb9f97c/b392fbe: lowercase and hyphenated tags are opt-in. PascalCase keeps
// working with no props at all — every test above this block passes `lex(src)`
// with no allowlist and is unchanged from 4.1.1.
describe('custom tag allowlist', () => {
	const tags = compileTags(['ai-thinking', 'mention'], ['mention']);

	test('should lex a listed lowercase tag as a component with parsed children', () => {
		const token = getFirstTokenByType(
			lex('<ai-thinking>\n**bold**\n</ai-thinking>', [], tags),
			'mdx'
		);

		expect(token.tagName).toBe('ai-thinking');
		expect(token.selfClosing).toBe(false);
		expect(token.tokens[0].type).toBe('paragraph');
		expect(token.tokens[0].tokens[0].type).toBe('strong');
	});

	test('should leave the same tag as an html block when it is not listed', () => {
		const tokens = lex('<ai-thinking>\n**bold**\n</ai-thinking>');

		expect(getTokensByType(tokens, 'mdx')).toHaveLength(0);
		expect(getFirstTokenByType(tokens, 'html')).toBeDefined();
	});

	test('should keep PascalCase working when an allowlist is supplied', () => {
		const token = getFirstTokenByType(lex('<Card title="x" />', [], tags), 'mdx');

		expect(token.tagName).toBe('Card');
		expect(token.attributes).toEqual({ title: 'x' });
	});

	test('should read hyphenated attributes', () => {
		const token = getFirstTokenByType(lex('<mention data-id="7">x</mention>', [], tags), 'mdx');

		expect(token.attributes).toEqual({ 'data-id': '7' });
	});

	test('should not let a listed name leak into plain HTML tags', () => {
		expect(getTokensByType(lex('<section>\nhi\n</section>', [], tags), 'mdx')).toHaveLength(0);
	});

	test('literalTagContent should emit one text token with the markup intact', () => {
		const token = getFirstTokenByType(
			lex('<mention user_id="1">@_name_ **x**</mention>', [], tags),
			'mdx'
		);

		expect(token.tokens).toHaveLength(1);
		expect(token.tokens[0].type).toBe('text');
		expect(token.tokens[0].text).toBe('@_name_ **x**');
	});

	test('a tag that is not in literalTagContent still parses its children', () => {
		const token = getFirstTokenByType(lex('<ai-thinking>@_name_</ai-thinking>', [], tags), 'mdx');

		expect(token.tokens[0].type).toBe('paragraph');
		expect(token.tokens[0].tokens.some((t: any) => t.type === 'em')).toBe(true);
	});

	test('should escape regex metacharacters in a custom tag name', () => {
		const odd = compileTags(['a.b']);

		expect(getFirstTokenByType(lex('<a.b>x</a.b>', [], odd), 'mdx').tagName).toBe('a.b');
		expect(getTokensByType(lex('<axb>x</axb>', [], odd), 'mdx')).toHaveLength(0);
	});

	test('should compile once per allowlist identity', () => {
		const a = compileTags(['mention']);

		expect(compileTags(['mention'])).not.toBe(a);
		expect(a.selfClosing).toBe(a.selfClosing);
	});

	describe('streaming a listed tag', () => {
		test('should strip a half-typed listed tag and close what is open', () => {
			expect(parseIncompleteMarkdown('Hello <ai-think', { tags, live: true })).toBe('Hello ');
		});

		test('should complete the tag and the emphasis inside it', () => {
			expect(parseIncompleteMarkdown('<ai-thinking>\n**bo', { tags, live: true })).toBe(
				'<ai-thinking>\n**bo**\n</ai-thinking>'
			);
		});

		test('should not touch an unlisted lowercase tag it does not own', () => {
			expect(parseIncompleteMarkdown('<ai-thinking>\nhi', { live: true })).toBe(
				'<ai-thinking>\nhi'
			);
		});
	});
});

describe('literalTagContent allows the tag on its own', () => {
	test('a tag listed only in literalTagContent is a component with literal children', () => {
		const tags = compileTags(undefined, ['mention']);
		const tokens = lex('<mention user_id="1">@_name_ **x**</mention>', [], tags);
		const mdx = tokens.flatMap((t: any) =>
			t.type === 'mdx' ? [t] : (t.tokens ?? []).filter((c: any) => c.type === 'mdx')
		);
		expect(mdx.length, 'the tag is a component without being in customTags').toBe(1);
		expect(mdx[0].tokens.length).toBe(1);
		expect(mdx[0].tokens[0].type).toBe('text');
		expect(mdx[0].tokens[0].text).toBe('@_name_ **x**');
	});
});
