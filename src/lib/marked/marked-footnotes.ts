import { type StreamdownToken } from './index.js';
import { StreamdownContext, type Extension } from '$lib/context.svelte.js';
import { getContext } from 'svelte';

const safeGetContext = () => {
	try {
		return getContext<StreamdownContext>('streamdown');
	} catch (e) {
		return null;
	}
};

export function markedFootnote(): Extension[] {
	const ensureMaps = (tokenizer: any) => {
		const streamdown = safeGetContext();
		if (!streamdown) {
			if (!tokenizer.lexer.hasFootnotes) {
				tokenizer.lexer.footnotes = {
					refs: new Map<string, FootnoteRef>(),
					footnotes: new Map<string, Footnote>()
				};
				tokenizer.lexer.hasFootnotes = true;
			}

			return tokenizer.lexer.footnotes as {
				refs: Map<string, FootnoteRef>;
				footnotes: Map<string, Footnote>;
			};
		} else {
			return streamdown.footnotes;
		}
	};

	return [
		{
			name: 'footnote',
			level: 'block',
			tokenizer(this, src) {
				const maps = ensureMaps(this);
				const match =
					/^\[\^([^\]\n]+)\]:(?:[ \t]+|[\n]*?|$)([^\n]*?(?:\n|$)(?:\n*?[ ]{4,}[^\n]*)*)/.exec(src);

				if (match) {
					const [raw, label, text = ''] = match;
					let content = text.split('\n').reduce((acc, curr) => {
						return acc + '\n' + curr.replace(/^(?:[ ]{4}|[\t])/, '');
					}, '');

					const contentLastLine = content.trimEnd().split('\n').pop();

					content +=
						// add lines after list, blockquote, codefence, and table
						contentLastLine && /^[ \t]*?[>\-*][ ]|[`]{3,}$|^[ \t]*?[|].+[|]$/.test(contentLastLine)
							? '\n\n'
							: '';

					const lines = content.split('\n');

					const token: Footnote = {
						type: 'footnote',
						raw,
						label,
						lines,
						tokens: []
					};
					maps.footnotes.set(label, token);

					const ref = maps.refs.get(label);

					if (ref) {
						ref.content = token;
					}
					return token as any;
				}
			}
		},
		{
			name: 'footnoteRef',
			level: 'inline',
			tokenizer(this, src) {
				const maps = ensureMaps(this);
				const match = /^\[\^([^\]\n]+)\]/.exec(src);

				if (match) {
					const [raw, label] = match;

					const footnote = maps.footnotes.get(label);

					const token: FootnoteRef = {
						type: 'footnoteRef',
						raw,
						label,
						content: footnote || {
							type: 'footnote',
							raw,
							label,
							lines: [],
							tokens: []
						}
					};
					maps.refs.set(label, token);
					return token;
				}
			}
		}
	];
}

/**
 * Represents a single footnote.
 */
export type Footnote = {
	type: 'footnote';
	raw: string;
	label: string;
	tokens: StreamdownToken[];
	lines: string[];
};

/**
 * Represents a reference to a footnote.
 */
export type FootnoteRef = {
	type: 'footnoteRef';
	raw: string;
	label: string;
	content: Footnote;
};

export type FootnoteToken = Footnote | FootnoteRef;
