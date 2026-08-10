import { readFileSync } from 'node:fs';

const path = new URL('../docs/generated/openapi.json', import.meta.url);
const document = JSON.parse(readFileSync(path, 'utf8'));
if (!/^3\.\d+\.\d+$/.test(document.openapi ?? '')) throw new Error('Invalid OpenAPI version');
if (!document.paths || typeof document.paths !== 'object')
  throw new Error('OpenAPI paths are missing');
const methods = new Set(['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace']);
let operations = 0;
for (const [route, item] of Object.entries(document.paths)) {
  if (!route.startsWith('/')) throw new Error(`Invalid path: ${route}`);
  for (const [method, operation] of Object.entries(item)) {
    if (!methods.has(method)) continue;
    if (!operation || typeof operation !== 'object' || !operation.responses) {
      throw new Error(`Operation ${method.toUpperCase()} ${route} has no responses`);
    }
    operations += 1;
  }
}
if (operations === 0) throw new Error('OpenAPI has no operations');
console.log(`Validated OpenAPI ${document.openapi}: ${operations} operations`);
