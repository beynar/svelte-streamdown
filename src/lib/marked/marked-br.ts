import type { Extension } from './index.js';

export interface BrToken {
	type: 'br';
	raw: string;
}

export const markedBr: Extension = {
	name: 'br',
	level: 'inline',
	tokenizer(this, src) {
		// marked dispatches every inline extension at every scan position; `start`
		// only clips the text rule, it does not gate the tokenizer. This rule is
		// anchored on a single literal character, so one charCodeAt rejects the
		// ~3.6k non-matching dispatches per 100 KB before the regex engine runs.
		if (src.charCodeAt(0) !== 60 /* < */) return undefined;
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
};
