import type { Extension } from './index.js';

const subRule = /^~([^~\s](?:[^~]*[^~\s])?)~/; // ~text~
const supRule = /^\^([^\^\s](?:[^\^]*[^\^\s])?)\^/; // ^text^

export const markedSub: Extension = {
	name: 'sub',
	level: 'inline',
	start(src: string) {
		const i = src.indexOf('~');
		return i === -1 ? undefined : i;
	},
	tokenizer(this, src) {
		const match = src.match(subRule);
		if (match) {
			return {
				type: 'sub',
				raw: match[0],
				text: match[1],
				tokens: this.lexer.inlineTokens(match[1])
			} satisfies SubToken;
		}
	}
};

export const markedSup: Extension = {
	name: 'sup',
	level: 'inline',
	start(src: string) {
		const i = src.indexOf('^');
		return i === -1 ? undefined : i;
	},
	tokenizer(this, src) {
		const match = src.match(supRule);
		if (match) {
			return {
				type: 'sup',
				raw: match[0],
				text: match[1],
				tokens: this.lexer.inlineTokens(match[1])
			} satisfies SupToken;
		}
	}
};

/**
 * Represents a subscript token.
 */
export type SubToken = {
	type: 'sub';
	raw: string;
	text: string;
	tokens: any[];
};

/**
 * Represents a superscript token.
 */
export type SupToken = {
	type: 'sup';
	raw: string;
	text: string;
	tokens: any[];
};

export type SubSupToken = SubToken | SupToken;
