import { expect, describe, test } from 'vitest';
import { lex } from '../lib/marked/index.js';
import { parseIncompleteMarkdown } from '../lib/utils/parse-incomplete-markdown.js';
import { closingFence, hasUnclosedFence } from '../lib/utils/fence.js';
import { resolveLineNumbers } from '../lib/utils/line-numbers.js';

// Helper functions
function getTokensByType(tokens: any[], type: string) {
	return tokens.filter((token) => token.type === type);
}

function getFirstTokenByType(tokens: any[], type: string) {
	return tokens.find((token) => token.type === type);
}

describe('tokenization', () => {
	test('should parse simple code block and verify all properties', () => {
		const tokens = lex('```\nconsole.log("Hello World");\n```');
		const codeToken = getFirstTokenByType(tokens, 'code');

		expect(codeToken).toBeDefined();
		expect(codeToken.type).toBe('code');
		expect(codeToken.text).toBe('console.log("Hello World");');
		expect(codeToken.raw).toBe('```\nconsole.log("Hello World");\n```');
		expect(codeToken.lang).toBe('');
	});

	test('should parse code block with language and verify language property', () => {
		const tokens = lex('```javascript\nconsole.log("Hello World");\n```');
		const codeToken = getFirstTokenByType(tokens, 'code');

		expect(codeToken).toBeDefined();
		expect(codeToken.type).toBe('code');
		expect(codeToken.text).toBe('console.log("Hello World");');
		expect(codeToken.lang).toBe('javascript');
		expect(codeToken.raw).toBe('```javascript\nconsole.log("Hello World");\n```');
	});

	test('should parse code block with multiple lines and preserve formatting', () => {
		const code = 'function greet(name) {\n  console.log(`Hello, ${name}!`);\n  return name;\n}';
		const tokens = lex(`\`\`\`javascript\n${code}\n\`\`\``);
		const codeToken = getFirstTokenByType(tokens, 'code');

		expect(codeToken).toBeDefined();
		expect(codeToken.type).toBe('code');
		expect(codeToken.text).toBe(code);
		expect(codeToken.lang).toBe('javascript');
	});

	test('should parse indented code block and verify properties', () => {
		const tokens = lex('```\n    console.log("Indented code");\nvar x = 5;\n\`\`\`');
		const codeToken = getFirstTokenByType(tokens, 'code');

		expect(codeToken).toBeDefined();
		expect(codeToken.type).toBe('code');
		expect(codeToken.text).toContain('console.log("Indented code");\nvar x = 5;');
		expect(codeToken.lang).toBe('');
	});

	test('should parse code block with different languages', () => {
		const languages = ['python', 'java', 'cpp', 'html', 'css', 'json', 'xml'];

		languages.forEach((lang) => {
			const tokens = lex(`\`\`\`${lang}\ncode content\n\`\`\``);
			const codeToken = getFirstTokenByType(tokens, 'code');

			expect(codeToken).toBeDefined();
			expect(codeToken.lang).toBe(lang);
			expect(codeToken.text).toBe('code content');
		});
	});

	test('should parse code block with special characters and symbols', () => {
		const code = 'const regex = /[a-zA-Z0-9]+/g;\nconst symbols = "!@#$%^&*()";';
		const tokens = lex(`\`\`\`\n${code}\n\`\`\``);
		const codeToken = getFirstTokenByType(tokens, 'code');

		expect(codeToken).toBeDefined();
		expect(codeToken.text).toBe(code);
	});

	test('should parse code block with empty lines and preserve them', () => {
		const code = 'function test() {\n\n  console.log("test");\n\n}';
		const tokens = lex(`\`\`\`javascript\n${code}\n\`\`\``);
		const codeToken = getFirstTokenByType(tokens, 'code');

		expect(codeToken).toBeDefined();
		expect(codeToken.text).toBe(code);
		expect(codeToken.text.split('\n').length).toBe(5);
	});

	test('should parse multiple code blocks in sequence', () => {
		const markdown = '```javascript\nconsole.log("first");\n```\n\n```python\nprint("second")\n```';
		const tokens = lex(markdown);
		const codeTokens = getTokensByType(tokens, 'code');

		expect(codeTokens.length).toBe(2);
		expect(codeTokens[0].lang).toBe('javascript');
		expect(codeTokens[0].text).toBe('console.log("first");');
		expect(codeTokens[1].lang).toBe('python');
		expect(codeTokens[1].text).toBe('print("second")');
	});

	test('should parse code block with backticks inside content', () => {
		const code = 'const template = `Hello ${name}`;\nconst code = "`inline code`";';
		const tokens = lex(`\`\`\`javascript\n${code}\n\`\`\``);
		const codeToken = getFirstTokenByType(tokens, 'code');

		expect(codeToken).toBeDefined();
		expect(codeToken.text).toBe(code);
	});

	test('should parse code block with language info and additional attributes', () => {
		const tokens = lex('```javascript {.line-numbers}\nconsole.log("test");\n```');
		const codeToken = getFirstTokenByType(tokens, 'code');

		expect(codeToken).toBeDefined();
		expect(codeToken.lang).toBe('javascript');
		expect(codeToken.meta).toBe('{.line-numbers}');
		expect(codeToken.text).toBe('console.log("test");');
	});

	// upstream d4ec6c0: the info string after the language is `meta`, not part of
	// `lang` — highlighting, the header label, the download extension and the
	// `lang === 'mermaid'` dispatch all compare against `lang`.
	test('should split the fence info string into lang and meta', () => {
		const tokens = lex('```ts title="x" {1}\ncode\n```');
		const codeToken = getFirstTokenByType(tokens, 'code');

		expect(codeToken.lang).toBe('ts');
		expect(codeToken.meta).toBe('title="x" {1}');
	});

	test('should leave meta undefined for a fence with only a language', () => {
		const tokens = lex('```ts\ncode\n```');
		const codeToken = getFirstTokenByType(tokens, 'code');

		expect(codeToken.lang).toBe('ts');
		expect(codeToken.meta).toBeUndefined();
	});

	test('should leave lang and meta empty for a fence with no info string', () => {
		const tokens = lex('```\nplain\n```');
		const codeToken = getFirstTokenByType(tokens, 'code');

		expect(codeToken.lang).toBe('');
		expect(codeToken.meta).toBeUndefined();
	});

	test('should split the info string of a fence nested in a list', () => {
		const tokens = lex('- item\n\n  ```js showLineNumbers startLine=5\n  code\n  ```');
		const listToken = getFirstTokenByType(tokens, 'list');
		const codeToken = listToken.tokens[0].tokens.find((t: any) => t.type === 'code');

		expect(codeToken).toBeDefined();
		expect(codeToken.lang).toBe('js');
		expect(codeToken.meta).toBe('showLineNumbers startLine=5');
	});

	test('should split the info string of a fence nested in a blockquote', () => {
		const tokens = lex('> ```py linenos\n> code\n> ```');
		const blockquoteToken = getFirstTokenByType(tokens, 'blockquote');
		const codeToken = blockquoteToken.tokens.find((t: any) => t.type === 'code');

		expect(codeToken).toBeDefined();
		expect(codeToken.lang).toBe('py');
		expect(codeToken.meta).toBe('linenos');
	});

	// upstream e633ff7: Code.svelte renders/copies/downloads `text` with its
	// trailing newlines stripped; marked keeps them, so assert what it hands over.
	test('should keep trailing blank lines in text (trimmed at render time)', () => {
		const tokens = lex('```text\nline1\nline2\n\n\n```');
		const codeToken = getFirstTokenByType(tokens, 'code');

		expect(codeToken.text).toBe('line1\nline2\n\n');
		expect(codeToken.text.replace(/\n+$/, '')).toBe('line1\nline2');
	});

	test('should handle code block with only whitespace content', () => {
		const tokens = lex('```\n   \n  \n```');
		const codeToken = getFirstTokenByType(tokens, 'code');

		expect(codeToken).toBeDefined();
		expect(codeToken.text).toBe('   \n  ');
	});

	test('should handle code block with no content', () => {
		const tokens = lex('```\n```');
		const codeToken = getFirstTokenByType(tokens, 'code');

		expect(codeToken).toBeDefined();
		expect(codeToken.text).toBe('');
	});

	test('should parse tilded code block (~) and verify properties', () => {
		const tokens = lex('~~~javascript\nconsole.log("tildes");\n~~~');
		const codeToken = getFirstTokenByType(tokens, 'code');

		expect(codeToken).toBeDefined();
		expect(codeToken.type).toBe('code');
		expect(codeToken.text).toBe('console.log("tildes");');
		expect(codeToken.lang).toBe('javascript');
	});

	test('should handle mixed indented and fenced code blocks', () => {
		const markdown = '```javascript\nfenced code\n```\n\n    indented code';
		const tokens = lex(markdown);
		const codeTokens = getTokensByType(tokens, 'code');

		expect(codeTokens.length).toBe(2);
		expect(codeTokens[0].text).toBe('fenced code');
		expect(codeTokens[0].lang).toBe('javascript');
		expect(codeTokens[1].text).toBe('indented code');
		expect(codeTokens[1].lang).toBeUndefined();
	});
});

