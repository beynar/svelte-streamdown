import { describe, expect, test } from 'vitest';
import { highlightLines } from '../lib/utils/hightlighter.svelte.js';
import { DEFAULT_THEMES, resolveHighlightTheme } from '../lib/utils/highlightThemes.js';
import type { HighlightTheme } from '@tanstack/highlight/theme';

describe('highlightLines', () => {
	test('splits tokens into lines and keeps keywords', () => {
		const lines = highlightLines('const a = 1\nlet b', 'ts');
		expect(lines.length).toBe(2);
		expect(lines[0].some((t) => t.className === 'keyword' && t.value === 'const')).toBe(true);
		expect(lines[1].some((t) => t.className === 'keyword' && t.value === 'let')).toBe(true);
	});

	test('a trailing newline yields a trailing empty line', () => {
		const lines = highlightLines('const a = 1\n', 'ts');
		expect(lines.length).toBe(2);
		expect(lines[1]).toEqual([]);
	});

	test('unknown languages fall back to plaintext lines', () => {
		const code = 'fn main() {\n    println!("hi");\n}';
		const lines = highlightLines(code, 'rust');
		expect(lines.map((line) => line.map((t) => t.value).join(''))).toEqual(code.split('\n'));
		expect(lines.flat().every((t) => t.className === undefined)).toBe(true);
	});

	test('a multi-line token is split per line, keeping its class', () => {
		const lines = highlightLines('/* one\n   two */\nlet c', 'js');
		expect(lines.length).toBe(3);
		expect(lines[0][0]).toEqual({ className: 'comment', value: '/* one' });
		expect(lines[1][0]).toEqual({ className: 'comment', value: '   two */' });
	});
});

describe('resolveHighlightTheme', () => {
	const custom = { name: 'custom' } as HighlightTheme;

	test('an unknown key falls back to github-dark in dark mode', () => {
		expect(resolveHighlightTheme('nope', undefined, true)).toBe(DEFAULT_THEMES['github-dark']);
	});

	test('an unknown key falls back to github-light in light mode', () => {
		expect(resolveHighlightTheme('nope', undefined, false)).toBe(DEFAULT_THEMES['github-light']);
	});

	test('no key falls back to the dark-mode default', () => {
		expect(resolveHighlightTheme(undefined, undefined, true)).toBe(DEFAULT_THEMES['github-dark']);
		expect(resolveHighlightTheme(undefined, undefined, false)).toBe(DEFAULT_THEMES['github-light']);
	});

	test('a user theme can override a built-in key', () => {
		expect(resolveHighlightTheme('github-dark', { 'github-dark': custom }, true)).toBe(custom);
	});

	test('with themes given but no key, the first user key wins', () => {
		expect(resolveHighlightTheme(undefined, { mine: custom, other: custom }, true)).toBe(custom);
	});

	test('an explicit key present in the given themes resolves to it', () => {
		expect(resolveHighlightTheme('mine', { mine: custom }, false)).toBe(custom);
	});
});
