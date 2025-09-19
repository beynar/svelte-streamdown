import { expect, test } from 'vitest';
import { markedMath } from '../lib/marked/marked-math.js';
import { marked } from 'marked';

// Configure marked with the math extension
marked.use(markedMath());

test('should parse valid inline math expressions', () => {
	const result = marked('This is inline math: $x + y = z$ and more text.');
	expect(result).toContain('math');
	expect(result).toContain('x + y = z');
});

test('should parse valid block math expressions', () => {
	const result = marked('Block math:\n$$\nx^2 + y^2 = z^2\n$$\nEnd.');
	expect(result).toContain('math');
	expect(result).toContain('x^2 + y^2 = z^2');
});

test('should NOT parse prices as math - single price', () => {
	const result = marked('The item costs $129 and is available now.');
	expect(result).not.toContain('math');
	expect(result).toContain('$129');
});

test('should NOT parse prices as math - decimal price', () => {
	const result = marked('The price is $169.99 for this item.');
	expect(result).not.toContain('math');
	expect(result).toContain('$169.99');
});

test('should NOT parse two separate prices as math', () => {
	const result = marked('Compare $129 vs $169.99 for the best deal.');
	expect(result).not.toContain('math');
	expect(result).toContain('$129');
	expect(result).toContain('$169.99');
});

test('should handle the user reported issue - HRM comparison text', () => {
	const text = `When choosing between the Garmin HRM 600 and the Garmin HRM-Pro Plus, consider the following:

*   **Price:** The HRM 600 is priced at $169.99, and the HRM-Pro Plus is priced at $119.93.

Price: The HRM 600 is priced at $169.99, and the HRM-Pro Plus is priced at $119.93.`;

	const result = marked(text);
	expect(result).not.toContain('math');
	expect(result).toContain('$169.99');
	expect(result).toContain('$119.93');
});

test('should handle mixed content - math and prices', () => {
	const result = marked('The equation $E = mc^2$ shows energy, while the cost is $50.');
	expect(result).toContain('math');
	expect(result).toContain('E = mc^2');
	expect(result).toContain('$50');
});

test('should parse math with variables and operators', () => {
	const result = marked('Calculate $\\alpha + \\beta = \\gamma$ for the solution.');
	expect(result).toContain('math');
	expect(result).toContain('\\alpha + \\beta = \\gamma');
});

test('should parse math with fractions', () => {
	const result = marked('The fraction is $\\frac{a}{b} = c$ in this context.');
	expect(result).toContain('math');
	expect(result).toContain('\\frac{a}{b} = c');
});

test('should distinguish between math and prices in same sentence', () => {
	const result = marked('The formula $a^2 + b^2 = c^2$ costs $15 to compute.');
	expect(result).toContain('math');
	expect(result).toContain('a^2 + b^2 = c^2');
	expect(result).toContain('$15');
});

test('should handle multiple math expressions', () => {
	const result = marked('First $x = 1$ and second $y = 2$ are variables.');
	expect(result).toContain('math');
	expect(result).toContain('x = 1');
	expect(result).toContain('y = 2');
});
