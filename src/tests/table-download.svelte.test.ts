import { describe, test, expect } from 'vitest';
import { flushSync } from 'svelte';
import { render } from 'vitest-browser-svelte';
import Streamdown from '$lib/Streamdown.svelte';

// The table download fixes are DOM-level: the popover walks the rendered table,
// so none of them can be asserted from the token stream. They only run in the
// browser project.

const table = (rows: string) => `| Name | Notes |\n| --- | --- |\n${rows}\n`;

// `save()` builds a Blob and clicks an <a download>. Capture the Blob and keep
// the click from reaching the browser's download manager.
const captureDownload = async (act: () => void) => {
	const createObjectURL = URL.createObjectURL;
	const click = HTMLAnchorElement.prototype.click;
	let blob: Blob | undefined;
	let filename = '';
	URL.createObjectURL = (source: Blob | MediaSource) => {
		blob = source as Blob;
		return 'blob:captured';
	};
	HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
		filename = this.download;
	};
	try {
		act();
		flushSync();
	} finally {
		URL.createObjectURL = createObjectURL;
		HTMLAnchorElement.prototype.click = click;
	}
	// `Blob.text()` strips a leading BOM, which is exactly what is under test, so
	// decode the bytes ourselves.
	const content = blob
		? new TextDecoder('utf-8', { ignoreBOM: true }).decode(await blob.arrayBuffer())
		: '';
	return { filename, content };
};

const openPopover = (container: HTMLElement, index = 0) => {
	// Two buttons per table (download, copy); the download one opens the popover.
	const buttons = container.querySelectorAll('[data-streamdown-table-download] button');
	(buttons[index * 2] as HTMLButtonElement).click();
	flushSync();
	// A popover closed by this click is still in the DOM for its outro, so take
	// the last one: tables render in document order.
	const dialogs = container.querySelectorAll('dialog');
	return dialogs[dialogs.length - 1] as HTMLDialogElement;
};

const clickItem = (dialog: HTMLDialogElement, label: string) => {
	const button = Array.from(dialog.querySelectorAll('button')).find(
		(b) => b.textContent?.trim() === label
	);
	if (!button) throw new Error(`no ${label} button in the popover`);
	return () => button.click();
};

describe('table download', () => {
	test('CSV export finds the table, keeps <br> breaks and carries a UTF-8 BOM', async () => {
		// `renderHtml` so the cell holds a real <br> element: textContent would
		// flatten it to 'onetwo'.
		const { container } = render(Streamdown, {
			content: table('| Café | one<br>two |'),
			renderHtml: true
		});

		const dialog = openPopover(container);
		const { content: csv, filename } = await captureDownload(clickItem(dialog, 'CSV'));

		// A non-empty result also means the `[data-streamdown-table="id"]` lookup
		// matched. Today's `$props.id()` values happen to be valid unquoted CSS
		// idents, so the quoting is what keeps that true if the shape ever changes.
		expect(csv).toBe('﻿Name,Notes\nCafé,"one\ntwo"');
		expect(filename).toBe('table.csv');
	});

	test('TSV export escapes the break instead of quoting it', async () => {
		const { container } = render(Streamdown, {
			content: table('| Café | one<br>two |'),
			renderHtml: true
		});

		const dialog = openPopover(container);
		const { content, filename } = await captureDownload(clickItem(dialog, 'TSV'));

		expect(content).toBe('Name\tNotes\nCafé\tone\\ntwo');
		expect(filename).toBe('table.tsv');
	});

	test('csvSeparator and a custom download filename come from controls', async () => {
		const { container } = render(Streamdown, {
			content: table('| a,b | c |'),
			controls: {
				table: { csvSeparator: ';', download: { filename: (t) => `x-${t.align.length}` } }
			}
		});

		const dialog = openPopover(container);
		const { content, filename } = await captureDownload(clickItem(dialog, 'CSV'));

		expect(content).toBe('﻿Name;Notes\na,b;c');
		expect(filename).toBe('x-2.csv');
	});

	test('controls turn individual table buttons off', () => {
		const { container } = render(Streamdown, {
			content: table('| a | b |'),
			controls: { table: { copy: false } }
		});

		expect(container.querySelectorAll('[data-streamdown-table-download] button').length).toBe(1);
	});

	test('controls={false} drops the table toolbar entirely', () => {
		const { container } = render(Streamdown, { content: table('| a | b |'), controls: false });

		expect(container.querySelector('[data-streamdown-table-download]')).toBe(null);
	});

	test('colspan and rowspan become empty cells so the columns line up', async () => {
		const { container } = render(Streamdown, {
			content: '| H1 | H2 | H3 |\n| --- | --- | --- |\n| spans 3 |  |  |\n| a | b | c |\n'
		});

		const dialog = openPopover(container);
		const { content } = await captureDownload(clickItem(dialog, 'CSV'));

		expect(content).toBe('﻿H1,H2,H3\nspans 3,,\na,b,c');
	});

	test('each table gets its own download popover id', () => {
		const { container } = render(Streamdown, {
			content: `${table('| a | b |')}\n${table('| c | d |')}`
		});

		const tables = container.querySelectorAll('[data-streamdown-table]');
		expect(tables.length).toBe(2);

		const first = openPopover(container, 0).id;
		const second = openPopover(container, 1).id;

		expect(first).not.toBe(second);
		expect(first).toBe(`table-download-popover-${tables[0].getAttribute('data-streamdown-table')}`);
		expect(second).toBe(
			`table-download-popover-${tables[1].getAttribute('data-streamdown-table')}`
		);
	});
});
