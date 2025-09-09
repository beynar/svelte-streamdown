import readmeFile from '../README.md';
import { read } from '$app/server';
export const load = async () => {
	const readme = read(readmeFile);
	return {
		readme: await readme.text()
	};
};
