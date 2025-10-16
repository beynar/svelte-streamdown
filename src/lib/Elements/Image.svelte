<script lang="ts">
	import { useStreamdown } from '$lib/context.svelte.js';
	import { transformUrl } from '$lib/utils/url.js';
	import Slot from './Slot.svelte';
	import type { Tokens } from 'marked';
	import type { Snippet } from 'svelte';

	const streamdown = useStreamdown();

	const {
		children,
		token,
		id
	}: {
		children: Snippet;
		token: Tokens.Image;
		id: string;
	} = $props();

	const transformedUrl = $derived(
		transformUrl(token.href, streamdown.allowedImagePrefixes ?? [], streamdown.defaultOrigin)
	);
</script>

{#if token.href !== 'streamdown:incomplete-image'}
	{#if transformedUrl}
		<Slot
			props={{
				src: transformedUrl,
				alt: token.text,
				children,
				token
			}}
			render={streamdown.snippets.image}
		>
			<span
				data-streamdown-image={id}
				style={streamdown.isMounted ? streamdown.animationBlockStyle : ''}
				class={streamdown.theme.image.base}
			>
				<img class={streamdown.theme.image.image} src={transformedUrl} alt={token.text} />
			</span>
		</Slot>
	{:else}
		<span
			data-streamdown-image-blocked={id}
			class="inline-block rounded bg-gray-200 px-3 py-1 text-sm text-gray-600 dark:bg-gray-700 dark:text-gray-400"
			title={`Blocked URL: ${token.href}`}
		>
			[Image blocked: {token.text || 'No description'}]
		</span>
	{/if}
{/if}
