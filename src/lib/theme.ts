import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
import type { Snippets } from './Streamdown.js';

export const theme = {
	a: {
		base: 'text-blue-600 font-medium underline',
		blocked: 'text-gray-500'
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
		base: 'my-4 w-full overflow-hidden rounded-xl border border-gray-200 flex flex-col',
		container: ' relative overflow-visible bg-gray-100 rounded p-2 font-mono text-sm ',
		header: 'flex items-center justify-between bg-gray-100/80 p-2 pb-0	 text-gray-600 text-xs',
		button:
			'cursor-pointer size-6 p-1 text-gray-600 transition-all hover:text-gray-900 rounded hover:bg-gray-100',
		language: 'ml-1 font-mono lowercase',
		skeleton: 'rounded-md font-mono text-transparent bg-gray-200 whitespace-nowrap inline-block',
		pre: 'overflow-x-auto font-mono p-0 bg-gray-100/40'
	},
	inlineCode: {
		base: 'bg-gray-100 rounded px-1.5 py-0.5 font-mono text-sm'
	},
	img: {
		base: 'group relative my-4  mx-auto w-fit block',
		image: 'max-w-full rounded-lg',
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
		base: 'overflow-x-auto max-w-full my-4 border border-gray-200 rounded-lg',
		table: 'w-full border-collapse min-w-full'
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
		base: 'px-4 py-3 text-left text-sm font-semibold whitespace-nowrap min-w-[200px]'
	},
	td: {
		base: 'px-4 py-3 text-sm min-w-[200px] max-w-[400px] break-words'
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
		base: 'group relative my-4 h-auto rounded-xl border border-gray-200 bg-white overflow-hidden items-center min-h-[500px]',
		downloadButton: 'cursor-pointer p-1 text-gray-600 transition-all hover:text-gray-900',
		button:
			'cursor-pointer size-6 p-1 text-gray-600 transition-all hover:text-gray-900 rounded hover:bg-gray-100',
		icon: 'size-5',
		buttons: 'absolute right-1 top-1 z-10 flex h-fit w-fit items-center gap-1'
	},
	math: {
		base: ''
	},
	inlineMath: {
		base: ''
	},
	em: {
		base: 'italic'
	},
	del: {
		base: 'line-through'
	}
} satisfies Record<keyof Snippets, any>;

export const shadcnTheme = {
	a: {
		base: 'text-primary font-medium underline hover:text-primary/80',
		blocked: 'text-muted-foreground'
	},
	h1: {
		base: 'mt-6 mb-2 text-3xl font-semibold text-foreground'
	},
	h2: {
		base: 'mt-6 mb-2 text-2xl font-semibold text-foreground'
	},
	h3: {
		base: 'mt-6 mb-2 text-xl font-semibold text-foreground'
	},
	h4: {
		base: 'mt-6 mb-2 text-lg font-semibold text-foreground'
	},
	h5: {
		base: 'mt-6 mb-2 text-base font-semibold text-foreground'
	},
	h6: {
		base: 'mt-6 mb-2 text-sm font-semibold text-foreground'
	},
	p: {
		base: 'text-foreground'
	},
	ul: {
		base: 'ml-4 list-outside list-disc whitespace-normal text-foreground'
	},
	ol: {
		base: 'ml-4 list-outside list-decimal whitespace-normal text-foreground'
	},
	li: {
		base: 'py-1'
	},
	code: {
		base: 'my-4 w-full overflow-hidden rounded-lg border border-border flex flex-col',
		container: 'relative overflow-visible bg-muted rounded p-2 font-mono text-sm',
		header: 'flex items-center justify-between bg-muted/80 p-2 pb-0 text-muted-foreground text-xs',
		button:
			'cursor-pointer size-6 p-1 text-muted-foreground transition-all hover:text-foreground rounded hover:bg-muted',
		language: 'ml-1 font-mono lowercase',
		skeleton: 'rounded-md font-mono text-transparent bg-muted whitespace-nowrap inline-block',
		pre: 'overflow-x-auto font-mono p-0 bg-muted/40'
	},
	inlineCode: {
		base: 'bg-muted rounded px-1.5 py-0.5 font-mono text-sm text-foreground'
	},
	img: {
		base: 'group relative my-4 mx-auto w-fit block',
		image: 'max-w-full rounded-lg',
		downloadButton:
			'absolute right-2 bottom-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-border bg-background/90 shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-background opacity-0 group-hover:opacity-100'
	},
	pre: {
		base: 'overflow-x-auto font-mono text-xs p-4 bg-muted/40'
	},
	blockquote: {
		base: 'border-muted-foreground/30 text-muted-foreground my-4 border-l-4 pl-4 italic'
	},
	alert: {
		base: 'relative my-4 border-l-4 p-4 bg-card',
		title: 'text-sm font-semibold flex items-center gap-2 mb-2 capitalize',
		icon: 'size-5',
		note: '[&>[data-alert-title]]:text-blue-600 border-blue-600 stroke-blue-600',
		tip: '[&>[data-alert-title]]:text-green-600 border-green-600 stroke-green-600',
		warning: '[&>[data-alert-title]]:text-yellow-600 border-yellow-600 stroke-yellow-600',
		caution: '[&>[data-alert-title]]:text-destructive border-destructive stroke-destructive',
		important: '[&>[data-alert-title]]:text-purple-600 border-purple-600 stroke-purple-600'
	},
	table: {
		base: 'overflow-x-auto max-w-full my-4 rounded-lg border border-border',
		table: 'w-full border-collapse min-w-full'
	},
	thead: {
		base: 'bg-muted/50'
	},
	tbody: {
		base: 'divide-border bg-card divide-y'
	},
	tr: {
		base: 'border-border border-b hover:bg-muted/50 transition-colors'
	},
	th: {
		base: 'px-4 py-3 text-left text-sm font-semibold whitespace-nowrap text-foreground min-w-[200px]'
	},
	td: {
		base: 'px-4 py-3 text-sm text-foreground min-w-[200px] max-w-[400px] break-words'
	},
	sup: {
		base: 'text-sm'
	},
	sub: {
		base: 'text-sm'
	},
	hr: {
		base: 'border-border my-6'
	},
	strong: {
		base: 'font-semibold text-foreground'
	},
	mermaid: {
		base: 'group relative my-4 h-auto rounded-lg border border-border bg-card overflow-hidden items-center min-h-[500px]',
		downloadButton: 'cursor-pointer p-1 text-muted-foreground transition-all hover:text-foreground',
		button:
			'cursor-pointer size-6 p-1 text-muted-foreground transition-all hover:text-foreground rounded hover:bg-muted',
		icon: 'size-5',
		buttons: 'absolute right-1 top-1 z-10 flex h-fit w-fit items-center gap-1'
	},
	math: {
		base: 'text-foreground'
	},
	inlineMath: {
		base: 'text-foreground'
	},
	em: {
		base: 'italic text-foreground'
	},
	del: {
		base: 'line-through text-muted-foreground'
	}
} satisfies Theme;

export type Theme = typeof theme;
export const mergeTheme = (customTheme?: Partial<Theme>, baseTheme?: 'tailwind' | 'shadcn') => {
	const base = baseTheme === 'shadcn' ? shadcnTheme : theme;
	if (!customTheme) return base;
	const mergedTheme = { ...base };
	for (const key in customTheme) {
		for (const subKey in customTheme[key as keyof Theme]) {
			Object.assign(mergedTheme[key as keyof Theme], {
				[subKey]: cn(mergedTheme[key as keyof Theme], customTheme[key as keyof Theme])
			});
		}
	}
	return mergedTheme;
};
