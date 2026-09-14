/**
 * An open code fence: the character it was opened with, its run length, and
 * the prefix the opener sat behind (indentation, blockquote markers, a list
 * marker). The prefix is what a closer's indentation is measured against.
 */
export type OpenFence = { char: string; length: number; prefix: string } | null;

// An opener may sit behind up to 3 spaces of indentation per CommonMark, behind
// blockquote markers ("> ```" inside a blockquote or an alert), and behind a
// list marker, because "- ```js" opens a fence in the item.
const OPENER_LINE = /^([ \t]{0,3}(?:>[ \t]*)*(?:(?:[-*+]|\d{1,9}[.)])[ \t]+)?)(`{3,}|~{3,})(.*)$/;

// A closer is measured against the opener, not against column 0: it may be
// indented up to 3 spaces more than the opener was. That is what makes a fence
// inside a list item close — "10. ```js" opens at column 4, so its "    ```"
// closer is at 4, which a fixed 0–3 limit rejected.
const CLOSER_LINE = /^([ \t]*(?:>[ \t]*)*)(`{3,}|~{3,})[ \t]*$/;

/**
 * Fence tracking, one line at a time: returns the fence state after `line`.
 * The completer's block scan and `hasUnclosedFence` both walk with this, so the
 * "am I inside a fence" answer can never drift between them.
 */
export const trackFence = (line: string, open: OpenFence): OpenFence => {
	if (open) {
		// A closer uses the opener's character, is at least as long, carries no
		// info string, and is not indented deeper than the opener plus 3 — so a
		// shorter or deeper fence line inside the block is content.
		const match = CLOSER_LINE.exec(line);
		if (!match) return open;
		const run = match[2];
		const closes =
			run[0] === open.char &&
			run.length >= open.length &&
			match[1].length <= open.prefix.length + 3;
		return closes ? null : open;
	}
	const match = OPENER_LINE.exec(line);
	if (!match) return null;
	const run = match[2];
	// A backtick fence's info string cannot contain a backtick (marked's own rule),
	// so such a line opens nothing.
	if (run[0] === '`' && match[3].includes('`')) return null;
	return { char: run[0], length: run.length, prefix: match[1] };
};

/**
 * The line that closes `open`, placed at the opener's depth so it closes the
 * fence where it lives. A list marker in the prefix is blanked to spaces: a
 * closer must sit inside the item, and a repeated marker would start a new one.
 */
export const closingFence = (open: NonNullable<OpenFence>): string =>
	open.prefix.replace(/[-*+]|\d{1,9}[.)]/g, (marker) => ' '.repeat(marker.length)) +
	open.char.repeat(open.length);

/**
 * True when `raw` ends inside a fenced block — i.e. the fence is still being
 * streamed. Only the last block of a live document can be in this state.
 */
export const hasUnclosedFence = (raw: string): boolean => {
	let open: OpenFence = null;
	for (const line of raw.split('\n')) {
		open = trackFence(line, open);
	}
	return open !== null;
};
