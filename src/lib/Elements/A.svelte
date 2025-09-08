<script lang="ts">
	import { useStreamdown } from '$lib/Streamdown.svelte';
	import { transformUrl } from '$lib/utils/url.js';
	import { clsx } from 'clsx';
	import type { ElementProps } from './element.js';
	import Slot from './Slot.svelte';

	const streamdown = useStreamdown();

	const { children, className, node, props }: ElementProps = $props();

	const transformedUrl = $derived(
		transformUrl(
			node.properties.href,
			streamdown.allowedLinkPrefixes ?? [],
			streamdown.defaultOrigin
		)
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
			props,
			className
		}}
		render={streamdown.snippets.a}
	>
		<a
			{...props}
			class={clsx(streamdown.theme.a.base, className)}
			href={transformedUrl}
			target="_blank"
			rel="noopener noreferrer"
		>
			{@render children()}
		</a>
	</Slot>
{:else}
	<span class={streamdown.theme.a.blocked} title={`Blocked URL: ${node.properties.href}`}>
		{@render children()} [blocked]
	</span>
{/if}
