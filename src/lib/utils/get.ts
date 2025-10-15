// A method that gets a value from an object using a path
// It should work with nested objects and arrays
export const get = <T>(obj: Record<string, any> | undefined, path: string): T | null => {
	if (!obj) return null;
	const keys = path.split('.');
	if (keys.length === 1) {
		return obj[path];
	}

	let value = obj;
	for (const key of keys) {
		if (value == null) return null;
		if (Array.isArray(value)) {
			const index = Number(key);
			if (isNaN(index) || index < 0 || index >= value.length) return null;
			value = value[index];
		} else {
			value = value[key];
		}
	}
	return value as T | null;
};
