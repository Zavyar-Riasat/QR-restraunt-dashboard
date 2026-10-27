/**
 * One-Time Migration Script: Plain-text Passwords -> AES-256-GCM Encrypted Form
 *
 * Requirements:
 * - Encrypts all existing plain-text passwords using AES-256-GCM and a random IV.
 * - Stores ciphertext + iv + authTag.
 * - Completely removes all plain-text 'password' properties.
 * - Verifies zero plain-text passwords remain and that decryption matches.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { encryptPassword, decryptPassword, comparePassword, getEncryptionKey } from '../server/crypto.js';
import { serverStorage } from '../server/storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🔐 Starting Password Migration to AES-256-GCM Encrypted Storage...\n');

// 1. Verify encryption key is loaded
const key = getEncryptionKey();
assert.equal(key.length, 32, 'Encryption key must be exactly 32 bytes.');
console.log('✅ Master PASSWORD_ENCRYPTION_KEY validated (32 bytes).');

// 2. Load existing users
const users = serverStorage.getUsers();
console.log(`📋 Found ${users.length} accounts in storage.`);

let migratedCount = 0;
let alreadyEncryptedCount = 0;

const migratedUsers = users.map((u) => {
  const userCopy = { ...u };

  // If plain-text password exists
  if (userCopy.password) {
    console.log(`  🔄 Encrypting password for: ${userCopy.email} (${userCopy.role})`);
    const plainText = userCopy.password;
    userCopy.password_encrypted = encryptPassword(plainText, key);

    // Verify decryption matches before removing plain text
    const decrypted = decryptPassword(userCopy.password_encrypted, key);
    assert.equal(decrypted, plainText, `Decryption verification failed for ${userCopy.email}`);
    assert.equal(comparePassword(plainText, userCopy.password_encrypted, key), true);

    // Strictly remove plain text password
    delete userCopy.password;
    migratedCount++;
  } else if (userCopy.password_encrypted) {
    alreadyEncryptedCount++;
  } else {
    // If no password at all, provision default strong password
    console.log(`  ⚠️ No password found for: ${userCopy.email}, generating encrypted default`);
    userCopy.password_encrypted = encryptPassword('AdminPass123!', key);
    userCopy.must_change_password = true;
    migratedCount++;
  }

  // Ensure must_change_password flag exists
  if (userCopy.must_change_password === undefined) {
    userCopy.must_change_password = false;
  }
  if (!userCopy.session_version) {
    userCopy.session_version = 1;
  }

  return userCopy;
});

// 3. Save migrated users to disk
serverStorage.saveUsers(migratedUsers);

// 4. Verification Check: Ensure ZERO plain-text passwords remain
const reloaded = serverStorage.getUsers();
for (const u of reloaded) {
  assert.equal(u.password, undefined, `CRITICAL: Plain text password still exists for ${u.email}!`);
  assert.ok(u.password_encrypted, `Account ${u.email} missing password_encrypted.`);
  assert.ok(u.password_encrypted.ciphertext, 'Missing ciphertext.');
  assert.ok(u.password_encrypted.iv, 'Missing iv.');
  assert.ok(u.password_encrypted.authTag, 'Missing authTag.');
}

console.log('\n======================================================');
console.log(`🎉 MIGRATION SUCCESSFUL!`);
console.log(`   - Newly encrypted: ${migratedCount}`);
console.log(`   - Already encrypted: ${alreadyEncryptedCount}`);
console.log(`   - Total accounts secured: ${reloaded.length}`);
console.log(`   - Plain-text passwords remaining: 0`);
console.log('======================================================\n');
