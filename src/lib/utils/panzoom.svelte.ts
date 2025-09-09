import { onDestroy, untrack } from 'svelte';

// Minimal pan/zoom utility for Svelte (DOM or SVG root)
// - Uses CSS transforms with origin at (0,0)
// - Mouse drag to pan
// - Wheel to zoom around cursor
// - Touch: single-finger pan, two-finger pinch-zoom
// - zoomToFit: scale and center element inside its parent with optional padding

export interface PanzoomOptions {
	minZoom?: number; // default: 0.1
	maxZoom?: number; // default: +Infinity
	zoomSpeed?: number; // wheel sensitivity (default: 1)
	doubleClickScale?: number; // zoom multiplier on double click (default: 1.75)
	initialScale?: number; // default: 1
	initialX?: number; // default: 0
	initialY?: number; // default: 0
	activateMouseWheel?: boolean;
}

export interface PanzoomInstance {
	attach: (node: HTMLElement | SVGSVGElement) => () => void;
	zoomToFit: (padding?: number) => void;
	zoomBy: (factor: number) => void;
	zoomIn: (factor?: number) => void;
	zoomOut: (factor?: number) => void;
	moveBy: (dx: number, dy: number) => void;
	setTransform: (x: number, y: number, scale: number) => void;
	expand: () => void;
	collapse: () => void;
	toggleExpand: (options?: ExpandOptions | number) => Promise<void>;
	readonly expanded: boolean;
	readonly transform: Readonly<{ x: number; y: number; scale: number }>;
}

export interface ExpandOptions {
	padding?: number; // px
	duration?: number; // ms
	easing?: string; // CSS timing-function
	zIndex?: number;
	fitRatio?: number; // ratio [0..0.5) used for zoomToFit before/after expand
}

