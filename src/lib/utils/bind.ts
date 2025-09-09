export const bind = (ref: any, props: Record<string, any>) => {
	const descriptors = Object.getOwnPropertyDescriptors(props);
	for (const key in descriptors) {
		Object.defineProperty(ref, key, descriptors[key]);
	}
};
