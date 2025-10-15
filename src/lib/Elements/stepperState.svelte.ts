import { tick } from 'svelte';

type KeyFramesOptions = {
	duration: number;
	easing: string;
	fill: 'auto' | 'backwards' | 'both' | 'forwards' | 'none';
};

export const bind = (ref: Record<string, any>, props: Record<string, any>) => {
	const descriptors = Object.getOwnPropertyDescriptors(props);
	for (const key in descriptors) {
		Object.defineProperty(ref, key, descriptors[key]);
	}
};
export interface StepperState<Item> {
	items: Item[];
	keyFramesOptions: KeyFramesOptions;
}
export class StepperState<Item> {
	activeStep = $state(0);
	destinationOffset = $state(0);
	stepAnimation = $state<Animation>();
	offsets = $state<number[]>([]);
	stepHeights = $state<number[]>([]);
	stepContainer: HTMLElement | null = null;
	isAnimating = $state(false);
	constructor(props: { items: Item[]; keyFramesOptions: KeyFramesOptions }) {
		bind(this, props);
	}

	translate = () => {
		if (this.destinationOffset !== this.offsets[this.activeStep] && this.stepContainer) {
			this.destinationOffset = this.offsets[this.activeStep];
			this.stepAnimation?.cancel();
			this.stepAnimation = this.stepContainer.animate(
				{
					transform: `translateX(-${this.offsets[this.activeStep]}px)`
				},

				this.keyFramesOptions
			);
			this.stepAnimation.onfinish = () => {
				this.stepAnimation = undefined;
			};
		}
	};

	setActiveStep = (i: number) => () => {
		if (!this.canGoToStep(i) || !this.stepContainer) return;
		const previousStep = this.stepContainer.children[this.activeStep] as HTMLElement;
		const nextStep = this.stepContainer.children[i] as HTMLElement;
		if (!previousStep || !nextStep) return;
		this.activeStep = i;
		this.translate();
		previousStep.animate(
			{
				opacity: `0`
			},
			this.keyFramesOptions
		);
		nextStep.animate(
			{
				opacity: `1`
			},
			this.keyFramesOptions
		);
	};

	scroller = (node: HTMLElement) => {
		const onScroll = (e: Event) => {
			e.preventDefault();
			node.scrollTo(0, 0);
		};
		node.addEventListener('scroll', onScroll);

		node.scrollTo(0, 0);

		const steps = node.querySelectorAll('[data-step]');

		const setOffsets = () => {
			steps.forEach((step, i) => {
				this.offsets[i] = (step as HTMLElement).offsetLeft;
				this.translate();
			});
		};
		const resizeObserver = new ResizeObserver(setOffsets);
		resizeObserver.observe(node);
		setOffsets();

		return {
			destroy: () => {
				resizeObserver.unobserve(node);
				node.removeEventListener('scroll', onScroll);
				this.activeStep = 0;
				this.offsets = [];
				this.destinationOffset = 0;
			}
		};
	};

	next = () => {
		if (this.activeStep < this.items.length - 1) {
			this.setActiveStep(this.activeStep + 1)();
		}
	};

	previous = () => {
		if (this.activeStep > 0) {
			this.setActiveStep(this.activeStep - 1)();
		}
	};
	goTo = (i: number) => {
		if (this.canGoToStep(i)) {
			this.setActiveStep(i)();
		}
	};

	get canGoNext() {
		return this.activeStep < this.items.length - 1;
	}
	get canGoPrevious() {
		return this.activeStep > 0;
	}

	canGoToStep = (targetStep: number): boolean => {
		return targetStep >= 0 && targetStep < this.items.length;
	};
}
