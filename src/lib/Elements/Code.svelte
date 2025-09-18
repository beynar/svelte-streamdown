<script lang="ts">
	import { useStreamdown } from '$lib/context.svelte.js';
	import { save } from '$lib/utils/save.js';
	import { useCopy } from '$lib/utils/copy.svelte.js';
	import { HighlighterManager, languageExtensionMap } from '$lib/utils/hightlighter.svelte.js';
	import type { Tokens } from 'marked';
	import { type ThemedToken } from 'shiki';

	const {
		token
	}: {
		token: Tokens.Code;
	} = $props();

	const streamdown = useStreamdown();
	const highlighter = HighlighterManager.create(streamdown.shikiPreloadThemes || []);
	const theme = $derived(streamdown.shikiTheme);
	let codeContent = $derived(token.text);
	const language = $derived(token.lang || '');
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

	$effect(() => {
		void highlighter.load(theme, language as any);
	});

	const isMounted = streamdown.isMounted;
</script>

<div class={streamdown.theme.code.base} data-language={language}>
	<div class={streamdown.theme.code.header} data-code-block-header data-language={language}>
		<span class={streamdown.theme.code.language}>{language}</span>
		{#if streamdown.controls.code}
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
		{/if}
	</div>
	<div style="height: fit-content; width: 100%;" class={streamdown.theme.code.container}>
		{#if highlighter.isReady(theme, language as any)}
			{@const tokens = highlighter.highlightCode(codeContent, language as any, theme)}
			<pre class={streamdown.theme.code.pre}><code>{@render Tokens(tokens)}</code></pre>
		{:else}
			<pre class={streamdown.theme.code.pre}><code>{@render Skeleton(token.text.split('\n'))}</code
				></pre>
		{/if}
	</div>
</div>

{#snippet Tokens(tokens: ThemedToken[][])}
	{#each tokens as line}
		<span class={streamdown.theme.code.line}>
			{#each line as token}
				<span
					style={isMounted ? streamdown.animationTextStyle : undefined}
					style:color={token.color}
					style:background-color={token.bgColor}
				>
					{token.content}
				</span>
			{/each}
		</span>
	{/each}
{/snippet}
{#snippet Skeleton(lines: string[])}
	{#each lines as line}
		<span class={streamdown.theme.code.skeleton}>
			{line.trim().length > 0 ? line : '\u200B'}
		</span>
	{/each}
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
