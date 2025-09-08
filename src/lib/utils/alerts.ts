import { SKIP, visit } from 'unist-util-visit';
import { isElement } from 'hast-util-is-element';
import type { Root, Element, ElementContent, Parent, Text } from 'hast';

export interface IAlert {
	keyword: string;
	icon: string;
}

export type DefaultBuildType = (
	alertOptions: IAlert,
	originalChildren: ElementContent[]
) => ElementContent | null;

export interface IOptions {
	alerts: IAlert[];
	supportLegacy?: boolean;
	build?: DefaultBuildType;
}

let internalOptions: IOptions;

export const rehypeGithubAlerts = (options: IOptions) => {
	const defaultOptions: IOptions = {
		supportLegacy: false,
		alerts: [
			{
				keyword: 'NOTE',
				icon: '<path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"/>'
			},
			{
				keyword: 'IMPORTANT',
				icon: '<path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v9.5A1.75 1.75 0 0 1 14.25 13H8.06l-2.573 2.573A1.458 1.458 0 0 1 3 14.543V13H1.75A1.75 1.75 0 0 1 0 11.25Zm1.75-.25a.25.25 0 0 0-.25.25v9.5c0 .138.112.25.25.25h2a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.749.749 0 0 1 .53-.22h6.5a.25.25 0 0 0 .25-.25v-9.5a.25.25 0 0 0-.25-.25Zm7 2.25v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 9a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"/>'
			},
			{
				keyword: 'WARNING',
				icon: '<path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"/>'
			},
			{
				keyword: 'TIP',
				icon: '<path d="M8 1.5c-2.363 0-4 1.69-4 3.75 0 .984.424 1.625.984 2.304l.214.253c.223.264.47.556.673.848.284.411.537.896.621 1.49a.75.75 0 0 1-1.484.211c-.04-.282-.163-.547-.37-.847a8.456 8.456 0 0 0-.542-.68c-.084-.1-.173-.205-.268-.32C3.201 7.75 2.5 6.766 2.5 5.25 2.5 2.31 4.863 0 8 0s5.5 2.31 5.5 5.25c0 1.516-.701 2.5-1.328 3.259-.095.115-.184.22-.268.319-.207.245-.383.453-.541.681-.208.3-.33.565-.37.847a.751.751 0 0 1-1.485-.212c.084-.593.337-1.078.621-1.489.203-.292.45-.584.673-.848.075-.088.147-.173.213-.253.561-.679.985-1.32.985-2.304 0-2.06-1.637-3.75-4-3.75ZM5.75 12h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1 0-1.5ZM6 15.25a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75Z"/>'
			},
			{
				keyword: 'CAUTION',
				icon: '<path d="M4.47.22A.749.749 0 0 1 5 0h6c.199 0 .389.079.53.22l4.25 4.25c.141.14.22.331.22.53v6a.749.749 0 0 1-.22.53l-4.25 4.25A.749.749 0 0 1 11 16H5a.749.749 0 0 1-.53-.22L.22 11.53A.749.749 0 0 1 0 11V5c0-.199.079-.389.22-.53Zm.84 1.28L1.5 5.31v5.38l3.81 3.81h5.38l3.81-3.81V5.31L10.69 1.5ZM8 4a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"/>'
			}
		]
	};

	internalOptions = Object.assign({}, defaultOptions, options);

	return (tree: Root) => {
		visit(tree, 'element', (node, index, parent) => {
			create(node, index, parent);
		});
	};
};

