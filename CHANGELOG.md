# Changelog

## 5.0.0

### 💥 Breaking: mermaid.js replaced by pele

Mermaid fences are now drawn by [pele](https://pele.run), Obsidian's MIT renderer for Mermaid syntax, instead of mermaid.js. The fence, the `Mermaid` component, `svelte-streamdown/mermaid`, the toolbar, `controls.mermaid` and the download formats are unchanged; what changes is the engine underneath and how diagrams are themed.

- **Size**: the component now costs ~15KB gzip for pele's runtime plus 6–45KB gzip for each diagram type a page actually shows (flowchart ~39KB, sequence ~33KB, pie ~9KB), each loaded on demand. mermaid.js was ~1.5MB, with 23 dependencies; pele has none.
- **Speed**: a diagram renders in well under a millisecond, synchronously, instead of 6–80ms async per diagram.
- **Diagrams draw while they stream.** The `incomplete` flag no longer skips rendering: the diagram is redrawn on every chunk, a half-typed last line is dropped before parsing, and if the source still does not parse the last good diagram stays up. Parse errors are only shown — as text, in the new `mermaid.error` theme slot — once the fence closes; mermaid.js swallowed them silently.
- **Layout adapts to the box.** The diagram is laid out for the width it has, so a wide `flowchart LR` turns vertical in a narrow column (below 640px, configurable with `peleOptions.autoDirection` / `directionBreakpoint`), and fullscreen re-lays it out for the whole window.
- **Diagrams look different.** pele has its own layout engine, so node positions, spacing and edge paths are not mermaid's. It covers every diagram type built into Mermaid 12.1 (flowchart, sequence, class, state, ER, Gantt, git graph, pie, mindmap, timeline, C4, architecture, block, packet, treemap, …); ZenUML and other external mermaid plugins are not supported. Labels are SVG text (line breaks, bold, italic), not HTML.

**Theming moves to CSS variables:**

- `mermaidConfig.theme` and `themeVariables` no longer apply. Colours come from the `--pele-*` CSS variables ([list](https://pele.run/theming)), set on any ancestor or on `.pele`, so light/dark switches without a re-render.
- The `shadcn` base theme maps them to `--card`, `--card-foreground`, `--muted`, `--muted-foreground`, `--accent`, `--border` and `--primary`: diagrams follow `.dark` with nothing to configure. Drop any `mermaidConfig={{ theme: isDark ? 'dark' : 'default' }}`.
- The `tailwind` base theme keeps pele's light defaults, matching its white card. Streamdown no longer switches mermaid to its `dark` theme by itself.

**Props and types:**

```diff
- mermaidConfig={{ theme: 'dark', flowchart: { curve: 'basis' } }}
+ mermaidConfig={{ flowchart: { rankSpacing: 60 } }}
+ peleOptions={{ linkSchemes: ['https'], maxEdges: 1000 }}
```

- `mermaidConfig` is still accepted and is passed to pele as default Mermaid settings; a diagram's frontmatter or `%%{init}%%` overrides it. Its type is now pele's config object rather than mermaid's `MermaidConfig`, and is exported as `MermaidConfig`.
- **New prop** `peleOptions` (type `PeleOptions`, exported): pele's render options — source/output/edge limits, allowed link and image schemes, `links`, `images`, `icons`, `fontFamily`, `autoDirection`, … `config`, `idPrefix`, `responsive` and `maxWidth` are set by the component.
- **New theme key** `mermaid.error`.
- The source is no longer "sanitized" before rendering. The old pass trimmed every line, removed blank lines, collapsed spaces and rewrote quotes and dashes, which broke indentation-sensitive diagrams (mindmap, block) and changed label text. Only a BOM, CRLF line endings and zero-width characters are stripped now.
- The hidden `div[id^='dmermaid-']` rule mermaid.js needed is gone.

**Security**: pele escapes all diagram text, emits no script, event handler or HTML label, ignores `click` JavaScript callbacks, and only allows `http`, `https`, `mailto` and `tel` links and `http`/`https` images by default (`peleOptions.linkSchemes` / `imageSchemes` to narrow them). Its output is inserted as is.

### 🧵 Class merging moves to `cn`

`clsx` and `tailwind-merge` are replaced by [`cn`](https://github.com/shadcn-ui/cn) 0.5.0, which implements both of their APIs in one zero-dependency package. **Nothing about theming changes**: `theme`, `shadcnTheme`, `mergeTheme` and the `theme` prop take the same values and produce the same class strings, verified by running every class string in this repo's two themes — alone, in all 13,924 ordered pairs, and against the `clsx` array/object/falsy shapes a custom theme can pass — through both implementations: 14,682 cases, byte-identical output. The library's merge helper was never exported from the package root, so there is no API surface to migrate.

- **Faster where it is hot.** `mergeTheme` runs `cn(baseVal, customVal)` per overridden theme key, and `Streamdown`'s `theme` getter re-runs it on every read, so a page with a custom theme merges constantly. On that exact call shape `cn` is **~25× faster** (250 ns → 10 ns per call, best of 5 runs). With no custom theme `mergeTheme` returns the base theme untouched, so that path was already free and stays free.
- **Costs ~3.4 KB gzip.** The root entry grows from 200,097 min / 61,784 gzip to 202,386 / 65,188 — `cn`'s compiled lookup tables are high-entropy and gzip worse than tailwind-merge's repetitive config, so it is a little larger despite shipping less JavaScript to parse. The `code` and `parser` entries are unchanged. The root bundle-size budget is raised on purpose for this.
- **One fewer transitive dependency, two fewer direct ones**: `clsx` and `tailwind-merge` are gone from `dependencies`, replaced by `cn` alone. If your app imports `clsx` or `tailwind-merge` itself, keep them in your own `dependencies` — they were never yours to rely on through this package, and a strict package manager will now stop resolving them through it.
- `cn` declares `engines: node >= 22`. That gates its CLI, which this library does not use; the runtime works on older Node, but npm or pnpm may print an `EBADENGINE` warning on Node 20 and below.

## 4.2.1

Code blocks highlight with `@tanstack/highlight` 1.0.0 (from 0.1.0). Same API, themes and markup; the JavaScript and TypeScript tokenizers now mark object-literal keys as properties and no longer mistake a spread (`...rest`) for a property access. The dependency range moves from `^0.1.0` to `^1.0.0`, so an app that also installs 1.0.0 (entasis does) ships one copy of the highlighter instead of two.

## 4.2.0

Feature release, all five items from the September upstream audit that were judged worth porting: HTML that streams without flashing, an opt-in allowlist that turns `<ai-thinking>` into a component, a fullscreen toggle for wide tables, and line numbers with `startLine`. Every new prop defaults to off, so the only 4.1.1 renders that change are the two below: the table toolbar grows a third button, and the completer strips a half-typed HTML tag from the end of the block still streaming. 908 node tests, 63 browser tests.

### ⚠️ Behaviour changes

- **The table toolbar has a third action, so turning copy and download off no longer removes it.** 4.1.0 made an empty toolbar disappear; `controls={{ table: { copy: false, download: false } }}` now leaves the expand button behind. Add `fullscreen: false` — or keep using `{ table: false }` — to get rid of the bar.
- **The exported `parseIncompleteMarkdown` strips a half-typed HTML tag by default.** `'Hello <div cla'` returned unchanged in 4.1.1 and returns `'Hello '` now; `'<div>content</di'` returns `'<div>content'`. The option that decides this is `live`, and it defaults to `true` because that is what 4.1.1 did for components — pass `{ live: false }` for text you know is finished. `Streamdown` passes it for you: only the last block is live, and only its last line is ever cut.
- **A sealed block no longer strips an incomplete PascalCase tag either.** 4.1.1's mdx plugin cut one on every block; the live guard means only the streaming one is touched. So `Some text <Component attr` in the middle of a finished document keeps its tail now, and a multi-line component whose attributes wrap — `<Card`, newline, `	title="x"`, newline, `>` — survives intact instead of losing its first line. Seven of the 240 blocks of this repo's README render differently for this reason, all of them closer to the source.
- **`markedMdx` is a factory**, `markedMdx(tags?)`, not a plain extension object. It is not re-exported from the package root; only a deep import into `marked/marked-mdx.js` is affected.

### 🧩 Custom tags and literal content

`<ai-thinking>**bold**</ai-thinking>` used to lex as one raw HTML block, asterisks and all, because the MDX tokenizer only ever matched PascalCase. Lowercase and hyphenated names are now accepted — but only ones you list, never by relaxing the regex, so nothing you write today changes meaning.

```svelte
<Streamdown {content} customTags={['ai-thinking']} />
```

- The effective allowlist is PascalCase (always) ∪ `customTags` ∪ the keys of `mdxComponents`, so registering a component is enough on its own.
- `literalTagContent` lists tags whose children are emitted as a single text token: `<mention user_id="1">@_name_</mention>` renders `@_name_`, not `@name` with an italic run.
- Attribute names may contain hyphens (`<mention data-id="7">`), in the tokenizer and in the parsed attributes.
- The allowlist is compiled once per identity by `compileTags` and shared by the lexer and the completer, so the two can never disagree about what counts as a tag and a streamed chunk rebuilds no regex. `compileTags` and `TagMatchers` are exported.

Ported from vercel/streamdown b392fbe and fb9f97c.

### 🏷️ Half-typed tags no longer flash while streaming

`Hello <div cla` rendered as text on every chunk until the `>` arrived, and `<div>content</di` showed its own markup before snapping into place. Streaming an answer one character at a time through the mounted component produced 56 frames of visible tag source; it now produces none.

Upstream strips `/<[a-zA-Z/][^>]*$/` at end of line unconditionally. We do not — our completer runs on every block, so a finished paragraph would lose its tail forever. Two guards:

- **Only the live block's last line.** Sealed blocks are never touched, and inside the live one only the streaming tail is, so `3 < 5`, `value <1`, `` `<div` `` and a fenced `<div` survive everywhere — as does a finished sentence like `Use the <div element to wrap it.`, which happens to sit in the last block.
- **Only a plausible name, followed only by attributes.** The partial name has to be a prefix of a common HTML element, of a PascalCase component, or of a `customTags` entry, and everything after it has to parse as an attribute list whose last entry may be half-typed. `<custom` stays put until you list it, and `if a <b then c` stays put because `then c` is prose, not attributes.

The MDX plugin's own incomplete-tag branch is gone, so one plugin handles components and HTML alike.

Ported from vercel/streamdown 3e6a77d, with the two guards added.

### 📐 `normalizeHtmlIndentation`

Four leading spaces after a blank line is an indented code block, tag or not, so a pretty-printed `<div class="wrapper">` with an indented inner `<div>` lexed as html / code / html and rendered half of itself in a code box. The new opt-in prop dedents tag lines before parsing and leaves `<pre>` and `<code>` bodies byte-for-byte; content that is not HTML, or already flat, comes back as the same string object, so the derived does not churn. Off by default, because dedenting is lossy. Also exported as a plain function for anyone who would rather pre-process. The trap only arises where blocks are not trimmed — `static`, `parseIncompleteMarkdown={false}`, or the exported function on raw text — since the default streaming path trims each block and so strips the leading four spaces before the lexer sees them.

Ported from vercel/streamdown 7f9127b.

### 🔳 Table fullscreen

Wide tables get an expand toggle next to copy and download. It lifts the wrapper out of the flow (`position: fixed`, the whole viewport) and repositions the toolbar to the top right, so copy and download stay usable; `Escape` or the same button — now a close icon — collapses it and puts focus back where it was. While expanded the wrapper is a labelled `role="dialog"` carrying `data-expanded="true"` and the new `theme.table.expanded` classes. It is not `aria-modal`, because the toolbar is the wrapper's sibling rather than its child and marking the subtree modal would make those buttons inert for assistive tech.

- New: `controls.table.fullscreen` (on by default), `icons.close`, and the `tableFullscreen` / `exitTableFullscreen` / `table` translation keys.
- The `[data-expanded='true']` rule moved out of `Mermaid.svelte` into `Streamdown.svelte`'s global block, so it exists on pages that never render a diagram. Mermaid's own behaviour is unchanged.
- No open/close animation, and no focus trap — `aria-modal` lands with one.

Ported from vercel/streamdown fb76275.

### 🔢 Code line numbers

`lineNumbers` numbers every code block. Upstream defaults them on; ours default off, because turning them on would change every existing render.

- It is a CSS counter on the line span that is already rendered — no extra element per line, and numbering a 10 000-line block adds zero DOM nodes and zero JS. The numbers are pseudo-content, so copy, download and text selection still give you only the code.
- Three words in the fence's info string override the prop for one block: `lineNumbers`, `noLineNumbers`, and `startLine=N` (non-numeric is ignored).
- The gutter's width and colour are theme data (`theme.code.lineNumber`); the counter machinery itself is a global rule, so the numbers appear whether or not the consumer's Tailwind scanned this package.
- Both code renderers behave identically — the highlighted `Code` component and the default fallback.

Ported from vercel/streamdown d6666b6 and 57cd3b5.

### Sizes

`pnpm test:size`, against 4.1.1: root 194 196 → 199 811 min and 59 526 → 61 697 gzip; code 43 201 → 43 893 min and 15 540 → 15 731 gzip; parser 76 080 → 77 182 min and 23 870 → 24 452 gzip. Every entry is still inside the budgets set in 4.1.0, root gzip with about 500 bytes to spare — the next feature that touches the root entry will have to re-baseline it deliberately.

## 4.1.1

### 🐛 Bug Fixes

- **A fenced code block inside a list item no longer grows a stray empty code block after the list.** The fence scanner accepted a fence opener behind a list marker but rejected its closer once the item's content indent reached four spaces, which is every nested bullet and every numbered step from `10.` up. The fence looked open forever, the completer appended a second closer, and `lex()` rendered an empty code box below the list — on complete, non-streaming content too, since the completer runs on every block. The scanner now measures a closer against the opener's depth (up to three spaces deeper, per CommonMark), and the completer emits its own closer at that depth with any list marker blanked out.
- **An unterminated fence inside a blockquote or alert is closed inside it.** The closer used to land at column 0, which ended the quote and opened a fresh top-level fence; it now carries the same `> ` prefix as the opener, so the code block stays nested.

The bug predates 4.0; it was found while reviewing the 4.1.0 fence work, which had fixed the three-space case and left the four-space one.

### ⚡ Streaming animation

- **A bulk update of `content` is no longer animated; only streamed appends are.** Replacing a partial document with a full one (the demo's "Show All": a 5% prefix → the whole 59 KB README — technically an append, since the document starts with its own prefix) mounted ~10,000 word spans that each started a CSS animation in the same frame: roughly two seconds of stalled main thread, identical since before 4.0. The parse cache now classifies each update as the first parse, a streamed append, or bulk (a replacement, or an append of more than ~2 KB in one go), and each block captures that answer when its own text changes, so a bulk update renders plain text while the next streamed chunk animates only what it adds. `animateOnMount` and `static` are unchanged. Known edge: a block rendered plain by a bulk update that then grows by streaming animates its whole text once on that first chunk.

## 4.1.0

Feature release: the LaTeX math delimiters LLMs actually emit, an `incomplete` signal for the block still streaming, a `controls` umbrella that configures the toolbars instead of only switching them off, height caps with pinned auto-scroll, a full accessibility and translation pass, and a completer that no longer goes quadratic on a long line. 835 node tests, 42 browser tests.

### ⚠️ Behaviour changes

- **An unterminated `\(` or `\[` is now auto-closed while streaming**, exactly as `$` and `$$` already were, so a half-typed formula renders as math instead of flashing a literal escaped paren. The cost is that a line using those sequences as prose escapes (`Use \[ to open a bracket`) becomes math. LLM output uses them for math essentially always; if you write them literally, escape the backslash.
- **A completed `\(…\)` / `\[…\]` pair is now tokenized as math everywhere**, static rendering included — the tokenizer change is not streaming-only. `the value is \[optional\]` rendered the literal text `[optional]` in 4.0.1 and is a display-math token now, with no completer involved. A document that uses those sequences as literal-bracket escapes changes appearance on upgrade; escaping the backslash (`\\[`) keeps it literal, and an escaped pair opens neither a token nor a completion.
- **The mermaid download filenames lost their prefix**: `diagram.svg` / `diagram.png`, not `mermaid-diagram.svg` / `mermaid-diagram.png`. One base name now feeds every format (`.svg`, `.png`, and the new `.mmd`), and it is configurable — `controls={{ mermaid: { download: { filename: 'chart' } } }}`.
- **A code or table toolbar with nothing left in it is no longer rendered.** `controls={{ table: { copy: false, download: false } }}` used to leave an empty bar taking vertical space above the table; it now removes the bar, which is what `{ table: false }` does.
- **A price no longer opens a math span in the completer.** `costs $100 and *italic` completes to `…*italic*`; before, the lone `$` made the rest of the line look like math to the new guards. The same hole was silently there for `_`, `~` and `^`.
- **Fence detection in the completer follows CommonMark** (character, run length, info string) now that it shares one scanner with the `incomplete` signal: a `~~~` line no longer closes a ` ``` ` block, a shorter fence line inside a longer one is content, and an info string containing a backtick opens nothing.

### 🐛 Also fixed

- **The `mermaid` snippet is rendered.** Both the mermaid and the plain-code branch went through `snippets.code`, so a `mermaid` snippet — documented since 3.x — never ran. It now takes precedence for mermaid blocks and still falls back to `code`, so overriding only `code` keeps catching them.
- **A fence opened inside a list item is tracked.** `- ```js` was invisible to the fence scanner, so the `incomplete` signal and the completer both thought the block was closed.
- **A bracket inside a math span is notation, not a citation.** `inline \(a[b\) tail` no longer gains a stray `]` at the end of the line.

### 🔢 LaTeX math delimiters

- `\(x^2\)` and `\[ E = mc^2 \]` are tokenized end to end and render identically to `$x^2$` and `$$ … $$` — same `MathToken`, same `Math.svelte`, no new prop or export. Verified inside bold, table cells, list items and next to currency (`costs $100, and \(x\)` is exactly one math token), and an escaped `\\(` still opens nothing.
- The completer knows the five math contexts (`$`, `$$`, `\(`, `\[`, none) instead of counting dollars, which fixes three corruptions of finished formulas: `\(P(x_{t+1})\)` gained a stray `_`, `\(w^{*}\)` gained `*^`, and a `\[ … \]` block was rewritten into an incomplete-link placeholder. Emphasis outside the span still completes.
- A backslash-escaped `[` is no longer treated as an unclosed link: `see \[x\] and [real link` completes only the real one.

Ported from vercel/streamdown 8093f2a, with the currency heuristic kept.

### ⚡ The completer is linear on long lines

Four quadratic (one cubic) scans in `parseIncompleteMarkdown` are gone. No behaviour change — verified by a differential fuzz of 500k inputs against the 4.0.1 implementation.

- `inlineCitation` was cubic: one `lastIndexOf(']')` decides unclosedness, the formatting and citation-key scans advance with monotone pointers, and the closers are spliced in with a single join. A 16 KB line of `see [a [b [c [d ` through the whole completer: **51.4 s → 0.67 ms**. Scaling per doubling went from ×9 to ×1.5.
- The inline-code and math-context probes resume their left-to-right walk where the previous probe stopped instead of restarting at character 0 (four/five module-level scalars, no per-line allocation — the allocating mask shape that regressed the gate in 4.0.1 review stays rejected). `singleUnderscoreItalic` on a 46 KB line: 197 ms → 0.43 ms.
- `isWithinFootnoteRef` drops its backward walk; for a caret it reduces to checking the previous character. A caret-heavy 24 KB line: 105 ms → 0.06 ms.
- `singleUnderscoreItalic` no longer re-derives, in a second full pass, the underscore the counting pass already found, and both single-marker handlers are gated on their own marker instead of `/[\s\S]*/`.
- `src/tests/parse-incomplete-perf.spec.ts` gates all of it: a 16 KB unclosed-bracket line must complete in under 50 ms, and doubling a line must not more than 2.5× the time for five shapes. Measured today: ×1.44–×2.26, and the 16 KB case at 0.66 ms.

Streaming gate (`streaming-perf.spec.ts`, medians of 5 isolated runs): full-stream parsing of the README 310 ms → 286 ms, on a README that is 12% longer than 4.0.1's. `parseIncompleteMarkdown` on the typical-chat-answer breakdown 2.92 ms → 2.38 ms.

### 🔁 Streaming signals and the block-cache contract

- **`incomplete`**: the `code` and `mermaid` snippets and `components` receive `incomplete: boolean`, and their containers carry `data-incomplete="true"` while the fence is open. Only the last block of a non-`static` document can be incomplete. The Mermaid component acts on it — it skips `mermaid.render` on a half-written diagram (each of those runs parsed, threw and warned) and keeps the last good chart on screen.
- **The append fast path now probes the first character of every sealed block**, not a fixed sample of the document. Editing the first character of a middle block and then appending used to return the stale block; it now falls back to a full parse. The probe is O(sealed blocks) against offsets the cache already keeps, and pure append-only streaming is unaffected.
- The remaining hole — a same-length edit **inside** a sealed block — is documented rather than papered over, with the `static` / `{#key}` workarounds, and pinned by a `KNOWN LIMIT` test so it cannot regress silently.

### 🎛️ Controls

`controls` grew from three booleans into an umbrella that also configures the toolbars. Every pre-4.1 form resolves unchanged, and `controls={false}` is a new all-off shorthand.

```svelte
<Streamdown
	{content}
	controls={{
		code: { download: { filename: (token) => `snippet-${token.lang}` } },
		table: { copy: false, csvSeparator: 'auto' },
		mermaid: { mouseWheelZoom: false }
	}}
/>
```

- Copy and download switch independently per section; `filename` is a base name (or a function of the token) and the extension follows the format.
- **TSV** joins Markdown / HTML / CSV in the table menu, and **`.mmd`** (the diagram source) joins PNG / SVG.
- `csvSeparator` takes `','`, `';'`, `'\t'` or `'auto'`, which picks `;` in locales that write decimals with a comma. Quoting follows the separator in use instead of a hard-coded `/[,"\n]/`.
- The table toolbar's DOM walk is now a pure module and exported: `extractTableData`, `tableDataToCSV`, `tableDataToTSV`, `tableDataToMarkdown`, `tableDataToHTML`, plus `TableData` and `CsvSeparator`. New types: `Controls`, `CodeControls`, `TableControls`, `MermaidControls`, `ResolvedControls`.

### 🌍 Translations and accessibility

- Every string the components render themselves — alert titles, button labels, menu entries, copy announcements, blocked-URL tooltips — comes from one `translations` object with `alert` and `controls` namespaces. Pass only the keys you want; `defaultTranslations` is exported, and `Streamdown` merges once so components never fall back themselves. The 4.0.1 alert-only shape still type-checks, and the rendered alert text is byte-identical.
- Icon-only buttons have accessible names (`title` + `aria-label`, both translated), all 14 buttons in `src/lib/Elements` carry `type="button"` so a Streamdown instance inside a `<form>` cannot submit it, and the 9 inline icon SVGs are `aria-hidden`.
- Copying announces itself through a visually hidden `aria-live` region (`Code copied` / `Table copied`).
- An expanded mermaid diagram is a real `role="dialog"` with `aria-modal`, a label and focus moved into it; Escape still collapses it. The rendered diagram is `role="img"` labelled with its declaration line — and the render no longer overwrites that label with mermaid's own `role="graphics-document"`, which it did depending on when the lazy import resolved.

### 📐 Height caps

- `codeBlockMaxHeight` and `tableMaxHeight` take a CSS length (`'24rem'`) and cap the block's own scroll container — the `<pre>` for code, the wrapper for tables, so the horizontal scrollbar stays reachable. Unset leaves everything unbounded, allocates nothing and registers no listener.
- While the content grows the container stays pinned to the bottom; scrolling up latches that off, and scrolling back to the bottom re-arms it. The scroll is instant, never smooth — an animation could not finish between chunks anyway.

### Tooling

- `pnpm test:size` bundles and minifies the three entry points and fails when one grows past its budget, with the replacement number in the failure message; CI runs it as its own step. Today: root 193 KB min / 59 KB gzip, code 43 KB / 15 KB, parser 76 KB / 24 KB.

## 4.0.1

Bug-fix release: the Jan–Sep fixes from [vercel/streamdown](https://github.com/vercel/streamdown) that applied to this port, plus the port-specific defects found while auditing them. No API changes.

### ⚠️ Two behaviour changes

- **Raw HTML is now shown literally instead of vanishing.** With `renderHtml` off (the default) the `html` branch had no `{:else}`, so an html token was dropped text and all — an LLM answer containing `<h2>` or `<details>` silently lost that content. It now renders as escaped text, which is what CommonMark and upstream do. Svelte interpolates it as text, so this is not an XSS surface; set `renderHtml` to insert it as markup.
- **`mailto:` and `tel:` links are no longer blocked under the default `allowedLinkPrefixes={['*']}`.** The wildcard branch only let `http:`/`https:` through, so every legitimate phone and email link rendered a visible `[blocked]` badge. `javascript:`, `data:` and `vbscript:` stay blocked.

### Rendering

- `escape` tokens render again: the branch was a TODO comment, so `a \* b` came out as `a  b`.
- The `parseIncompleteMarkdown` prop is honoured. `Block.svelte` never consulted `streamdown.parseIncompleteMarkdown`, which made `parseIncompleteMarkdown={false}` a silent no-op; the import is aliased now so the context flag and the helper cannot be confused.
- Fenced code strips its trailing blank lines once, shared by render, copy and download, so they cannot disagree and the block stops flickering while streaming (e633ff7). Same trim for mermaid, where the trailing newlines re-ran the whole diagram render on nearly every chunk.
- Link titles render on the built-in anchor (only custom snippets got them), and a blocked link always gets its explanatory tooltip instead of only when the source had a title.

### Lexer

- A fence's info string is split into `lang` and the new `meta` (d4ec6c0). ` ```ts title="x" ` highlighted as plaintext, labelled the header with the whole string, downloaded as `file.txt`, and missed `lang === 'mermaid'`. `CodeToken` (`Tokens.Code & { meta?: string }`) is exported.
- Footnote identifiers are restricted to `\w`, `-` and `:` (9f72224). `[^\]\n]+` turned every regex character class written in prose (`[^\s]`, `[^,]`) into an empty footnote marker.
- A sub/superscript is a single run with no whitespace in it, and a digit before the `~` is a numeric range, not a subscript base (716a5f0): `20~25°C and 30~35°C` used to subscript half the sentence. Single-tilde `del` is disabled to match.

### Incomplete-markdown completer

- Asterisks flanked by whitespace on both sides are arithmetic or a bare list marker, never emphasis (c347b53).
- An asterisk that cannot _open_ emphasis is not completed: `*foo*bar*` is literal, not half of `*foo*bar**` (9f96409).
- Markers already inside a closed `` ` `` span are code, not unterminated emphasis (a725579), and a `$` shown as code no longer flips inline-math parity (e50b0c4).
- A half-typed block-math closer is completed to `$$` instead of gaining a stray `$`.
- A `>` that opens a list item before a number is escaped (4fffb9f): `- > 25: rich` lexed as a blockquote nested in the list item.
- The completer is ~28% faster than 4.0.0 on the README stream: the per-asterisk backward line scan was dead work (the handler only ever sees one line), whitespace-flanked asterisks bail before anything else runs, and the inline-code check scans on demand, allocating nothing and skipping lines with no backtick.

### Tables, downloads and a11y

- Downloaded CSV carries a UTF-8 BOM, so accented and CJK cells stop opening as mojibake in Excel on Windows.
- A `<br>` in a cell survives CSV export instead of collapsing two paragraphs into one run.
- The table node lookup quotes its attribute selector, which was invalid for most generated ids.
- Citation `aria-label`s interpolate the id instead of announcing `${id}` verbatim, and the table/mermaid download popovers get per-instance DOM ids instead of duplicating a constant one.

Ported from vercel/streamdown c347b53, 9f96409, a725579, 716a5f0, e50b0c4, 4fffb9f, 9f72224, d4ec6c0, e633ff7, 82bc4a6, 8b1c262, f46cd3c.

### Tooling

- CI runs both suites on every push and pull request, and the release workflow runs them before publishing. Neither ran before.
- `svelte-check` is clean (was 11 long-standing errors, now 0), so CI can gate on it along with the build. The fixes are type-level only, except in `math.test.ts`: six assertions passed their failure message as a second argument to `toBe`/`toBeDefined`, where vitest ignores it — the messages are now on `expect()` and will actually print.
- The vitest `client` project actually starts now (`environment: 'browser'` was never a valid vitest 3 option, so it silently never ran). It needs a Playwright Chromium binary, so it is split out: `pnpm test` runs the node tests, `pnpm test:browser` runs the component tests after `pnpm exec playwright install chromium`.

## 4.0.0

### 💥 Breaking: shiki replaced by `@tanstack/highlight`

Code highlighting now uses [`@tanstack/highlight`](https://github.com/TanStack/highlight) instead of shiki. It is synchronous, isomorphic and zero-dependency: all 30 language scanners plus both default themes weigh ~31KB minified / ~11KB gzip together, so highlighting runs during SSR, the skeleton/loading state is gone, and there is no grammar or theme to lazy-load.

**Prop renames:**

```diff
- shikiTheme="nord"
- shikiThemes={{ nord }}
- shikiLanguages={[{ id: 'haskell', name: 'Haskell', import: () => import('@shikijs/langs/haskell') }]}
+ highlightTheme="nord"
+ highlightThemes={{ nord }}
+ highlightLanguages={[myLanguage]}
```

- `highlightThemes` takes `Record<string, HighlightTheme>` — import theme objects from `@tanstack/highlight/themes/<name>` (`aurora-x`, `dracula`, `github-dark`, `github-light`, `gruvbox-dark`, `gruvbox-light`, `monokai`, `nord`, `one-dark-pro`, `solarized-dark`, `solarized-light`) or write your own object of that shape. `github-dark` / `github-light` stay built in and follow the color scheme by default.
- `highlightLanguages` takes `LanguageDefinition[]` built with the newly exported `defineLanguage` instead of lazy shiki grammar loaders.
- **Removed exports**: `bundledLanguagesInfo`, `createLanguageSet`, `LanguageInfo`. **New exports**: `defineLanguage`, `LanguageDefinition`, `HighlightTheme`.
- **Removed theme key**: `code.skeleton` (no loading state anymore).
- An unknown `highlightTheme` key now falls back to the built-in themes instead of leaving the block unhighlighted forever.
- Every highlighted token now carries `th-token th-<class>` CSS classes (`th-keyword`, `th-string`, `th-comment`, …) in addition to its inline color, so tokens can be restyled or overridden from CSS.
- `useStreamdown().shikiTheme` (a theme key) is now `useStreamdown().highlightTheme` and holds the resolved `HighlightTheme` object.
- **Language coverage caveat**: `@tanstack/highlight@0.1.0` supports `apache`, `cmake`, `cpp`, `css`, `diff`, `dockerfile`, `ejs`, `env`, `go`, `html`, `http`, `js`, `json`, `jsx`, `markdown`, `mermaid`, `nginx`, `php`, `plaintext`, `python`, `scheme`, `shell`, `sql`, `svelte`, `toml`, `ts`, `tsrx`, `tsx`, `vue`, `yaml` (plus the usual aliases). Languages shiki covered but this does not — `java`, `rust`, `c`, `c#`, `swift`, `kotlin`, `ruby`, `graphql`, … — render as plaintext.

### ⚡ Performance: streaming parse is ~10x faster on long documents

Profiling the per-chunk path showed the cost was not the parser: 93% of `parseBlocks` time on a 100 KB stream was an O(N) `startsWith` comparison of the whole sealed prefix on every chunk, plus a few hot-path mistakes in the plugins. All fixed, no behaviour change (734 tests, including a new 10k-document equivalence test for the block splitter):

- `parseBlocks` append path is now O(live tail): exact compare of the live region only, prefix-sum offsets, and a persistent block array whose tail is rewritten instead of a per-chunk `filter`.
- Footnote plugin matches its regex before touching Svelte context (`getContext()` throws outside component init and was called on every block token).
- Table plugin no longer rebuilds a ~1 KB `RegExp` per token.
- Block splitting uses a `Lexer` subclass that skips the nested parse marked's list tokenizer does only to compute `loose`; proven identical over 10,510 documents and streaming prefixes.
- Six inline plugins now check their trigger character before running their regex.

Measured on a 100 KB document streamed in 20-character chunks: stream total 901 ms → 74 ms, per-chunk median 0.178 ms → 0.014 ms, growth exponent N^1.27 → N^1.02; full parse 37 ms → 10 ms. Cost: +278 bytes gzip. `marked` is now pinned to an exact version because the splitter relies on two of its internals (guarded by `src/tests/split-lexer-equivalence.test.ts`).

### 📦 Dependencies

- `marked` bumped from 16.2.1 to 18.0.12 (two majors; both breaking changes concern the built-in list and blank-line handling that svelte-streamdown's own list and table plugins replace, so no behaviour change here). Picks up marked's fix for O(n²) reference-link scanning on long documents. Pinned exactly, see above.

## 3.1.2

### 🔒 Security

- Bumped `mermaid` to `^11.15.0` to clear 4 moderate advisories (classDef/config injection, Gantt DoS) that surfaced in consumers' `pnpm audit` ([#32](https://github.com/beynar/svelte-streamdown/issues/32), thanks [@polvallverdu](https://github.com/polvallverdu)).

### 🐛 Bug Fixes

- **List no longer absorbs a following paragraph** — a paragraph after a blank line following a list item is now its own block instead of being merged into the item ([#34](https://github.com/beynar/svelte-streamdown/issues/34), thanks [@snayerman](https://github.com/snayerman)).
- **Inline citations with no matching source now render as plain text** (`[123]`, `[ref] [ref2]`) instead of vanishing ([#31](https://github.com/beynar/svelte-streamdown/issues/31)).

## 3.1.1

### 🐛 Bug Fixes

- **Table last-row border** — removed the doubled bottom border on the final table row (it stacked on the table's own rounded border). Thanks [@ieedan](https://github.com/ieedan) ([#23](https://github.com/beynar/svelte-streamdown/pull/23)).

## 3.1.0

### ✨ Features

- **`allowedLinkPrefixes` / `allowedImagePrefixes` now support protocol-only prefixes** ([#27](https://github.com/beynar/svelte-streamdown/issues/27)). Use `'https://'` to allow all HTTPS links while still blocking insecure `http://`, or `'mailto:'` / `'tel:'` for those protocols. The `'*'` wildcard continues to allow only `http`/`https`.
  ```svelte
  <Streamdown {content} allowedLinkPrefixes={['https://', 'mailto:']} />
  ```
- **Disable Mermaid mouse-wheel zoom** ([#29](https://github.com/beynar/svelte-streamdown/issues/29)). `controls.mermaid` now accepts an object `{ enabled?, mouseWheelZoom? }` so you can turn off wheel-zoom while keeping pan and the zoom buttons (`enabled` still toggles the whole toolbar). The plain boolean form still works.
  ```svelte
  <Streamdown {content} controls={{ mermaid: { mouseWheelZoom: false } }} />
  ```

### 🐛 Bug Fixes

- **Paragraphs in loose list items now render correctly** ([#28](https://github.com/beynar/svelte-streamdown/issues/28)). A list item containing a blank line is now detected as loose, and its content renders as separate paragraph blocks instead of being glued onto one line.
  > **Behavior note:** loose-list item content is now wrapped in `<p>` (CommonMark-correct, matching the original Streamdown). The default theme adds no extra margin (`theme.paragraph.base` is empty), so vertical spacing is unchanged for most users.
- **Streaming parser overhaul** — fixed a family of incomplete-markdown completion bugs that produced stray or broken markup mid-stream:
  - A half-streamed closing marker (`**bold*`, `__under_`, `~~strike~`, `***both*`) no longer leaves a stray `*`/`_`/`~` after the text.
  - Incomplete links/images on lines with multiple brackets no longer duplicate text or get a misplaced `]`; incomplete images are completed with the image marker instead of being closed as citations.
  - Multiple incomplete citations on one line are now each closed (previously only one `]` was appended).
  - Alignment blocks: `[center]`/`[right]` with empty content tokenize, consecutive blocks parse as siblings, formatting completion works inside blocks, and an unclosed code fence inside an unclosed block is closed in the right order. A lone trailing `[center]`/`[right]` line is left as-is until content streams in.
  - Code fences quoted inside blockquotes/alerts (`> \`\`\``) are now detected, so fenced content in alerts is no longer mangled mid-stream.
  - MDX-looking tags inside code fences or math blocks are no longer tracked/auto-closed as components.
  - Incomplete footnote references (`[^label`) are completed with the footnote marker again (the citation handler was closing them first).
- **Description lists no longer drop lines whose detail contains a colon** (`: Time: 10:30 AM` used to vanish entirely — the per-line regex disagreed with the block rule).
- **Table rowspan cleanup** — `^^` continuation markers no longer leak a stray `^` cell, and a cell with content plus a trailing `^` keeps its full text when merged into the cell above (the last character used to be dropped).
- **Nested same-name MDX components** — the incomplete-markdown parser now pairs closing tags with the innermost open tag (LIFO) and no longer double-counts closes that are part of a same-line pair, so streamed nested components are auto-closed in the right order.
- **Spaced thematic breaks** — `- - - -` now parses as a horizontal rule per CommonMark instead of a bullet list.
  > **Behavior notes:** a bare trailing `[text` (no `](` on the line) is now consistently completed as an inline citation `[text]` — it becomes a link as soon as `](url` streams in. GFM tables keep genuinely empty cells (`| a |  | b |`); use consecutive pipes (`||`) for colspan, which is unchanged.

### ⚡ Performance

- **Faster streaming parse** — hot-path regexes in the list, alert, and description-list tokenizers are now precompiled once at module load instead of being rebuilt on every chunk, the citations tokenizer's `start()` hook returns the actual bracket index so marked can skip ahead instead of re-invoking it at every position, and a duplicate regex evaluation was removed from the math tokenizer. Streaming benchmark suites (`src/tests/streaming-perf*.spec.ts`) are included to keep this measurable.
- **Incremental block splitting** — `parseBlocks` no longer re-lexes the whole document on every streamed chunk. On append-only updates (the streaming case) it seals completed blocks and re-lexes only the last two, falling back to a full parse for any non-append edit or when token raws don't reconstruct the input (e.g. tab normalization). The tokenizer options object is also built once and shared instead of being rebuilt twice per chunk. Equivalence with the full parse is locked in by a property test (`parse-blocks-incremental.test.ts`) that streams pathological documents (tables forming row by row, setext headings, fences, footnote continuations) and compares at every chunk. Combined with the tokenizer work above, total parse cost on a representative streamed LLM answer (~1 token per chunk) drops **~12×** vs 3.0.1, and the end-of-stream cost-growth ratio falls from ~240× to ~8×.

### 📝 Documentation

- Clarified that the Tailwind `@source` path is relative to your stylesheet, with a `src/routes` example for newer SvelteKit project layouts ([#24](https://github.com/beynar/svelte-streamdown/issues/24)).
- Documented KaTeX math usage — importing the `Math` component and using `$…$` / `$$…$$` ([#21](https://github.com/beynar/svelte-streamdown/issues/21)).
- Documented Shiki theme usage: the built-in `github-dark` / `github-light` themes, registering extra themes via `shikiThemes`, dynamic light/dark switching, and migrating off the removed `shikiPreloadThemes` prop ([#25](https://github.com/beynar/svelte-streamdown/issues/25)).
- Added a **Streaming Performance & Memoization** section explaining how parsing work is reused across streaming updates ([#18](https://github.com/beynar/svelte-streamdown/issues/18)).

### 🔒 Supply Chain & Release

- Added an npm publish workflow using [trusted publishing](https://docs.npmjs.com/trusted-publishers) (OIDC, no long-lived token) with provenance, plus `repository` and `publishConfig` metadata ([#22](https://github.com/beynar/svelte-streamdown/issues/22)). _Requires enabling the Trusted Publisher for this package on npmjs.com before the first automated release._

## 3.0.0

### ⚠️ Breaking Changes

#### Heavy Components Now Opt-in

- **Code, Mermaid, and Math components are now opt-in** - they are no longer bundled by default
- Import heavy components separately and pass them via the `components` prop:

  ```svelte
  <script>
  	import { Streamdown } from 'svelte-streamdown';
  	import Code from 'svelte-streamdown/code';
  	import Mermaid from 'svelte-streamdown/mermaid';
  	import Math from 'svelte-streamdown/math';
  </script>

  <Streamdown content={markdown} components={{ code: Code, mermaid: Mermaid, math: Math }} />
  ```

- If components are not provided, lightweight fallbacks are used (plain `<pre><code>` for code, raw text for math)

#### Shiki Core Migration

- **Migrated to `shiki/core`** for optimal bundle size - only explicitly imported languages and themes are bundled
- **`shikiTheme` prop type changed**: Now accepts `string` instead of `BundledTheme` type

  ```svelte
  // Before
  <Streamdown shikiTheme="github-light" /> // ✅ Still works // Type changed from BundledTheme to string
  ```

- **Removed `shikiPreloadThemes` prop**: No longer needed as default themes are loaded immediately
- **`shikiThemes` prop changed**: Now accepts `Record<string, ThemeRegistration>` instead of `ThemeInfo[]`

  ```svelte
  <script>
  	import { Streamdown } from 'svelte-streamdown';
  	import nord from '@shikijs/themes/nord';

  	// Pass pre-imported theme objects
  	const customThemes = {
  		nord: nord
  	};
  </script>

  <Streamdown content={markdown} shikiThemes={customThemes} shikiTheme="nord" />
  ```

### Reduced Bundle Size

- Trimmed default syntax highlighting languages from ~240 to ~28 most commonly used languages
- Unsupported languages now render as plaintext instead of falling back to bash
- **Migrated to `shiki/core`** - dramatically reduced bundle size by only bundling explicitly imported languages and themes

#### Default Themes (2)

- `github-dark`
- `github-light`

#### Default Languages (28)

**Web:**
`javascript` (js), `typescript` (ts), `html`, `css`, `json`, `jsx`, `tsx`, `markdown` (md), `yaml` (yml), `xml`, `svelte`, `vue`

**Backend:**
`python` (py), `java`, `go`, `rust` (rs), `ruby` (rb), `php`, `c`, `cpp` (c++), `csharp` (c#, cs), `sql`, `swift`, `kotlin` (kt, kts)

**Config/Shell:**
`shellscript` (bash, sh, shell, zsh), `docker` (dockerfile), `toml`, `graphql` (gql)

### Custom Language & Theme Support

- Added `shikiLanguages` prop to add extra syntax highlighting languages (merged with defaults)
- Added `shikiThemes` prop to add extra themes as pre-imported objects
- Exported `bundledLanguagesInfo`, `createLanguageSet`, and `LanguageInfo` type

#### Adding Custom Languages

```svelte
<script>
	import { Streamdown, type LanguageInfo } from 'svelte-streamdown';

	// Add extra languages - automatically merged with defaults
	const extraLanguages: LanguageInfo[] = [
		{
			id: 'haskell',
			aliases: ['hs'],
			import: () => import('@shikijs/langs/haskell')
		}
	];
</script>

<Streamdown content={markdown} shikiLanguages={extraLanguages} />
```

#### Adding Custom Themes

Import themes from `@shikijs/themes` and pass them as a record:

```svelte
<script>
	import { Streamdown } from 'svelte-streamdown';
	import nord from '@shikijs/themes/nord';
	import draculaSoft from '@shikijs/themes/dracula-soft';

	// Add custom themes
	const customThemes = {
		nord: nord,
		'dracula-soft': draculaSoft
	};
</script>

<!-- Use a specific custom theme -->
<Streamdown content={markdown} shikiThemes={customThemes} shikiTheme="nord" />
```

#### Custom Dark/Light Theme Pair

When using custom themes, you need to handle the dark/light switching yourself:

```svelte
<script>
	import { Streamdown } from 'svelte-streamdown';
	import tokyoNight from '@shikijs/themes/tokyo-night';
	import catppuccinLatte from '@shikijs/themes/catppuccin-latte';

	const customThemes = {
		'tokyo-night': tokyoNight,
		'catppuccin-latte': catppuccinLatte
	};

	// Your app's dark mode state
	let isDark = $state(false);
</script>

<!-- Switch theme based on your dark mode state -->
<Streamdown
	content={markdown}
	shikiThemes={customThemes}
	shikiTheme={isDark ? 'tokyo-night' : 'catppuccin-latte'}
/>
```

### 🛠️ Features

#### Mermaid Diagram Export

- **New download button for Mermaid diagrams** - export diagrams as PNG or SVG
- PNG export renders at 2x scale for high-quality images with white background
- SVG export preserves vector format with proper XML namespaces
- Download button appears in the Mermaid controls bar alongside zoom/fullscreen controls

#### Automatic Dark Mode Detection

- **Code blocks and Mermaid diagrams now automatically switch themes** based on your app's dark/light mode
- Detects theme via `dark`/`light` class, `data-theme` attribute, or `color-scheme` style on `<html>` or `<body>`
- Code highlighting automatically switches between `github-dark` and `github-light` themes
- Mermaid diagrams automatically switch between `dark` and `default` themes
- **Zero configuration needed** for dark mode support - just works with your existing theme setup

```svelte
<!-- Your app's theme toggle automatically updates code highlighting -->
<html class="dark">
  <!-- or data-theme="dark" -->
  <!-- or style="color-scheme: dark;" -->
```

#### Static Mode

- Added `static` prop for rendering pre-processed markdown (e.g., blog posts) without runtime parsing

```svelte
<Streamdown content={htmlContent} static />
```

#### New Exports

- `parseIncompleteMarkdown` - Parse incomplete/streaming markdown
- `IncompleteMarkdownParser` - Parser class for streaming scenarios
- `Plugin` type - For creating custom parser plugins
