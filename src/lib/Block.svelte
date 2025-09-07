<script lang="ts">
	import { parseIncompleteMarkdown } from './utils/parse-incomplete-markdown.js';
	import { parseMarkdown } from './utils/parse.js';
	import { useStreamdown } from './Streamdown.svelte';
	import type { Root } from 'hast';
	import Element from './Elements/Element.svelte';
	let {
		content,
		id
	}: {
		content: string;
		id: string;
	} = $props();

	const streamdownContext = useStreamdown();
	const parsedContent = $derived(parseIncompleteMarkdown(content.trim()));
	const root = $derived(parseMarkdown(streamdownContext, parsedContent));
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
