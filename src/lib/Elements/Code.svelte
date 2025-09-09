<script lang="ts">
	import { setContext } from 'svelte';
	import type { Snippet } from 'svelte';
	import type { BundledLanguage, BundledTheme } from 'shiki';
	import { useStreamdown } from '$lib/Streamdown.svelte';
	import { save } from '$lib/utils/save.js';
	import { useCopy } from '$lib/utils/copy.svelte.js';
	import { highlighter, languageExtensionMap } from '$lib/hightlighter.svelte.js';
	import { clsx } from 'clsx';
	import type { ElementProps } from './element.js';

	let { node, className, props }: ElementProps = $props();

	const streamdown = useStreamdown();
	const theme = $derived(streamdown.shikiTheme);
	let codeContent = $derived((node.children[0] as any).value);
	const language = $derived(node.properties.language as string);
	const copy = useCopy({
		get content() {
			return codeContent;
		}
	});

	// Download button functionality

	const downloadCode = () => {
		try {
			const extension =
				language && language in languageExtensionMap
					? languageExtensionMap[language as keyof typeof languageExtensionMap]
					: 'txt';
			const filename = `file.${extension}`;
			const mimeType = 'text/plain';
			save(filename, codeContent, mimeType);
		} catch (error) {
			console.error('Failed to download file:', error);
		}
	};
</script>

<div
	{...props}
	class={clsx(streamdown.theme.code.base, streamdown.theme.code.container, className)}
	data-language={language}
>
	<div class={clsx(streamdown.theme.code.header)} data-code-block-header data-language={language}>
		<span class={streamdown.theme.code.language}>{language}</span>
		<div class="flex items-center gap-2">
			<!-- Download button snippet -->
			<button
				class={streamdown.theme.code.button}
				onclick={downloadCode}
				title="Download file"
				type="button"
			>
				{@render downloadIcon()}
			</button>

			<button class={streamdown.theme.code.button} onclick={copy.copy} type="button">
				{@render copyIcon()}
			</button>
		</div>
	</div>
	<div style="height: fit-content; width: 100%;" class={streamdown.theme.code.container}>
		<div>
			{#snippet code()}
				{@const code = highlighter.highlightCode(
					codeContent,
					language as any,
					theme,
					streamdown.theme.code.pre
				)}
				{@html code}
			{/snippet}
			{#key theme}
				{#if highlighter.isLoaded(theme, language as any)}
					{@render code()}
				{:else}
					{#await highlighter.isReady(theme, language as any)}
						{@render Skeleton()}
					{:then}
						{@render code()}
					{/await}
				{/if}
			{/key}
		</div>
	</div>
</div>

<!-- Need to improve this -->
{#snippet Skeleton()}
	{@const lines = codeContent.split('\n')}
	<!--  -->

	<!--  --><code
		class={streamdown.theme.code.pre}
		style="height: fit-content; width: 100%; display: flex; flex-direction: column;"
		><!--  -->{#each lines as line}<!--  --><span class={streamdown.theme.code.skeleton}
				>{line}</span
			><!--  -->
			<!--  -->{/each}<!--  --></code
	><!--  -->
{/snippet}
{#snippet copyIcon()}
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="100%"
		height="100%"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		class="lucide lucide-clipboard-icon lucide-clipboard"
		><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path
			d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"
		/></svg
	>
{/snippet}

{#snippet downloadIcon()}
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="100%"
		height="100%"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
		class="lucide lucide-download-icon lucide-download"
		><path d="M12 15V3" /><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path
			d="m7 10 5 5 5-5"
		/></svg
	>
{/snippet}
