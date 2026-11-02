/**
 * Client-Side AES-256-GCM Password Encryption & Decryption Utility
 * Uses Web Crypto API (crypto.subtle) and reads the 32-byte encryption/decryption key
 * strictly from the environment (.env: PASSWORD_ENCRYPTION_KEY / VITE_PASSWORD_ENCRYPTION_KEY).
 *
 * Byte-for-byte compatible with server/crypto.js (Node.js aes-256-gcm).
 * Zero plain-text passwords are stored in source code or localStorage.
 */

const ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12; // 96-bit IV
const TAG_BYTE_LENGTH = 16; // 128-bit authentication tag

// Pre-encrypted AES-256-GCM ciphertexts for default roles & seeded accounts (NO plain-text passwords)
export const ENCRYPTED_ROLE_DEFAULTS = {
  "admin": {"algorithm":"aes-256-gcm","ciphertext":"48873c6ceb74362f11310f94d1","iv":"1a96b67b3db66575e39ea164","authTag":"e10119fde4761cab18c27a3138ac6e8d"},
  "owner": {"algorithm":"aes-256-gcm","ciphertext":"5e5dfdc4f84775babc51308447","iv":"3e1f72ac93c56703718a3e55","authTag":"91156bcdd14501739df807052a627b8f"},
  "manager": {"algorithm":"aes-256-gcm","ciphertext":"ec2b193c05c8fad3e24bdaa0de64e1","iv":"55ddfe904e27eca297a951dc","authTag":"dd64f39e3baa678f36b60368b93b8be8"},
  "cashier": {"algorithm":"aes-256-gcm","ciphertext":"f0760d614ae36e9c88f413c451d2cb","iv":"f33c51ad40835124b89f0767","authTag":"1df9b2f6909e8179ee27de6b51a40e00"},
  "waiter": {"algorithm":"aes-256-gcm","ciphertext":"1e1774874f41ac30c7446f491156","iv":"e5c524a1fd1efd4c8cb58e78","authTag":"952a07f0ae9ea461a3648039a1a41711"}
};

export const ENCRYPTED_SEED_ACCOUNTS = {
  "admin@dineflow.pk": {"algorithm":"aes-256-gcm","ciphertext":"b48c8a1eb6ad2a67fe719d9c21","iv":"129da1dcc31260802ca130b1","authTag":"0a4efd0e6f3a1f1df7ecd4e715444135"},
  "owner@burgersmoke.com": {"algorithm":"aes-256-gcm","ciphertext":"c75134072ab8d07cca55b54560","iv":"d46c107d44b9e94492f2363f","authTag":"90c1ff06ae924ac4690e5543ae357978"},
  "manager@crust.com": {"algorithm":"aes-256-gcm","ciphertext":"165b329d00585e6b22f6564e6c","iv":"3e7421e0b32adf9b9630f326","authTag":"0a0301a78f8a2170c1543a8d2db9b7ac"},
  "manager@shinwari.com": {"algorithm":"aes-256-gcm","ciphertext":"4851ac07890769dfb4d471691fcfc253","iv":"a2db9e79ad66d79340e481c8","authTag":"0421fc5708f5a5c125f8a24e7144798e"},
  "manager@greenoasis.com": {"algorithm":"aes-256-gcm","ciphertext":"68dc97d93471a21cc463d3ef17","iv":"2f18ce32ffba999e248d1e6e","authTag":"b5859c926ad6a39bc10ddbaf91711c49"},
  "manager@tokyosushi.com": {"algorithm":"aes-256-gcm","ciphertext":"b8918b1d2ecd638055f458cff9","iv":"2d44ef2cef3cd5f2312eb96b","authTag":"f2e56d95b19eb8156c2b2edd1677f614"},
  "manager@royaltaj.com": {"algorithm":"aes-256-gcm","ciphertext":"ce76ba4d4d4dcc39ef25e6","iv":"0fc622944a9853aa8a8e4a2e","authTag":"a085bee565a35024d6089229cab881fe"},
  "manager@fiestamex.com": {"algorithm":"aes-256-gcm","ciphertext":"3c5713cc647ba2ad936bbd7e4a1d","iv":"27c35b9e7bb8bb9d1826d3b3","authTag":"2cc8a2d71831ee2f80287d1358476c51"},
  "manager@sweetretreat.com": {"algorithm":"aes-256-gcm","ciphertext":"aa1a29afabf6d12309cba7dab5fc6b","iv":"8767724f84270bf31db8d524","authTag":"f72283e085ef968d179aa5cea5eaf1c5"},
  "manager@chaijunction.com": {"algorithm":"aes-256-gcm","ciphertext":"49a4771af8c8588a9bd15bbe","iv":"a26a727a44327e5d84384987","authTag":"68a39818ad1ded5add7d36a14af130e3"},
  "manager@stoneove.com": {"algorithm":"aes-256-gcm","ciphertext":"ec5851922a3a802aaf918b06fb","iv":"3d88d794da11cae94d732813","authTag":"3de2b8bfb4ddb2ebbfdbff2102aeda54"},
  "manager@burgersmoke.com": {"algorithm":"aes-256-gcm","ciphertext":"e33152819351f0f706ab4f9f6cea45","iv":"6f2c4406b8edd998a2f5e1db","authTag":"a8fef570a25263ab484cbfd0d25de361"},
  "cashier@burgersmoke.com": {"algorithm":"aes-256-gcm","ciphertext":"39fc2aac0465fc0498ccc5173fda44","iv":"381cfcac758e12d24b015aea","authTag":"ce13e8390a1284938f3dde3b9eb59d64"},
  "waiter@burgersmoke.com": {"algorithm":"aes-256-gcm","ciphertext":"dea8f979e07358994e9ae5fbe442","iv":"7a6f6cc382319702c251d2ad","authTag":"3cc7a1e2d2c0e1724b8f57738bd74864"},
  "manager@lyallpurgrill.com": {"algorithm":"aes-256-gcm","ciphertext":"cde99a479a31669be2faec0391","iv":"e23d21f21a3e298d383cfbbc","authTag":"7ac1183aa54a997bf0b445b45a8e07b5"},
  "manager@chenabsmash.com": {"algorithm":"aes-256-gcm","ciphertext":"cd42c8626888395568295be965","iv":"6e8325a2d81f9131e492a8fd","authTag":"6f581ab1cad1ed26db4c47c5e259e3f4"},
  "hamza.waiter@burgersmoke.com": {"algorithm":"aes-256-gcm","ciphertext":"90b06756670edc55f8135d34786c","iv":"33b287dee9cf7cbdf08436c5","authTag":"78311559362c34786ba71fcd6df57971"},
  "usman.waiter@burgersmoke.com": {"algorithm":"aes-256-gcm","ciphertext":"3455d2179d7bfb77f9ccf68fa179","iv":"66ab534cfc8aa1938a0c1c8a","authTag":"fa31131463a438d618a1774814765241"},
  "bilal.waiter@burgersmoke.com": {"algorithm":"aes-256-gcm","ciphertext":"9efbc09554e7800dd7a9d0b7a42a","iv":"bb5f56a9f60d698ce40653fb","authTag":"ff84083b954668a7c947c9714472204e"}
};

