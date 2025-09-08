<script lang="ts">
	import Streamdown from '$lib/Streamdown.svelte';
	const source = `

-------
# Hello

\`\`\`svelte
<div class={streamdown.theme.code.container} data-code-block-container data-language={language}>
	<div class={streamdown.theme.code.header} data-code-block-header data-language={language}>
		<span class={streamdown.theme.code.language}>{language}</span>
		<div class="flex items-center gap-2">
			<!-- Download button snippet -->
			<button
				class={streamdown.theme.code.downloadButton}
				onclick={downloadCode}
				title="Download file"
				type="button"
			>
				<span class="text-sm">⬇️</span>
			</button>

			<!-- Copy button snippet -->
			<button class={streamdown.theme.code.copyButton} onclick={copy.copy} type="button">
				<span class="text-sm">{copy.isCopied ? '✓' : '📋'}</span>
			</button>
		</div>
	</div>
	<div class="h-fit w-full">
		<div class={streamdown.theme.code.base}>
			{#await highlighter.isReady(themes, language)}
				{@const lines = codeContent.split('\n')}
				{#each lines as line}
					<div
						class={streamdown.theme.code.skeleton + ' ' + 'rounded-md font-mono text-transparent'}
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
\`\`\`
`;

	let content = $state('');
	let isStreaming = $state(false);
	let streamingProgress = $state(0);

	const simulateStreaming = async () => {
		if (isStreaming) return;

		isStreaming = true;
		content = '';
		streamingProgress = 0;

		// Split by words and whitespace/newlines for more realistic streaming
		const tokens = source.split(/(\s+|\n+)/);
		const totalTokens = tokens.length;

		for (let i = 0; i < tokens.length; i++) {
			const token = tokens[i];
			content += token;
			streamingProgress = Math.round(((i + 1) / totalTokens) * 100);

			// Calculate delay based on token type
			let delay = 50; // Base delay for words

			// Add some randomness (±30ms) to make it feel more natural
			delay += (Math.random() - 0.5) * 10;

			// Ensure minimum delay
			delay = Math.max(delay, 1);

			await new Promise((resolve) => setTimeout(resolve, delay));
		}

		isStreaming = false;
		streamingProgress = 100;
	};

	let shikiTheme = $state('slack-ochin');

	const swapTheme = () => {
		console.log('swapTheme');
		shikiTheme = shikiTheme === 'slack-ochin' ? 'solarized-light' : 'slack-ochin';
	};

	let mermaidTheme = $state('dark');
	const swapMermaidTheme = () => {
		mermaidTheme = mermaidTheme === 'dark' ? 'default' : 'dark';
	};
</script>

<div class="mb-4 flex items-center gap-4">
	<button
		class="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
		onclick={() => swapTheme()}
		disabled={isStreaming}
	>
		Swap Theme
	</button>
	<button
		class="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
		onclick={() => simulateStreaming()}
		disabled={isStreaming}
	>
		{isStreaming ? `Streaming... ${streamingProgress}%` : 'Simulate Streaming'}
	</button>
	<button
		class="rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-700 disabled:opacity-50"
		onclick={() => {
			content = source;
		}}
		disabled={isStreaming}
	>
		Show All
	</button>
	<button
		class="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
		onclick={() => {
			swapMermaidTheme();
		}}
		disabled={isStreaming}
	>
		Swap Mermaid Theme
	</button>
	<button
		class="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
		onclick={() => {
			content = '';
		}}
		disabled={isStreaming}
	>
		Clear
	</button>
	<span class="text-sm text-gray-600">Theme: {shikiTheme}</span>
</div>

<div class="p-10">
	<div class="mx-auto max-w-3xl rounded-md p-4 shadow">
		<Streamdown
			mermaidConfig={{
				theme: mermaidTheme
			}}
			{shikiTheme}
			allowedLinkPrefixes={['*']}
			content={source}
		/>
	</div>
</div>
