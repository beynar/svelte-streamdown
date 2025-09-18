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

	const logDom = () => {
		if (text === 'Svelte Streamdown') {
			console.log(streamdown.animationTextStyle);
		}
	};

	const isMounted = streamdown.isMounted;
</script>

{#if isMounted}
	<span {@attach logDom}>
		{#each tokens as token}
			<span style={streamdown.animationTextStyle}>
				{token}
			</span>
		{/each}
	</span>
{:else}
	{text}
{/if}
