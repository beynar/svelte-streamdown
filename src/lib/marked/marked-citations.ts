import type { Extension } from './index.js';

export const markedCitations: Extension = {
	name: 'citations',
	level: 'inline',

	start(src) {
		return src.indexOf('[') === -1 ? -1 : 0;
	},

	tokenizer(this, src) {
		// Match inline citations like [1], [ref], [1] [2], [ref] [ref2], etc.
		// Requires non-empty bracket contents and spaces between adjacent citation brackets
		const match = src.match(/^\[[^\]]+\](?:\s+\[[^\]]+\])*/);

		if (match) {
			// Early exit: if first closing bracket is immediately followed by '[', it's likely link-style syntax
			const firstClosingBracketIndex = src.indexOf(']');
			if (firstClosingBracketIndex !== -1 && src[firstClosingBracketIndex + 1] === '[') {
				return undefined;
			}

			// If followed by parentheses, it's likely a markdown link or image, so don't treat as citation
			const remainingSrc = src.slice(match[0].length);
			if (remainingSrc.match(/^\s*\(/)) {
				return undefined;
			}
			// Extract all citation keys (anything inside brackets)
			const citations = match[0].match(/\[([^\]]+)\]/g);
			if (citations) {
				// Filter out task list syntax ([ ], [x], [X]) after trimming
				const validCitations = citations.filter((citation) => {
					const content = citation.slice(1, -1).trim();
					return content !== '' && content !== 'x' && content !== 'X';
				});

				if (validCitations.length > 0) {
					// Process each bracket content and split on spaces, commas, or semicolons
					const keys = validCitations.flatMap((citation) => {
						const content = citation.slice(1, -1).trim(); // Remove brackets and trim
						// Split on spaces, commas, or semicolons and filter out empty strings
						return content.split(/[\s,;]+/).filter((key) => key.length > 0);
					});

					// Deduplicate keys after trimming
					const uniqueKeys = Array.from(
						new Set(keys.map((key) => key.trim()).filter((key) => key.length > 0))
					);

					return {
						type: 'inline-citations',
						keys: uniqueKeys,
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
