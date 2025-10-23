import fs from 'node:fs';

const p = '.open-next/_routes.json';
const r = JSON.parse(fs.readFileSync(p, 'utf8'));

// Force the function to receive all routes (or just '/_next/*' if you prefer)
r.include = ['/*'];
r.exclude = [];

fs.writeFileSync(p, JSON.stringify(r));
console.log('Patched .open-next/_routes.json to include all routes');
