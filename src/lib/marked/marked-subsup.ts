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
		// marked dispatches every inline extension at every scan position; `start`
		// only clips the text rule, it does not gate the tokenizer. This rule is
		// anchored on a single literal character, so one charCodeAt rejects the
		// ~3.6k non-matching dispatches per 100 KB before the regex engine runs.
		if (src.charCodeAt(0) !== 126 /* ~ */) return;
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
		if (src.charCodeAt(0) !== 94 /* ^ */) return;
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