describe('incomplete markdown', () => {
	test('should complete basic incomplete code block', () => {
		const input = '```javascript\nconsole.log("incomplete");\nSome text after';
		const result = parseIncompleteMarkdown(input);

		// Should complete the code block with closing backticks
		expect(result).toBe('```javascript\nconsole.log("incomplete");\nSome text after\n```');
	});

	test('should handle code blocks in different contexts', () => {
		const input = '# Heading\n\n```python\ncode block\n\nRegular paragraph';
		const result = parseIncompleteMarkdown(input);

		// Should complete code block in different markdown contexts
		expect(result).toBe('# Heading\n\n```python\ncode block\n\nRegular paragraph\n```');
	});

	test('should handle code blocks with language specification', () => {
		const input = '```typescript\nfunction test() {}\nconsole.log("end")';
		const result = parseIncompleteMarkdown(input);

		// Should complete code block with language
		expect(result).toBe('```typescript\nfunction test() {}\nconsole.log("end")\n```');
	});

	test('should close a tilde fence with tildes, not backticks', () => {
		// A '```' closer inside a '~~~' block is content: it would show up as a
		// literal line in the streamed code block on every chunk.
		expect(parseIncompleteMarkdown('~~~py\nx = 1')).toBe('~~~py\nx = 1\n~~~');
		expect(getFirstTokenByType(lex(parseIncompleteMarkdown('~~~py\nx = 1')), 'code').text).toBe(
			'x = 1'
		);
	});

	test('should close a long fence with a closer of the same length', () => {
		expect(parseIncompleteMarkdown('````md\n```ts\nconst a = 1;\n```')).toBe(
			'````md\n```ts\nconst a = 1;\n```\n````'
		);
	});

	test('should handle code blocks with nested content', () => {
		const input = '```markdown\n# This is markdown\n**bold** and *italic*\n\nEnd of code';
		const result = parseIncompleteMarkdown(input);

		// Should complete code block without processing nested markdown
		expect(result).toBe(
			'```markdown\n# This is markdown\n**bold** and *italic*\n\nEnd of code\n```'
		);
	});
});

