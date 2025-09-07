<script lang="ts">
	import { useStreamdown } from '$lib/Streamdown.svelte';
	import { transformUrl } from '$lib/utils/url.js';
	import { clsx } from 'clsx';
	import type { ImageProps } from './element.js';
	import Slot from './Slot.svelte';

	const streamdown = useStreamdown();

	const { src, alt, children, node, ...props }: ImageProps = $props();

	const transformedUrl = $derived(
		transformUrl(src, streamdown.allowedImagePrefixes ?? [], streamdown.defaultOrigin)
	);
</script>

{#if transformedUrl}
	<Slot
		props={{
			src: transformedUrl,
			alt,
			children,
			...props
		}}
		render={streamdown.snippets.img}
	>
		<img
			src={transformedUrl}
			{alt}
			class={clsx(streamdown.theme.img.base, node.properties.className)}
			{...props}
		/>
	</Slot>
{:else}
	<span
		class={clsx(
			'inline-block rounded bg-gray-200 px-3 py-1 text-sm text-gray-600 dark:bg-gray-700 dark:text-gray-400',
			node.properties.className
		)}
		title={`Blocked URL: ${src}`}
	>
		[Image blocked: {alt || 'No description'}]
	</span>
{/if}
