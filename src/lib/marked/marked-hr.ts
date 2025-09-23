import type { Extension } from './index.js';

export interface HrToken {
	type: 'hr';
	raw: string;
}

export const markedHr: Extension = {
	name: 'hr',
	level: 'block',
	tokenizer(this, src) {
		// Match horizontal rules according to CommonMark spec:
		// 3 or more matching -, _, or * characters, with optional spaces between
		// Must be at start of string and match entire line
		const match = src.match(
			/^[ \t]*(-[ \t]*-[ \t]*-+|_[ \t]*_[ \t]*_+|\*[ \t]*\*[ \t]*\*+)[ \t]*(?:\n|$)/
		);

		if (match) {
			const raw = match[0].replace(/\n$/, ''); // Remove trailing newline from raw
			return {
				type: 'hr',
				raw: raw
			} satisfies HrToken;
		}

		return undefined;
	}
};
