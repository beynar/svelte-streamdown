<script lang="ts">
	import type { Snippet } from 'svelte';
	import Link from './Link.svelte';
	import Code from './Code.svelte';
	import Image from './Image.svelte';
	import Table from './Table.svelte';
	import Mermaid from './Mermaid.svelte';
	import Math from './Math.svelte';
	import Alert from './Alert.svelte';
	import type { StreamdownToken } from '$lib/marked/index.js';
	import Slot from './Slot.svelte';
	import { useStreamdown } from '$lib/Streamdown.svelte';
	import FootnoteRef from './FootnoteRef.svelte';
	let { token, children }: { token: StreamdownToken; children: Snippet } = $props();
	const id = $props.id();
	const streamdown = useStreamdown();
</script>

{#if token.type === 'heading'}
	{@const level = `h${token.depth}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'}
	{@const className = streamdown.theme[level].base}
	<Slot
		props={{
			children,
			token
		}}
		render={streamdown.snippets.heading}
	>
		<svelte:element this={level} class={className}>
			{@render children()}
		</svelte:element>
	</Slot>
{:else if token.type === 'paragraph'}
	<Slot props={{ children, token }} render={streamdown.snippets.paragraph}>
		<p class={streamdown.theme.paragraph.base}>
			{@render children()}
		</p>
	</Slot>
{:else if token.type === 'blockquote'}
	<Slot props={{ children, token }} render={streamdown.snippets.blockquote}>
		<blockquote class={streamdown.theme.blockquote.base}>
			{@render children()}
		</blockquote>
	</Slot>
{:else if token.type === 'code' && token.lang === 'mermaid'}
	<Slot props={{ children, token }} render={streamdown.snippets.code}>
		<Mermaid {token} />
	</Slot>
{:else if token.type === 'code'}
	<Slot props={{ children, token }} render={streamdown.snippets.code}>
		<Code {token} />
	</Slot>
{:else if token.type === 'codespan'}
	<Slot props={{ children, token }} render={streamdown.snippets.codespan}>
		<code class={streamdown.theme.codespan.base}>
			{token.text}
		</code>
	</Slot>
{:else if token.type === 'list'}
	{#if token.ordered}
		<Slot props={{ children, token }} render={streamdown.snippets.ol}>
			<ol style:list-style-type={token.listType} class={streamdown.theme.ol.base}>
				{@render children()}
			</ol>
		</Slot>
	{:else}
		<Slot props={{ children, token }} render={streamdown.snippets.ul}>
			<ul class={streamdown.theme.ul.base}>
				{@render children()}
			</ul>
		</Slot>
	{/if}
{:else if token.type === 'list_item'}
	<Slot props={{ children, token }} render={streamdown.snippets.li}>
		<li
			style:list-style-type={token.task ? 'none' : undefined}
			{...token.value && !token.task ? { value: token.value } : {}}
			class={streamdown.theme.li.base}
		>
			{#if token.task}
				<input
					disabled
					type="checkbox"
					checked={token.checked}
					class={streamdown.theme.li.checkbox}
				/>
			{/if}
			{@render children()}
		</li>
	</Slot>
{:else if token.type === 'table'}
	<Table {token} {children} />
{:else if token.type === 'tableRow'}
	<Slot props={{ token, children }} render={streamdown.snippets.tableRow}>
		<tr class={streamdown.theme.tableRow.base}>
			{@render children?.()}
		</tr>
	</Slot>
{:else if token.type === 'tableHead'}
	<Slot props={{ token, children }} render={streamdown.snippets.tableHead}>
		<thead class={streamdown.theme.tableHead.base}>
			{@render children?.()}
		</thead>
	</Slot>
{:else if token.type === 'td'}
	<Slot props={{ children, token }} render={streamdown.snippets.td}>
		<td class={streamdown.theme.td.base}>
			{@render children?.()}
		</td>
	</Slot>
{:else if token.type === 'th'}
	<Slot props={{ children, token }} render={streamdown.snippets.th}>
		<th class={streamdown.theme.th.base}>
			{@render children?.()}
		</th>
	</Slot>
{:else if token.type === 'image'}
	<Image {token} {children} />
{:else if token.type === 'link'}
	<Link {token} {children} />
{:else if token.type === 'sub'}
	<Slot props={{ children, token }} render={streamdown.snippets.sub}>
		<sub class={streamdown.theme.sub.base}>
			{@render children()}
		</sub>
	</Slot>
{:else if token.type === 'sup'}
	<Slot props={{ children, token }} render={streamdown.snippets.sup}>
		<sup class={streamdown.theme.sup.base}>
			{@render children()}
		</sup>
	</Slot>
{:else if token.type === 'strong'}
	<Slot props={{ children, token }} render={streamdown.snippets.strong}>
		<strong class={streamdown.theme.strong.base}>
			{@render children()}
		</strong>
	</Slot>
{:else if token.type === 'em'}
	<Slot props={{ children, token }} render={streamdown.snippets.em}>
		<em class={streamdown.theme.em.base}>
			{@render children()}
		</em>
	</Slot>
{:else if token.type === 'del'}
	<Slot props={{ children, token }} render={streamdown.snippets.del}>
		<del class={streamdown.theme.del.base}>
			{@render children()}
		</del>
	</Slot>
{:else if token.type === 'hr'}
	<Slot props={{ children, token }} render={streamdown.snippets.hr}>
		<hr class={streamdown.theme.hr.base} />
	</Slot>
{:else if token.type === 'br'}
	<br />
{:else if token.type === 'math'}
	<Slot
		props={{
			children,
			token
		}}
		render={streamdown.snippets.math}
	>
		<Math {token} />
	</Slot>
{:else if token.type === 'alert'}
	<Alert {token} {children} />
{:else if token.type === 'footnoteRef'}
	<FootnoteRef {token} />
{:else}
	<!-- For tokens we don't handle specifically, render children or fallback -->
	{@render children?.()}
{/if}
