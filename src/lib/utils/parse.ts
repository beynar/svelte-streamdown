import type { StreamdownContext } from '$lib/Streamdown.svelte';
import type { Element, Nodes, Parents, Root } from 'hast';
import type { AllowElement, UrlTransform } from '$lib/Streamdown.js';
import { urlAttributes } from 'html-url-attributes';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified, type PluggableList } from 'unified';
import { visit } from 'unist-util-visit';
import { VFile } from 'vfile';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import type { BundledLanguage } from 'shiki';
import { rehypeGithubAlerts } from './alerts.js';

const emptyPlugins: PluggableList = [];
const emptyRemarkRehypeOptions = { allowDangerousHtml: true };
const safeProtocol = /^(https?|ircs?|mailto|xmpp)$/i;

/**
 * Configuration options
 */
interface ParseOptions {
	allowElement?: AllowElement | null;
	allowedElements?: readonly string[] | null;
	children?: string;
	disallowedElements?: readonly string[] | null;
	skipHtml?: boolean;
	unwrapDisallowed?: boolean;
	urlTransform?: UrlTransform | null;
}

function createFile(content: string): VFile {
	const file = new VFile();

	if (typeof content === 'string') {
		file.value = content;
	} else {
		throw new Error('Unexpected value `' + content + '` for content, expected `string`');
	}

	return file;
}

export function parseMarkdown(context: StreamdownContext, content: string): Root {
	const rehypePlugins = context.rehypePlugins || emptyPlugins;
	const remarkPlugins = context.remarkPlugins || emptyPlugins;
	const remarkRehypeOptions = context.remarkRehypeOptions
		? { ...context.remarkRehypeOptions, ...emptyRemarkRehypeOptions }
		: emptyRemarkRehypeOptions;

	const processor = unified()
		.use(remarkParse)
		.use(remarkPlugins)

		.use(remarkMath)
		.use(remarkGfm)
		.use(remarkRehype, remarkRehypeOptions)
		.use(rehypePlugins)
		.use([rehypeGithubAlerts]);

	const file = createFile(content);
	const tree = processor.parse(file);

	return post(processor.runSync(tree, file), {
		allowElement: context.allowElement,
		allowedElements: context.allowedElements,
		disallowedElements: context.disallowedElements,
		skipHtml: context.skipHtml,
		unwrapDisallowed: context.unwrapDisallowed,
		urlTransform: context.urlTransform
	});
}

/**
 * Process the HAST tree with filtering and transformations
 */
function post(tree: Nodes, options: ParseOptions): Root {
	const allowedElements = options.allowedElements;
	const allowElement = options.allowElement;
	const disallowedElements = options.disallowedElements;
	const skipHtml = options.skipHtml;
	const unwrapDisallowed = options.unwrapDisallowed;
	const urlTransform = options.urlTransform || defaultUrlTransform;

	if (allowedElements && disallowedElements) {
		throw new Error(
			'Unexpected combined `allowedElements` and `disallowedElements`, expected one or the other'
		);
	}

	visit(tree, transform);

	return tree as Root;

	/** @type {import('unist-util-visit').BuildVisitor<Root>} */
	function transform(node: Nodes, index: number | undefined, parent: Parents | undefined) {
		if (node.type === 'raw' && parent && typeof index === 'number') {
			if (skipHtml) {
				parent.children.splice(index, 1);
			} else {
				parent.children[index] = { type: 'text', value: node.value };
			}
			return index;
		}

		if (node.type === 'element') {
			const element = node as Element;

			// Transform URLs
			for (const key in urlAttributes) {
				if (Object.hasOwn(urlAttributes, key) && Object.hasOwn(element.properties, key)) {
					const value = element.properties[key];
					const test = urlAttributes[key];
					if (test === null || test.includes(element.tagName)) {
						element.properties[key] = urlTransform(String(value || ''), key, element);
					}
				}
			}

			if (node.tagName === 'code') {
				const LANGUAGE_REGEX = /language-([^\s]+)/;
				const className = node.properties.className;

				const match = (Array.isArray(className) ? className : [className])?.reduce((acc, c) => {
					const match = String(c).match(LANGUAGE_REGEX);
					const lang = match?.[1];

					if (lang) {
						acc = lang;
					}
					return acc;
				}, '');
				const language = (match ?? 'plaintext') as BundledLanguage;
				node.properties.language = language;
			}
		}

		if (node.type === 'element') {
			const element = node as Element;
			let remove = allowedElements
				? !allowedElements.includes(element.tagName)
				: disallowedElements
					? disallowedElements.includes(element.tagName)
					: false;

			if (!remove && allowElement && typeof index === 'number') {
				remove = !allowElement(element, index, parent);
			}

			if (remove && parent && typeof index === 'number') {
				if (unwrapDisallowed && element.children) {
					parent.children.splice(index, 1, ...element.children);
				} else {
					parent.children.splice(index, 1);
				}
				return index;
			}
		}
	}
}

/**
 * Make a URL safe (GitHub-style)
 */
function defaultUrlTransform(value: string): string {
	const colon = value.indexOf(':');
	const questionMark = value.indexOf('?');
	const numberSign = value.indexOf('#');
	const slash = value.indexOf('/');

	if (
		// If there is no protocol, it's relative
		colon === -1 ||
		// If the first colon is after a `?`, `#`, or `/`, it's not a protocol
		(slash !== -1 && colon > slash) ||
		(questionMark !== -1 && colon > questionMark) ||
		(numberSign !== -1 && colon > numberSign) ||
		// It is a protocol, it should be allowed
		safeProtocol.test(value.slice(0, colon))
	) {
		return value;
	}

	return '';
}
