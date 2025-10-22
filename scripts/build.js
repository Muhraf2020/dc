#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32',
    ...options,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const args = process.argv.slice(2);
const forceCloudflare = args.includes('--cloudflare');
const forceNext = args.includes('--next');
const envHints = [
  process.env.CF_PAGES,
  process.env.CF_PAGES_BRANCH,
  process.env.CF_PAGES_COMMIT_SHA,
  process.env.CF_PAGES_URL,
];
const detectedCloudflare = envHints.some(Boolean);
const useCloudflareBuild = !forceNext && (forceCloudflare || detectedCloudflare);

if (useCloudflareBuild) {
  console.log('Detected Cloudflare Pages environment. Building with OpenNext...');
  run('npx', ['@opennextjs/cloudflare@latest', 'build']);

  const workerSource = path.join('.open-next', 'worker.js');
  const workerTarget = path.join('.open-next', '_worker.js');

  if (fs.existsSync(workerSource)) {
    fs.copyFileSync(workerSource, workerTarget);
    console.log(`Copied ${workerSource} -> ${workerTarget}`);
  } else {
    console.warn(`Expected worker bundle not found at ${workerSource}.`);
  }
} else {
  console.log('Running standard Next.js build...');
  run('next', ['build']);
}
