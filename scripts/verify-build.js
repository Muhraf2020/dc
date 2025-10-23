#!/usr/bin/env node
// scripts/verify-build.js
// Verifies that the OpenNext build output is correct for Cloudflare Pages

const fs = require('fs');
const path = require('path');

const BUILD_DIR = path.join(process.cwd(), '.open-next');

console.log('\n🔍 Verifying OpenNext build output...\n');

const checks = [
  {
    name: 'Build directory exists',
    path: BUILD_DIR,
    type: 'dir',
  },
  {
    name: 'Worker file (_worker.js)',
    path: path.join(BUILD_DIR, '_worker.js'),
    type: 'file',
  },
  {
    name: 'Assets directory',
    path: path.join(BUILD_DIR, 'assets'),
    type: 'dir',
  },
  {
    name: 'Next.js static files',
    path: path.join(BUILD_DIR, 'assets', '_next', 'static'),
    type: 'dir',
  },
  {
    name: 'CSS files exist',
    path: path.join(BUILD_DIR, 'assets', '_next', 'static', 'css'),
    type: 'dir',
  },
];

let allPassed = true;

checks.forEach(check => {
  try {
    const stats = fs.statSync(check.path);
    const isCorrectType = check.type === 'dir' ? stats.isDirectory() : stats.isFile();
    
    if (isCorrectType) {
      console.log(`✅ ${check.name}`);
      
      // Show file count for directories
      if (check.type === 'dir') {
        try {
          const files = fs.readdirSync(check.path);
          console.log(`   └─ ${files.length} items`);
        } catch (e) {
          // Ignore
        }
      }
    } else {
      console.log(`❌ ${check.name} - Wrong type`);
      allPassed = false;
    }
  } catch (error) {
    console.log(`❌ ${check.name} - Not found`);
    console.log(`   └─ Expected: ${check.path}`);
    allPassed = false;
  }
});

// Check for asset files
console.log('\n📦 Checking static assets...');
try {
  const staticDir = path.join(BUILD_DIR, 'assets', '_next', 'static');
  
  function countFiles(dir) {
    let count = 0;
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        count += countFiles(fullPath);
      } else {
        count++;
      }
    });
    
    return count;
  }
  
  const totalFiles = countFiles(staticDir);
  console.log(`✅ Found ${totalFiles} static files`);
  
  // Check for CSS files
  const cssDir = path.join(staticDir, 'css');
  if (fs.existsSync(cssDir)) {
    const cssFiles = fs.readdirSync(cssDir).filter(f => f.endsWith('.css'));
    console.log(`✅ Found ${cssFiles.length} CSS files`);
  } else {
    console.log('⚠️  No CSS directory found');
  }
  
  // Check for JS chunks
  const chunksDir = path.join(staticDir, 'chunks');
  if (fs.existsSync(chunksDir)) {
    const jsFiles = fs.readdirSync(chunksDir).filter(f => f.endsWith('.js'));
    console.log(`✅ Found ${jsFiles.length} JavaScript chunks`);
  } else {
    console.log('⚠️  No chunks directory found');
  }
} catch (error) {
  console.log('❌ Error checking static assets:', error.message);
  allPassed = false;
}

console.log('\n' + '='.repeat(50));

if (allPassed) {
  console.log('✨ Build output looks good!');
  console.log('\n Next steps:');
  console.log('  1. Commit changes to Git');
  console.log('  2. Push to GitHub');
  console.log('  3. Cloudflare will auto-deploy');
  console.log('  4. Set environment variables in Cloudflare Dashboard\n');
} else {
  console.log('❌ Build output has issues');
  console.log('\n Try:');
  console.log('  1. rm -rf .open-next node_modules');
  console.log('  2. npm install');
  console.log('  3. npm run pages:build');
  console.log('  4. node scripts/verify-build.js\n');
  process.exit(1);
}
