<script lang="ts">
	import { useStreamdown } from '$lib/context.svelte.js';
	import Slot from './Slot.svelte';
	import type { FootnoteRef } from '$lib/marked/marked-footnotes.js';
	import {
		autoPlacement,
		computePosition,
		autoUpdate,
		hide,
		offset,
		shift
	} from '@floating-ui/dom';
	import { useClickOutside } from '$lib/utils/useClickOutside.svelte.js';
	import { scale } from 'svelte/transition';
	import Block from '$lib/Block.svelte';
	import { useKeyDown } from '$lib/utils/useKeyDown.svelte.js';

	const streamdown = useStreamdown();

	const {
		token
	}: {
		token: FootnoteRef;
	} = $props();

	const id = $props.id();
	let isOpen = $state(false);

	let reference = $state<HTMLButtonElement>();
	let content = $state<HTMLDialogElement>();

	const clickOutside = useClickOutside({
		get isActive() {
			return isOpen;
		},
		callback: () => {
			isOpen = false;
		}
	});

	useKeyDown({
		keys: ['Escape'],
		get isActive() {
			return isOpen;
		},
		callback: () => {
			isOpen = false;
		}
	});

	const place = async (node: HTMLElement) => {
		const middleware = [
			hide(),
			offset(0),
			shift({
				mainAxis: true
			}),
			autoPlacement({
				allowedPlacements: ['top', 'top-end', 'top-start', 'bottom', 'bottom-end', 'bottom-start']
			})
		];
		const { x, y, strategy, placement, middlewareData } = await computePosition(reference!, node, {
			strategy: 'fixed',
			middleware
		});

		Object.assign(node.style, {
			position: strategy,
			left: `${x}px`,
			top: `${y}px`
		});
	};

	const popoverAttachment = (node: HTMLDialogElement) => {
		content = node;
		void place(node);
		const off = autoUpdate(reference!, node, () => place(node));
		return () => {
			off();
		};
	};
</script>

{#if isOpen}
	<Slot
		props={{
			token,
			isOpen
		}}
		render={streamdown.snippets.footnotePopover}
	>
		<dialog
			style="z-index: 1000; position: fixed;"
			id={'footnote-popover-' + id}
			aria-modal="false"
			transition:scale|global={{ start: 0.95, duration: 100 }}
			{@attach clickOutside.attachment}
			{@attach popoverAttachment}
			open
			class={`${streamdown.theme.footnotePopover.base}`}
		>
			{#each token.content.lines as line}
				<Block insideFootnote block={line} />
			{/each}
		</dialog>
	</Slot>
{/if}

{#if token.label !== 'streamdown:footnote'}
	<Slot
		props={{
			token
		}}
		render={streamdown.snippets.footnoteRef}
	>
		<button
			style={streamdown.animationBlockStyle}
			bind:this={reference}
			class={streamdown.theme.footnoteRef.base}
			onclick={() => (isOpen = !isOpen)}
			aria-expanded={isOpen}
			aria-haspopup="dialog"
			aria-controls={'footnote-popover-' + id}
			{@attach clickOutside.attachment}
		>
			{token.label.replace('^', '')}
		</button>
	</Slot>
{/if}
