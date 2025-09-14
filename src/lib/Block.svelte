<script lang="ts" module>
</script>

<script lang="ts">
	import { parseIncompleteMarkdown } from './utils/parse-incomplete-markdown.js';
	import Element from './Elements/Element.svelte';
	import { lex, type StreamdownToken, type TableRow } from './marked/index.js';

	let {
		block
	}: {
		block: string;
	} = $props();

	const tokens = $derived(lex(parseIncompleteMarkdown(block.trim())));

	const getChildren = (token: StreamdownToken) => {
		if (token.type === 'list') {
			return token.items as StreamdownToken[];
		}

		if (token.type === 'table') {
			const headerRow = token.header?.length
				? ({
						type: 'tableRow',
						raw: '',
						tokens: token.header.map((cell) => ({
							type: 'th',
							raw: '',
							...cell
						})),
						isHeader: true
					} satisfies TableRow)
				: null;

			const rows = token.rows.reduce(
				(acc, cells) => {
					const row = {
						type: 'tableRow',
						raw: '',
						tokens: cells.map((cell) => ({
							type: 'td',
							raw: '',
							...cell
						})),
						isHeader: false
					} satisfies TableRow;
					acc.push(row);
					return acc;
				},
				headerRow
					? ([
							{
								type: 'tableHead',
								tokens: [headerRow]
							}
						] as StreamdownToken[])
					: []
			);

			return rows;
		}
		const children =
			'tokens' in token ? ((token.tokens || []) as StreamdownToken[]) : ([] as StreamdownToken[]);

		if (!children.length && token.type !== 'text') {
			return [
				{
					type: 'text',
					text: 'text' in token ? token.text : '',
					raw: 'raw' in token ? token.raw : '',
					tokens: []
				}
			] satisfies StreamdownToken[];
		}
		return children;
	};
</script>

{#snippet renderChildren(tokens: StreamdownToken[])}
	{#each tokens as token}
		{@const children = getChildren(token)}
		{@const isTextOnlyNode = children.length === 0}
		<Element {token}>
			{#if isTextOnlyNode}
				{'text' in token ? token.text : ''}
			{:else}
				{@render renderChildren(children)}
			{/if}
		</Element>
	{/each}
{/snippet}

{@render renderChildren(tokens)}
