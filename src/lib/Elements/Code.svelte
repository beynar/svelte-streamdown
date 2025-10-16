<script lang="ts">
	import { useStreamdown } from '$lib/context.svelte.js';
	import { save } from '$lib/utils/save.js';
	import { useCopy } from '$lib/utils/copy.svelte.js';
	import { HighlighterManager, languageExtensionMap } from '$lib/utils/hightlighter.svelte.js';
	import type { Tokens } from 'marked';
	import { type ThemedToken } from 'shiki';
	import { untrack } from 'svelte';
	import { checkIcon, copyIcon, downloadIcon } from './icons.js';

	const {
		token,
		id
	}: {
		token: Tokens.Code;
		id: string;
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
	data-streamdown-code={id}
	style={streamdown.isMounted ? streamdown.animationBlockStyle : ''}
	class={streamdown.theme.code.base}
>
	<div class={streamdown.theme.code.header}>
		<span class={streamdown.theme.code.language}>{token.lang}</span>
		{#if streamdown.controls.code}
			<div class={streamdown.theme.code.buttons}>
				<button
					class={streamdown.theme.components.button}
					onclick={downloadCode}
					title="Download code"
					type="button"
				>
					{@render (streamdown.icons?.download || downloadIcon)()}
				</button>

				<button class={streamdown.theme.components.button} onclick={copy.copy} type="button">
					{#if copy.isCopied}
						{@render (streamdown.icons?.check || checkIcon)()}
					{:else}
						{@render (streamdown.icons?.copy || copyIcon)()}
					{/if}
				</button>
			</div>
		{/if}
	</div>
	<div style="height: fit-content; width: 100%;" class={streamdown.theme.code.container}>
		{#if highlighter.isReady(streamdown.shikiTheme, token.lang)}
			<pre class={streamdown.theme.code.pre}><code
					>{@render Tokens(
						highlighter.highlightCode(token.text, token.lang, streamdown.shikiTheme)
					)}</code
				></pre>
		{:else}
			<pre class={streamdown.theme.code.pre}><code>{@render Skeleton(token.text.split('\n'))}</code
				></pre>
		{/if}
	</div>
</div>

{#snippet Tokens(lines: ThemedToken[][])}
	{#each lines as tokens}
		<span class={streamdown.theme.code.line}>
			{#each tokens as token}
				<span
					style={streamdown.isMounted ? streamdown.animationTextStyle : ''}
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