describe('hasUnclosedFence', () => {
	test('an open backtick fence is unclosed', () => {
		expect(hasUnclosedFence('```ts\nconst a = 1;')).toBe(true);
	});

	test('an open tilde fence is unclosed', () => {
		expect(hasUnclosedFence('~~~\ncode here')).toBe(true);
	});

	test('a closed fence is complete', () => {
		expect(hasUnclosedFence('```ts\nconst a = 1;\n```')).toBe(false);
		expect(hasUnclosedFence('~~~\ncode here\n~~~')).toBe(false);
	});

	test('a shorter fence line inside a longer fence is content, not a closer', () => {
		expect(hasUnclosedFence('````md\n```ts\nconst a = 1;\n```')).toBe(true);
		expect(hasUnclosedFence('````md\n```ts\nconst a = 1;\n```\n````')).toBe(false);
	});

	test('a fence is only closed by its own character', () => {
		expect(hasUnclosedFence('~~~\ncode\n```')).toBe(true);
	});

	test('a closer cannot carry an info string', () => {
		expect(hasUnclosedFence('```ts\nconst a = 1;\n```python')).toBe(true);
	});

	test('a backtick info string containing a backtick opens nothing', () => {
		// CommonMark (and marked) reject it as a fence, so neither should we.
		expect(hasUnclosedFence('```ts title=`x`\nconst a = 1;')).toBe(false);
		expect(hasUnclosedFence('Use ``` to open a fence.')).toBe(false);
	});

	test('a fence quoted inside a blockquote still counts', () => {
		expect(hasUnclosedFence('> ```ts\n> const a = 1;')).toBe(true);
		expect(hasUnclosedFence('> ```ts\n> const a = 1;\n> ```')).toBe(false);
	});

	test('prose is never unclosed', () => {
		expect(hasUnclosedFence('# Title\n\nSome `inline` code.')).toBe(false);
		expect(hasUnclosedFence('')).toBe(false);
	});
});

