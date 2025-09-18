<script lang="ts">
	import { parseIncompleteMarkdown } from './utils/parse-incomplete-markdown.js';
	import Element from './Elements/Element.svelte';
	import { lex, type StreamdownToken } from './marked/index.js';
	import AnimatedText from './AnimatedText.svelte';
	import { useStreamdown } from './streamdown.svelte.js';
	import AnimatedBlock from './AnimatedBlock.svelte';

	let {
		block
	}: {
		block: string;
	} = $props();
	const id = $props.id();
	const tokens = $derived(lex(parseIncompleteMarkdown(block.trim())));
	const streamdown = useStreamdown();
</script>

{#snippet renderChildren(tokens: StreamdownToken[])}
	{#each tokens as token, i (`${id}-block-${i}`)}
		{#if token}
			{@const children = (token as any)?.tokens || []}
			{@const isTextOnlyNode = children.length === 0}
			<Element {token}>
				{#if isTextOnlyNode}
					{#if streamdown.animation.enabled}
						<AnimatedText text={'text' in token ? token.text : ''} />
					{:else}
						{'text' in token ? token.text : ''}
					{/if}
				{:else}
					{@render renderChildren(children)}
				{/if}
			</Element>
		{/if}
	{/each}
{/snippet}

{#if streamdown.animation.enabled}
	<AnimatedBlock>
		{@render renderChildren(tokens)}
	</AnimatedBlock>
{:else}
	{@render renderChildren(tokens)}
{/if}
