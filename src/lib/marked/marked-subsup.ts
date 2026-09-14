import type { Extension } from './index.js';

// A sub/superscript is a single run, never a phrase: no whitespace anywhere in
// it. The old rules only forbade whitespace at the edges, so `20~25°C and 30~35°C`
// subscripted half the sentence (upstream 716a5f0).
const subRule = /^~([^~\s]+)~/; // ~text~
const supRule = /^\^([^\^\s]+)\^/; // ^text^

export const markedSub: Extension = {
	name: 'sub',
	level: 'inline',
	start(src: string) {
		const i = src.indexOf('~');
		return i === -1 ? undefined : i;
	},
	tokenizer(this, src, tokens) {
		// marked dispatches every inline extension at every scan position; `start`
		// only clips the text rule, it does not gate the tokenizer. This rule is
		// anchored on a single literal character, so one charCodeAt rejects the
		// ~3.6k non-matching dispatches per 100 KB before the regex engine runs.
		if (src.charCodeAt(0) !== 126 /* ~ */) return;
		// A digit right before the opening `~` means a numeric range (`20~25°C`),
		// not a subscript base — chemistry and indices always have a letter or a
		// closing bracket there (`H~2~O`, `x~i+1~`). `src` starts at the marker, so
		// the preceding character is the last one of the previous inline token.
		const prevRaw = tokens[tokens.length - 1]?.raw;
		if (prevRaw) {
			const code = prevRaw.charCodeAt(prevRaw.length - 1);
			if (code >= 48 && code <= 57) return;
		}
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
