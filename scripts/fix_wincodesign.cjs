const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const cacheDir = path.join(process.env.LOCALAPPDATA, 'electron-builder', 'Cache', 'winCodeSign');
const sevenZip = path.resolve(__dirname, '../desktop/node_modules/7zip-bin/win/x64/7za.exe');

if (!fs.existsSync(cacheDir)) {
  console.log('Cache dir does not exist yet:', cacheDir);
  process.exit(0);
}

const files = fs.readdirSync(cacheDir);
const archives = files.filter(f => f.endsWith('.7z'));

for (const archive of archives) {
  const archivePath = path.join(cacheDir, archive);
  const extractDir = path.join(cacheDir, path.basename(archive, '.7z'));
  console.log(`Extracting ${archive} to ${extractDir}...`);
  if (!fs.existsSync(extractDir)) {
    fs.mkdirSync(extractDir, { recursive: true });
  }
  try {
    // Extract excluding darwin so macOS symlinks don't fail on Windows non-admin accounts
    execSync(`"${sevenZip}" x -y "-o${extractDir}" "${archivePath}" -xr!darwin`, { stdio: 'inherit' });
    console.log(`✓ Extracted ${archive} successfully!`);
  } catch (err) {
    console.warn('Extraction notice:', err.message);
  }
}
