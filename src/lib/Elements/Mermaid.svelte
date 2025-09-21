<script lang="ts">
	import { onMount } from 'svelte';
	import { useStreamdown } from '$lib/context.svelte.js';
	import type { Tokens } from 'marked';
	import type { MermaidConfig } from 'mermaid';
	import { on } from 'svelte/events';
	import { usePanzoom } from '$lib/utils/panzoom.svelte';

	const streamdown = useStreamdown();

	const {
		token
	}: {
		token: Tokens.Code;
	} = $props();

	let mermaid = $state<any>(null);
	onMount(async () => {
		mermaid = (await import('mermaid')).default;
	});

	const useIsInsideForMoreThanAQuarterSecond = () => {
		let isInside = $state(false);
		let timeout: number | undefined = undefined;

		return {
			get isInside() {
				return isInside;
			},
			attach: (node: HTMLElement) => {
				const off1 = on(node, 'mouseenter', () => {
					timeout = setTimeout(() => {
						isInside = true;
					}, 800);
				});

				const off2 = on(node, 'mouseleave', () => {
					isInside = false;
					clearTimeout(timeout);
				});

				return () => {
					off1();
					off2();
				};
			}
		};
	};

	const insider = useIsInsideForMoreThanAQuarterSecond();

	const panzoom = usePanzoom({
		minZoom: 0.5,
		maxZoom: 4,
		zoomSpeed: 1,
		get activateMouseWheel() {
			return insider.isInside;
		}
	});

	const sanitizeMermaidCode = (code: string): string => {
		try {
			let sanitized = code;

			// 1. Remove Byte Order Mark (BOM)
			sanitized = sanitized.replace(/^\uFEFF/, '');

			// 2. Normalize Unicode (NFC form for consistent rendering)
			sanitized = sanitized.normalize('NFC');

			// 3. Remove invisible/zero-width characters
			sanitized = sanitized.replace(/[\u200B-\u200F\u2028-\u202F\u205F-\u206F]/g, '');

			// 4. Remove control characters (except tab, line feed, carriage return)
			sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

			// 5. Normalize line endings to LF
			sanitized = sanitized.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

			// 6. Decode common HTML entities that might appear in Mermaid code
			const htmlEntities: Record<string, string> = {
				'&lt;': '<',
				'&gt;': '>',
				'&amp;': '&',
				'&quot;': '"',
				'&#39;': "'",
				'&apos;': "'",
				'&nbsp;': ' ',
				'&hellip;': '...',
				'&mdash;': '--',
				'&ndash;': '-',
				'&lsquo;': "'",
				'&rsquo;': "'",
				'&ldquo;': '"',
				'&rdquo;': '"'
			};

			for (const [entity, replacement] of Object.entries(htmlEntities)) {
				sanitized = sanitized.replace(new RegExp(entity, 'g'), replacement);
			}

			// 7. Convert smart quotes and other quote variants to standard quotes
			sanitized = sanitized
				.replace(/[\u2018\u2019]/g, "'") // Smart single quotes
				.replace(/[\u201C\u201D]/g, '"') // Smart double quotes
				.replace(/[\u2013\u2014]/g, '-') // Em/en dashes
				.replace(/\u2026/g, '...'); // Horizontal ellipsis

			// 8. Trim leading/trailing whitespace from each line and remove empty lines
			sanitized = sanitized
				.split('\n')
				.map((line) => line.trim())
				.filter((line) => line.length > 0)
				.join('\n');

			// 9. Normalize multiple spaces/tabs to single space (but preserve indentation in code blocks)
			sanitized = sanitized.replace(/[ \t]+/g, ' ');

			// 10. Handle over-escaped characters (common in copied code)
			// Convert double backslashes to single (except in JSON strings)
			sanitized = sanitized.replace(/\\\\(?![\\"])/g, '\\');

			// 11. Remove non-breaking spaces and other special spaces
			sanitized = sanitized.replace(/[\u00A0\u1680\u180E\u2000-\u200A\u202F\u205F\u3000]/g, ' ');

			// 12. Ensure proper spacing around operators and keywords
			// Add space after commas if missing (common in CSV-like data)
			sanitized = sanitized.replace(/,([^\s])/g, ', $1');

			// 13. Clean up Mermaid-specific issues
			// Remove trailing semicolons that might break parsing
			sanitized = sanitized.replace(/;+\s*$/gm, '');

			// Ensure proper spacing in flowchart syntax
			sanitized = sanitized.replace(
				/([A-Za-z0-9_]+)(\-\-|\-\-\>|\-\.\-|\-\.\-\>|\=\=|\=\=\>|\=\.\=\>|\=\.\-\>)/g,
				'$1 $2'
			);

			// 14. Final cleanup: trim and ensure single trailing newline
			sanitized = sanitized.trim();
			if (sanitized && !sanitized.endsWith('\n')) {
				sanitized += '\n';
			}

			return sanitized;
		} catch (error) {
			console.warn('Error during Mermaid code sanitization:', error);
			// Return original code if sanitization fails
			return code;
		}
	};

	const renderMermaid = async (code: string, element: HTMLElement) => {
		try {
			// Sanitize the code first

			// Default configuration
			const defaultConfig: MermaidConfig = {
				theme: 'base',
				startOnLoad: false,
				securityLevel: 'strict',
				fontFamily: 'monospace',
				suppressErrorRendering: true,

				flowchart: {
					useMaxWidth: true,
					htmlLabels: true,
					curve: 'basis'
				},
				...(streamdown.mermaidConfig || {})
			};

			// Initialize mermaid with merged config
			const mergedConfig = { ...defaultConfig };
			mermaid.initialize(mergedConfig);

			const chartHash = code.split('').reduce((acc, char) => {
				return ((acc << 5) - acc + char.charCodeAt(0)) | 0;
			}, 0);

			const uniqueId = `mermaid-${Math.abs(chartHash)}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

			// Render the diagram
			const { svg: svgString } = await mermaid.render(uniqueId, sanitizeMermaidCode(code));
			const svg = new DOMParser().parseFromString(svgString, 'image/svg+xml').documentElement;

			const svgTarget = element.querySelector('[data-mermaid-svg]')!;
			svg.id = uniqueId;
			Array.from(svg.attributes).forEach((attribute) => {
				svgTarget.setAttribute(attribute.name, attribute.value);
			});
			svgTarget.innerHTML = svg.innerHTML;

			panzoom.zoomToFit();
			panzoom.zoomToFit();
		} catch (err) {
			const sanitizedCode = sanitizeMermaidCode(code);
		}
	};
</script>

{#if mermaid}
	<div
		class={streamdown.theme.mermaid.base}
		{@attach (node) => renderMermaid(token.text, node)}
		{@attach insider.attach}
		data-expanded={'false'}
	>
		{#if streamdown.controls.mermaid}
			<div class={streamdown.theme.mermaid.buttons}>
				<button
					class={streamdown.theme.mermaid.button}
					aria-label="Zoom to fit"
					onclick={() => panzoom.zoomToFit()}
					data-panzoom-ignore
				>
					{@render (streamdown.icons?.fitView || fitViewIcon)()}
				</button>
				<button
					class={streamdown.theme.mermaid.button}
					aria-label="Zoom in"
					onclick={() => panzoom.zoomIn()}
					data-panzoom-ignore
				>
					{@render (streamdown.icons?.zoomIn || zoomInIcon)()}
				</button>
				<button
					class={streamdown.theme.mermaid.button}
					aria-label="Zoom out"
					onclick={() => panzoom.zoomOut()}
					data-panzoom-ignore
				>
					{@render (streamdown.icons?.zoomOut || zoomOutIcon)()}
				</button>
				<button
					class={streamdown.theme.mermaid.button}
					aria-label="Toggle expand"
					onclick={() => panzoom.toggleExpand()}
					data-panzoom-ignore
				>
					{@render (streamdown.icons?.fullscreen || fullscreenIcon)()}
				</button>
			</div>
		{/if}
		<svg {@attach panzoom.attach} data-mermaid-svg></svg>
	</div>
{:else}
	<div class={streamdown.theme.mermaid.base}></div>
{/if}

{#snippet zoomInIcon()}
	<svg
		class={streamdown.theme.mermaid.icon}
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	>
		<circle cx="11" cy="11" r="8" /><line x1="21" x2="16.65" y1="21" y2="16.65" />
		<line x1="11" x2="11" y1="8" y2="14" />
		<line x1="8" x2="14" y1="11" y2="11" />
	</svg>
{/snippet}

{#snippet zoomOutIcon()}
	<svg
		class={streamdown.theme.mermaid.icon}
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	>
		<circle cx="11" cy="11" r="8" /><line x1="21" x2="16.65" y1="21" y2="16.65" /><line
			x1="8"
			x2="14"
			y1="11"
			y2="11"
		/>
	</svg>
{/snippet}

{#snippet fitViewIcon()}
	<svg
		class={streamdown.theme.mermaid.icon}
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	>
		<path d="M3 7V5a2 2 0 0 1 2-2h2" />
		<path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" />
		<path d="M7 21H5a2 2 0 0 1-2-2v-2" /><rect width="10" height="8" x="7" y="8" rx="1" />
	</svg>
{/snippet}

{#snippet fullscreenIcon()}
	<svg
		class={streamdown.theme.mermaid.icon}
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	>
		<path d="m15 15 6 6" /><path d="m15 9 6-6" /><path d="M21 16v5h-5" /><path d="M21 8V3h-5" />
		<path d="M3 16v5h5" /><path d="m3 21 6-6" /><path d="M3 8V3h5" /><path d="M9 9 3 3" />
	</svg>
{/snippet}

<style>
	/* View Transition styles for zoom effect */
	::view-transition-old(panzoom-element),
	::view-transition-new(panzoom-element) {
		/* Animate both scale and opacity for smooth zoom */
		animation-duration: 0.3s;
		animation-timing-function: cubic-bezier(0.2, 0, 0, 1);
	}

	/* Zoom in animation (expand) */
	::view-transition-old(panzoom-element) {
		animation-name: zoom-out;
	}

	::view-transition-new(panzoom-element) {
		animation-name: zoom-in;
	}

	@keyframes zoom-out {
		from {
			transform: scale(1);
		}
		to {
			transform: scale(0.8);
		}
	}

	@keyframes zoom-in {
		from {
			transform: scale(1.2);
		}
		to {
			transform: scale(1);
		}
	}

	:global([data-expanded='true']) {
		::view-transition-old(panzoom-element),
		::view-transition-new(panzoom-element) {
			animation-duration: 0.3s;
			animation-timing-function: cubic-bezier(0.2, 0, 0, 1);
		}
		position: fixed;
		top: 16px;
		left: 16px;
		width: calc(100vw - 32px);
		height: calc(100vh - 32px);
		z-index: 2147483647;
		margin: 0px;
	}
</style>
