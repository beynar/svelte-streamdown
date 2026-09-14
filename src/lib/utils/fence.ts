/** An open code fence: the character it was opened with, and its run length. */
export type OpenFence = { char: string; length: number } | null;

// Up to 3 spaces of indentation per CommonMark; blockquote markers are stripped
// too because a fence can be quoted ("> ```") inside a blockquote or an alert,
// and so is a leading list marker, because "- ```js" opens a fence in the item.
const FENCE_LINE = /^[ \t]{0,3}(?:>[ \t]*)*(?:(?:[-*+]|\d{1,9}[.)])[ \t]+)?(`{3,}|~{3,})(.*)$/;

/**
 * Fence tracking, one line at a time: returns the fence state after `line`.
 * The completer's block scan and `hasUnclosedFence` both walk with this, so the
 * "am I inside a fence" answer can never drift between them.
 */
export const trackFence = (line: string, open: OpenFence): OpenFence => {
	const match = FENCE_LINE.exec(line);
	if (!match) {
		return open;
	}
	const run = match[1];
	const info = match[2];
	if (open) {
		// A closer uses the opener's character, is at least as long, and carries no
		// info string — so a shorter fence line inside a longer block is content.
		return run[0] === open.char && run.length >= open.length && info.trim() === '' ? null : open;
	}
	// A backtick fence's info string cannot contain a backtick (marked's own rule),
	// so such a line opens nothing.
	if (run[0] === '`' && info.includes('`')) {
		return open;
	}
	return { char: run[0], length: run.length };
};

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
