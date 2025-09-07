<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		children,
		render,
		...props
	}: {
		children: Snippet;
		render?: Snippet<[any]>;
		props: Record<string, any>;
	} = $props();
</script>

{#if render}
	{@render render(props)}
{:else}
	{@render children()}
{/if}
