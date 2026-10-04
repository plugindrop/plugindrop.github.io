import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const directories = ['src/layouts', 'src/components', 'src/pages', 'src/lib'];
const files = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const name = path.join(directory, entry.name);
  return entry.isDirectory() ? files(name) : entry.isFile() && /\.(?:astro|mjs|js|ts)$/.test(name) ? [name] : [];
});
let violations = 0;
for (const directory of directories) for (const file of files(path.join(root, directory))) {
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(/\bhref\s*=\s*["'](\/[^"']*)["']/g)) {
    const href = match[1];
    const pathname = href.split(/[?#]/, 1)[0];
    if (pathname === '/' || pathname.endsWith('/') || /\.[^/]+$/.test(pathname)) continue;
    const line = source.slice(0, match.index).split(/\r?\n/).length;
    console.error(`FAIL: ${path.relative(root, file)}:${line}: ${href}`);
    violations++;
  }
}
if (violations) process.exitCode = 1;
else console.log('PASS: source template internal hrefs have trailing slashes.');
