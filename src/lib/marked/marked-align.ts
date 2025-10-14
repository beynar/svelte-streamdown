import type { Extension } from './index.js';
import type { Token } from 'marked';

export const markedAlign: Extension = {
	name: 'align',
	level: 'block',
	tokenizer(this, src) {
		// Check if the source starts with [center] or [right] blocks
		const centerMatch = src.match(/^\[center\]\n([\s\S]*?)\n\[\/center\]/);
		const rightMatch = src.match(/^\[right\]\n([\s\S]*?)\n\[\/right\]/);

		if (centerMatch) {
			const text = centerMatch[1];
			const raw = centerMatch[0];

			// Tokenize the content inside the alignment block
			const tokens = this.lexer.blockTokens(text, []);

			return {
				type: 'align',
				align: 'center',
				raw,
				text,
				tokens
			} satisfies AlignToken;
		}

		if (rightMatch) {
			const text = rightMatch[1];
			const raw = rightMatch[0];

			// Tokenize the content inside the alignment block
			const tokens = this.lexer.blockTokens(text, []);

			return {
				type: 'align',
				align: 'right',
				raw,
				text,
				tokens
			} satisfies AlignToken;
		}

		return undefined;
	}
};

export type AlignToken = {
	type: 'align';
	align: 'center' | 'right';
	raw: string;
	text: string;
	tokens: Token[];
};
