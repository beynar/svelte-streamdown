<script lang="ts">
	import Streamdown from '$lib/Streamdown.svelte';
	import { useTheme } from 'svelte-themes';

	let content = `
# AI System Instructions for Svelte Streamdown

Copy the prompt below to use with AI systems. Click the copy button on the code block:

\`\`\`markdown
## MARKDOWN ELEMENTS

### 1. Headings
Use hash symbols followed by space and text. Number of hashes = heading level (1-6).
# Heading 1
## Heading 2
### Heading 3

### 2. Bold
Wrap text with ** or __.
**bold text**

### 3. Italic
Wrap text with * or _.
*italic text*

### 4. Inline Code
Wrap text with backticks.
\`code\`

### 5. Strikethrough
Wrap text with ~~.
~~strikethrough~~

### 6. Subscript
Wrap text with ~.
H~2~O

### 7. Superscript
Wrap text with ^.
E = mc^2^

### 8. Links
Use [text](url) format.
[Link text](https://example.com)

### 9. Blockquotes
Start lines with >. Use >> for nested quotes.
> This is a quote
>> Nested quote

### 10. Ordered Lists
Start with number + period. Supports: 1., a., A., i., I.
1. First item
2. Second item

### 11. Unordered Lists
Start with - or *.
- Item one
- Item two

### 12. Task Lists
Use - [ ] for unchecked, - [x] for checked.
- [ ] Unchecked task
- [x] Checked task

### 13. Alerts
Use blockquote with [!TYPE] on first line. TYPE can be NOTE, TIP, IMPORTANT, WARNING, CAUTION.
> [!NOTE]
> This is a note

> [!TIP]
> This is a tip

> [!IMPORTANT]
> This is important

> [!WARNING]
> This is a warning

> [!CAUTION]
> This is a caution

### 14. Code Blocks
Wrap with triple backticks and language name.

### 15. Inline Math
Wrap with single $.
$E = mc^2$

### 16. Block Math
Wrap with double $$.
$$
\\sum_{i=1}^{n} x_i
$$

### 17. Mermaid Diagrams
Use code block with mermaid language.
### 18. Tables
Use pipes | to separate columns, hyphens for header separator.
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |

### 19. Table Alignment
Use colons in separator row.
| Left | Center | Right |
|:-----|:------:|------:|
| A    | B      | C     |

### 20. Table Colspan
Use multiple consecutive pipe characters (|||) to span columns.
| Spans 3 columns |||

### 21. Table Rowspan
Use ^ in cell below to merge with cell above.
| Cell spans |
| two rows ^ |

### 22. Table Footer
Add separator row with |---|.
| Data  |
|-------|
| Value |
|-------|
| Total |

### 23. Footnotes
Reference with [^id], define with [^id]: text.
Text with footnote[^1]

[^1]: Footnote definition

### 24. Citations
Reference sources with their key (or nested key) in square brackets [key]. Use spaces for multiple citations.
The key should point to a source in the sources object that has been given to you.

According to research[smith2023] and studies[jones2024]

### 25. Description Lists
Use : term : definition format.
: Term 1 : Definition 1
: Term 2 : Definition 2
\`\`\`

## Feature Examples

Below are examples of all supported features rendered with Svelte Streamdown:

### Basic Text Formatting
- **Bold text**: \`**text**\` or \`__text__\`
- *Italic text*: \`*text*\` or \`_text_\`
- \`Inline code\`: \`\`code\`\`
- ~~Strikethrough~~: \`~~text~~\`
- ~Subscript~: \`~text~\`
- ^Superscript^: \`^text^\`

### Headings
All heading levels supported:
# H1 Heading
## H2 Heading
### H3 Heading
#### H4 Heading
##### H5 Heading
###### H6 Heading

### Links
[External links](https://example.com) and [relative links](./path)

### Blockquotes
> This is a blockquote
>
> It can span multiple lines
>> And support nesting

### GitHub-Style Alerts
> [!NOTE]
> This is a note alert

> [!TIP]
> This is a tip alert

> [!IMPORTANT]
> This is an important alert

> [!WARNING]
> This is a warning alert

> [!CAUTION]
> This is a caution alert

### Lists

#### Unordered Lists
- Item 1
- Item 2
  - Nested item
  - Another nested item
- Item 3

#### Ordered Lists (Multiple Styles)
1. Decimal numbering
2. Second item
3. Third item

a. Lowercase alpha
b. Second item
c. Third item

A. Uppercase alpha
B. Second item
C. Third item

i. Lowercase roman
ii. Second item
iii. Third item

I. Uppercase roman
II. Second item
III. Third item

#### Task Lists
- [ ] Uncompleted task
- [x] Completed task
- [ ] Another task
  - [ ] Nested subtask
  - [x] Completed subtask


### Code Blocks
\`\`\`javascript
function example() {
  console.log('Syntax highlighting supported');
  return 'Many languages available';
}
\`\`\`

\`\`\`python
def hello_world():
    print("Python syntax highlighting")
    return "Hello, World!"
\`\`\`

### Mermaid Diagrams
\`\`\`mermaid
graph TD
    A[Start] --> B{Decision?}
    B -->|Yes| C[Process]
    B -->|No| D[End]
    C --> E[Finish]
\`\`\`

### Mathematical Expressions

#### Inline Math
The famous equation $E = mc^2$ demonstrates mass-energy equivalence.

#### Block Math
$$
\\int_{a}^{b} f(x) \\, dx = F(b) - F(a)
$$

$$
\\sum_{i=1}^{n} x_i = x_1 + x_2 + \\dots + x_n
$$

### Complex Tables

#### Basic Tables
| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell A   | Cell B   | Cell C   |
| Cell D   | Cell E   | Cell F   |

#### Tables with Alignment
| Left | Center | Right |
|:-----|:------:|------:|
| A    |   B    |     C |
| D    |   E    |     F |

#### Complex Tables with Spans
| H1                        | H2  | H3  |
| ------------------------- | --- | --- |
| This cell spans 3 columns |||

| Header 1                  | Header 2 | Header 3 |
| ------------------------- | -------- | -------- |
| This cell spans 2 columns || Normal   |
| Normal                    | Normal   | Normal   |

#### Tables with Rowspan
| Header 1        | Header 2 |
| --------------- | -------- |
| This cell spans | Cell A   |
| two rows ^      | Cell B   |

#### Tables with Footer
| Header 1        | Header 2 |
| --------------- | -------- |
| Cell A          | Cell B   |
| --------------- | -------- |
| Footer          | Footer   |

### Footnotes
This is some text with a footnote reference.[^1]

[^1]: This is the footnote content that appears in a popover when clicked.

### Inline Citations
Use inline citations to reference sources: [smith2023].

Multiple citations: [ref1] [ref2] [ref3]

### Description Lists
: Term 1 : Definition 1
: **Term 2** : *Definition 2*
: Term 3 : Definition 3

`;
	const theme = useTheme();