describe('hasUnclosedFence in a list item', () => {
	test('a fence opened after a list marker is tracked', () => {
		// '- ```js' opens a fence inside the item; the marker used to hide it.
		expect(hasUnclosedFence('- ```\n  x')).toBe(true);
		expect(hasUnclosedFence('1. ```js\n   code')).toBe(true);
	});

	test('and its closer still closes it', () => {
		expect(hasUnclosedFence('- ```js\n  code\n  ```')).toBe(false);
	});

	test('a closer at the item content indent closes it, even past column 3', () => {
		// "10. " and a nested "  - " both put the content at column 4, which a
		// fixed 0–3 indent limit rejected: the fence looked open forever.
		expect(hasUnclosedFence('10. ```js\n    code\n    ```')).toBe(false);
		expect(hasUnclosedFence('- a\n  - ```js\n    code\n    ```')).toBe(false);
		expect(hasUnclosedFence('- a\n  - ```js\n    code')).toBe(true);
	});

	test('a closer indented more than 3 past the opener is content', () => {
		expect(hasUnclosedFence('```js\n    ```')).toBe(true);
	});
});

describe('closingFence', () => {
	test('is placed at the opener depth with any list marker blanked out', () => {
		expect(closingFence({ char: '`', length: 3, prefix: '' })).toBe('```');
		expect(closingFence({ char: '~', length: 4, prefix: '10. ' })).toBe('    ~~~~');
		expect(closingFence({ char: '`', length: 3, prefix: '  - ' })).toBe('    ```');
		expect(closingFence({ char: '`', length: 3, prefix: '> ' })).toBe('> ```');
	});
});

describe('line numbers from the fence meta', () => {
	// `lang` is the first word and `meta` the rest since 4.0.1, so this is what
	// ```ts startLine=10 hands the component.
	const meta = (info: string) =>
		(lex('```' + info + '\nconst a = 1;\n```')[0] as { meta?: string }).meta;

	test('startLine is read from the meta, and only when it is a number', () => {
		expect(meta('ts startLine=10')).toBe('startLine=10');
		expect(resolveLineNumbers(meta('ts startLine=10'), true).start).toBe(10);
		expect(resolveLineNumbers(meta('ts'), true).start).toBe(1);
		expect(resolveLineNumbers(undefined, true).start).toBe(1);
		expect(resolveLineNumbers(meta('ts startLine=abc'), true).start).toBe(1);
		expect(resolveLineNumbers(meta('ts startLine='), true).start).toBe(1);
	});

	test('the meta flags flip the prop either way', () => {
		expect(resolveLineNumbers(undefined, false).enabled).toBe(false);
		expect(resolveLineNumbers(meta('ts lineNumbers'), false).enabled).toBe(true);
		expect(resolveLineNumbers(meta('ts noLineNumbers'), true).enabled).toBe(false);
		// `noLineNumbers` must not read as the positive flag.
		expect(resolveLineNumbers(meta('ts noLineNumbers'), false).enabled).toBe(false);
		expect(resolveLineNumbers(meta('ts startLine=3 lineNumbers'), false)).toEqual({
			enabled: true,
			start: 3
		});
	});
});
