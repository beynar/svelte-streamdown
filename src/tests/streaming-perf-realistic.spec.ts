/**
 * Realistic streaming benchmark — representative LLM chat answers streamed at
 * ~1 token/chunk (4 chars). Writes results to process.env.PERF_OUT so the same
 * run can be compared before/after the optimizations (via git stash).
 *
 *   PERF_OUT=/tmp/x.json npm run test:unit -- src/tests/streaming-perf-realistic.spec.ts --run
 */
import fs from 'node:fs';
import { describe, test, expect } from 'vitest';
import { simulateStream, warmup } from './_perf-harness.js';

const explainer = `## How JSON Web Tokens work

A **JSON Web Token** (JWT) is a compact, URL-safe way to represent claims between two
parties. It has three parts separated by dots: the *header*, the *payload*, and the
*signature*.

When a user logs in, the server signs a token with a secret key and returns it. On every
subsequent request the client sends it in the \`Authorization\` header, and the server
verifies the [signature](https://example.com/jwt) instead of hitting the database.

The main advantages are:

- **Stateless** — the server doesn't store sessions, so it scales horizontally.
- **Portable** — the same token works across services that share the key.
- **Self-describing** — the payload carries the user id, roles, and expiry.

Here's how you verify one in Node:

\`\`\`js
import jwt from 'jsonwebtoken';

function verify(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}
\`\`\`

One caveat: never put secrets in the payload — it's only base64-encoded, not encrypted.
`;

const steps = `Here's how to set up the project from scratch:

1. Create a new directory and run \`npm init -y\` to scaffold a **package.json**.
2. Install the core dependencies with \`npm install svelte vite\`.
3. Add a \`vite.config.js\` that wires up the [Svelte plugin](https://vitejs.dev).
4. Create a \`src/\` folder with an \`App.svelte\` entry component.
5. Add an \`index.html\` that mounts the app to a \`#app\` div.
6. Configure \`svelte.config.js\` with the **vitePreprocess** preprocessor.
7. Wire up a \`tsconfig.json\` extending \`@tsconfig/svelte\`.
8. Add npm scripts for \`dev\`, \`build\`, and \`preview\`.
9. Create a \`.gitignore\` that excludes \`node_modules\` and \`dist\`.
10. Run \`npm run dev\` and open the printed *localhost* URL.
11. Install [Tailwind](https://tailwindcss.com) with \`npm install tailwindcss\`.
12. Generate the config with \`npx tailwindcss init\` and add the content globs.
13. Import the Tailwind directives in your \`app.css\` entry file.
14. Add a component library such as **bits-ui** if you need primitives.
15. Commit the scaffold and push to your remote with \`git push -u origin main\`.

That's the full setup — from here you can start building features.
`;

const comparison = `When choosing a state management approach, the trade-offs matter:

| Approach        | Boilerplate | Type safety | Best for                    |
| --------------- | ----------- | ----------- | --------------------------- |
| Svelte stores   | Low         | Good        | Most apps, shared UI state  |
| Runes ($state)  | Very low    | Excellent   | Component-local reactivity  |
| External (Redux)| High        | Excellent   | Large teams, time-travel    |
| Context API     | Medium      | Good        | Dependency injection        |

In practice, **runes** cover the majority of cases now. Reach for stores when you need
to share state *across* components, and only pull in an external library when you have a
genuinely complex, cross-cutting state graph.

Key things to remember:

- Don't reach for a global store when a prop will do.
- Keep derived state \`$derived\` rather than syncing it manually.
- Co-locate state with the component that owns it.
`;

const math = `The quadratic formula solves any equation of the form $ax^2 + bx + c = 0$:

$$
x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
$$

The term under the root, $b^2 - 4ac$, is called the **discriminant**. Its sign tells you
how many real roots exist:

- If $b^2 - 4ac > 0$, there are two distinct real roots.
- If $b^2 - 4ac = 0$, there is exactly one (repeated) root.
- If $b^2 - 4ac < 0$, the roots are complex conjugates.

For example, $2x^2 + 3x - 2 = 0$ gives roots at $x = 0.5$ and $x = -2$.
`;

