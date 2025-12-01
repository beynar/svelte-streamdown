# Changelog

## 2.7.0

### Reduced Bundle Size

- Trimmed default syntax highlighting languages from ~240 to ~28 most commonly used languages
- Unsupported languages now render as plaintext instead of falling back to bash

### Custom Language Support

- Added `shikiLanguages` prop to add extra syntax highlighting languages (merged with defaults)
- Exported `bundledLanguagesInfo`, `createLanguageSet`, and `LanguageInfo` type

```svelte
<script>
  import { Streamdown, type LanguageInfo } from 'svelte-streamdown';

  // Add extra languages - automatically merged with defaults
  const extraLanguages: LanguageInfo[] = [
    {
      id: 'haskell',
      name: 'Haskell',
      aliases: ['hs'],
      import: () => import('@shikijs/langs/haskell')
    }
  ];
</script>

<Streamdown content={markdown} shikiLanguages={extraLanguages} />
```

### Static Mode

- Added `static` prop for rendering pre-processed markdown (e.g., blog posts) without runtime parsing

```svelte
<Streamdown content={htmlContent} static />
```

### New Exports

- `parseIncompleteMarkdown` - Parse incomplete/streaming markdown
- `IncompleteMarkdownParser` - Parser class for streaming scenarios
- `Plugin` type - For creating custom parser plugins

