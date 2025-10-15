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
		if (Array.isArray(value)) {
			value = value[Number(key)];
		} else {
			value = value[key];
		}
	}
	return value as T | null;
};
