<script lang="ts" module>
</script>

<script lang="ts">
	import { parseIncompleteMarkdown } from './utils/parse-incomplete-markdown.js';
	import Element from './Elements/Element.svelte';
	import { lex, type StreamdownToken } from './marked/index.js';

	let {
		block
	}: {
		block: string;
	} = $props();

	const tokens = $derived(lex(parseIncompleteMarkdown(block.trim())));
</script>

{#snippet renderChildren(tokens: StreamdownToken[])}
	{#each tokens as token}
		{#if token}
			{@const children = (token as any)?.tokens || []}
			{@const isTextOnlyNode = children.length === 0}
			<Element {token}>
				{#if isTextOnlyNode}
					{'text' in token ? token.text : ''}
				{:else}
					{@render renderChildren(children)}
				{/if}
			</Element>
		{/if}
	{/each}
{/snippet}

{@render renderChildren(tokens)}
