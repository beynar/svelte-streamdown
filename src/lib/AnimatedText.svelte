<script lang="ts">
	import { useStreamdown } from './context.svelte.js';
	let { text }: { text: string } = $props();

	const streamdown = useStreamdown();

	const tokenizeNewContent = (text: string) => {
		if (!text) return [];

		let splitRegex;
		if (streamdown.animation.tokenize === 'word') {
			splitRegex = /(\s+)/;
		} else {
			splitRegex = /(.)/;
		}

		return text.split(splitRegex).filter((token) => token.length > 0);
	};

	const tokens = $derived(tokenizeNewContent(text));
</script>

{#if streamdown.isMounted}
	{#each tokens as token}
		<span style={streamdown.animationTextStyle}>
			{token}
		</span>
	{/each}
{:else}
	{text}
{/if}
