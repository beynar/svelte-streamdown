<script lang="ts">
	import { useStreamdown } from '$lib/Streamdown.svelte';
	import { transformUrl } from '$lib/utils/url.js';
	import { clsx } from 'clsx';
	import type { AnchorProps } from './element.js';
	import Slot from './Slot.svelte';

	const streamdown = useStreamdown();

	const { href, children, node, ...props }: AnchorProps = $props();

	const transformedUrl = $derived(
		transformUrl(href, streamdown.allowedLinkPrefixes ?? [], streamdown.defaultOrigin)
	);
</script>

{#if transformedUrl}
	<Slot
		props={{
			href: transformedUrl,
			target: '_blank',
			rel: 'noopener noreferrer',
			children,
			node,
			...props
		}}
		render={streamdown.snippets.a}
	>
		<a
			class={clsx(streamdown.theme.a.base, node.properties.className)}
			href={transformedUrl}
			target="_blank"
			rel="noopener noreferrer"
			{...props}
		>
			{@render children()}
		</a>
	</Slot>
{:else}
	<span class="text-gray-500" title={`Blocked URL: ${href}`}>
		{@render children()} [blocked]
	</span>
{/if}
