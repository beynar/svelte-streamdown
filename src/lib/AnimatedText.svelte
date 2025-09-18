<script lang="ts">
	import { useStreamdown } from './streamdown.svelte.js';

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

	let tokens = $derived.by(() => {
		return tokenizeNewContent(text);
	});
</script>

{#if streamdown.isMounted}
	<span>
		{#each tokens as token}
			<span style={streamdown.animationTextStyle}>
				{token}
			</span>
		{/each}
	</span>
{:else}
	{text}
{/if}
