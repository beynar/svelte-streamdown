<script lang="ts">
	import { useStreamdown } from '$lib/context.svelte.js';
	import Slot from './Slot.svelte';
	import type { FootnoteRef } from '$lib/marked/marked-footnotes.js';

	import { useClickOutside } from '$lib/utils/useClickOutside.svelte.js';
	import { scale } from 'svelte/transition';
	import Block from '$lib/Block.svelte';
	import { useKeyDown } from '$lib/utils/useKeyDown.svelte.js';
	import { Popover } from './popover.svelte.js';

	const streamdown = useStreamdown();

	const {
		token
	}: {
		token: FootnoteRef;
	} = $props();

	const id = $props.id();
	const popover = new Popover();

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
</script>

{#if popover.isOpen}
	<dialog
		data-streamdown-footnote-popover={id}
		id={'footnote-popover-' + id}
		aria-modal="false"
		transition:scale|global={{ start: 0.95, duration: 100 }}
		{@attach clickOutside.attachment}
		{@attach popover.popoverAttachment}
		open
		class={`${streamdown.theme.components.popover}`}
	>
		<Slot
			props={{
				token,
				isOpen: popover.isOpen
			}}
			render={streamdown.snippets.footnotePopover}
		>
			{#each token.content.lines as line}
				<Block block={line} />
			{/each}
		</Slot>
	</dialog>
{/if}

{#if token.label !== 'streamdown:footnote'}
	<button
		data-streamdown-footnote-ref={id}
		style={streamdown.animationBlockStyle}
		bind:this={popover.reference}
		class={streamdown.theme.footnoteRef.base}
		onclick={() => (popover.isOpen = !popover.isOpen)}
		aria-expanded={popover.isOpen}
		aria-haspopup="dialog"
		aria-controls={'footnote-popover-' + id}
		{@attach clickOutside.attachment}
	>
		{token.label.replace('^', '')}
	</button>
{/if}
