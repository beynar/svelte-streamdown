<script lang="ts">
	import type { Element } from 'hast';
	import type { Snippet } from 'svelte';

	let {
		node,
		props,
		className,
		type,
		children
	}: { node: Element; props: any; className: any; type: string; children: Snippet } = $props();

	const streamdown = useStreamdown();

	// Import all element components
	import A from './A.svelte';
	import Blockquote from './Blockquote.svelte';
	import Code from './Code.svelte';
	import H1 from './H1.svelte';
	import H2 from './H2.svelte';
	import H3 from './H3.svelte';
	import H4 from './H4.svelte';
	import H5 from './H5.svelte';
	import H6 from './H6.svelte';
	import Hr from './Hr.svelte';
	import Image from './Image.svelte';
	import Li from './Li.svelte';
	import Ol from './Ol.svelte';
	import P from './P.svelte';
	import Strong from './Strong.svelte';
	import Sub from './Sub.svelte';
	import Sup from './Sup.svelte';
	import Table from './Table.svelte';
	import Tbody from './Tbody.svelte';
	import Td from './Td.svelte';
	import Th from './Th.svelte';
	import Thead from './Thead.svelte';
	import Tr from './Tr.svelte';
	import Ul from './Ul.svelte';
	import InlineCode from './InlineCode.svelte';
	import Mermaid from './Mermaid.svelte';
	import Math from './Math.svelte';
	import Em from './Em.svelte';
	import Del from './Del.svelte';
	import Alert from './Alert.svelte';
	import { useStreamdown } from '$lib/Streamdown.svelte';
	import { type ElementProps } from './element.js';
</script>

{#if type === 'a'}
	<A {props} {className} {children} {node} />
{:else if type === 'blockquote'}
	<Blockquote {props} {className} {children} {node} />
{:else if type === 'code' && node?.properties.language === 'math'}
	<Math {props} {className} {children} {node} />
{:else if type === 'code' && node?.position?.start.line === node?.position?.end.line}
	<InlineCode {props} {className} {children} {node} />
{:else if type === 'code' && node?.properties.language === 'mermaid'}
	<Mermaid {props} {className} {children} {node} />
{:else if type === 'code'}
	<Code {props} {className} {children} {node} />
{:else if type === 'h1'}
	<H1 {props} {className} {children} {node} />
{:else if type === 'h2'}
	<H2 {props} {className} {children} {node} />
{:else if type === 'h3'}
	<H3 {props} {className} {children} {node} />
{:else if type === 'h4'}
	<H4 {props} {className} {children} {node} />
{:else if type === 'h5'}
	<H5 {props} {className} {children} {node} />
{:else if type === 'h6'}
	<H6 {props} {className} {children} {node} />
{:else if type === 'hr'}
	<Hr {children} {node} {props} {className} />
{:else if type === 'img'}
	<Image
		src={node.properties.src as string}
		alt={node.properties.alt as string}
		{props}
		{className}
		{children}
		{node}
	/>
{:else if type === 'li'}
	<Li {props} {className} {children} {node} />
{:else if type === 'ol'}
	<Ol {props} {className} {children} {node} />
{:else if type === 'p'}
	<P {props} {className} {children} {node} />
{:else if type === 'strong'}
	<Strong {props} {className} {children} {node} />
{:else if type === 'sub'}
	<Sub {props} {className} {children} {node} />
{:else if type === 'sup'}
	<Sup {props} {className} {children} {node} />
{:else if type === 'table'}
	<Table {props} {className} {children} {node} />
{:else if type === 'tbody'}
	<Tbody {props} {className} {children} {node} />
{:else if type === 'td'}
	<Td {props} {className} {children} {node} />
{:else if type === 'th'}
	<Th {props} {className} {children} {node} />
{:else if type === 'thead'}
	<Thead {props} {className} {children} {node} />
{:else if type === 'tr'}
	<Tr {props} {className} {children} {node} />
{:else if type === 'ul'}
	<Ul {props} {className} {children} {node} />
{:else if type === 'ol'}
	<Ol {props} {className} {children} {node} />
{:else if type === 'br'}
	<br />
{:else if type === 'em'}
	<Em {props} {className} {children} {node} />
{:else if type === 'del'}
	<Del {props} {className} {children} {node} />
{:else if type === 'alert'}
	<Alert {props} {className} {children} {node} />
{:else}
	{@const snippet = streamdown.customElements?.[type] as Snippet<[ElementProps]> | undefined}
	{#if snippet}
		{@render streamdown.customElements?.[type]({ props, className, children, node })}
	{:else}
		{@render children?.()}
	{/if}

	<!-- Fallback for unsupported elements -->
{/if}
