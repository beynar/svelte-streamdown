import type { Extension } from '$lib/context.svelte.js';

export interface BrToken {
	type: 'br';
	raw: string;
}

export function markedBr(): Extension[] {
	return [
		{
			name: 'br',
			level: 'inline',
			tokenizer(this, src) {
				// Match HTML <br> tags (with or without closing slash, case insensitive)
				const match = src.match(/^<br\s*\/?>/i);

				if (match) {
					return {
						type: 'br',
						raw: match[0]
					} as any;
				}

				return undefined;
			}
		}
	];
}