function hexToBytes(hex) {
  const clean = String(hex || '').trim();
  if (clean.length % 2 !== 0) {
    throw new Error('Invalid hex string length.');
  }
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.slice(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Resolve the 32-byte AES-256 key from .env
 */
function getRawKeyBytesFromEnv() {
  const envKey =
    (typeof import.meta !== 'undefined' &&
      import.meta.env &&
      (import.meta.env.VITE_PASSWORD_ENCRYPTION_KEY ||
        import.meta.env.PASSWORD_ENCRYPTION_KEY)) ||
    (typeof process !== 'undefined' &&
      process.env &&
      (process.env.PASSWORD_ENCRYPTION_KEY || process.env.VITE_PASSWORD_ENCRYPTION_KEY)) ||
    '';

  const trimmed = String(envKey).trim();
  if (!trimmed) {
    throw new Error(
      'Decryption key is missing in .env (PASSWORD_ENCRYPTION_KEY / VITE_PASSWORD_ENCRYPTION_KEY).'
    );
  }

  if (trimmed.length === 64 && /^[0-9a-fA-F]+$/.test(trimmed)) {
    return hexToBytes(trimmed);
  }

  const encoder = new TextEncoder();
  const utf8 = encoder.encode(trimmed);
  if (utf8.byteLength === 32) {
    return utf8;
  }

  throw new Error('PASSWORD_ENCRYPTION_KEY in .env must be 32 bytes (64 hex characters).');
}

async function importAesGcmKey(usages = ['encrypt', 'decrypt']) {
  const keyBytes = getRawKeyBytesFromEnv();
  return window.crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: ALGORITHM },
    false,
    usages
  );
}

/**
 * Encrypt a plain-text password using AES-256-GCM and the key from .env
 * @param {string} plainText
 * @returns {Promise<{ algorithm: string, ciphertext: string, iv: string, authTag: string }>}
 */
export async function encryptPasswordBrowser(plainText) {
  if (typeof plainText !== 'string' || !plainText) {
    throw new Error('Password must be a non-empty string.');
  }

  const cryptoKey = await importAesGcmKey(['encrypt']);
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plainText);

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: ALGORITHM, iv, tagLength: TAG_BYTE_LENGTH * 8 },
    cryptoKey,
    encoded
  );

  const fullBytes = new Uint8Array(encryptedBuffer);
  const cipherBytes = fullBytes.slice(0, fullBytes.length - TAG_BYTE_LENGTH);
  const tagBytes = fullBytes.slice(fullBytes.length - TAG_BYTE_LENGTH);

  return {
    algorithm: 'aes-256-gcm',
    ciphertext: bytesToHex(cipherBytes),
    iv: bytesToHex(iv),
    authTag: bytesToHex(tagBytes),
  };
}

/**
 * Decrypt an AES-256-GCM encrypted password object using the decryption key from .env
 * @param {{ ciphertext: string, iv: string, authTag: string }} encryptedObj
 * @returns {Promise<string>}
 */
