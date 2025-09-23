import type { Extension } from '$lib/context.svelte.js';

export const markedCollapsible: Extension = {
	name: 'collapsible',
	level: 'block',
	tokenizer(this, src) {
		// Match [detail]...[detail] blocks (case insensitive)
		const detailMatch = src.match(/^\[detail\](.*?)\[detail\]/is);

		if (detailMatch) {
			const content = detailMatch[1] || '';
			const tokens = this.lexer.blockTokens(content);

			return {
				type: 'detail',
				raw: detailMatch[0], // The entire matched string including tags
				tokens
			};
		}

		return undefined;
	}
};
