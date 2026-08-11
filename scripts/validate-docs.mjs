import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize, relative, resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const ignored = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage']);
const markdown = [];

function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (entry.isFile() && extname(entry.name).toLowerCase() === '.md') markdown.push(path);
  }
}

function slug(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[`*_~]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function headings(content) {
  const result = new Set();
  for (const line of content.split('\n')) {
    const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (match) result.add(slug(match[2]));
  }
  return result;
}

walk(root);
let errors = 0;
for (const file of markdown) {
  const content = readFileSync(file, 'utf8');
  const linkPattern = /!?\[[^\]]*\]\(([^)]+)\)/g;
  for (const match of content.matchAll(linkPattern)) {
    const raw = match[1].trim().replace(/^<|>$/g, '').split(/\s+/u)[0];
    if (
      !raw ||
      raw.startsWith('#') ||
      /^[a-z][a-z0-9+.-]*:/iu.test(raw) ||
      raw.startsWith('mailto:')
    )
      continue;
    const [pathPart, anchor] = raw.split('#', 2);
    const candidate = normalize(resolve(dirname(file), pathPart || '.'));
    if (!existsSync(candidate)) {
      console.error(`${relative(root, file)}: missing link target ${raw}`);
      errors += 1;
      continue;
    }
    if (anchor && statSync(candidate).isFile() && extname(candidate).toLowerCase() === '.md') {
      const target = readFileSync(candidate, 'utf8');
      if (!headings(target).has(anchor.toLowerCase())) {
        console.error(`${relative(root, file)}: missing anchor ${raw}`);
        errors += 1;
      }
    }
  }
  const canonical =
    /^(README\.md|CONTRIBUTING\.md|docs\/(getting-started|development|backend|frontend|api|deployment)\/|docs\/architecture\/(overview|project-structure|backend|frontend|worker|ai-pipeline)\.md)/u.test(
      relative(root, file),
    );
  if (canonical && /\bTODO|TBD\b/iu.test(content)) {
    console.error(`${relative(root, file)}: unresolved TODO/TBD`);
    errors += 1;
  }
}

if (errors > 0) process.exit(1);
console.log(`Validated ${markdown.length} Markdown files and their internal links.`);
