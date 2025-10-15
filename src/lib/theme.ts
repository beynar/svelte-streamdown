import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
import type { Snippets } from './context.svelte.js';

export const theme = {
	link: {
		base: 'text-blue-600 font-medium underline wrap-anywhere hover:text-blue-600/80',
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
	paragraph: {
		base: ''
	},
	ul: {
		base: 'ml-4 list-inside list-disc whitespace-normal'
	},
	ol: {
		base: 'ml-4 list-inside whitespace-normal'
	},
	li: {
		base: 'py-1 marker:hidden',
		checkbox: ' mr-2'
	},
	code: {
		base: 'my-4 w-full overflow-hidden rounded-xl border border-gray-200 flex flex-col',
		container: ' relative overflow-visible bg-gray-100 p-2 font-mono text-sm ',
		header: 'flex items-center justify-between bg-gray-100/80 p-2	 text-gray-600 text-xs',
		buttons: 'flex items-center gap-2',
		language: 'ml-1 font-mono lowercase',
		skeleton:
			'block rounded-md font-mono text-transparent bg-gray-200 scale-y-90 animate-pulse whitespace-nowrap',
		pre: 'overflow-x-auto font-mono p-0 bg-gray-100/40',
		line: 'block'
	},
	codespan: {
		base: 'bg-gray-100 rounded px-1.5 py-0.5 font-mono text-[0.9em]'
	},
	image: {
		base: 'group relative my-4  mx-auto w-fit block',
		image: 'max-w-full rounded-lg'
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
		base: 'bg-gray-200/80'
	},
	tbody: {
		base: ''
	},
	tfoot: {
		base: 'bg-gray-100/50 border-t border-gray-300'
	},
	tr: {
		base: 'border-gray-200 border-b hover:bg-gray-100/50 transition-colors'
	},
	td: {
		base: 'px-4 py-3 text-sm min-w-[200px] max-w-[400px] break-words'
	},
	th: {
		base: 'px-4 py-3 text-sm text-foreground min-w-[200px] max-w-[400px] break-words'
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
		icon: 'size-5',
		buttons: 'absolute right-1 top-1 z-10 flex h-fit w-fit items-center gap-1'
	},
	math: {
		block: '',
		inline: ''
	},
	br: {
		base: ''
	},
	em: {
		base: 'italic'
	},
	del: {
		base: 'text-gray-600'
	},
	footnoteRef: {
		base: 'text-gray-600 px-1 py-0.5 rounded-md bg-gray-100/80'
	},
	descriptionList: {
		base: 'my-4 space-y-2'
	},
	descriptionTerm: {
		base: 'font-semibold text-gray-900 border-l-2 border-gray-200 pl-4'
	},
	descriptionDetail: {
		base: 'text-gray-700 ml-4 leading-relaxed'
	},
	inlineCitation: {
		preview:
			'text-sm text-muted-foreground bg-muted rounded-md px-2 py-0.5 cursor-pointer inline-flex border border-border hover:bg-muted/50 outline-none focus:ring-1 focus:ring-primary',

		carousel: {
			header: 'flex items-center justify-between',
			stepCounter: 'h-fit text-xs font-semibold text-muted-foreground tabular-nums',
			buttons: 'flex w-fit items-center justify-end gap-2',
			title: 'mb-2 line-clamp-2 font-semibold',
			url: 'flex items-center gap-2 text-sm text-muted-foreground',
			favicon: 'h-4 w-4 rounded'
		},
		list: {
			base: 'grid gap-2',
			item: 'grid gap-1 hover:bg-muted rounded-md p-2',
			title: 'line-clamp-1 font-semibold text-sm',
			url: 'flex items-center gap-2 text-xs text-muted-foreground',
			favicon: 'h-3 w-3 rounded'
		}
	},

	components: {
		button:
			'disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer p-1 text-gray-600 transition-all hover:text-gray-900 rounded hover:bg-gray-100 w-6 h-6',
		popover:
			'min-w-[250px] max-w-md  fixed z-[1000] max-h-[30vh] max-w-3xl overflow-y-auto rounded-lg bg-white p-4 shadow'
	}
} satisfies Record<
	| keyof Omit<
			Snippets,
			| 'description'
			| 'heading'
			| 'footnotePopover'
			| 'inlineCitationContent'
			| 'inlineCitationPreview'
			| 'inlineCitationPopover'
	  >
	| 'h1'
	| 'h2'
	| 'h3'
	| 'h4'
	| 'h5'
	| 'h6'
	| 'components',
	any
>;

export const shadcnTheme = {
	link: {
		base: 'text-primary wrap-anywhere  font-medium underline hover:text-primary/80',
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
	paragraph: {
		base: 'text-foreground'
	},
	ul: {
		base: 'ml-4 list-inside list-disc whitespace-normal text-foreground'
	},
	ol: {
		base: 'ml-4 list-inside whitespace-normal text-foreground'
	},
	li: {
		base: 'py-1',
		checkbox: ' mr-2'
	},
	code: {
		base: 'my-4 w-full overflow-hidden rounded-lg border border-border flex flex-col',
		container: 'relative overflow-visible bg-muted p-2 font-mono text-sm',
		header: 'flex items-center justify-between bg-muted/80 px-2 py-1 text-muted-foreground text-xs',
		buttons: 'flex items-center gap-2',

		language: 'ml-1 font-mono lowercase',
		skeleton:
			'block rounded-md font-mono text-transparent bg-border/80 scale-y-90 w-fit animate-pulse whitespace-nowrap',
		pre: 'overflow-x-auto font-mono p-0 bg-muted/40',
		line: 'block '
	},
	codespan: {
		base: 'bg-muted rounded px-1.5 py-0.5 font-mono text-foreground text-[0.9em]'
	},
	image: {
		base: 'group relative my-4 mx-auto w-fit block',
		image: 'max-w-full rounded-lg'
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
		base: 'bg-muted/80'
	},
	tbody: {
		base: ''
	},
	tfoot: {
		base: 'bg-muted/50 border-t border-border'
	},
	tr: {
		base: 'border-border border-b hover:bg-muted/50 transition-colors'
	},
	td: {
		base: 'px-4 py-3 text-sm text-foreground min-w-[200px] max-w-[400px] break-words'
	},
	th: {
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
		icon: 'size-5',
		buttons: 'absolute right-1 top-1 z-10 flex h-fit w-fit items-center gap-1'
	},
	math: {
		block: 'text-foreground',
		inline: 'text-foreground'
	},
	br: {
		base: ''
	},
	em: {
		base: 'italic'
	},
	del: {
		base: 'text-muted-foreground'
	},
	footnoteRef: {
		base: 'text-muted-foreground text-sm  rounded-full bg-muted cursor-pointer border border-border hover:bg-muted/50 tabular-nums min-w-5 min-h-5 outline-none focus:ring-1 focus:ring-primary'
	},
	descriptionList: {
		base: 'my-4 space-y-2'
	},
	descriptionTerm: {
		base: 'font-semibold text-foreground border-l-2 border-border pl-4'
	},
	descriptionDetail: {
		base: 'text-muted-foreground ml-4 leading-relaxed'
	},
	inlineCitation: {
		preview:
			'text-sm text-muted-foreground bg-muted rounded-md px-2 py-0.5 cursor-pointer inline-flex border border-border hover:bg-muted/50 outline-none focus:ring-1 focus:ring-primary',

		carousel: {
			header: 'flex items-center justify-between',
			stepCounter: 'h-fit text-xs font-semibold text-muted-foreground tabular-nums',
			buttons: 'flex w-fit items-center justify-end gap-2',
			title: 'mb-2 line-clamp-2 font-semibold',
			url: 'flex items-center gap-2 text-sm text-muted-foreground',
			favicon: 'h-4 w-4 rounded'
		},
		list: {
			base: 'grid gap-2',
			item: 'grid gap-1 hover:bg-muted rounded-md p-2',
			title: 'line-clamp-1 font-semibold text-sm',
			url: 'flex items-center gap-2 text-xs text-muted-foreground',
			favicon: 'h-3 w-3 rounded'
		}
	},
	components: {
		button:
			'disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer p-1 text-muted-foreground transition-all hover:text-foreground rounded hover:bg-border flex items-center justify-center w-6 h-6',
		popover:
			'min-w-[250px] max-w-md fixed z-[1000] max-h-[30vh] max-w-3xl overflow-y-auto rounded-lg bg-popover border border-border p-2 shadow'
	}
} satisfies Theme;

export type Theme = typeof theme;

type DeepPartial<T> = {
	[K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

export type DeepPartialTheme = DeepPartial<Theme>;

export const mergeTheme = (customTheme?: DeepPartialTheme, baseTheme?: 'tailwind' | 'shadcn') => {
	const base = baseTheme === 'shadcn' ? shadcnTheme : theme;
	if (!customTheme) return base;
	const mergedTheme = { ...base };
	for (const key in customTheme) {
		const origGroup = (mergedTheme as any)[key as keyof Theme] as
			| Record<string, ClassValue>
			| undefined;
		const customGroup = (customTheme as any)[key as keyof Theme] as
			| Record<string, ClassValue>
			| undefined;
		if (!origGroup || !customGroup) continue;
		const mergedGroup: Record<string, ClassValue> = { ...origGroup };
		for (const subKey of Object.keys(customGroup)) {
			const baseVal = origGroup[subKey as keyof typeof origGroup];
			const customVal = customGroup[subKey as keyof typeof customGroup];
			mergedGroup[subKey] = cn(baseVal as ClassValue, customVal as ClassValue);
		}
		(mergedTheme as any)[key] = mergedGroup;
	}
	return mergedTheme;
};
