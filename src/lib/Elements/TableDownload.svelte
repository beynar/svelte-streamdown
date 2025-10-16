<script lang="ts">
	import { useStreamdown } from '$lib/context.svelte.js';
	import { scale } from 'svelte/transition';
	import { checkIcon, copyIcon, downloadIcon } from './icons.js';
	import { Popover } from './popover.svelte.js';
	import { useClickOutside } from '$lib/utils/useClickOutside.svelte.js';
	import { useKeyDown } from '$lib/utils/useKeyDown.svelte.js';
	import type { TableToken } from '$lib/marked/marked-table.js';
	import { useCopy } from '$lib/utils/copy.svelte.js';
	import { save } from '$lib/utils/save.js';

	let {
		token,
		id
	}: {
		token: TableToken;
		id: string;
	} = $props();
	const streamdown = useStreamdown();
	const popover = new Popover();
	let modeState = $state<'download' | 'copy'>('download');

	useKeyDown({
		keys: ['Escape'],
		get isActive() {
			return popover.isOpen;
		},
		callback: () => {
			popover.isOpen = false;
		}
	});
	const clickOutside = useClickOutside({
		get isActive() {
			return popover.isOpen;
		},
		callback: () => {
			popover.isOpen = false;
		}
	});

	let copyValue = $state(token.raw);

	const copy = useCopy({
		get content() {
			return copyValue;
		}
	});

	const copyOrDownload = (type: 'Markdown' | 'HTML' | 'CSV') => {
		if (type === 'Markdown') {
			copyValue = token.raw;
			if (modeState === 'copy') {
				copy.copy();
			} else {
				save('table.md', copyValue, 'text/markdown');
			}
		} else if (type === 'HTML') {
			const table = document.parentElement?.querySelector(`[data-streamdown-table=${id}]`);

			if (table) {
				let html = (table.cloneNode(true) as HTMLElement).outerHTML;
				// remove comments
				html = html.replace(/<!--[\s\S]*?-->/g, '');
				copyValue = html;
				// Remove class and style attributes
				html = html.replace(/class="[^"]*"/g, '');
				html = html.replace(/style="[^"]*"/g, '');
				// remove space between the tag name and the closing chrevron like <table  > -> <table> for every tagnmae
				html = html.replace(/<([^>]+)>\s+</g, '<$1><');
				// Remove spaces before closing bracket >
				html = html.replace(/\s+>/g, '>');
				// Remove spaces after opening bracket <
				html = html.replace(/<\s+/g, '<');
				// Collapse multiple spaces within tags to single space
				html = html.replace(/<([^>]+)>/g, (match) => match.replace(/\s+/g, ' '));

				copyValue = html;

				if (modeState === 'copy') {
					copy.copy();
				} else {
					save('table.html', copyValue, 'text/html');
				}
			}
		} else if (type === 'CSV') {
			const table = document.querySelector(`[data-streamdown-table=${id}]`);

			if (table) {
				const rows = table.querySelectorAll('tr');
				const rowSpanFills: Array<{ rowIndex: number; colIndex: number; colSpan: number }> = [];

				const matrix = Array.from(rows).reduce((acc, row, rowIndex) => {
					const cells = row.querySelectorAll('td, th');
					const rowData: string[] = [];
					let actualCol = 0; // Track actual column position in the output matrix

					Array.from(cells).forEach((cell) => {
						const colSpan = parseInt(cell.getAttribute('colspan') || '1');
						const rowSpan = parseInt(cell.getAttribute('rowspan') || '1');

						// Add the cell content
						// Add the cell content, quoting if it contains commas, quotes, or newlines
						const content = cell.textContent || '';
						const needsQuoting = /[,"\n]/.test(content);
						const escapedContent = content.replace(/"/g, '""');
						rowData.push(needsQuoting ? `"${escapedContent}"` : content);

						// Add empty cells for colspan
						for (let i = 0; i < colSpan - 1; i++) {
							rowData.push('');
						}

						// Track rowspan fills needed in future rows
						if (rowSpan > 1) {
							for (let r = 1; r < rowSpan; r++) {
								rowSpanFills.push({
									rowIndex: rowIndex + r,
									colIndex: actualCol,
									colSpan: colSpan
								});
							}
						}

						actualCol += colSpan;
					});

					acc.push(rowData);
					return acc;
				}, [] as string[][]);

				// Process rowspan fills - insert empty cells at correct positions
				rowSpanFills.forEach(({ rowIndex, colIndex, colSpan }) => {
					if (matrix[rowIndex]) {
						matrix[rowIndex].splice(colIndex, 0, ...Array(colSpan).fill(''));
					}
				});

				const csv = matrix.map((row) => row.join(',')).join('\n');
				copyValue = csv;
				if (modeState === 'copy') {
					copy.copy();
				} else {
					save('table.csv', copyValue, 'text/csv');
				}
			}
		}
		popover.isOpen = false;
	};
</script>

{#if popover.isOpen}
	<dialog
		id={'table-download-popover'}
		aria-modal="false"
		transition:scale|global={{ start: 0.95, duration: 100 }}
		{@attach clickOutside.attachment}
		{@attach popover.popoverAttachment}
		open
		style:width="fit-content !important"
		style:min-width="fit-content !important"
		class={streamdown.theme.components.popover}
	>
		{#each ['Markdown', 'HTML', 'CSV'] as type}
			<button
				style="width: 100%; text-align: left; justify-content: flex-start; padding: 1rem 1rem; margin: 0.2rem 0;"
				onclick={() => copyOrDownload(type as 'Markdown' | 'HTML' | 'CSV')}
				class={streamdown.theme.components.button}
			>
				{type}
			</button>
		{/each}
	</dialog>
{/if}

<div
	data-streamdown-table-download
	class=" right-0 ml-auto flex items-center justify-end gap-2 p-1"
>
	{#each ['download', 'copy'] as mode (mode)}
		<button
			class={streamdown.theme.components.button}
			onclick={async (e: MouseEvent) => {
				if (modeState === mode && popover.isOpen) {
					popover.isOpen = false;
					return;
				}
				if (popover.isOpen && modeState !== mode) {
					popover.isOpen = false;
					const wait = new Promise((resolve) => {
						setTimeout(resolve, 80);
					});
					await wait;
				}
				popover.reference = e.target as HTMLButtonElement;
				popover.isOpen = true;
				modeState = mode as 'download' | 'copy';
			}}
			{@attach clickOutside.attachment}
			title={mode === 'download' ? 'Download table' : 'Copy table'}
		>
			{#if mode === 'download'}
				{@render (streamdown.icons?.download || downloadIcon)()}
			{:else if copy.isCopied}
				{@render (streamdown.icons?.check || checkIcon)()}
			{:else}
				{@render (streamdown.icons?.copy || copyIcon)()}
			{/if}
		</button>
	{/each}
</div>

<style>
	:global([data-streamdown-table-download] + div) {
		margin-top: 0px;
	}
</style>
