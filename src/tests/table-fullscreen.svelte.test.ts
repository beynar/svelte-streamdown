import { describe, test, expect, vi } from 'vitest';
import { flushSync } from 'svelte';
import { render } from 'vitest-browser-svelte';
import Streamdown from '$lib/Streamdown.svelte';
import { defaultTranslations } from '$lib/index.js';

// Expanding is focus- and attribute-work on live DOM nodes, so none of it can be
// asserted from the token stream: browser project only.

const content = '| Name | Notes |\n| --- | --- |\n| Ada | first |\n';

const setup = () => {
	const { container } = render(Streamdown, { content });
	const toggle = container.querySelector<HTMLButtonElement>(
		'[data-streamdown-table-download] button[aria-pressed]'
	)!;
	const wrapper = container.querySelector<HTMLElement>('[data-streamdown-table]')!;
	return { container, toggle, wrapper };
};

const escape = () => {
	window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
	flushSync();
};

describe('table fullscreen', () => {
	test('the toggle turns the wrapper into a labelled dialog', () => {
		const { toggle, wrapper } = setup();
		expect(wrapper.dataset.expanded).toBeUndefined();
		expect(wrapper.getAttribute('role')).toBe(null);

		toggle.click();
		flushSync();

		expect(wrapper.dataset.expanded).toBe('true');
		expect(wrapper.getAttribute('role')).toBe('dialog');
		expect(wrapper.getAttribute('aria-label')).toBe(defaultTranslations.controls.table);
		// Not aria-modal: the toolbar is a sibling, and marking the subtree modal
		// would hide close/copy/download from assistive tech.
		expect(wrapper.getAttribute('aria-modal')).toBe(null);
		// The global rule keys off the attribute, the theme class off the state.
		expect(wrapper.className).toContain('shadow-2xl');
		// Focus moves into the overlay so the next Tab stays inside it.
		expect(document.activeElement).toBe(wrapper);
	});

	test('clicking the toggle again collapses it', () => {
		const { toggle, wrapper } = setup();
		toggle.click();
		flushSync();
		toggle.click();
		flushSync();

		expect(wrapper.dataset.expanded).toBe('false');
		expect(wrapper.getAttribute('role')).toBe(null);
		expect(wrapper.className).not.toContain('shadow-2xl');
	});

	test('Escape collapses it and hands focus back to the toggle', () => {
		const { toggle, wrapper } = setup();
		toggle.click();
		flushSync();
		expect(document.activeElement).toBe(wrapper);

		escape();

		expect(wrapper.dataset.expanded).toBe('false');
		expect(document.activeElement).toBe(toggle);
	});

	test('the fullscreen rule leaves other elements with data-expanded alone', () => {
		const { toggle, wrapper } = setup();
		// The rule is global; the host page may use data-expanded for its own elements.
		const other = document.createElement('div');
		other.dataset.expanded = 'true';
		document.body.append(other);

		toggle.click();
		flushSync();

		expect(getComputedStyle(wrapper).position).toBe('fixed');
		expect(getComputedStyle(other).position).toBe('static');
		other.remove();
	});

	test('Escape on a collapsed table does nothing', () => {
		const { wrapper } = setup();
		escape();
		expect(wrapper.dataset.expanded).toBeUndefined();
	});

	test('copy still reaches the table while it is expanded', async () => {
		const { container, toggle } = setup();
		const writeText = navigator.clipboard.writeText;
		let copied = '';
		navigator.clipboard.writeText = async (text: string) => {
			copied = text;
		};
		try {
			toggle.click();
			flushSync();

			// Second button in the toolbar is copy; it opens the same format popover.
			const buttons = container.querySelectorAll<HTMLButtonElement>(
				'[data-streamdown-table-download] button'
			);
			buttons[1].click();
			flushSync();
			const dialog = document.querySelectorAll('dialog');
			const markdown = Array.from(dialog[dialog.length - 1].querySelectorAll('button')).find(
				(b) => b.textContent?.trim() === 'Markdown'
			)!;
			markdown.click();
			await vi.waitFor(() => expect(copied).not.toBe(''));
		} finally {
			navigator.clipboard.writeText = writeText;
		}
		expect(copied).toBe(content.trimEnd());
		// And the overlay is still up.
		expect(container.querySelector<HTMLElement>('[data-streamdown-table]')?.dataset.expanded).toBe(
			'true'
		);
	});
});
