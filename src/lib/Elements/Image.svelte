<script lang="ts">
	import { useStreamdown } from '$lib/Streamdown.svelte';
	import { transformUrl } from '$lib/utils/url.js';
	import { clsx } from 'clsx';
	import type { ElementProps } from './element.js';
	import Slot from './Slot.svelte';

	const streamdown = useStreamdown();

	const { children, node, className, props }: ElementProps = $props();

	const src = $derived(node.properties.src);
	const alt = $derived(node.properties.alt as string | undefined);

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
		<div class={clsx(streamdown.theme.img.base, className)} {...props}>
			<img class={streamdown.theme.img.image} src={transformedUrl} {alt} />
		</div>
	</Slot>
{:else}
	<span
		class={clsx(
			'inline-block rounded bg-gray-200 px-3 py-1 text-sm text-gray-600 dark:bg-gray-700 dark:text-gray-400',
			className?.toString()
		)}
		title={`Blocked URL: ${src}`}
	>
		[Image blocked: {alt || 'No description'}]
	</span>
{/if}
