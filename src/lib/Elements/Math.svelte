<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { useStreamdown } from '$lib/context.svelte.js';
	import type { MathToken } from '$lib/marked/index.js';
	import type { KatexOptions } from 'katex';
	import 'katex/dist/katex.min.css';

	const {
		token
	}: {
		token: MathToken;
	} = $props();

	const streamdown = useStreamdown();
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
			displayMode: !token.isInline,
			...(typeof streamdown.katexConfig === 'function'
				? streamdown.katexConfig(token.isInline)
				: streamdown.katexConfig || {})
		};
		const code = token.text;

		try {
			return katexInstance.renderToString(code, config);
		} catch (error) {
			return untrack(() => {
				return inner?.innerHTML || '';
			});
		}
	});
</script>

{#if token.isInline}
	<span
		style={streamdown.isMounted ? streamdown.animationBlockStyle : ''}
		bind:this={inner}
		class={streamdown.theme.math.inline}
	>
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
