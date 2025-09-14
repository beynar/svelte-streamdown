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

	const getChildren = (token: StreamdownToken) => {
		if (!token) {
			return [];
		}
		const children =
			'tokens' in token ? ((token.tokens || []) as StreamdownToken[]) : ([] as StreamdownToken[]);

		if (!children.length && token.type !== 'text') {
			return [
				{
					type: 'text',
					text: 'text' in token ? token.text : '',
					raw: 'raw' in token ? token.raw : '',
					tokens: []
				}
			] satisfies StreamdownToken[];
		}
		return children;
	};
</script>

{#snippet renderChildren(tokens: StreamdownToken[])}
	{#each tokens as token}
		{#if token}
			{@const children = getChildren(token)}
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