</script>

<div
	class="sticky top-0 z-10 flex flex-col gap-2 border-b border-dashed border-border bg-background/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:flex-row md:items-center md:justify-between"
>
	<!-- Page title -->
	<div class="flex items-center gap-2">
		<h1 class="text-lg font-semibold text-foreground">Prompting Guide</h1>
	</div>

	<!-- Navigation links row -->
	<div class="flex items-center gap-2">
		<a
			class="inline-flex h-8 items-center justify-center rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50 sm:px-3"
			href="/"
		>
			<span class="hidden sm:inline">🏠 Back to Demo</span>
			<span class="sm:hidden">🏠 Home</span>
		</a>
	</div>
</div>

<div class="px-2 sm:px-4 md:px-6 lg:px-10">
	<div
		class="mx-auto mb-48 max-w-4xl border border-t-0 border-dashed border-border px-2 pt-6 sm:px-4 sm:pt-10 [&>h1]:mt-0"
	>
		<Streamdown
			sources={{
				smith2023: {
					title: 'Smith 2023',
					date: '2021-01-01',
					url: 'https://example.com/smith2023',
					content: 'Smith 2023 content'
				},
				jones2024: {
					title: 'Jones 2024',
					date: '2021-01-02',
					url: 'https://example.com/jones2024',
					content: 'Jones 2024 content'
				},
				ref1: {
					title: 'Reference 1',

					date: '2021-01-01',
					url: 'https://example.com/ref1',
					content: 'Reference 1 content'
				},
				ref2: {
					title: 'Reference 2',

					date: '2021-01-02',
					url: 'https://example.com/ref2',
					content: 'Reference 2 content'
				},
				ref3: {
					title: 'Reference 3',

					date: '2021-01-03',
					url: 'https://example.com/ref3',
					content: 'Reference 3 content'
				}
			}}
			baseTheme="shadcn"
			shikiTheme={theme.resolvedTheme === 'dark' ? 'github-dark' : 'github-light'}
			shikiPreloadThemes={['github-dark', 'github-light']}
			{content}
		></Streamdown>
	</div>
</div>

<!-- Floating GitHub Button -->
<div class="fixed right-6 bottom-6 z-50">
	<a
		class="inline-flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background shadow-lg transition-all hover:scale-110 hover:bg-muted focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none"
		href="https://github.com/beynar/svelte-streamdown"
		aria-label="View on GitHub"
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="size-6"
		>
			<path
				d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"
			/>
			<path d="M9 18c-4.51 2-5-2-7-2" />
		</svg>
	</a>
</div>
