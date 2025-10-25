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

const defaultLexer = new Lexer({ gfm: true });
const defaultTokenizer = defaultLexer.options.tokenizer!;

/**
 * Parse attributes from MDX component tag
 * Supports: attribute="string", attribute={number}, attribute={boolean}, attribute={expression}
 */
function parseAttributes(attributeString: string): Record<string, any> {
	const attributes: Record<string, any> = {};

	// Pattern: attr="value" or attr={value}
	const attrPattern = /(\w+)=(?:"([^"]*)"|{([^}]*)})/g;
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

export const markedMdx: Extension = {
	name: 'mdx',
	level: 'block',
	applyInBlockParsing: true,
	tokenizer(this, src) {
		// Match MDX component tags (must start with capital letter)
		// Self-closing: <Component attr="value" />
		// With children: <Component attr="value">content</Component>

		// First try self-closing tag
		const selfClosingMatch = src.match(
			/^<([A-Z][a-zA-Z0-9]*)((?:\s+\w+=(?:"[^"]*"|{[^}]*}))*)\s*\/>/
		);

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
		const openTagMatch = src.match(/^<([A-Z][a-zA-Z0-9]*)((?:\s+\w+=(?:"[^"]*"|{[^}]*}))*)\s*>/);

		if (openTagMatch) {
			const [openTag, tagName, attributeString] = openTagMatch;
			const attributes = parseAttributes(attributeString);

			// Find matching closing tag with nesting support
			const closingTag = `</${tagName}>`;
			const openTagPattern = new RegExp(`<${tagName}(?:\\s|>)`, 'g');
			const closeTagPattern = new RegExp(`</${tagName}>`, 'g');

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
					depth++;
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

				// Parse children as markdown
				const tokens = content.trim() ? this.lexer.blockTokens(content.trim(), []) : [];

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
};
