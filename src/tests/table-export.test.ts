import { describe, test, expect } from 'vitest';
import {
	tableDataToCSV,
	tableDataToTSV,
	tableDataToMarkdown,
	tableDataToHTML,
	type TableData
} from '$lib/utils/table-export.js';

// `extractTableData` needs a real table element, so it is covered through the
// rendered component in table-download.svelte.test.ts. Everything downstream of
// it is pure and lives here.
const data: TableData = {
	headers: ['Name', 'Notes'],
	rows: [
		['Café', 'one\ntwo'],
		['a,b', 'say "hi"']
	]
};

describe('tableDataToCSV', () => {
	test('quotes separators, quotes and breaks, and doubles inner quotes', () => {
		expect(tableDataToCSV(data)).toBe('Name,Notes\nCafé,"one\ntwo"\n"a,b","say ""hi"""');
	});

	test('a semicolon separator quotes semicolons and leaves commas alone', () => {
		expect(tableDataToCSV(data, ';')).toBe('Name;Notes\nCafé;"one\ntwo"\na,b;"say ""hi"""');
		expect(tableDataToCSV({ headers: [], rows: [['a;b']] }, ';')).toBe('"a;b"');
	});

	test('a table without headers writes only its rows', () => {
		expect(tableDataToCSV({ headers: [], rows: [['a', 'b']] })).toBe('a,b');
	});

	test("'auto' follows the locale's decimal separator", () => {
		const NumberFormat = Intl.NumberFormat;
		// A locale that writes 1,1 reads ';' as the column separator in Excel.
		Intl.NumberFormat = (() => ({ format: () => '1,1' })) as unknown as typeof Intl.NumberFormat;
		try {
			expect(tableDataToCSV(data, 'auto')).toBe('Name;Notes\nCafé;"one\ntwo"\na,b;"say ""hi"""');
		} finally {
			Intl.NumberFormat = NumberFormat;
		}
		expect(tableDataToCSV(data, 'auto')).toBe(
			Intl.NumberFormat().format(1.1).includes(',')
				? 'Name;Notes\nCafé;"one\ntwo"\na,b;"say ""hi"""'
				: 'Name,Notes\nCafé,"one\ntwo"\n"a,b","say ""hi"""'
		);
	});
});

describe('tableDataToTSV', () => {
	test('escapes tabs and breaks instead of quoting', () => {
		expect(tableDataToTSV({ headers: ['a', 'b'], rows: [['one\ntwo', 'x\ty']] })).toBe(
			'a\tb\none\\ntwo\tx\\ty'
		);
	});
});

describe('tableDataToMarkdown', () => {
	test('escapes pipes and backslashes, turns breaks into <br>, pads short rows', () => {
		expect(
			tableDataToMarkdown({ headers: ['a', 'b'], rows: [['x|y', 'one\ntwo'], ['c\\d']] })
		).toBe('| a | b |\n| --- | --- |\n| x\\|y | one<br>two |\n| c\\\\d |  |');
	});

	test('a table without headers has no markdown form', () => {
		expect(tableDataToMarkdown({ headers: [], rows: [['a']] })).toBe('');
	});
});

describe('tableDataToHTML', () => {
	test('escapes markup and keeps breaks', () => {
		expect(tableDataToHTML({ headers: ['a & b'], rows: [['<x>'], ['one\ntwo']] })).toBe(
			'<table><thead><tr><th>a &amp; b</th></tr></thead>' +
				'<tbody><tr><td>&lt;x&gt;</td></tr><tr><td>one<br>two</td></tr></tbody></table>'
		);
	});
});
