import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
import type { Snippets } from './Streamdown.js';

export const theme = {
	a: {
		base: 'text-blue-600 font-medium underline'
	},
	h1: {
		base: 'mt-6 mb-2 text-3xl font-semibold'
	},
	h2: {
		base: 'mt-6 mb-2 text-2xl font-semibold'
	},
	h3: {
		base: 'mt-6 mb-2 text-xl font-semibold'
	},
	h4: {
		base: 'mt-6 mb-2 text-lg font-semibold'
	},
	h5: {
		base: 'mt-6 mb-2 text-base font-semibold'
	},
	h6: {
		base: 'mt-6 mb-2 text-sm font-semibold'
	},
	p: {
		base: ''
	},
	ul: {
		base: 'ml-4 list-outside list-disc whitespace-normal'
	},
	ol: {
		base: 'ml-4 list-outside list-decimal whitespace-normal'
	},
	li: {
		base: 'py-1'
	},
	code: {
		base: 'bg-gray-100 rounded px-1.5 py-0.5 font-mono text-sm',
		container: 'my-4 w-full overflow-hidden rounded-xl border border-gray-200 flex flex-col',
		header: 'flex items-center justify-between bg-gray-100/80 p-3 text-gray-600 text-xs',
		copyButton: 'cursor-pointer p-1 text-gray-600 transition-all hover:text-gray-900',
		downloadButton: 'cursor-pointer p-1 text-gray-600 transition-all hover:text-gray-900',
		language: 'ml-1 font-mono lowercase',
		skeleton: 'rounded-md font-mono text-transparent bg-gray-200'
	},
	inlineCode: {
		base: 'bg-gray-100 rounded px-1.5 py-0.5 font-mono text-sm'
	},
	img: {
		container: 'group relative my-4 inline-block',
		base: 'max-w-full rounded-lg',
		downloadButton:
			'absolute right-2 bottom-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-gray-200 bg-white/90 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-white opacity-0 group-hover:opacity-100'
	},
	pre: {
		base: 'overflow-x-auto font-mono text-xs p-4 bg-gray-100/40'
	},
	blockquote: {
		base: 'border-gray-600/30 text-gray-600 my-4 border-l-4 pl-4 italic'
	},
	alert: {
		base: ' relative my-4 border-l-4 p-4',
		title: 'text-sm font-semibold flex items-center gap-2 mb-2 capitalize',
		icon: 'size-5',
		note: '[&>[data-alert-title]]:text-blue-600 border-blue-600 stroke-blue-600',
		tip: '[&>[data-alert-title]]:text-green-600 border-green-600 stroke-green-600',
		warning: '[&>[data-alert-title]]:text-yellow-600 border-yellow-600 stroke-yellow-600',
		caution: '[&>[data-alert-title]]:text-red-600 border-red-600 stroke-red-600',
		important: '[&>[data-alert-title]]:text-purple-600 border-purple-600 stroke-purple-600'
	},
	table: {
		base: 'border-gray-200 w-full border-collapse border',
		container: 'my-4 flex flex-col space-y-2'
	},
	thead: {
		base: 'bg-gray-100/80'
	},
	tbody: {
		base: 'divide-gray-200 bg-gray-100/40 divide-y'
	},
	tr: {
		base: 'border-gray-200 border-b'
	},
	th: {
		base: 'px-4 py-2 text-left text-sm font-semibold whitespace-nowrap'
	},
	td: {
		base: 'px-4 py-2 text-sm'
	},
	sup: {
		base: 'text-sm'
	},
	sub: {
		base: 'text-sm'
	},
	hr: {
		base: 'border-gray-200 my-6'
	},
	strong: {
		base: 'font-semibold'
	},
	mermaid: {
		base: 'group relative my-4 h-auto rounded-xl border border-gray-200 p-4',
		downloadButton: 'cursor-pointer p-1 text-gray-600 transition-all hover:text-gray-900'
	},
	math: {
		base: ''
	},
	inlineMath: {
		base: ''
	},
	em: {
		base: 'font-italic'
	},
	ins: {
		base: 'underline'
	},
	del: {
		base: 'line-through'
	},
	small: {
		base: 'text-sm'
	}
} satisfies Record<keyof Snippets, any>;

export type Theme = typeof theme;
export const mergeTheme = (customTheme?: Partial<Theme>) => {
	if (!customTheme) return theme;
	const baseTheme = { ...theme };
	for (const key in customTheme) {
		for (const subKey in customTheme[key as keyof Theme]) {
			Object.assign(baseTheme[key as keyof Theme], {
				[subKey]: cn(baseTheme[key as keyof Theme], customTheme[key as keyof Theme])
			});
		}
	}
	return baseTheme;
};
