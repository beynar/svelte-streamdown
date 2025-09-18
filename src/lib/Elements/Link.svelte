<script lang="ts">
	import { useStreamdown } from '$lib/streamdown.svelte.js';
	import { transformUrl } from '$lib/utils/url.js';
	import Slot from './Slot.svelte';
	import type { Tokens } from 'marked';
	import type { Snippet } from 'svelte';

	const streamdown = useStreamdown();

	const {
		children,
		token
	}: {
		children: Snippet;
		token: Tokens.Link;
	} = $props();

	const transformedUrl = $derived(
		transformUrl(token.href, streamdown.allowedLinkPrefixes ?? [], streamdown.defaultOrigin)
	);
</script>

{#if transformedUrl}
	<Slot
		props={{
			href: transformedUrl,
			target: '_blank',
			rel: 'noopener noreferrer',
			title: token.title,
			children,
			token
		}}
		render={streamdown.snippets.link}
	>
		<a
			class={streamdown.theme.link.base}
			href={transformedUrl}
			target="_blank"
			rel="noopener noreferrer"
		>
			{@render children()}
		</a>
	</Slot>
{:else}
	<span
		class={streamdown.theme.link.blocked}
		title={token.title ? `Blocked URL: ${token.href}` : undefined}
	>
		{@render children()} [blocked]
	</span>
{/if}
