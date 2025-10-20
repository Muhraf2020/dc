// scripts/migrate-to-supabase.js
// Migrates JSON clinic data to Supabase database

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // Use service key for migration
const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateData() {
  const dataDir = path.join(process.cwd(), 'data', 'clinics');
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
  
  console.log(`\n📦 Migrating ${files.length} state files to Supabase...\n`);
  
  let total = 0;
  let errors = 0;
  
  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf-8'));
    const clinics = data.clinics || [];
    
    console.log(`${data.state_code}: Migrating ${clinics.length} clinics...`);
    
    // Insert in batches of 100
    for (let i = 0; i < clinics.length; i += 100) {
      const batch = clinics.slice(i, i + 100);
      
      const { error } = await supabase
        .from('clinics')
        .upsert(batch, { onConflict: 'place_id' });
      
      if (error) {
        console.error(`  ❌ Error in batch ${i}-${i+100}:`, error.message);
        errors++;
      } else {
        total += batch.length;
        process.stdout.write(`  ✓ ${total} clinics migrated\r`);
      }
    }
    
    console.log(`  ✅ ${data.state_code} complete\n`);
  }
  
  console.log(`\n✨ Migration complete!`);
  console.log(`   Total: ${total} clinics`);
  console.log(`   Errors: ${errors}\n`);
}

migrateData().catch(console.error);