<script lang="ts">
	import type { Element } from 'hast';
	import type { Snippet } from 'svelte';

	let {
		node,
		props,
		type,
		children
	}: { node: Element; props: any; type: string; children: Snippet } = $props();

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
</script>

{#if type === 'a'}
	<A {...props} {children} {node} />
{:else if type === 'blockquote'}
	<Blockquote {...props} {children} {node} />
{:else if type === 'code' && node?.properties.language === 'math'}
	<Math {...props} {children} {node} />
{:else if type === 'code' && node?.position?.start.line === node?.position?.end.line}
	<InlineCode {...props} {children} {node} />
{:else if type === 'code' && node?.properties.language === 'mermaid'}
	<Mermaid {...props} {children} {node} />
{:else if type === 'code'}
	<Code {...props} {children} {node} />
{:else if type === 'h1'}
	<H1 {...props} {children} {node} />
{:else if type === 'h2'}
	<H2 {...props} {children} {node} />
{:else if type === 'h3'}
	<H3 {...props} {children} {node} />
{:else if type === 'h4'}
	<H4 {...props} {children} {node} />
{:else if type === 'h5'}
	<H5 {...props} {children} {node} />
{:else if type === 'h6'}
	<H6 {...props} {children} {node} />
{:else if type === 'hr'}
	<Hr {node} {...props} />
{:else if type === 'img'}
	<Image {...props} {children} {node} />
{:else if type === 'li'}
	<Li {...props} {children} {node} />
{:else if type === 'ol'}
	<Ol {...props} {children} {node} />
{:else if type === 'p'}
	<P {...props} {children} {node} />
{:else if type === 'strong'}
	<Strong {...props} {children} {node} />
{:else if type === 'sub'}
	<Sub {...props} {children} {node} />
{:else if type === 'sup'}
	<Sup {...props} {children} {node} />
{:else if type === 'table'}
	<Table {...props} {children} {node} />
{:else if type === 'tbody'}
	<Tbody {...props} {children} {node} />
{:else if type === 'td'}
	<Td {...props} {children} {node} />
{:else if type === 'th'}
	<Th {...props} {children} {node} />
{:else if type === 'thead'}
	<Thead {...props} {children} {node} />
{:else if type === 'tr'}
	<Tr {...props} {children} {node} />
{:else if type === 'ul'}
	<Ul {...props} {children} {node} />
{:else if type === 'ol'}
	<Ol {...props} {children} {node} />
{:else if type === 'br'}
	<br />
{:else if type === 'em'}
	<Em {...props} {children} {node} />
{:else if type === 'ins'}
	<!-- <Ins {...props} {children} {node} /> -->
{:else if type === 'del'}
	<Del {...props} {children} {node} />
{:else if type === 'alert'}
	<Alert {...props} {children} {node} />
{:else}
	<!-- Fallback for unsupported elements -->
	{@render children?.()}
{/if}