const research = `Recent work suggests transformer context windows can be extended well beyond their
training length [1]. The key insight is that positional encodings, not attention itself,
are the limiting factor [2]. Several groups have shown that interpolating the rotary
embeddings recovers most of the lost accuracy [3], and that a short fine-tune on long
sequences closes the remaining gap [1] [4].

This has practical consequences for retrieval-augmented generation: longer windows let
you pack more retrieved passages [2], though the model's *effective* use of the middle of
the context remains weaker than the edges [5].

[^1]: Chen et al., "Extending Context via Position Interpolation", 2023.
[^2]: Press et al., "Train Short, Test Long", 2022.
`;

const mixedLong = `# Building a streaming markdown renderer

Rendering markdown that arrives **token by token** is harder than it looks. The naive
approach — re-parse the whole string on every update — works but degrades badly as the
document grows. This post walks through the architecture we landed on.

## The core problem

When content streams in, you receive a *prefix* of the final document on every tick. A
parser that re-tokenizes the entire prefix each time does **O(N²)** total work over the
stream. For short answers this is invisible; for long ones it stalls the main thread.

## Splitting into blocks

The first optimization is to split the document into top-level blocks and only re-render
the block that changed:

1. Run a block-level pass to find the boundaries.
2. Key each block by index so the framework reuses DOM.
3. Only the *last* block re-tokenizes as new tokens arrive.

This alone removes most of the cost for prose, because each paragraph becomes a small,
independent unit.

## Handling incomplete syntax

While a token is mid-stream you'll see things like \`**bold\` with no closing marker, or a
\`[link\` with no URL yet. We repair these before tokenizing:

- Dangling emphasis (\`**\`, \`*\`, \`_\`, \`~~\`) gets a temporary closing marker.
- An unfinished \`[link](\` is completed with a placeholder href.
- Unclosed code fences get a closing \`\\\`\\\`\\\`\`.

> **Note:** the repair pass is cheap — it's a single line-oriented scan — so it runs on the
> live block every chunk without measurable cost.

## Highlighting code

Code blocks are highlighted lazily with Shiki. A quick comparison of the options:

| Highlighter | Bundle | Accuracy | Streaming-friendly |
| ----------- | ------ | -------- | ------------------ |
| Shiki       | Large  | Best     | Yes (incremental)  |
| Prism       | Small  | Good     | Partial            |
| hljs        | Medium | Good     | No                 |

## The result

After these changes, a typical answer parses in well under a frame budget, and even a long
technical document with many lists and tables stays responsive. The remaining work is to
*seal* completed blocks so the block-pass itself stops re-scanning them — the last source
of quadratic behavior.

For the math-inclined, the parse cost is roughly $O(B \\cdot k)$ where $B$ is the number of
live blocks and $k$ the chunk count, down from $O(N^2)$.
`;

const DOCS: Record<string, string> = { explainer, steps, comparison, math, research, mixedLong };

describe('realistic streaming', () => {
	test('stream representative LLM answers at ~1 token/chunk', { timeout: 600_000 }, () => {
		const results: any[] = [];
		for (const [name, doc] of Object.entries(DOCS)) {
			warmup(doc);
			const r = simulateStream(name, doc, 4);
			results.push({
				name,
				chars: r.docLen,
				chunks: r.chunks,
				total: +r.totalMs.toFixed(2),
				perChunk: +(r.totalMs / r.chunks).toFixed(4),
				parseBlocks: +r.parseBlocksMs.toFixed(2),
				lex: +r.lexMs.toFixed(2),
				incomplete: +r.incompleteMs.toFixed(2)
			});
		}
		const out = process.env.PERF_OUT;
		if (out) fs.writeFileSync(out, JSON.stringify(results, null, 2));
		console.log('REALISTIC_DONE ' + (out || '(no PERF_OUT)'));
		expect(results.length).toBe(Object.keys(DOCS).length);
	});
});
