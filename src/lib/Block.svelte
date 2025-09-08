<script lang="ts">
	import { parseIncompleteMarkdown } from './utils/parse-incomplete-markdown.js';
	import { parseMarkdown } from './utils/parse.js';
	import { useStreamdown } from './Streamdown.svelte';
	import type { Root } from 'hast';
	import Element from './Elements/Element.svelte';
	let {
		block
	}: {
		block: string;
	} = $props();

	const streamdownContext = useStreamdown();
	const root = $derived(parseMarkdown(streamdownContext, parseIncompleteMarkdown(block.trim())));

	console.log({ root });
</script>

{#snippet renderChildren(nodeChildren: Root['children'])}
	{#each nodeChildren as node}
		{#if node.type === 'element'}
			<Element {node} props={'properties' in node ? node.properties : {}} type={node.tagName}>
				{#if 'children' in node && node.children?.length}
					{@render renderChildren(node.children)}
				{/if}
			</Element>
		{:else if node.type === 'text' && node.value}
			{node.value}
		{/if}
	{/each}
{/snippet}

{@render renderChildren(root.children)}
