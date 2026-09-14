import { describe, test, expect, vi } from 'vitest';
import { flushSync } from 'svelte';
import { render } from 'vitest-browser-svelte';
import Streamdown from '$lib/Streamdown.svelte';
import { defaultTranslations } from '$lib/index.js';
import Code from '$lib/Elements/Code.svelte';
import Mermaid from '$lib/Elements/Mermaid.svelte';

// Accessible names come from the DOM, not the token stream, so they can only be
// asserted in the browser project.

const code = '```ts\nconst a = 1;\n```';
// The copy/download toolbar lives in the opt-in `Code` component (svelte-streamdown/code),
// not in the default lightweight renderer.
const withCode = { components: { code: Code } };
const table = '| Name | Notes |\n| --- | --- |\n| Ada | first |\n';

const names = (container: HTMLElement, selector: string) =>
	Array.from(container.querySelectorAll(selector)).map((el) => el.getAttribute('aria-label'));

describe('accessible names', () => {
	test('code block controls are named and are not submit buttons', () => {
		const { container } = render(Streamdown, { content: code, ...withCode });
		const buttons = container.querySelectorAll<HTMLButtonElement>('[data-streamdown-code] button');
		expect(buttons.length).toBe(2);
		expect(names(container, '[data-streamdown-code] button')).toEqual([
			defaultTranslations.controls.downloadCode,
			defaultTranslations.controls.copyCode
		]);
		expect(Array.from(buttons).every((b) => b.type === 'button')).toBe(true);
	});

	test('the copy state is announced in a live region', () => {
		const { container } = render(Streamdown, { content: code, ...withCode });
		const live = container.querySelector('[data-streamdown-code] [aria-live]');
		// The region exists before the copy so the change is announced.
		expect(live).not.toBeNull();
		expect(live?.textContent).toBe('');
	});

	test('table controls are named', () => {
		const { container } = render(Streamdown, { content: table });
		expect(names(container, '[data-streamdown-table-download] button')).toEqual([
			defaultTranslations.controls.downloadTable,
			defaultTranslations.controls.copyTable
		]);
	});

	test('icons are hidden from the accessibility tree', () => {
		const { container } = render(Streamdown, { content: code, ...withCode });
		const svgs = container.querySelectorAll('[data-streamdown-code] button svg');
		expect(svgs.length).toBe(2);
		expect(Array.from(svgs).every((s) => s.getAttribute('aria-hidden') === 'true')).toBe(true);
	});

	test('a blocked link keeps its tooltip and label', () => {
		const { container } = render(Streamdown, {
			content: '[x](javascript:alert(1))',
			allowedLinkPrefixes: ['https://example.com']
		});
		const blocked = container.querySelector('[data-streamdown-link-blocked]');
		expect(blocked?.getAttribute('title')).toContain(defaultTranslations.controls.blockedUrl);
	});
});

describe('translations.controls', () => {
	test('override the control strings without touching the alert ones', () => {
		const { container } = render(Streamdown, {
			content: code,
			...withCode,
			translations: { controls: { copyCode: 'Copier le code' } }
		});
		expect(names(container, '[data-streamdown-code] button')).toEqual([
			// untouched keys keep their default
			defaultTranslations.controls.downloadCode,
			'Copier le code'
		]);
	});

	test('reach the table format menu', () => {
		const { container } = render(Streamdown, {
			content: table,
			translations: { controls: { tableFormatCsv: 'Valeurs séparées par des virgules' } }
		});
		const trigger = container.querySelector<HTMLButtonElement>(
			'[data-streamdown-table-download] button'
		);
		trigger?.click();
		flushSync();
		const labels = Array.from(document.querySelectorAll('dialog button')).map((b) =>
			b.textContent?.trim()
		);
		expect(labels).toContain('Valeurs séparées par des virgules');
	});

	test('alert titles still resolve from the defaults', () => {
		const { container } = render(Streamdown, {
			content: '> [!NOTE]\n> hello',
			translations: { alert: { note: 'Remarque' } }
		});
		expect(container.querySelector('[data-alert-title]')?.textContent?.trim()).toBe('Remarque');
	});
});

describe('mermaid', () => {
	const renderDiagram = async () => {
		const { container } = render(Streamdown, {
			content: '```mermaid\nflowchart TD\n  A --> B\n```',
			components: { mermaid: Mermaid }
		});
		// mermaid itself is imported lazily. Wait for the diagram to actually be in
		// the DOM, not just for the empty target element: the render copies mermaid's
		// own attributes onto the target, so asserting earlier would pass vacuously.
		await vi.waitFor(() =>
			expect(container.querySelector('[data-mermaid-svg]')?.childNodes.length).toBeGreaterThan(0)
		);
		return container;
	};

	test('the diagram is an image labelled with its declaration line', async () => {
		const svg = (await renderDiagram()).querySelector('[data-mermaid-svg]');
		expect(svg?.getAttribute('role')).toBe('img');
		expect(svg?.getAttribute('aria-label')).toBe(
			`${defaultTranslations.controls.diagram}: flowchart TD`
		);
	});

	test('the toolbar buttons are named', async () => {
		const container = await renderDiagram();
		expect(names(container, 'button')).toEqual([
			defaultTranslations.controls.resetView,
			defaultTranslations.controls.zoomIn,
			defaultTranslations.controls.zoomOut,
			defaultTranslations.controls.fullscreen,
			defaultTranslations.controls.downloadDiagram
		]);
	});

	test('expanding makes the container a labelled modal dialog and moves focus into it', async () => {
		const container = await renderDiagram();
		container.querySelectorAll<HTMLButtonElement>('button')[3].click();
		await vi.waitFor(() => {
			const dialog = container.querySelector('[role="dialog"]');
			expect(dialog?.getAttribute('aria-modal')).toBe('true');
			expect(dialog?.getAttribute('aria-label')).toBe(
				`${defaultTranslations.controls.diagram}: flowchart TD`
			);
			expect(document.activeElement).toBe(dialog);
		});
		// Escape collapses it again (window listener installed by usePanzoom).
		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
		await vi.waitFor(() => expect(container.querySelector('[role="dialog"]')).toBeNull());
	});
});
