<script lang="ts">
	import { parseIncompleteMarkdown as completeMarkdown } from './utils/parse-incomplete-markdown.js';
	import Element from './Elements/Element.svelte';
	import { lex, type StreamdownToken } from './marked/index.js';
	import AnimatedText from './AnimatedText.svelte';
	import { useStreamdown } from './context.svelte.js';
	import { getContext, untrack } from 'svelte';

	let {
		block,
		static: isStatic = false,
		incomplete = false,
		live = false
	}: {
		block: string;
		static?: boolean;
		/** This block ends inside an unfinished code fence (streaming only). */
		incomplete?: boolean;
		/** This is the block still being streamed into — the only one whose tail may be cut. */
		live?: boolean;
	} = $props();

	const streamdown = useStreamdown();
	// The old code never consulted `streamdown.parseIncompleteMarkdown`; the import
	// is aliased so the context flag and the helper cannot be confused.
	const complete = $derived(!isStatic && streamdown.parseIncompleteMarkdown !== false);
	// A bracket only means a citation when there is something to cite. The rule takes the whole
	// bracket before any other can see it, so without sources it would keep a tag inside one from
	// reaching its component. A consumer's own snippet renders citations without `sources`.
	// Derived on its own so that new `sources` do not re-lex a block unless this answer changes.
	const citations = $derived(
		Object.keys(streamdown.sources ?? {}).length > 0 || !!streamdown.snippets.inlineCitation
	);
	const view = $derived.by(() => {
		const tokens = lex(
			complete ? completeMarkdown(block.trim(), { tags: streamdown.tags, live }) : block,
			streamdown.extensions,
			streamdown.tags,
			citations
		);
		// Decided when this block's text changes and deliberately not tracked: a
		// bulk update renders plain, and the next streamed chunk must not
		// retroactively animate the blocks it left untouched.
		return { tokens, animate: untrack(() => streamdown.animateUpdate) };
	});
	const insidePopover = getContext('POPOVER');
</script>

{#snippet renderChildren(tokens: StreamdownToken[])}
	{#each tokens as token}
		{#if token}
			{@const children = (token as any)?.tokens || []}
			{@const isTextOnlyNode = children.length === 0}
			<Element {token} {incomplete} animate={view.animate}>
				{#if isTextOnlyNode}
					{#if streamdown.animation.enabled && view.animate && !insidePopover && !isStatic}
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

{@render renderChildren(view.tokens)}