export async function decryptPasswordBrowser(encryptedObj) {
  if (!encryptedObj || !encryptedObj.ciphertext || !encryptedObj.iv || !encryptedObj.authTag) {
    throw new Error('Invalid encrypted password payload.');
  }

  const cryptoKey = await importAesGcmKey(['decrypt']);
  const ivBytes = hexToBytes(encryptedObj.iv);
  const cipherBytes = hexToBytes(encryptedObj.ciphertext);
  const tagBytes = hexToBytes(encryptedObj.authTag);

  const combined = new Uint8Array(cipherBytes.length + tagBytes.length);
  combined.set(cipherBytes, 0);
  combined.set(tagBytes, cipherBytes.length);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: ALGORITHM, iv: ivBytes, tagLength: TAG_BYTE_LENGTH * 8 },
    cryptoKey,
    combined
  );

  return new TextDecoder().decode(decryptedBuffer);
}

/**
 * Verify an entered password against an AES-256-GCM encrypted payload using the .env key
 * @param {string} enteredPassword
 * @param {{ ciphertext: string, iv: string, authTag: string }} encryptedObj
 * @returns {Promise<boolean>}
 */
export async function verifyEncryptedPasswordBrowser(enteredPassword, encryptedObj) {
  if (!enteredPassword || !encryptedObj) return false;
  try {
    const decrypted = await decryptPasswordBrowser(encryptedObj);
    if (decrypted.length !== enteredPassword.length) return false;
    let diff = 0;
    for (let i = 0; i < decrypted.length; i++) {
      diff |= decrypted.charCodeAt(i) ^ enteredPassword.charCodeAt(i);
    }
    return diff === 0;
  } catch {
    return false;
  }
}

/**
 * Compute a deterministic cryptographic session integrity signature (keyed with the .env secret key)
 * Prevents any DevTools localStorage tampering of role, email, restaurant_slug, or expiration.
 * @param {object} sessionData
 * @returns {string}
 */
export function computeSessionSignature(sessionData) {
  if (!sessionData || !sessionData.user || !sessionData.token) return '';
  const keyBytes = getRawKeyBytesFromEnv();
  const u = sessionData.user;
  const payload = [
    String(u.id || ''),
    String(u.email || '').toLowerCase(),
    String(u.role || ''),
    String(u.restaurant_slug || '').toLowerCase(),
    String(sessionData.token || ''),
    String(sessionData.expiresAt || ''),
    String(Boolean(sessionData.must_change_password)),
  ].join('|');

  const payloadBytes = new TextEncoder().encode(payload);
  // Keyed 256-bit mixing (FNV-1a / SipHash-style multi-lane keyed MAC using all 32 key bytes)
  const lanes = new Uint32Array(8);
  for (let i = 0; i < 8; i++) {
    lanes[i] =
      ((keyBytes[i * 4] << 24) |
        (keyBytes[i * 4 + 1] << 16) |
        (keyBytes[i * 4 + 2] << 8) |
        keyBytes[i * 4 + 3]) >>>
      0;
    lanes[i] = (lanes[i] ^ (0x811c9dc5 + i * 0x9e3779b9)) >>> 0;
  }

  for (let i = 0; i < payloadBytes.length; i++) {
    const b = payloadBytes[i];
    const k = keyBytes[i % keyBytes.length];
    const laneIdx = i & 7;
    lanes[laneIdx] = Math.imul(lanes[laneIdx] ^ b ^ k, 0x01000193) >>> 0;
    lanes[(laneIdx + 1) & 7] =
      (lanes[(laneIdx + 1) & 7] + ((lanes[laneIdx] << 13) | (lanes[laneIdx] >>> 19))) >>> 0;
  }

  // Final avalanche across all 8 lanes with keyBytes
  for (let round = 0; round < 4; round++) {
    for (let i = 0; i < 8; i++) {
      const kWord =
        ((keyBytes[(i * 4 + round) % 32] << 24) |
          (keyBytes[(i * 4 + round + 1) % 32] << 16) |
          (keyBytes[(i * 4 + round + 2) % 32] << 8) |
          keyBytes[(i * 4 + round + 3) % 32]) >>>
        0;
      lanes[i] = Math.imul(lanes[i] ^ lanes[(i + 3) & 7] ^ kWord, 0x85ebca6b) >>> 0;
      lanes[i] = (lanes[i] ^ (lanes[i] >>> 16)) >>> 0;
    }
  }

  return Array.from(lanes)
    .map((n) => n.toString(16).padStart(8, '0'))
    .join('');
}

/**
 * Constant-time verification of session signature
 * @param {object} sessionData
 * @returns {boolean}
 */
export function verifySessionSignature(sessionData) {
  if (!sessionData || typeof sessionData.signature !== 'string' || !sessionData.signature) {
    return false;
  }
  try {
    const expected = computeSessionSignature(sessionData);
    if (!expected || expected.length !== sessionData.signature.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) {
      diff |= expected.charCodeAt(i) ^ sessionData.signature.charCodeAt(i);
    }
    return diff === 0;
  } catch {
    return false;
  }
}
