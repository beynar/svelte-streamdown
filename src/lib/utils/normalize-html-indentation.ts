/**
 * Four leading spaces after a blank line is an indented code block, HTML or not.
 * A pretty-printed document therefore splits into html / code / html and the
 * indented part renders as source in a code box (upstream 7f9127b).
 *
 * This strips the indentation off tag lines only. It is lossy inside `<pre>` and
 * `<code>`, where whitespace is content, so those bodies are skipped and the
 * whole thing is behind the opt-in `normalizeHtmlIndentation` prop.
 */

// The indentation of a line whose first non-space character opens a tag, a
// closing tag, or a comment/doctype. Anchored, and the tag itself is a lookahead
// so the match is exactly the whitespace to drop.
const INDENTED_TAG = /^[ \t]+(?=<[a-zA-Z!/])/;

// Inside these, indentation is content. `<pre class=…>` and `<code>` both match.
const LITERAL_OPEN = /<(?:pre|code)[\s/>]/gi;
const LITERAL_CLOSE = /<\/(?:pre|code)>/gi;

const count = (line: string, re: RegExp): number => {
	re.lastIndex = 0;
	let n = 0;
	while (re.exec(line)) n++;
	return n;
};

export const normalizeHtmlIndentation = (content: string): string => {
	// Only documents that start with a tag; anything else is Markdown whose
	// indentation we have no business touching. Returned by identity so a Svelte
	// `$derived` over it does not churn.
	let i = 0;
	while (i < content.length && (content[i] === ' ' || content[i] === '\n' || content[i] === '\t'))
		i++;
	if (content[i] !== '<') return content;

	const lines = content.split('\n');
	let literalDepth = 0;
	let changed = false;
	for (let l = 0; l < lines.length; l++) {
		const line = lines[l];
		if (literalDepth === 0) {
			const match = INDENTED_TAG.exec(line);
			if (match) {
				lines[l] = line.slice(match[0].length);
				changed = true;
			}
		}
		if (line.indexOf('<') !== -1) {
			literalDepth += count(line, LITERAL_OPEN) - count(line, LITERAL_CLOSE);
			if (literalDepth < 0) literalDepth = 0;
		}
	}
	return changed ? lines.join('\n') : content;
};
