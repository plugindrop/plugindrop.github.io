import { readFile } from 'node:fs/promises';
import { measureHome } from '../src/lib/homeDensity.mjs';
const html = await readFile(process.argv[2] ?? new URL('../dist/index.html', import.meta.url), 'utf8');
console.log(JSON.stringify(measureHome(html), null, 2));
