/**
 * ID generation. Uses the platform `crypto` CSPRNG when available, with a
 * safe fallback. No external dependency.
 */

function randomBytes(byteLength: number): Uint8Array {
  const arr = new Uint8Array(byteLength);
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(arr);
    return arr;
  }
  // Fallback (non-cryptographic) — should rarely run on Hermes/RN.
  for (let i = 0; i < byteLength; i++) arr[i] = Math.floor(Math.random() * 256);
  return arr;
}

const HEX = '0123456789abcdef';

function toHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += HEX[bytes[i] >> 4] + HEX[bytes[i] & 0x0f];
  }
  return out;
}

/** RFC 4122 v4 UUID. */
export function uuid(): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  const b = randomBytes(16);
  // Set version (4) and variant (10xx).
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = toHex(b);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Compact id for ephemeral / non-persistent use. */
export function shortId(length = 8): string {
  return toHex(randomBytes(length / 2)).slice(0, length);
}
