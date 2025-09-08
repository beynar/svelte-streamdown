# Svelte Streamdown

[![npm version](https://badge.fury.io/js/svelte-streamdown.svg)](https://badge.fury.io/js/svelte-streamdown)

A **Svelte port** of [Streamdown](https://streamdown.ai/) by Vercel - an all markdown renderer, designed specifically for AI-powered streaming applications.

## 🚀 Overview

Streamdown makes formatting Markdown easy, but when you tokenize and stream it from AI models, new challenges arise. This Svelte port brings all the power of the original React Streamdown component to the Svelte ecosystem.

Perfect for AI-powered applications that need to stream and render markdown content safely and beautifully, with support for incomplete markdown blocks, security hardening, and rich features like code highlighting, math expressions, and interactive diagrams.

## ✨ Main Features

### 🎨 Built-in Typography Styles

Beautiful, responsive typography with **built-in Tailwind CSS classes** for headings, lists, code blocks, and more. Comes with a complete default theme that works out of the box.

### 📝 GitHub Flavored Markdown

Full support for GitHub Flavored Markdown including:

- Task lists
- Tables
- Strikethrough text
- Autolinks
- Footnotes

### 💻 Interactive Code Blocks

- Syntax highlighting powered by Shiki
- Copy-to-clipboard functionality
- Hover-to-reveal copy button
- Support for light and dark themes

### 🔢 Mathematical Expressions

LaTeX math support through KaTeX:

- Inline math: `$E = mc^2$`
- Block math: `$$\\sum_{i=1}^n x_i$$`
- Perfect rendering for scientific content

### 🧜‍♀️ Mermaid Diagrams

- Render Mermaid diagrams from code blocks
- **Incremental rendering** during streaming content
- Click-to-render functionality for streaming content
- Static diagram visualization (non-interactive)

### 🔄 Streaming-Optimized

- **Incomplete Markdown Parsing**: Handles unterminated blocks gracefully
- **Progressive Rendering**: Perfect for streaming AI responses
- **Real-time Updates**: Optimized for dynamic content

### 🔒 Security Hardening

- **Image Origin Control**: Whitelist allowed image sources
- **Link Safety**: Control link destinations
- **HTML Sanitization**: Prevent XSS attacks

### 🎯 Fully Customizable Components & Theming

- **Every component customizable** with Svelte snippets
- **Granular theming system** - customize every part of every component
- Override default styling and behavior for any markdown element
- Full control over rendering with type-safe props
- Seamless integration with your design system

## 🔄 Differences from Original React Version

This Svelte port maintains feature parity with the original [Streamdown](https://streamdown.ai/) while adapting to Svelte's patterns:

| Aspect            | Original (React) | Svelte Port               |
| ----------------- | ---------------- | ------------------------- |
| **Framework**     | React            | Svelte 5                  |
| **Component API** | JSX Components   | Svelte Snippets           |
| **Styling**       | Tailwind CSS     | Tailwind CSS (compatible) |
| **Context**       | React Context    | Svelte Context            |
| **Build System**  | Vite/React       | Vite/SvelteKit            |
| **TypeScript**    | Full TS support  | Full TS support           |

## 📦 Installation

```bash
npm install svelte-streamdown
# or
pnpm add svelte-streamdown
# or
yarn add svelte-streamdown
```

### Peer Dependencies

```bash
npm install svelte@^5.0.0
```

### Tailwind CSS Setup

Streamdown comes with **built-in Tailwind CSS classes** for beautiful default styling. To ensure all styles are included in your build, add the following to your `app.css` or main CSS file:

```css
@import 'tailwindcss';
/* Add Streamdown styles to your Tailwind build */
@source "../node_modules/svelte-streamdown/**/*";
```

This ensures that all Streamdown's default styling is included in your Tailwind build process.

## 🚀 Quick Start

### Basic Usage

```svelte
<script>
	import { Streamdown } from 'svelte-streamdown';

	let content = `# Hello World

This is a **bold** text and this is *italic*.

\`\`\`javascript
console.log('Hello from Streamdown!');
\`\`\`
`;
</script>

<Streamdown {content} />
```

### Advanced Usage with Custom Components

```svelte
<script>
	import { Streamdown } from 'svelte-streamdown';

	let content = `# Custom Components Example

This heading will use a custom component!`;

	// Custom heading component
</script>

{#snippet customH1({ children, props })}
	<h1 class="mb-4 text-4xl font-bold text-blue-600" {...props}>
		{children}
	</h1>
{/snippet}

<Streamdown {content} h1={customH1} />
```

### Security Configuration

```svelte
<script>
	import { Streamdown } from 'svelte-streamdown';

	let markdown = `![Safe Image](https://trusted-domain.com/image.jpg)
[Safe Link](https://trusted-domain.com/page)`;
</script>

<Streamdown
	{content}
	allowedImagePrefixes={['https://trusted-domain.com']}
	allowedLinkPrefixes={['https://trusted-domain.com']}
/>
```

## 📋 Props API

| Prop                      | Type                                                  | Default          | Description                                    |
| ------------------------- | ----------------------------------------------------- | ---------------- | ---------------------------------------------- |
| `content`                 | `string`                                              | -                | **Required.** The markdown content to render   |
| `class`                   | `string`                                              | -                | CSS class names for the wrapper element        |
| `parseIncompleteMarkdown` | `boolean`                                             | `true`           | Parse and fix incomplete markdown syntax       |
| `defaultOrigin`           | `string`                                              | -                | Default origin for relative URLs               |
| `allowedLinkPrefixes`     | `string[]`                                            | `['*']`          | Allowed URL prefixes for links                 |
| `allowedImagePrefixes`    | `string[]`                                            | `['*']`          | Allowed URL prefixes for images                |
| `allowElement`            | `AllowElement \| null`                                | -                | Custom element filtering function              |
| `allowedElements`         | `readonly string[] \| null`                           | -                | Whitelist of allowed HTML elements             |
| `disallowedElements`      | `readonly string[] \| null`                           | -                | Blacklist of disallowed HTML elements          |
| `skipHtml`                | `boolean`                                             | -                | Skip HTML parsing entirely                     |
| `unwrapDisallowed`        | `boolean`                                             | -                | Unwrap instead of removing disallowed elements |
| `urlTransform`            | `UrlTransform \| null`                                | -                | Custom URL transformation function             |
| `theme`                   | `Partial<Theme>`                                      | -                | Custom theme overrides                         |
| `shikiTheme`              | `BundledTheme`                                        | `'github-light'` | Code highlighting theme                        |
| `mermaidConfig`           | `MermaidConfig`                                       | -                | Mermaid diagram configuration                  |
| `katexConfig`             | `KatexOptions \| ((inline: boolean) => KatexOptions)` | -                | KaTeX math rendering options                   |
| `remarkPlugins`           | `PluggableList`                                       | -                | Additional remark plugins                      |
| `rehypePlugins`           | `PluggableList`                                       | -                | Additional rehype plugins                      |
| `remarkRehypeOptions`     | `RemarkRehypeOptions`                                 | -                | Remark-rehype conversion options               |

### Custom Component Props

**Every single markdown element** can be customized with Svelte snippets, giving you complete control over styling and behavior:

```svelte
<script>
	import { Streamdown } from 'svelte-streamdown';

	let content = `# Fully Customizable

This heading uses a custom component with your design system!`;
</script>

{#snippet customH1({ children, ...props })}
	<h1
		class="text-gradient mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-4xl font-bold text-transparent"
		{...props}
	>
		{@render children()}
	</h1>
{/snippet}

{#snippet customCode({ children, ...props })}
	<code class="rounded bg-gray-100 px-2 py-1 font-mono text-sm dark:bg-gray-800" {...props}>
		{@render children()}
	</code>
{/snippet}

{#snippet customBlockquote({ children, ...props })}
	<blockquote
		class="border-l-4 border-blue-500 pl-4 text-gray-600 italic dark:text-gray-300"
		{...props}
	>
		{@render children()}
	</blockquote>
{/snippet}

<Streamdown {content} h1={customH1} code={customCode} blockquote={customBlockquote} />
```

#### All Available Customizable Elements:

**Text Elements**: `h1`, `h2`, `h3`, `h4`, `h5`, `h6`, `p`, `strong`, `em`, `del`

**Links & Media**: `a`, `img`

**Lists**: `ul`, `ol`, `li`

**Code**: `code`, `inlineCode`, `pre`

**Tables**: `table`, `thead`, `tbody`, `tr`, `th`, `td`

**Special Content**: `blockquote`, `hr`, `alert`, `mermaid`, `math`, `inlineMath`

Each snippet receives `{ children, ...props }` where `props` contains all element attributes and classes.

## 🎨 Advanced Theming System

Beyond custom snippets, Streamdown provides a **granular theming system** that lets you customize every part of every component without writing custom snippets.

### Theme Structure

Every component has multiple themeable parts. For example, the `code` component has:

```typescript
code: {
  base: 'bg-gray-100 rounded p-2 font-mono text-sm',           // Main code block
  container: 'my-4 w-full overflow-hidden rounded-xl border',   // Wrapper container
  header: 'flex items-center justify-between bg-gray-100/80',  // Header with language
  button: 'cursor-pointer p-1 text-gray-600 transition-all',   // Copy button
  language: 'ml-1 font-mono lowercase',                        // Language label
  pre: 'overflow-x-auto font-mono p-0 bg-gray-100/40'        // Pre element
}
```

### Using Custom Themes

```svelte
<script>
	import { Streamdown } from 'svelte-streamdown';

	let content = `# Custom Theme Example

\`\`\`javascript
console.log('Beautiful code blocks!');
\`\`\`

> This blockquote is also themed

| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
`;

	// Custom theme overrides
	let customTheme = {
		code: {
			container: 'my-6 rounded-2xl border-2 border-purple-200 shadow-lg',
			header: 'bg-purple-50 text-purple-700 font-medium',
			button: 'text-purple-600 hover:text-purple-800 hover:bg-purple-100'
		},
		blockquote: {
			base: 'border-l-8 border-purple-400 bg-purple-50 p-4 italic text-purple-800'
		},
		table: {
			base: 'border-purple-200 shadow-md',
			container: 'my-6 rounded-lg overflow-hidden'
		},
		th: {
			base: 'bg-purple-100 px-6 py-3 text-purple-900 font-bold'
		},
		td: {
			base: 'px-6 py-3 border-purple-100'
		}
	};
</script>

<Streamdown {content} theme={customTheme} />
```

### All Themeable Components

Each component supports multiple themeable parts:

**Headings (`h1`-`h6`)**: `base`

**Text Elements (`p`, `strong`, `em`, `del`)**: `base`

**Lists (`ul`, `ol`, `li`)**: `base`

**Links (`a`)**: `base`, `blocked` (for blocked/unsafe links)

**Code (`code`)**: `base`, `container`, `header`, `button`, `language`, `skeleton`, `pre`

**Inline Code (`inlineCode`)**: `base`

**Images (`img`)**: `container`, `base`, `downloadButton`

**Tables (`table`, `thead`, `tbody`, `tr`, `th`, `td`)**: `base`, `container` (table only)

**Blockquotes (`blockquote`)**: `base`

**Alerts (`alert`)**: `base`, `title`, `icon`, plus type-specific styles (`note`, `tip`, `warning`, `caution`, `important`)

**Mermaid (`mermaid`)**: `base`, `downloadButton`

**Math (`math`, `inlineMath`)**: `base`

**Other (`hr`, `sup`, `sub`)**: `base`

### Theme Merging

Themes are intelligently merged using Tailwind's class merging utility, so you only need to override the specific parts you want to customize while keeping the default styling for everything else.

## 🛠️ Development

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd svelte-streamdown

# Install dependencies
pnpm install

# Start development server
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build
```

### Building

```bash
# Build the library
pnpm build

# Preview the showcase app
pnpm preview
```

## 🤝 Contributing

Contributions are welcome! This is a port of the original Streamdown project, so please:

1. Check the [original Streamdown repository](https://github.com/vercel/streamdown) for upstream changes
2. Ensure compatibility with the original API
3. Maintain feature parity where possible
4. Add tests for new features

## 📄 License

This project is a port of [Streamdown](https://streamdown.ai/) by Vercel. Please refer to the original project's license for usage terms.

## 🙏 Acknowledgments

- **Original Streamdown**: [Vercel](https://vercel.com) for creating the original React component
- **Svelte Community**: For the amazing framework that made this port possible
- **All Contributors**: For helping improve and maintain this project

---

Made with ❤️ and 🤖, ported from Vercel's original Streamdown.
