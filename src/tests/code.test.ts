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
		expect(codeToken.lang).toBe('javascript {.line-numbers}');
		expect(codeToken.text).toBe('console.log("test");');
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

	test('should handle code blocks with nested content', () => {
		const input = '```markdown\n# This is markdown\n**bold** and *italic*\n\nEnd of code';
		const result = parseIncompleteMarkdown(input);

		// Should complete code block without processing nested markdown
		expect(result).toBe(
			'```markdown\n# This is markdown\n**bold** and *italic*\n\nEnd of code\n```'
		);
	});
});
