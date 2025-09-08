<script lang="ts">
	const icons = {
		note: `<circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />`,
		caution: `<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>`,
		important: `<path
		d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"
	/><path d="M7 11h10" /><path d="M7 15h6" /><path d="M7 7h8" />`,
		tip: `<path
		d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"
	/><path d="M9 18h6" /><path d="M10 22h4" />`,
		warning: `<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path
		d="M12 9v4"
	/><path d="M12 17h.01" />`
	};

	import { useStreamdown } from '$lib/Streamdown.svelte';
	import { clsx } from 'clsx';
	import type { AlertProps } from './element.js';
	import Slot from './Slot.svelte';

	const streamdown = useStreamdown();

	const { children, node, ...props }: AlertProps = $props();

	// Extract alertType from className
	const alertType = $derived.by(() => {
		const className = node.properties.className as string[] | undefined;
		if (!className) return 'note';
		const alertClass = className.find((cls) => cls.startsWith('markdown-alert-'));
		if (!alertClass) return 'note';
		return alertClass.replace('markdown-alert-', '') as
			| 'note'
			| 'tip'
			| 'warning'
			| 'caution'
			| 'important';
	});

	// Extract icon from node properties
	const icon = $derived((node.properties.icon as string) || '');
</script>

<Slot
	props={{
		children,
		alertType,
		icon,
		node,
		...props
	}}
	render={streamdown.snippets.alert}
>
	<div
		class={clsx(
			streamdown.theme.alert.base,
			node.properties.className,
			streamdown.theme.alert[alertType]
		)}
		{...props}
	>
		<div data-alert-title class={streamdown.theme.alert.title}>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="none"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class={streamdown.theme.alert.icon}
			>
				<!-- {@html icon} -->
				{@html icons[alertType]}
			</svg>
			{alertType}
		</div>
		{@render children()}
	</div>
</Slot>
