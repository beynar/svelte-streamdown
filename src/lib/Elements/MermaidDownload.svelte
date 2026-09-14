<script lang="ts">
	import { useStreamdown } from '$lib/context.svelte.js';
	import { scale } from 'svelte/transition';
	import { downloadIcon } from './icons.js';
	import { Popover } from './popover.svelte.js';
	import { useClickOutside } from '$lib/utils/useClickOutside.svelte.js';
	import { useKeyDown } from '$lib/utils/useKeyDown.svelte.js';
	import { save } from '$lib/utils/save.js';
	import type { CodeToken } from '$lib/marked/index.js';

	let {
		token,
		id
	}: {
		token: CodeToken;
		id: string;
	} = $props();

	const streamdown = useStreamdown();
	const popover = new Popover();

	const filename = (extension: string) => {
		const base = streamdown.controls.mermaidDownloadFilename;
		return `${typeof base === 'function' ? base(token) : base}.${extension}`;
	};

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

	const getSvgElement = (): SVGSVGElement | null => {
		const container = document.querySelector(`[data-streamdown-mermaid="${id}"]`);
		if (!container) return null;

		const svgContainer = container.querySelector('[data-mermaid-svg]');
		if (!svgContainer) return null;

		// The actual SVG is rendered inside the data-mermaid-svg container
		const svg = svgContainer.querySelector('svg');
		return svg;
	};

	const downloadSvg = () => {
		const svg = getSvgElement();
		if (!svg) return;

		// Clone the SVG to avoid modifying the original
		const clonedSvg = svg.cloneNode(true) as SVGSVGElement;

		// Ensure the SVG has proper xmlns
		clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
		clonedSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

		// Get computed styles and inline them for standalone SVG
		const styles = getComputedStyle(svg);
		if (!clonedSvg.getAttribute('width')) {
			clonedSvg.setAttribute('width', styles.width);
		}
		if (!clonedSvg.getAttribute('height')) {
			clonedSvg.setAttribute('height', styles.height);
		}

		const svgString = new XMLSerializer().serializeToString(clonedSvg);
		save(filename('svg'), svgString, 'image/svg+xml');
		popover.isOpen = false;
	};

	const downloadPng = async () => {
		const svg = getSvgElement();
		if (!svg) return;

		// Clone the SVG to avoid modifying the original
		const clonedSvg = svg.cloneNode(true) as SVGSVGElement;

		// Ensure the SVG has proper xmlns
		clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
		clonedSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

		// Get dimensions
		const bbox = svg.getBBox();
		const styles = getComputedStyle(svg);
		const width = parseFloat(styles.width) || bbox.width || 800;
		const height = parseFloat(styles.height) || bbox.height || 600;

		// Set explicit dimensions on the cloned SVG
		clonedSvg.setAttribute('width', String(width));
		clonedSvg.setAttribute('height', String(height));

		// Serialize SVG to string
		const svgString = new XMLSerializer().serializeToString(clonedSvg);

		// Use data URL instead of blob URL to avoid tainted canvas issues
		const svgDataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));

		// Create an image to load the SVG
		const img = new Image();

		img.onload = () => {
			// Create a canvas with 2x scale for better quality
			const scale = 2;
			const canvas = document.createElement('canvas');
			canvas.width = width * scale;
			canvas.height = height * scale;

			const ctx = canvas.getContext('2d');
			if (!ctx) {
				return;
			}

			// Fill with white background (optional, remove for transparent)
			ctx.fillStyle = '#ffffff';
			ctx.fillRect(0, 0, canvas.width, canvas.height);

			// Scale and draw the image
			ctx.scale(scale, scale);
			ctx.drawImage(img, 0, 0);

			// Convert to PNG and download
			canvas.toBlob((blob) => {
				if (blob) {
					const url = URL.createObjectURL(blob);
					const link = document.createElement('a');
					link.href = url;
					link.download = filename('png');
					document.body.appendChild(link);
					link.click();
					document.body.removeChild(link);
					URL.revokeObjectURL(url);
				}
			}, 'image/png');
		};

		img.onerror = () => {
			console.error('Failed to load SVG for PNG conversion');
		};

		img.src = svgDataUrl;
		popover.isOpen = false;
	};

	const formats = $derived([
		{ type: 'PNG', label: streamdown.translations.controls.downloadDiagramPng },
		{ type: 'SVG', label: streamdown.translations.controls.downloadDiagramSvg },
		{ type: 'MMD', label: streamdown.translations.controls.downloadDiagramMmd }
	] as const);

	const download = (type: 'SVG' | 'PNG' | 'MMD') => {
		if (type === 'SVG') {
			downloadSvg();
		} else if (type === 'PNG') {
			downloadPng();
		} else {
			// The diagram source, same trailing-newline trim as the rendered chart.
			save(filename('mmd'), token.text.replace(/\n+$/, ''), 'text/plain');
			popover.isOpen = false;
		}
	};
</script>

{#if popover.isOpen}
	<dialog
		id={'mermaid-download-popover-' + id}
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
				onclick={() => download(type)}
				class={streamdown.theme.components.button}
				type="button"
			>
				{label}
			</button>
		{/each}
	</dialog>
{/if}

<button
	class={streamdown.theme.components.button}
	onclick={(e: MouseEvent) => {
		if (popover.isOpen) {
			popover.isOpen = false;
			return;
		}
		popover.reference = e.target as HTMLButtonElement;
		popover.isOpen = true;
	}}
	{@attach clickOutside.attachment}
	type="button"
	title={streamdown.translations.controls.downloadDiagram}
	aria-label={streamdown.translations.controls.downloadDiagram}
	data-panzoom-ignore
>
	{@render (streamdown.icons?.download || downloadIcon)()}
</button>
