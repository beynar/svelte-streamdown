<script lang="ts">
	import type { Snippet } from 'svelte';
	import Link from './Link.svelte';
	import Code from './Code.svelte';
	import Image from './Image.svelte';
	import Mermaid from './Mermaid.svelte';
	import Math from './Math.svelte';
	import Alert from './Alert.svelte';
	import type { StreamdownToken } from '$lib/marked/index.js';
	import Slot from './Slot.svelte';
	import { useStreamdown } from '$lib/streamdown.svelte.js';
	import FootnoteRef from './FootnoteRef.svelte';
	let { token, children }: { token: StreamdownToken; children: Snippet } = $props();
	const streamdown = useStreamdown();

	const isMounted = streamdown.isMounted;
</script>

{#if token.type === 'heading'}
	<Slot
		props={{
			children,
			token
		}}
		render={streamdown.snippets.heading}
	>
		{#if token.depth === 1}
			<h1 class={streamdown.theme[`h${token.depth}`].base}>
				{@render children()}
			</h1>
		{:else if token.depth === 2}
			<h2 class={streamdown.theme[`h${token.depth}`].base}>
				{@render children()}
			</h2>
		{:else if token.depth === 3}
			<h3 class={streamdown.theme[`h${token.depth}`].base}>
				{@render children()}
			</h3>
		{:else if token.depth === 4}
			<h4 class={streamdown.theme[`h${token.depth}`].base}>
				{@render children()}
			</h4>
		{:else if token.depth === 5}
			<h5 class={streamdown.theme[`h${token.depth}`].base}>
				{@render children()}
			</h5>
		{:else if token.depth === 6}
			<h6 class={streamdown.theme[`h${token.depth}`].base}>
				{@render children()}
			</h6>
		{/if}
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
			{@render children()}
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
			style={isMounted ? streamdown.animationBlockStyle : undefined}
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
	<Slot props={{ token, children }} render={streamdown.snippets.table}>
		<div class={streamdown.theme.table.base}>
			<table class={streamdown.theme.table.table}>
				{@render children()}
			</table>
		</div>
	</Slot>
{:else if token.type === 'thead'}
	<Slot props={{ token, children }} render={streamdown.snippets.thead}>
		<thead class={streamdown.theme.thead.base}>
			{@render children?.()}
		</thead>
	</Slot>
{:else if token.type === 'tbody'}
	<Slot props={{ token, children }} render={streamdown.snippets.tbody}>
		<tbody class={streamdown.theme.tbody.base}>
			{@render children?.()}
		</tbody>
	</Slot>
{:else if token.type === 'tfoot'}
	<Slot props={{ token, children }} render={streamdown.snippets.tfoot}>
		<tfoot class={streamdown.theme.tfoot.base}>
			{@render children?.()}
		</tfoot>
	</Slot>
{:else if token.type === 'tr'}
	<Slot props={{ token, children }} render={streamdown.snippets.tr}>
		<tr class={streamdown.theme.tr.base}>
			{@render children?.()}
		</tr>
	</Slot>
{:else if token.type === 'td'}
	{#if token.rowspan > 0}
		<Slot props={{ children, token }} render={streamdown.snippets.td}>
			<td
				class={streamdown.theme.td.base}
				{...token.colspan > 1 ? { colspan: token.colspan } : {}}
				{...token.rowspan > 1 ? { rowspan: token.rowspan } : {}}
				{...token.align && ['left', 'center', 'right', 'justify', 'char'].includes(token.align)
					? { align: token.align as 'left' | 'center' | 'right' | 'justify' | 'char' }
					: { align: 'left' }}
			>
				{@render children?.()}
			</td>
		</Slot>
	{/if}
{:else if token.type === 'th'}
	{#if token.rowspan > 0}
		<Slot props={{ children, token }} render={streamdown.snippets.th}>
			<th
				class={streamdown.theme.th.base}
				{...token.colspan > 1 ? { colspan: token.colspan } : {}}
				{...token.rowspan > 1 ? { rowspan: token.rowspan } : {}}
				{...token.align && ['left', 'center', 'right', 'justify', 'char'].includes(token.align)
					? { align: token.align as 'left' | 'center' | 'right' | 'justify' | 'char' }
					: { align: 'left' }}
			>
				{@render children?.()}
			</th>
		</Slot>
	{/if}
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
{:else if token.type === 'html'}
	{#if streamdown.renderHtml}
		{@const content =
			typeof streamdown.renderHtml === 'function' ? streamdown.renderHtml(token) : token.raw}
		{@html content}
	{/if}
{:else}
	<!-- For tokens we don't handle specifically, render children or fallback -->
	{@render children?.()}
{/if}
