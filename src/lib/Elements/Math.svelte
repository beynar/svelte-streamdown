<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { useStreamdown } from '$lib/Streamdown.js';
	import Slot from './Slot.svelte';
	import type { MathToken } from '$lib/marked/index.js';
	import type { Snippet } from 'svelte';
	import type { KatexOptions } from 'katex';
	import 'katex/dist/katex.min.css';

	const streamdown = useStreamdown();

	const {
		token
	}: {
		token: MathToken;
	} = $props();

	const isInline = $derived(token.isInline);

	console.log({ token });

	let katexInstance = $state<typeof import('katex') | null>(null);

	onMount(() => {
		import('katex').then((mod) => {
			katexInstance = mod.default;
		});
	});

	let inner = $state<HTMLElement | null>(null);
	const html = $derived.by(() => {
		if (!katexInstance) {
			return '';
		}
		const config: KatexOptions = {
			output: 'html',
			displayMode: !isInline,
			...(typeof streamdown.katexConfig === 'function'
				? streamdown.katexConfig(isInline)
				: streamdown.katexConfig || {})
		};
		const code = token.text;
		console.log({ code });
		try {
			return katexInstance.renderToString(code, config);
		} catch (error) {
			return untrack(() => {
				return inner?.innerHTML || '';
			});
		}
	});
</script>

{#if isInline}
	<span bind:this={inner} class={streamdown.theme.math.inline}>
		{@html html}
	</span>
{:else}
	<div class="h-fit w-full">
		<div class="overflow-x-auto">
			<div bind:this={inner} class={streamdown.theme.math.block}>
				{@html html}
			</div>
		</div>
	</div>
{/if}
