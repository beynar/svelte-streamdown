import { expect, describe, test } from 'vitest';
import { get } from '../lib/utils/get.js';

describe('get: single-key paths', () => {
	test('returns a top-level value', () => {
		expect(get({ a: 1 }, 'a')).toBe(1);
	});

	test('returns falsy top-level values as-is', () => {
		expect(get({ zero: 0 }, 'zero')).toBe(0);
		expect(get({ empty: '' }, 'empty')).toBe('');
		expect(get({ no: false }, 'no')).toBe(false);
	});

	test('returns undefined (not null) for a missing top-level key', () => {
		// single-key lookups bypass the traversal loop and read obj[path] directly
		expect(get({ a: 1 }, 'missing')).toBeUndefined();
	});

	test('returns null when the object itself is undefined', () => {
		expect(get(undefined, 'a')).toBeNull();
	});
});

describe('get: nested object paths', () => {
	test('walks nested objects', () => {
		expect(get({ a: { b: { c: 3 } } }, 'a.b.c')).toBe(3);
	});

	test('returns falsy leaf values from nested paths', () => {
		expect(get({ a: { b: 0 } }, 'a.b')).toBe(0);
		expect(get({ a: { b: false } }, 'a.b')).toBe(false);
	});

	test('returns null when an intermediate key is missing', () => {
		// value becomes undefined at "b", the next iteration null-checks it
		expect(get({ a: {} }, 'a.b.c')).toBeNull();
	});

	test('returns null when an intermediate value is null', () => {
		expect(get({ a: null }, 'a.b')).toBeNull();
	});

	test('returns null instead of throwing when traversing through a primitive', () => {
		// (5)['b'] is undefined, the following segment turns that into null
		expect(get({ a: 5 }, 'a.b.c')).toBeNull();
	});

	test('returns undefined when only the final segment is missing', () => {
		// the null-check runs at the START of each iteration, so a missing
		// leaf is returned as undefined rather than normalized to null
		expect(get({ a: { b: 1 } }, 'a.c')).toBeUndefined();
	});
});

describe('get: array traversal', () => {
	test('indexes into arrays with numeric path segments', () => {
		expect(get({ items: ['a', 'b', 'c'] }, 'items.1')).toBe('b');
	});

	test('walks arrays of objects', () => {
		expect(get({ a: [{ b: 1 }, { b: 2 }] }, 'a.1.b')).toBe(2);
	});

	test('walks nested arrays', () => {
		expect(
			get(
				{
					matrix: [
						[1, 2],
						[3, 4]
					]
				},
				'matrix.1.0'
			)
		).toBe(3);
	});

	test('returns null for an out-of-bounds index', () => {
		expect(get({ items: ['a'] }, 'items.5')).toBeNull();
	});

	test('returns null for a negative index', () => {
		expect(get({ items: ['a'] }, 'items.-1')).toBeNull();
	});

	test('returns null for a non-numeric key on an array', () => {
		// array steps only allow index access, so .length is rejected
		expect(get({ items: ['a', 'b'] }, 'items.length')).toBeNull();
	});
});
