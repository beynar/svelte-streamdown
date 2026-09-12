# Changelog

## 4.0.0 (unreleased)

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
- **Language coverage caveat**: `@tanstack/highlight@0.1.0` supports `apache`, `cmake`, `cpp`, `css`, `diff`, `dockerfile`, `ejs`, `env`, `go`, `html`, `http`, `js`, `json`, `jsx`, `markdown`, `mermaid`, `nginx`, `php`, `plaintext`, `python`, `scheme`, `shell`, `sql`, `svelte`, `toml`, `ts`, `tsrx`, `tsx`, `vue`, `yaml` (plus the usual aliases). Languages shiki covered but this does not — `java`, `rust`, `c`, `c#`, `swift`, `kotlin`, `ruby`, `graphql`, … — render as plaintext.

### ⚡ Performance: streaming parse is ~10x faster on long documents

Profiling the per-chunk path showed the cost was not the parser: 93% of `parseBlocks` time on a 100 KB stream was an O(N) `startsWith` comparison of the whole sealed prefix on every chunk, plus a few hot-path mistakes in the plugins. All fixed, no behaviour change (735 tests, including a new 10k-document equivalence test for the block splitter):

- `parseBlocks` append path is now O(live tail): exact compare of the live region only, prefix-sum offsets, and a persistent block array whose tail is rewritten instead of a per-chunk `filter`.
- Footnote plugin matches its regex before touching Svelte context (`getContext()` throws outside component init and was called on every block token).
- Table plugin no longer rebuilds a ~1 KB `RegExp` per token.
- Block splitting uses a `Lexer` subclass that skips the nested parse marked's list tokenizer does only to compute `loose`; proven identical over 10,510 documents and streaming prefixes.
- Six inline plugins now check their trigger character before running their regex.

Measured on a 100 KB document streamed in 20-character chunks: stream total 901 ms → 74 ms, per-chunk median 0.178 ms → 0.014 ms, growth exponent N^1.27 → N^1.02; full parse 37 ms → 10 ms. Cost: +278 bytes gzip. `marked` is now pinned to an exact version because the splitter relies on two of its internals (guarded by `src/tests/split-lexer-equivalence.test.ts`).

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
