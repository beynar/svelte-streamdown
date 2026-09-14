<script lang="ts">
	import { parseIncompleteMarkdown as completeMarkdown } from './utils/parse-incomplete-markdown.js';
	import Element from './Elements/Element.svelte';
	import { lex, type StreamdownToken } from './marked/index.js';
	import AnimatedText from './AnimatedText.svelte';
	import { useStreamdown } from './context.svelte.js';
	import { getContext } from 'svelte';

	let {
		block,
		static: isStatic = false,
		incomplete = false
	}: {
		block: string;
		static?: boolean;
		/** This block ends inside an unfinished code fence (streaming only). */
		incomplete?: boolean;
	} = $props();

	const streamdown = useStreamdown();
	// The old code never consulted `streamdown.parseIncompleteMarkdown`; the import
	// is aliased so the context flag and the helper cannot be confused.
	const complete = $derived(!isStatic && streamdown.parseIncompleteMarkdown !== false);
	const tokens = $derived(
		lex(complete ? completeMarkdown(block.trim()) : block, streamdown.extensions)
	);
	const insidePopover = getContext('POPOVER');
</script>

{#snippet renderChildren(tokens: StreamdownToken[])}
	{#each tokens as token}
		{#if token}
			{@const children = (token as any)?.tokens || []}
			{@const isTextOnlyNode = children.length === 0}
			<Element {token} {incomplete}>
				{#if isTextOnlyNode}
					{#if streamdown.animation.enabled && !insidePopover && !isStatic}
						<AnimatedText text={'text' in token ? token.text || '' : ''} />
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

{@render renderChildren(tokens)}