export const usePanzoom = (opts: PanzoomOptions = {}): PanzoomInstance => {
	// state
	let x = opts.initialX ?? 0;
	let y = opts.initialY ?? 0;
	let scale = opts.initialScale ?? 1;

	// options
	const minZoom = opts.minZoom ?? 0.1;
	const maxZoom = opts.maxZoom ?? Number.POSITIVE_INFINITY;
	const zoomSpeed = opts.zoomSpeed ?? 1;
	const doubleClickScale = opts.doubleClickScale ?? 1.75;

	let node: HTMLElement | SVGSVGElement | null = null; // element we transform
	let eventTarget: HTMLElement | null = null; // element we listen on (parent container if available)
	let createdWrapper: HTMLElement | null = null; // wrapper we created if no parent existed
	const listeners = new Set<() => void>();

	// drag state
	let dragging = false;
	let lastClientX = 0;
	let lastClientY = 0;
	let dragOffMove: (() => void) | null = null;
	let dragOffUp: (() => void) | null = null;
	let previousStyle: string | null = null;
	// touch state
	let touchMode: 'none' | 'pan' | 'pinch' = 'none';
	let pinchDistance = 0;
	let pinchCenter: { x: number; y: number } | null = null;

	// expand/collapse state
	let isExpanded = $state(false);
	let animating = false;
	let placeholderEl: HTMLDivElement | null = null;

	function onKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape' || (e as any).keyCode === 27) {
			if (isExpanded && !animating) {
				// fire and forget
				void collapse();
			}
		}
	}

	const destroy = () => {
		listeners.forEach((off) => off());
		listeners.clear();
		if (placeholderEl) {
			placeholderEl.remove();
			placeholderEl = null;
		}
		if (createdWrapper) {
			// Move node back out of wrapper before removing wrapper
			if (node && createdWrapper.parentElement) {
				createdWrapper.parentElement.insertBefore(node, createdWrapper);
			}
			createdWrapper.remove();
			createdWrapper = null;
		}
		if (dragOffMove) dragOffMove();
		if (dragOffUp) dragOffUp();
	};

	onDestroy(() => {
		destroy();
	});

	function normalize() {
		// clamp and round to reduce subpixel jitter
		scale = clampScale(scale);
		const r = (v: number) => Math.round(v * 1000) / 1000;
		x = r(x);
		y = r(y);
		scale = r(scale);
	}

	function apply() {
		if (!node) return;
		normalize();
		// Use CSS transform regardless of DOM/SVG root; modern browsers support this.
		const el = node as HTMLElement;
		el.style.transformOrigin = '0 0';
		el.style.willChange = 'transform';
		// transform order is right-to-left. We want screen = translate + scale * local
		// so use translate() first, then scale().
		el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
	}

	function clampScale(s: number) {
		if (s < minZoom) return minZoom;
		if (s > maxZoom) return maxZoom;
		return s;
	}

	function zoomAt(clientX: number, clientY: number, factor: number) {
		if (!node) return;
		if (!Number.isFinite(factor) || factor === 1) return;
		const nextScale = clampScale(scale * factor);
		const ratio = nextScale / scale;
		if (ratio === 1) return;
		const owner = (eventTarget ?? node.parentElement ?? (node as HTMLElement)) as HTMLElement;
		const ownerRect = owner.getBoundingClientRect();
		const ox = clientX - ownerRect.left;
		const oy = clientY - ownerRect.top;
		// Keep (ox, oy) stationary in owner's coordinate space
		x = ratio * x + (1 - ratio) * ox;
		y = ratio * y + (1 - ratio) * oy;
		scale = nextScale;
		apply();
	}

	function kineticWheel(deltaY: number) {
		// deltaY > 0 => zoom out; use smooth exponential scaling
		const sign = Math.sign(deltaY);
		const step = Math.min(0.25, Math.abs((zoomSpeed * deltaY) / 128));
		return 1 - sign * step;
	}

	function onWheel(e: WheelEvent) {
		if (!opts.activateMouseWheel) return;
		if (!node) return;
		if (animating) {
			e.preventDefault();
			e.stopPropagation();
			return;
		}
		// Always prevent default to stop page scroll
		e.preventDefault();
		e.stopPropagation();
		const factor = kineticWheel(e.deltaY * (e.deltaMode ? 100 : 1));

		zoomAt(e.clientX, e.clientY, factor);
		// re-apply using latest rect
		apply();
	}

	function onDblClick(e: MouseEvent) {
		// Ignore dblclicks that originate outside of the pan/zoom content (the node)
		const t = e.target as Element | null;
		if (node && t && !(t === (node as Element) || (node as Element).contains(t))) {
			return; // likely UI control inside container; don't zoom
		}
		// Ignore dblclicks on interactive elements or those explicitly marked to ignore
		const isInteractive = (el: Element) => {
			const tag = el.tagName.toLowerCase();
			return (
				el.closest('[data-panzoom-ignore]') !== null ||
				['button', 'a', 'input', 'textarea', 'select', 'label', 'summary', 'details'].includes(
					tag
				) ||
				(el as HTMLElement).isContentEditable
			);
		};
		if (t && isInteractive(t)) return;

		e.preventDefault();
		// Anchor double-click zoom at parent center to avoid shifts on rapid clicks
		const baseEl = (eventTarget ?? node?.parentElement ?? (node as HTMLElement)) as HTMLElement;
		const base = baseEl.getBoundingClientRect();
		const cx = base.left + base.width / 2;
		const cy = base.top + base.height / 2;
		zoomAt(cx, cy, doubleClickScale);
	}

	function startDrag(e: MouseEvent) {
		if (animating) {
			e.preventDefault();
			return;
		}
		if (e.button !== 0) return; // left only
		dragging = true;
		lastClientX = e.clientX;
		lastClientY = e.clientY;
		e.preventDefault();
		if (node) (node as HTMLElement).style.cursor = 'grabbing';
		dragOffMove = () => window.removeEventListener('mousemove', onDragMove as any);
		dragOffUp = () => window.removeEventListener('mouseup', endDrag as any);
		window.addEventListener('mousemove', onDragMove as any, { passive: false });
		window.addEventListener('mouseup', endDrag as any, { passive: true });

		listeners.add(dragOffMove);
		listeners.add(dragOffUp);
	}

	function onDragMove(e: MouseEvent) {
		if (!dragging) return;
		const dx = e.clientX - lastClientX;
		const dy = e.clientY - lastClientY;
		lastClientX = e.clientX;
		lastClientY = e.clientY;
		x += dx;
		y += dy;
		apply();
	}

	function endDrag() {
		dragging = false;
		if (node) (node as HTMLElement).style.cursor = 'grab';
		if (dragOffMove) {
			dragOffMove();
			listeners.delete(dragOffMove);
		}
		if (dragOffUp) {
			dragOffUp();
			listeners.delete(dragOffUp);
		}
		dragOffMove = dragOffUp = null;
	}

	function onTouchStart(e: TouchEvent) {
		if (!node) return;
		if (animating) {
			e.preventDefault();
			return;
		}
		if (e.touches.length === 1) {
			touchMode = 'pan';
			lastClientX = e.touches[0].clientX;
			lastClientY = e.touches[0].clientY;
		} else if (e.touches.length >= 2) {
			touchMode = 'pinch';
			const [t1, t2] = [e.touches[0], e.touches[1]];
			pinchDistance = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
			pinchCenter = {
				x: (t1.clientX + t2.clientX) / 2,
				y: (t1.clientY + t2.clientY) / 2
			};
		}
		// prevent default scrolling/zooming
		e.preventDefault();
		const offMove = () => window.removeEventListener('touchmove', onTouchMove);
		const offEnd = () => window.removeEventListener('touchend', onTouchEnd);
		const offCancel = () => window.removeEventListener('touchcancel', onTouchEnd);
		window.addEventListener('touchmove', onTouchMove, { passive: false });
		window.addEventListener('touchend', onTouchEnd, { passive: true });
		window.addEventListener('touchcancel', onTouchEnd, { passive: true });
		listeners.add(offMove);
		listeners.add(offEnd);
		listeners.add(offCancel);
	}

	function onTouchMove(e: TouchEvent) {
		if (!node) return;
		if (touchMode === 'pan' && e.touches.length === 1) {
			const t = e.touches[0];
			const dx = t.clientX - lastClientX;
			const dy = t.clientY - lastClientY;
			lastClientX = t.clientX;
			lastClientY = t.clientY;
			x += dx;
			y += dy;
			apply();
			e.preventDefault();
		} else if (touchMode === 'pinch' && e.touches.length >= 2) {
			const [t1, t2] = [e.touches[0], e.touches[1]];
			const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
			const factor = dist / (pinchDistance || dist);
			const center = {
				x: (t1.clientX + t2.clientX) / 2,
				y: (t1.clientY + t2.clientY) / 2
			};
			zoomAt(center.x, center.y, factor);
			pinchDistance = dist;
			pinchCenter = center;
			e.preventDefault();
		}
	}

	function onTouchEnd() {
		if (!node) return;
		if (touchMode === 'pinch') {
			// reset pinch state, keep resulting transform
			touchMode = 'none';
			pinchDistance = 0;
			pinchCenter = null;
		} else if (touchMode === 'pan') {
			touchMode = 'none';
		}
	}

	function internalAttach(target: HTMLElement | SVGSVGElement) {
		return untrack(() => {
			node = target;

			// Ensure eventTarget and node are different elements to avoid FLIP conflicts
			const isSVG = typeof SVGSVGElement !== 'undefined' && target instanceof SVGSVGElement;

			if (isSVG) {
				// For SVG, prefer parent element
				eventTarget = target.parentElement as HTMLElement | null;
			} else {
				// For non-SVG, try to use parent element when available
				const parent = target.parentElement;
				if (parent && parent instanceof HTMLElement) {
					eventTarget = parent;
				} else {
					// No suitable parent - create wrapper to ensure separation
					const wrapper = document.createElement('div');
					wrapper.style.cssText = `
						display: contents;
						contain: layout style;
					`
						.replace(/\s+/g, ' ')
						.trim();

					// Insert wrapper and move target into it
					if (target.parentElement) {
						target.parentElement.insertBefore(wrapper, target);
					}
					wrapper.appendChild(target);
					eventTarget = wrapper;
					createdWrapper = wrapper;
				}
			}

			// Final fallback if no eventTarget was established
			if (!eventTarget) {
				eventTarget = target as HTMLElement;
			}
			apply();
			// helper to add and track listeners with options
			const add = <K extends keyof HTMLElementEventMap>(
				type: K,
				handler: (e: any) => void,
				options?: AddEventListenerOptions
			) => {
				const n = (eventTarget ?? (node as HTMLElement)) as HTMLElement;
				n.addEventListener(type, handler as any, options);
				const off = () => n.removeEventListener(type, handler as any, options);
				listeners.add(off);
				return off;
			};

			const addWindow = <K extends keyof WindowEventMap>(
				type: K,
				handler: (e: any) => void,
				options?: AddEventListenerOptions
			) => {
				window.addEventListener(type, handler as any, options);
				const off = () => window.removeEventListener(type, handler as any, options);
				listeners.add(off);
				return off;
			};

			// core events with passive: false where needed
			add('mousedown', startDrag as any, { passive: false });
			add('wheel', onWheel as any, { passive: false, capture: true });
			add('dblclick', onDblClick as any, { passive: false });
			add('touchstart', onTouchStart as any, { passive: false });
			addWindow('keydown', onKeyDown as any, { passive: true });

			// prevent text selection/scrolling while interacting
			const t = (eventTarget ?? node) as HTMLElement;
			t.style.userSelect = 'none';
			t.style.touchAction = 'none';
			t.style.cursor = 'grab';
			(t.style as any).overscrollBehavior = 'contain';
			// For SVG root, use fill-box so translation math stays in CSS px space
			const n = node;
			if (typeof SVGSVGElement !== 'undefined' && target instanceof SVGSVGElement) {
				(n.style as any).transformBox = 'fill-box';
			}

			return () => {
				destroy();
			};
		});
	}

	const collapse = () => {
		if (!eventTarget) return;

		// Add view transition name for CSS targeting
		eventTarget.style.viewTransitionName = 'panzoom-element';

		isExpanded = false;
		const api = (document as any).startViewTransition;
		const run = () => {
			if (!eventTarget) return;
			eventTarget.dataset.expanded = 'false';
			zoomToFit();
		};
		if (typeof api === 'function') {
			api(run).finished.finally(() => {
				if (eventTarget) eventTarget.style.viewTransitionName = '';
			});
		} else {
			run();
			if (eventTarget) eventTarget.style.viewTransitionName = '';
		}
	};

	const expand = () => {
		if (!eventTarget) return;

		// Add view transition name for CSS targeting
		eventTarget.style.viewTransitionName = 'panzoom-element';
		isExpanded = true;
		const api = (document as any).startViewTransition;
		const run = () => {
			if (!eventTarget) return;
			eventTarget.dataset.expanded = 'true';
			zoomToFit();
		};
		if (typeof api === 'function') {
			api(run).finished.finally(() => {
				if (eventTarget) eventTarget.style.viewTransitionName = '';
			});
		} else {
			run();
			if (eventTarget) eventTarget.style.viewTransitionName = '';
		}
	};

	async function toggleExpand(): Promise<void> {
		zoomToFit();
		if (isExpanded) return collapse();
		return expand();
	}

	function zoomToFit(padding = 0.05) {
		if (!node) return;
		const parent = node.parentElement;
		if (!parent) return;
		const parentRect = parent.getBoundingClientRect();
		const rect = node.getBoundingClientRect();
		// infer unscaled natural size by dividing by current scale
		const naturalWidth = rect.width / scale || 0;
		const naturalHeight = rect.height / scale || 0;
		const targetWidth = parentRect.width * (1 - 2 * padding);
		const targetHeight = parentRect.height * (1 - 2 * padding);
		if (naturalWidth <= 0 || naturalHeight <= 0 || targetWidth <= 0 || targetHeight <= 0) return;
		const s = clampScale(Math.min(targetWidth / naturalWidth, targetHeight / naturalHeight));
		// Temporarily apply scale with zero translate to measure new size

		scale = s;
		x = 0;
		y = 0;
		apply();
		const newRect = node.getBoundingClientRect();
		// compute centered position inside parent
		const targetLeft = parentRect.left + (parentRect.width - newRect.width) / 2;
		const targetTop = parentRect.top + (parentRect.height - newRect.height) / 2;
		x = targetLeft - newRect.left;
		y = targetTop - newRect.top;
		apply();
	}

	function zoomBy(factor: number) {
		console.log('zoomBy', factor);
		if (!node) return;

		// Use zoomAt with the center of the container for consistent behavior
		const owner = (eventTarget ?? node.parentElement ?? (node as HTMLElement)) as HTMLElement;
		const ownerRect = owner.getBoundingClientRect();
		const cx = ownerRect.left + ownerRect.width / 2;
		const cy = ownerRect.top + ownerRect.height / 2;
		zoomAt(cx, cy, factor);
	}

	function moveBy(dx: number, dy: number) {
		x += dx;
		y += dy;
		apply();
	}

	function zoomIn(factor = 1.25) {
		zoomBy(factor);
	}

	function zoomOut(factor = 1.25) {
		console.log('zoomOut', factor);
		// zoom out by inverse multiplier
		if (factor <= 0) return;
		zoomBy(1 / factor);
	}

	function setTransform(nx: number, ny: number, ns: number) {
		scale = clampScale(ns);
		x = nx;
		y = ny;
		apply();
	}

	return {
		attach: internalAttach,
		zoomToFit,
		zoomBy,
		zoomIn,
		zoomOut,
		moveBy,
		setTransform,
		expand,
		collapse,
		toggleExpand,
		get transform() {
			return { x, y, scale } as const;
		},
		get expanded() {
			return isExpanded;
		}
	};
};
