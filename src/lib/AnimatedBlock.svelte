<script lang="ts">
	import type { Snippet } from 'svelte';
	import { useStreamdown } from './streamdown.svelte.js';

	let { children }: { children: Snippet } = $props();

	const streamdown = useStreamdown();

	const isMounted = streamdown.isMounted;
</script>

{#if isMounted}
	<div style={streamdown.animationBlockStyle}>
		{@render children()}
	</div>
{:else}
	{@render children()}
{/if}
