<script lang="ts">
	import { useStreamdown } from '$lib/context.svelte.js';
	import { save } from '$lib/utils/save.js';
	import { useCopy } from '$lib/utils/copy.svelte.js';
	import { HighlighterManager, languageExtensionMap } from '$lib/utils/hightlighter.svelte.js';
	import type { Tokens } from 'marked';
	import { type ThemedToken } from 'shiki';
	import { untrack } from 'svelte';

	const {
		token
	}: {
		token: Tokens.Code;
	} = $props();

	const streamdown = useStreamdown();
	const highlighter = HighlighterManager.create(streamdown.shikiPreloadThemes);

	const copy = useCopy({
		get content() {
			return token.text;
		}
	});

	// Download button functionality

	const downloadCode = () => {
		try {
			const extension =
				token.lang && token.lang in languageExtensionMap
					? languageExtensionMap[token.lang as keyof typeof languageExtensionMap]
					: 'txt';
			const filename = `file.${extension}`;
			const mimeType = 'text/plain';
			save(filename, token.text, mimeType);
		} catch (error) {
			console.error('Failed to download file:', error);
		}
	};

	$effect(() => {
		const theme = streamdown.shikiTheme;
		const lang = token.lang;
		untrack(() => {
			void highlighter.load(theme, lang);
		});
	});
</script>

<div
	style={streamdown.isMounted ? streamdown.animationBlockStyle : ''}
	class={streamdown.theme.code.base}
>
	<div class={streamdown.theme.code.header}>
		<span class={streamdown.theme.code.language}>{token.lang}</span>
		{#if streamdown.controls.code}
			<div class={streamdown.theme.code.buttons}>
				<button
					class={streamdown.theme.code.button}
					onclick={downloadCode}
					title="Download file"
					type="button"
				>
					{@render (streamdown.icons?.download || downloadIcon)()}
				</button>

				<button class={streamdown.theme.code.button} onclick={copy.copy} type="button">
					{@render (streamdown.icons?.copy || copyIcon)()}
				</button>
			</div>
		{/if}
	</div>
	<div style="height: fit-content; width: 100%;" class={streamdown.theme.code.container}>
		{#if highlighter.isReady(streamdown.shikiTheme, token.lang)}
			{@const tokens = highlighter.highlightCode(token.text, token.lang, streamdown.shikiTheme)}
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
					style={streamdown.animationTextStyle}
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
		<span style={streamdown.animationTextStyle} class={streamdown.theme.code.skeleton}>
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
