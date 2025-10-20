const fs = require('fs');
const path = require('path');

const dataDir = path.join(process.cwd(), 'data', 'clinics');
const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));

console.log('\n📊 Data Quality Report\n');

let totalClinics = 0;
let nonDermClinics = [];

files.forEach(file => {
  const data = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf-8'));
  const clinics = data.clinics || [];
  
  console.log(`${data.state_code}:`);
  console.log(`  Total: ${clinics.length} clinics`);
  
  // Check completeness
  const withRating = clinics.filter(c => c.rating).length;
  const withPhone = clinics.filter(c => c.phone).length;
  const withWebsite = clinics.filter(c => c.website).length;
  const withHours = clinics.filter(c => c.opening_hours).length;
  const withAccessibility = clinics.filter(c => c.accessibility_options).length;
  const withParking = clinics.filter(c => c.parking_options).length;
  
  console.log(`  ├─ Ratings: ${withRating}/${clinics.length} (${Math.round(withRating/clinics.length*100)}%)`);
  console.log(`  ├─ Phone: ${withPhone}/${clinics.length} (${Math.round(withPhone/clinics.length*100)}%)`);
  console.log(`  ├─ Website: ${withWebsite}/${clinics.length} (${Math.round(withWebsite/clinics.length*100)}%)`);
  console.log(`  ├─ Hours: ${withHours}/${clinics.length} (${Math.round(withHours/clinics.length*100)}%)`);
  console.log(`  ├─ Accessibility: ${withAccessibility}/${clinics.length} (${Math.round(withAccessibility/clinics.length*100)}%)`);
  console.log(`  └─ Parking: ${withParking}/${clinics.length} (${Math.round(withParking/clinics.length*100)}%)`);
  
  // Sample first 3 clinic names
  console.log(`  Sample names:`);
  clinics.slice(0, 3).forEach((c, i) => {
    console.log(`    ${i+1}. ${c.display_name}`);
  });
  
  // Check for potential non-derm entries
  const badTerms = ['dental', 'dentist', 'veterinary', 'pet', 'animal', 'massage'];
  clinics.forEach(c => {
    const name = (c.display_name || '').toLowerCase();
    const hasBad = badTerms.some(term => name.includes(term));
    if (hasBad) {
      nonDermClinics.push(`${data.state_code}: ${c.display_name}`);
    }
  });
  
  console.log('');
  totalClinics += clinics.length;
});

console.log(`\n✅ Total clinics: ${totalClinics}`);

if (nonDermClinics.length > 0) {
  console.log(`\n⚠️  Potential non-derm clinics (${nonDermClinics.length}):`);
  nonDermClinics.forEach(clinic => console.log(`  - ${clinic}`));
} else {
  console.log('\n✨ No obvious non-derm clinics detected!');
}

console.log('\n');
