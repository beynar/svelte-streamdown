<script lang="ts">
	import { setContext } from 'svelte';
	import type { Snippet } from 'svelte';
	import type { BundledLanguage, BundledTheme } from 'shiki';
	import { useStreamdown } from '$lib/Streamdown.svelte';
	import { save } from '$lib/utils/save.js';
	import { useCopy } from '$lib/utils/copy.svelte.js';
	import { highlighter, languageExtensionMap } from '$lib/hightlighter.svelte.js';
	import { clsx } from 'clsx';

	let {
		code,
		children,
		preClassName,
		language,
		node,
		...rest
	}: {
		code: Snippet;
		children?: Snippet;
		preClassName?: string;
		node?: any;
		[key: string]: any;
	} = $props();

	const streamdown = useStreamdown();
	const themes = $derived(streamdown.shikiTheme);
	let codeContent = $derived(node.children[0].value);

	const copy = useCopy({
		get content() {
			return codeContent;
		}
	});

	// Download button functionality

	const downloadCode = () => {
		try {
			const extension =
				language && language in languageExtensionMap ? languageExtensionMap[language] : 'txt';
			const filename = `file.${extension}`;
			const mimeType = 'text/plain';
			save(filename, codeContent, mimeType);
		} catch (error) {
			console.error('Failed to download file:', error);
		}
	};
</script>

{#snippet renderCode(type: string, code: string)}
	<div
		class="overflow-x-auto {type === 'dark' ? 'hidden dark:block' : 'dark:hidden'}"
		data-code-block
		data-language={language}
		{...rest}
	>
		{@html code}
	</div>
{/snippet}
<div
	class={clsx(streamdown.theme.code.container, node.properties.className)}
	data-code-block-container
	data-language={language}
>
	<div class={clsx(streamdown.theme.code.header)} data-code-block-header data-language={language}>
		<span class={streamdown.theme.code.language}>{language}</span>
		<div class="flex items-center gap-2">
			<!-- Download button snippet -->
			<button
				class={clsx(streamdown.theme.code.downloadButton)}
				onclick={downloadCode}
				title="Download file"
				type="button"
			>
				<span class="text-sm">⬇️</span>
			</button>

			<!-- Copy button snippet -->
			<button class={clsx(streamdown.theme.code.copyButton)} onclick={copy.copy} type="button">
				<span class="text-sm">{copy.isCopied ? '✓' : '📋'}</span>
			</button>
		</div>
	</div>
	<div class="h-fit w-full">
		<div class={clsx(streamdown.theme.code.base)}>
			{#await highlighter.isReady(themes, language)}
				{@const lines = codeContent.split('\n')}
				{#each lines as line}
					<div
						class={clsx(streamdown.theme.code.skeleton, 'rounded-md font-mono text-transparent')}
					>
						{line}
					</div>
				{/each}
			{:then}
				{@const [light, dark] = highlighter.highlightCode(
					codeContent,
					language,
					themes,
					preClassName
				)}
				{@render renderCode('light', light)}
				{@render renderCode('dark', dark)}
			{/await}
		</div>
	</div>
</div>
