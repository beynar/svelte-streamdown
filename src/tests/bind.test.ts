import { expect, describe, test } from 'vitest';
import { bind } from '../lib/utils/bind.js';

describe('bind', () => {
	test('copies plain data properties onto the target', () => {
		const ref: Record<string, any> = {};
		bind(ref, { a: 1, b: 'two' });
		expect(ref.a).toBe(1);
		expect(ref.b).toBe('two');
	});

	test('preserves getters instead of snapshotting their current value', () => {
		let source = 'initial';
		const ref: Record<string, any> = {};
		bind(ref, {
			get value() {
				return source;
			}
		});
		expect(ref.value).toBe('initial');
		source = 'updated';
		// the live getter was copied, so the target sees the new value
		expect(ref.value).toBe('updated');
	});

	test('preserves setters so writes flow back to the backing store', () => {
		let stored = 0;
		const ref: Record<string, any> = {};
		bind(ref, {
			get count() {
				return stored;
			},
			set count(v: number) {
				stored = v;
			}
		});
		ref.count = 42;
		expect(stored).toBe(42);
		expect(ref.count).toBe(42);
	});

	test('copies accessor descriptors as accessors, not as resolved values', () => {
		const ref: Record<string, any> = {};
		bind(ref, {
			get live() {
				return 1;
			}
		});
		const desc = Object.getOwnPropertyDescriptor(ref, 'live');
		expect(desc?.get).toBeTypeOf('function');
		expect(desc?.value).toBeUndefined();
	});

	test('data properties are copied by value: later prop mutation does not propagate', () => {
		const props = { a: 1 };
		const ref: Record<string, any> = {};
		bind(ref, props);
		props.a = 99;
		expect(ref.a).toBe(1);
	});

	test('overwrites data properties that already exist on the target', () => {
		const ref: Record<string, any> = { a: 'old', untouched: true };
		bind(ref, { a: 'new' });
		expect(ref.a).toBe('new');
		expect(ref.untouched).toBe(true);
	});

	test('redefines an existing configurable getter on the target', () => {
		const ref: Record<string, any> = {};
		Object.defineProperty(ref, 'x', {
			configurable: true,
			get: () => 'old'
		});
		bind(ref, {
			get x() {
				return 'new';
			}
		});
		expect(ref.x).toBe('new');
	});

	test('binding an empty props object leaves the target unchanged', () => {
		const ref: Record<string, any> = { keep: 1 };
		bind(ref, {});
		expect(Object.keys(ref)).toEqual(['keep']);
	});
});
