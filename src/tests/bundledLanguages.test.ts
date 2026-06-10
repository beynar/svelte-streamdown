import { expect, describe, test } from 'vitest';
import {
	bundledLanguagesInfo,
	createLanguageSet,
	supportedLanguages,
	type LanguageInfo
} from '../lib/utils/bundledLanguages.js';

describe('createLanguageSet', () => {
	test('collects ids and aliases into a single set', () => {
		const langs: LanguageInfo[] = [
			{ id: 'foo', aliases: ['f', 'fo'], import: async () => ({}) },
			{ id: 'bar', import: async () => ({}) }
		];
		expect(createLanguageSet(langs)).toEqual(new Set(['foo', 'f', 'fo', 'bar']));
	});

	test('handles entries without aliases', () => {
		const set = createLanguageSet([{ id: 'solo', import: async () => ({}) }]);
		expect(set).toEqual(new Set(['solo']));
	});

	test('returns an empty set for an empty list', () => {
		expect(createLanguageSet([]).size).toBe(0);
	});
});

describe('bundledLanguagesInfo integrity', () => {
	test('ids are unique', () => {
		const ids = bundledLanguagesInfo.map((l) => l.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	test('no id or alias is claimed by two entries', () => {
		// a duplicate would silently shrink the lookup set and shadow a language
		const all = bundledLanguagesInfo.flatMap((l) => [l.id, ...(l.aliases ?? [])]);
		expect(new Set(all).size).toBe(all.length);
	});

	test('every entry exposes an import thunk', () => {
		expect(bundledLanguagesInfo.length).toBeGreaterThan(0);
		for (const lang of bundledLanguagesInfo) {
			expect(lang.import, `import of ${lang.id}`).toBeTypeOf('function');
		}
	});
});

describe('supportedLanguages', () => {
	test('matches the set derived from bundledLanguagesInfo', () => {
		expect(supportedLanguages).toEqual(createLanguageSet(bundledLanguagesInfo));
	});

	test('resolves common fence aliases', () => {
		const aliases = [
			'js',
			'ts',
			'py',
			'md',
			'yml',
			'rb',
			'rs',
			'bash',
			'sh',
			'shell',
			'zsh',
			'c++',
			'c#',
			'cs',
			'kt',
			'kts',
			'dockerfile',
			'gql'
		];
		for (const alias of aliases) {
			expect(supportedLanguages.has(alias), `alias ${alias}`).toBe(true);
		}
	});

	test('contains canonical ids', () => {
		const ids = ['javascript', 'typescript', 'python', 'shellscript', 'svelte', 'vue', 'graphql'];
		for (const id of ids) {
			expect(supportedLanguages.has(id), `id ${id}`).toBe(true);
		}
	});

	test('does not contain unbundled or empty names', () => {
		expect(supportedLanguages.has('haskell')).toBe(false);
		expect(supportedLanguages.has('')).toBe(false);
		// lookups are case-sensitive: fence infostrings must be lowercased upstream
		expect(supportedLanguages.has('JavaScript')).toBe(false);
	});
});

describe('import thunks', () => {
	test('every declared module specifier resolves to a shiki language module', async () => {
		const modules = await Promise.all(bundledLanguagesInfo.map((l) => l.import()));
		expect(modules.length).toBe(bundledLanguagesInfo.length);
		modules.forEach((mod, i) => {
			expect(mod.default, `default export of ${bundledLanguagesInfo[i].id}`).toBeDefined();
		});
	});
});
