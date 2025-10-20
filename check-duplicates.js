const fs = require('fs');
const path = require('path');

const dataDir = path.join(process.cwd(), 'data', 'clinics');
const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));

const allIds = new Set();
const duplicates = [];
let total = 0;

files.forEach(file => {
  const data = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf-8'));
  const clinics = data.clinics || [];
  
  clinics.forEach(c => {
    total++;
    if (allIds.has(c.place_id)) {
      duplicates.push({ id: c.place_id, name: c.display_name, file });
    } else {
      allIds.add(c.place_id);
    }
  });
});

console.log(`\nTotal clinics in files: ${total}`);
console.log(`Unique place_ids: ${allIds.size}`);
console.log(`Duplicates: ${duplicates.length}\n`);

if (duplicates.length > 0) {
  console.log('Duplicate clinics:');
  duplicates.forEach(d => {
    console.log(`  - ${d.name} (${d.id}) in ${d.file}`);
  });
}
