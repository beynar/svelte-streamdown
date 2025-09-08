import type { Snippet } from 'svelte';

import type { Element as HastElement } from 'hast';

export type ElementProps<T = {}> = {
	children: Snippet;
	className?: string;
	node: HastElement;
	props: Record<string, any>;
} & T &
	Record<string, any>;
