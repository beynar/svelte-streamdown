import type { Extension } from './index.js';
import type { Tokenizer, Token } from 'marked';
import { Lexer } from 'marked';

export type MdxToken = {
	type: 'mdx';
	raw: string;
	tagName: string;
	attributes: Record<string, any>;
	selfClosing: boolean;
	tokens?: Token[];
	text?: string;
};

/**
 * The tag vocabulary the mdx tokenizer and the streaming completer share,
 * compiled once per allowlist (upstream fb9f97c/b392fbe). PascalCase is always
 * in it; lowercase/hyphenated names only ever come from `customTags` /
 * `mdxComponents`, so this can never swallow a real HTML tag the way a blanket
 * `/^<([a-zA-Z][\w-]*)/` would.
 */
export type TagMatchers = {
	/** `<Tag …/>` */
	selfClosing: RegExp;
	/** `<Tag …>` */
	openTag: RegExp;
	/** `</Tag>` */
	closeTag: RegExp;
	/** `<Tag …>…</Tag>`, both ends on one line */
	complete: RegExp;
	/** a bare allowed tag name, anchored */
	name: RegExp;
	/** the non-PascalCase names, kept as strings so a half-typed one can be prefix-matched */
	names: string[];
	/** tags whose children are emitted as one literal text token */
	literal: Set<string>;
};

const escapeName = (name: string) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Attribute names take hyphens (`data-id`), not just word characters.
const ATTRS = '((?:\\s+[\\w-]+=(?:"[^"]*"|{[^}]*}))*)';

export const compileTags = (customTags?: string[], literalTagContent?: string[]): TagMatchers => {
	// A tag whose content is literal is a custom tag by definition: listing it
	// once in `literalTagContent` must be enough, without repeating it in
	// `customTags`.
	const allowed = [...new Set([...(customTags ?? []), ...(literalTagContent ?? [])])];
	const names = ['[A-Z][a-zA-Z0-9]*', ...allowed.map(escapeName)].join('|');
	const tag = `(${names})`;
	return {
		selfClosing: new RegExp(`^<${tag}${ATTRS}\\s*/>`),
		openTag: new RegExp(`^<${tag}${ATTRS}\\s*>`),
		closeTag: new RegExp(`^</${tag}>`),
		complete: new RegExp(`^<${tag}${ATTRS}\\s*>.*?</\\1>`),
		name: new RegExp(`^(?:${names})$`),
		names: allowed,
		literal: new Set(literalTagContent ?? [])
	};
};

/** PascalCase only — what every call that passes no allowlist gets. */
export const DEFAULT_TAGS = compileTags();

const defaultLexer = new Lexer({ gfm: true });
const defaultTokenizer = defaultLexer.options.tokenizer!;

/**
 * Parse attributes from MDX component tag
 * Supports: attribute="string", attribute={number}, attribute={boolean}, attribute={expression}
 */
function parseAttributes(attributeString: string): Record<string, any> {
	const attributes: Record<string, any> = {};

	// Pattern: attr="value" or attr={value}
	const attrPattern = /([\w-]+)=(?:"([^"]*)"|{([^}]*)})/g;
	let match;

	while ((match = attrPattern.exec(attributeString)) !== null) {
		const [, name, stringValue, expressionValue] = match;

		if (stringValue !== undefined) {
			// String attribute: attr="value"
			attributes[name] = stringValue;
		} else if (expressionValue !== undefined) {
			// Expression attribute: attr={value}
			const trimmed = expressionValue.trim();

			// Try to parse as number
			if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
				attributes[name] = parseFloat(trimmed);
			}
			// Parse boolean
			else if (trimmed === 'true') {
				attributes[name] = true;
			} else if (trimmed === 'false') {
				attributes[name] = false;
			}
			// Otherwise keep as string (could be variable reference, etc.)
			else {
				attributes[name] = trimmed;
			}
		}
	}

	return attributes;
}

export const markedMdx = (tags: TagMatchers = DEFAULT_TAGS): Extension => ({
	name: 'mdx',
	level: 'block',
	applyInBlockParsing: true,
	tokenizer(this, src) {
		// Match a tag from the allowlist (PascalCase plus anything `customTags` /
		// `mdxComponents` added).
		// Self-closing: <Component attr="value" />
		// With children: <Component attr="value">content</Component>

		// First try self-closing tag
		const selfClosingMatch = src.match(tags.selfClosing);

		if (selfClosingMatch) {
			const [raw, tagName, attributeString] = selfClosingMatch;
			const attributes = parseAttributes(attributeString);

			return {
				type: 'mdx',
				raw,
				tagName,
				attributes,
				selfClosing: true
			};
		}

		// Try paired tag with children
		const openTagMatch = src.match(tags.openTag);

		if (openTagMatch) {
			const [openTag, tagName, attributeString] = openTagMatch;
			const attributes = parseAttributes(attributeString);

			// Find matching closing tag with nesting support
			const closingTag = `</${tagName}>`;

			// Escape special regex characters in tagName to prevent ReDoS
			const escapedTagName = tagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			const openTagPattern = new RegExp(`<${escapedTagName}(?:\\s|>)`, 'g');
			const closeTagPattern = new RegExp(`</${escapedTagName}>`, 'g');

			let depth = 1;
			let searchPos = openTag.length;
			let closingIndex = -1;

			while (depth > 0 && searchPos < src.length) {
				openTagPattern.lastIndex = searchPos;
				closeTagPattern.lastIndex = searchPos;

				const nextOpen = openTagPattern.exec(src);
				const nextClose = closeTagPattern.exec(src);

				if (!nextClose) break;

				if (nextOpen && nextOpen.index < nextClose.index) {
					// Verify this is not a self-closing tag by finding the full tag and checking for />
					const tagStart = nextOpen.index;
					const tagEndPos = src.indexOf('>', tagStart);

					if (tagEndPos !== -1) {
						const fullTag = src.substring(tagStart, tagEndPos + 1);
						const isSelfClosing = fullTag.trimEnd().endsWith('/>');

						if (!isSelfClosing) {
							depth++;
						}
					}
					searchPos = openTagPattern.lastIndex;
				} else {
					depth--;
					if (depth === 0) {
						closingIndex = nextClose.index;
					}
					searchPos = closeTagPattern.lastIndex;
				}
			}

			if (closingIndex !== -1) {
				// Extract content between tags
				const contentStart = openTag.length;
				const content = src.substring(contentStart, closingIndex);
				const raw = src.substring(0, closingIndex + closingTag.length);

				// Parse children as markdown — unless the tag is in `literalTagContent`,
				// where the inner text is data, not Markdown (upstream b392fbe): one
				// text token, nothing escaped, `**` and `_` left alone.
				const tokens = tags.literal.has(tagName)
					? [{ type: 'text', raw: content, text: content } as Token]
					: content.trim()
						? this.lexer.blockTokens(content.trim(), [])
						: [];

				return {
					type: 'mdx',
					raw,
					tagName,
					attributes,
					selfClosing: false,
					tokens,
					text: content
				};
			}
		}

		return undefined;
	}
});
