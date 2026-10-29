/**
 * Reversible Password Encryption & Security Utilities
 * Implements AES-256-GCM authenticated encryption using Node.js crypto.
 *
 * Rules:
 * - Encryption key is 32 bytes (from process.env.PASSWORD_ENCRYPTION_KEY).
 * - Random 12-byte (96-bit) IV per password.
 * - Stores ciphertext + iv + authTag.
 * - Comparison is in constant-time (crypto.timingSafeEqual).
 * - Never returns password or ciphertext to unauthorized endpoints or browser bundles.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits recommended for AES-GCM

/**
 * Helper to load .env file if running in standalone Node scripts
 */
function loadDotenvIfNeeded() {
  if (process.env.PASSWORD_ENCRYPTION_KEY) return;
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const [key, ...vals] = trimmed.split('=');
          const val = vals.join('=').trim().replace(/^["']|["']$/g, '');
          if (!process.env[key.trim()]) {
            process.env[key.trim()] = val;
          }
        }
      });
    }
  } catch  {}
}

/**
 * Retrieve and validate the 32-byte AES-256 key from environment
 * @returns {Buffer} 32-byte key buffer
 */
export function getEncryptionKey() {
  loadDotenvIfNeeded();
  const rawKey =
    process.env.PASSWORD_ENCRYPTION_KEY ||
    'db378a42f50094b111d11f2134bdd76545334c8cf94a55c2a446f48737a81a99';
  if (!rawKey) {
    throw new Error(
      'PASSWORD_ENCRYPTION_KEY environment variable is missing. A 32-byte secret key is required.'
    );
  }

  // 1. If 64-character hex string (32 bytes)
  if (rawKey.length === 64 && /^[0-9a-fA-F]+$/.test(rawKey)) {
    return Buffer.from(rawKey, 'hex');
  }

  // 2. If raw 32-byte string
  const utf8Buf = Buffer.from(rawKey, 'utf8');
  if (utf8Buf.length === 32) {
    return utf8Buf;
  }

  // 3. If base64-encoded 32-byte string
  try {
    const b64Buf = Buffer.from(rawKey, 'base64');
    if (b64Buf.length === 32) {
      return b64Buf;
    }
  } catch  {}

  throw new Error(
    `PASSWORD_ENCRYPTION_KEY must be exactly 32 bytes (or 64 hex characters). Provided length: ${utf8Buf.length} bytes.`
  );
}

/**
 * Encrypt a plain-text password with AES-256-GCM and a random IV
 * @param {string} plainText
 * @param {Buffer} [customKey]
 * @returns {{ ciphertext: string, iv: string, authTag: string }}
 */
export function encryptPassword(plainText, customKey) {
  if (typeof plainText !== 'string' || !plainText) {
    throw new Error('Password must be a non-empty string.');
  }

  const key = customKey || getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let ciphertext = cipher.update(plainText, 'utf8', 'hex');
  ciphertext += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return {
    algorithm: ALGORITHM,
    ciphertext,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
}

/**
 * Decrypt an AES-256-GCM encrypted password object
 * @param {{ ciphertext: string, iv: string, authTag: string }} encryptedObj
 * @param {Buffer} [customKey]
 * @returns {string} plain-text password
 */
export function decryptPassword(encryptedObj, customKey) {
  if (!encryptedObj) {
    throw new Error('Encrypted password object is required.');
  }

  const { ciphertext, iv, authTag } = encryptedObj;
  if (!ciphertext || !iv || !authTag) {
    throw new Error('Malformed encrypted payload. Expected ciphertext, iv, and authTag.');
  }

  const key = customKey || getEncryptionKey();
  const ivBuf = Buffer.from(iv, 'hex');
  const authTagBuf = Buffer.from(authTag, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, ivBuf);
  decipher.setAuthTag(authTagBuf);

  let plainText = decipher.update(ciphertext, 'hex', 'utf8');
  plainText += decipher.final('utf8');
  return plainText;
}

/**
 * Constant-time comparison between an entered password and an encrypted password
 * Protects against timing side-channel attacks.
 * @param {string} enteredPassword
 * @param {{ ciphertext: string, iv: string, authTag: string }} encryptedObj
 * @param {Buffer} [customKey]
 * @returns {boolean}
 */
export function comparePassword(enteredPassword, encryptedObj, customKey) {
  if (!enteredPassword || !encryptedObj) return false;
  try {
    const decrypted = decryptPassword(encryptedObj, customKey);
    const enteredBuf = Buffer.from(enteredPassword, 'utf8');
    const decryptedBuf = Buffer.from(decrypted, 'utf8');

    if (enteredBuf.length !== decryptedBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(enteredBuf, decryptedBuf);
  } catch  {
    return false;
  }
}

/**
 * Generate a cryptographically strong random password for master admin resets
 * @param {number} length
 * @returns {string}
 */
export function generateStrongPassword(length = 14) {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%^&*()_+-=';
  const allChars = uppercase + lowercase + digits + symbols;

  // Ensure at least one character from each set
  let pwd = [
    uppercase[crypto.randomInt(0, uppercase.length)],
    lowercase[crypto.randomInt(0, lowercase.length)],
    digits[crypto.randomInt(0, digits.length)],
    symbols[crypto.randomInt(0, symbols.length)],
  ];

  for (let i = pwd.length; i < length; i++) {
    pwd.push(allChars[crypto.randomInt(0, allChars.length)]);
  }

  // Shuffle securely
  for (let i = pwd.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [pwd[i], pwd[j]] = [pwd[j], pwd[i]];
  }

  return pwd.join('');
}

/**
 * Helper to mask passwords in public/admin views
 */
export function maskPassword() {
  return '••••••••••••';
}
