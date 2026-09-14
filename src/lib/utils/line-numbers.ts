/**
 * Line-number options carried by a fence's info string. `token.lang` is the first
 * word and `token.meta` the rest since 4.0.1, so this only ever sees the rest —
 * `startLine=10 noLineNumbers` out of a ```ts fence.
 *
 * `lineNumbers` / `noLineNumbers` are upstream streamdown's per-block escape
 * hatches; ours flip the `lineNumbers` prop either way because our prop defaults
 * to false (upstream defaults to on).
 *
 * The rendering side is CSS counters on the per-line span that is already there
 * (`counter-increment` + a `::before` printing `counter(sd-line)`, in the global
 * block of Streamdown.svelte; `counter-reset` inline on the <pre> so `startLine`
 * can move it): no element per line, and a pseudo-element's content is never part
 * of a selection, so copy/download — which read the token text anyway — can never
 * pick numbers up. The counter rule cannot live in the theme like the gutter's
 * width and colour (`theme.code.lineNumber`), because a Tailwind
 * `before:content-[counter(sd-line)]` class only exists if the consumer's
 * Tailwind scanned this package.
 */
export const resolveLineNumbers = (meta: string | undefined, enabled: boolean) => {
	// The tests are case-sensitive and `noLineNumbers` spells the word with a
	// capital L, so the positive test can never match it; checked first anyway.
	const on = meta
		? /\bnoLineNumbers\b/.test(meta)
			? false
			: /\blineNumbers\b/.test(meta) || enabled
		: enabled;
	const start = meta?.match(/\bstartLine=(\d+)\b/);
	return { enabled: on, start: start ? Number(start[1]) : 1 };
};
