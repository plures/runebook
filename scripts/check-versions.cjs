#!/usr/bin/env node
/**
 * Script to verify that all version numbers are synchronized across the project
 */

const fs = require('fs');
const path = require('path');

function getPackageJsonVersion() {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  return pkg.version;
}

function getCargoTomlVersion() {
  const cargo = fs.readFileSync('src-tauri/Cargo.toml', 'utf8');
  const match = cargo.match(/^version = "(.+)"$/m);
  return match ? match[1] : null;
}

function getTauriConfVersion() {
  const config = JSON.parse(fs.readFileSync('src-tauri/tauri.conf.json', 'utf8'));
  return config.version;
}

function main() {
  const packageVersion = getPackageJsonVersion();
  const cargoVersion = getCargoTomlVersion();
  const tauriVersion = getTauriConfVersion();

  console.log('Version Check:');
  console.log('--------------');
  console.log(`package.json:           ${packageVersion}`);
  console.log(`src-tauri/Cargo.toml:   ${cargoVersion}`);
  console.log(`src-tauri/tauri.conf.json: ${tauriVersion}`);
  console.log('');

  const allMatch = packageVersion === cargoVersion && packageVersion === tauriVersion;

  if (allMatch) {
    console.log('✅ All versions are synchronized!');
    process.exit(0);
  } else {
    console.error('❌ Version mismatch detected!');
    console.error('');
    console.error('Run the following commands to fix:');
    console.error('1. Update package.json to the correct version');
    console.error('2. Run: npm install');
    console.error('3. Run the version-bump workflow from GitHub Actions');
    process.exit(1);
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

module.exports = { getPackageJsonVersion, getCargoTomlVersion, getTauriConfVersion };
