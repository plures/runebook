#!/usr/bin/env node
/**
 * Sync a release version across every version-bearing file in the repository.
 *
 * Invoked by the reusable release workflow (plures/.github) as:
 *   node scripts/sync-release-version.mjs <version>
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

export function isValidVersion(version) {
  return typeof version === 'string' && SEMVER.test(version);
}

/** Replace the first top-level `version = "..."` entry of a Cargo manifest. */
export function setCargoTomlVersion(contents, version) {
  return contents.replace(/^version = ".*"$/m, `version = "${version}"`);
}

/** Replace the version of a named package entry in a Cargo.lock file. */
export function setCargoLockVersion(contents, name, version) {
  const pattern = new RegExp(`(name = "${name}"\\nversion = )".*"`, 'm');
  return contents.replace(pattern, `$1"${version}"`);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function syncJsonVersion(path, version, updated) {
  if (!existsSync(path)) return;
  const json = readJson(path);
  json.version = version;
  if (json.packages && json.packages['']) {
    json.packages[''].version = version;
  }
  writeJson(path, json);
  updated.push(path);
}

function syncTextVersion(path, version, updated, transform) {
  if (!existsSync(path)) return;
  const contents = readFileSync(path, 'utf8');
  const next = transform(contents, version);
  if (next !== contents) {
    writeFileSync(path, next);
  }
  updated.push(path);
}

export function syncVersion(version, root) {
  if (!isValidVersion(version)) {
    throw new Error(`Invalid semver version: ${version}`);
  }

  const updated = [];
  syncJsonVersion(join(root, 'package.json'), version, updated);
  syncJsonVersion(join(root, 'package-lock.json'), version, updated);
  syncJsonVersion(join(root, 'src-tauri/tauri.conf.json'), version, updated);
  syncTextVersion(join(root, 'src-tauri/Cargo.toml'), version, updated, setCargoTomlVersion);
  syncTextVersion(join(root, 'src-tauri/Cargo.lock'), version, updated, (contents, next) =>
    setCargoLockVersion(contents, 'runebook', next)
  );

  return updated;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const version = process.argv[2];
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

  try {
    const updated = syncVersion(version, root);
    console.log(`Synced version ${version}:`);
    for (const path of updated) {
      console.log(`  ✓ ${path}`);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
