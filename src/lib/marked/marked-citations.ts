import type { Extension } from './index.js';

export const markedCitations: Extension = {
	name: 'citations',
	level: 'inline',

	tokenizer(this, src) {
		// Match inline citations like [1], [ref], [1] [2], [ref] [ref2], [ref ref2], [ref, ref2], etc.
		const match = src.match(/^\[.*?\](\s*\[.*?\])*/);

		if (match) {
			// If followed by parentheses, it's likely a markdown link or image, so don't treat as citation
			const remainingSrc = src.slice(match[0].length);
			if (remainingSrc.match(/^\s*\(/)) {
				return undefined;
			}
			// Extract all citation keys (anything inside brackets)
			const citations = match[0].match(/\[([^\]]+)\]/g);
			if (citations) {
				// Filter out task list syntax ([ ], [x], [X])
				const validCitations = citations.filter((citation) => {
					const content = citation.slice(1, -1);
					return content !== ' ' && content !== 'x' && content !== 'X';
				});

				if (validCitations.length > 0) {
					// Process each bracket content and split on spaces, commas, or semicolons
					const keys = validCitations.flatMap((citation) => {
						const content = citation.slice(1, -1); // Remove brackets
						// Split on spaces, commas, or semicolons and filter out empty strings
						return content.split(/[\s,;]+/).filter((key) => key.length > 0);
					});

					return {
						type: 'inline-citations',
						keys,
						text: match[0],
						raw: match[0]
					};
				}
			}
		}
	}
};

export type CitationToken = {
	type: 'inline-citations';
	keys: string[];
	text: string;
	raw: string;
};
