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
	import { srOnly } from './srOnly.js';
	import { extractTableData, tableDataToCSV, tableDataToTSV } from '$lib/utils/table-export.js';

	type Format = 'Markdown' | 'HTML' | 'CSV' | 'TSV';

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
	const modes = $derived(
		(['download', 'copy'] as const).filter((mode) =>
			mode === 'download' ? streamdown.controls.tableDownload : streamdown.controls.tableCopy
		)
	);

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

	const filename = (extension: string) => {
		const base = streamdown.controls.tableDownloadFilename;
		return `${typeof base === 'function' ? base(token) : base}.${extension}`;
	};

	const formats = $derived([
		{ type: 'Markdown', label: streamdown.translations.controls.tableFormatMarkdown },
		{ type: 'HTML', label: streamdown.translations.controls.tableFormatHtml },
		{ type: 'CSV', label: streamdown.translations.controls.tableFormatCsv },
		{ type: 'TSV', label: streamdown.translations.controls.tableFormatTsv }
	] as const satisfies readonly { type: Format; label: string }[]);

	const emit = (content: string, extension: string, mimeType: string) => {
		copyValue = content;
		if (modeState === 'copy') {
			copy.copy();
		} else {
			save(filename(extension), content, mimeType);
		}
	};

	const tableElement = () => document.querySelector(`[data-streamdown-table="${id}"]`);

	const copyOrDownload = (type: Format) => {
		if (type === 'Markdown') {
			// `token.raw` is the author's own markdown; a DOM round-trip through
			// tableDataToMarkdown() would lose the inline formatting.
			emit(token.raw, 'md', 'text/markdown');
		} else if (type === 'HTML') {
			const table = tableElement();

			if (table) {
				let html = (table.cloneNode(true) as HTMLElement).outerHTML;
				// remove comments
				html = html.replace(/<!--[\s\S]*?-->/g, '');
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

				emit(html, 'html', 'text/html');
			}
		} else {
			const table = tableElement();

			if (table) {
				const data = extractTableData(table);
				if (type === 'CSV') {
					emit(tableDataToCSV(data, streamdown.controls.tableCsvSeparator), 'csv', 'text/csv');
				} else {
					emit(tableDataToTSV(data), 'tsv', 'text/tab-separated-values');
				}
			}
		}
		popover.isOpen = false;
	};
</script>

{#if popover.isOpen}
	<dialog
		id={'table-download-popover-' + id}
		aria-modal="false"
		transition:scale|global={{ start: 0.95, duration: 100 }}
		{@attach clickOutside.attachment}
		{@attach popover.popoverAttachment}
		open
		style:width="fit-content !important"
		style:min-width="fit-content !important"
		class={streamdown.theme.components.popover}
	>
		{#each formats as { type, label } (type)}
			<button
				style="width: 100%; text-align: left; justify-content: flex-start; padding: 1rem 1rem; margin: 0.2rem 0;"
				onclick={() => copyOrDownload(type)}
				class={streamdown.theme.components.button}
				type="button"
			>
				{label}
			</button>
		{/each}
	</dialog>
{/if}

<div
	data-streamdown-table-download
	class=" right-0 ml-auto flex items-center justify-end gap-2 p-1"
>
	{#each modes as mode (mode)}
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
			type="button"
			title={mode === 'download'
				? streamdown.translations.controls.downloadTable
				: streamdown.translations.controls.copyTable}
			aria-label={mode === 'download'
				? streamdown.translations.controls.downloadTable
				: streamdown.translations.controls.copyTable}
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
	<span aria-live="polite" style={srOnly}
		>{copy.isCopied ? streamdown.translations.controls.copiedTable : ''}</span
	>
</div>

<style>
	:global([data-streamdown-table-download] + div) {
		margin-top: 0px;
	}
</style>
