<script lang="ts">
	import type { Snippet } from 'svelte';
	import { useStreamdown } from './context.svelte.js';

	let { children }: { children: Snippet } = $props();

	const streamdown = useStreamdown();
</script>

{#if streamdown.isMounted}
	<div style={streamdown.animationBlockStyle}>
		{@render children()}
	</div>
{:else}
	{@render children()}
{/if}