const create = (node: Element, index: number | undefined, parent: Parent | undefined) => {
	// check if main element is a blockquote
	if (node.tagName !== 'blockquote') {
		return [SKIP];
	}

	// make sure the blockquote is not empty
	if (node.children.length < 1) {
		return [SKIP];
	}

	// find the first paragraph inside of the blockquote
	const firstParagraph = node.children.find((child) => {
		return child.type === 'element' && child.tagName === 'p';
	});

	// typescript type guard
	// make sure the first paragraph is a valid element
	if (!isElement(firstParagraph)) {
		return [SKIP];
	}

	// try to find the alert type
	const headerData = extractHeaderData(firstParagraph);

	// typescript type guard
	if (headerData === null) {
		return [SKIP];
	}

	// if the first line contains more than the type
	// drop out of rendering as alert, this is what
	// GitHub does (as of Mar. 2024)
	if (headerData.rest.trim() !== '') {
		if (!headerData.rest.startsWith('\n') && !headerData.rest.startsWith('\r')) {
			return [SKIP];
		}
	}

	// try to find options matching the alert keyword
	const alertOptions = getAlertOptions(headerData.alertType);

	if (alertOptions === null) {
		return [SKIP];
	}

	// make sure we have parent element and an index
	// or we won't be able to replace the blockquote
	// with the new alert element
	if (!parent || typeof index !== 'number') {
		return [SKIP];
	}

	// use a build to convert the blockquote into an alert
	const build = internalOptions.build ?? defaultBuild;

	const alertBodyChildren: ElementContent[] = [];

	// for alerts the blockquote first element is always
	// a paragraph but it can have more children than just
	// the alert type text node
	const remainingFirstParagraphChildren = firstParagraph.children.slice(
		1,
		firstParagraph.children.length
	);

	const newFirstParagraphChildren: ElementContent[] = [];

	// remove the first line break from rest if there is one
	const rest = headerData.rest.replace(/^(\r\n|\r|\n)/, '');

	// if the rest is empty and the first paragraph has no children
	// this is a special github case (as of Mar. 2024)
	// where the alert is only the type (no alert body)
	// in this case github keeps the original blockquote
	if (rest === '' && remainingFirstParagraphChildren.length === 0 && node.children.length < 4) {
		return [SKIP];
	}

	if (remainingFirstParagraphChildren.length > 0) {
		// if the alert type has a hard line break we remove it
		// to not start the alert with a blank line
		// meaning we start the slice at 2 to not take
		// the br element and new line text nodes
		if (
			remainingFirstParagraphChildren[0].type === 'element' &&
			remainingFirstParagraphChildren[0].tagName === 'br'
		) {
			const remainingChildrenWithoutLineBreak = remainingFirstParagraphChildren.slice(
				2,
				firstParagraph.children.length
			);
			newFirstParagraphChildren.push(...remainingChildrenWithoutLineBreak);
		} else {
			// if the first line of the blockquote has no hard line break
			// after the alert type but some text, then both the type
			// and the text will be in a single text node
			// headerData rest contains the remaining text without the alert type
			if (rest !== '') {
				const restAsTextNode: Text = {
					type: 'text',
					value: rest
				};
				remainingFirstParagraphChildren.unshift(restAsTextNode);
			}
			// if no hard line break (br) take all the remaining
			// and add them to new paragraph to mimic the initial structure
			newFirstParagraphChildren.push(...remainingFirstParagraphChildren);
		}
	} else {
		if (rest !== '') {
			const restAsTextNode: Text = {
				type: 'text',
				value: rest
			};
			newFirstParagraphChildren.push(restAsTextNode);
		}
	}

	if (newFirstParagraphChildren.length > 0) {
		const paragraphElement: Element = {
			type: 'element',
			tagName: 'p',
			properties: {},
			children: newFirstParagraphChildren
		};
		alertBodyChildren.push(paragraphElement);
	}

	// outside of the first paragraph there may also be children
	// we add them too back into the alert body
	if (node.children.length > 2) {
		alertBodyChildren.push(...node.children.slice(2, node.children.length));
	}

	const alertElement = build(alertOptions, alertBodyChildren);

	// replace the original blockquote with the
	// new alert element and its children
	if (alertElement !== null) {
		parent.children[index] = alertElement;
	}

	return [SKIP];
};

export const defaultBuild: DefaultBuildType = (alertOptions, originalChildren) => {
	// Filter out any title paragraphs that might contain icons or titles
	const filteredChildren = originalChildren.filter((child) => {
		if (child.type === 'element' && child.tagName === 'p') {
			const className = child.properties?.className as string[] | undefined;
			// Remove paragraphs with markdown-alert-title class
			if (className?.includes('markdown-alert-title')) {
				return false;
			}
		}
		return true;
	});

	const alert: ElementContent = {
		type: 'element',
		tagName: 'alert',
		properties: {
			className: ['markdown-alert', `markdown-alert-${alertOptions.keyword.toLowerCase()}`],
			icon: alertOptions.icon
		},
		children: filteredChildren
	};

	return alert;
};

const extractHeaderData = (paragraph: Element): { alertType: string; rest: string } | null => {
	const header = paragraph.children[0];
	let alertType: string | undefined;
	let rest = '';

	if (internalOptions.supportLegacy) {
		if (header.type === 'element' && header.tagName === 'strong') {
			if (header.children[0].type === 'text') {
				alertType = header.children[0].value;
			}
		}
	}

	if (header.type === 'text') {
		const match = /\[!(.*?)\]/.exec(header.value);

		if (!match?.input) {
			return null;
		}

		if (match.input.length > match[0].length) {
			// if in markdown there are no two spaces at the end
			// then in html there will be no line break
			// this means in the first line there will be more
			// content than just the alert type
			rest = match.input.replace(match[0], '');
		}

		alertType = match[1];
	}

	if (typeof alertType === 'undefined') {
		return null;
	}

	return { alertType, rest };
};

const getAlertOptions = (alertType: string): IAlert | null => {
	const alertOptions = internalOptions.alerts.find((alert) => {
		return alertType.toUpperCase() === alert.keyword.toUpperCase();
	});

	return alertOptions ?? null;
};
