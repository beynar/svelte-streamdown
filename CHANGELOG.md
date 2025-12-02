# Changelog

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

  <Streamdown 
    content={markdown}
    components={{ code: Code, mermaid: Mermaid, math: Math }}
  />
  ```
- If components are not provided, lightweight fallbacks are used (plain `<pre><code>` for code, raw text for math)

#### Shiki Core Migration

- **Migrated to `shiki/core`** for optimal bundle size - only explicitly imported languages and themes are bundled
- **`shikiTheme` prop type changed**: Now accepts `string` instead of `BundledTheme` type
  ```svelte
  // Before
  <Streamdown shikiTheme="github-light" /> // ✅ Still works
  
  // Type changed from BundledTheme to string
  ```
- **Removed `shikiPreloadThemes` prop**: No longer needed as default themes are loaded immediately
- **`shikiThemes` prop changed**: Now accepts `Record<string, ThemeRegistration>` instead of `ThemeInfo[]`
  ```svelte
  <script>
    import { Streamdown } from 'svelte-streamdown';
    import nord from '@shikijs/themes/nord';
    
    // Pass pre-imported theme objects
    const customThemes = {
      'nord': nord
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
    'nord': nord,
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

