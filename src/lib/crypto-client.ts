/**
 * Client-side AES-GCM encryption for item names.
 * Key is derived from household code + per-household salt (from server).
 * Envelope: enc1.<base64url(iv)>.<base64url(ciphertext+tag)>
 */

const APP_PEPPER = "indkobsliste.v1.aes-gcm";
const PBKDF2_ITERATIONS = 210_000;
const IV_BYTES = 12;
const ENC_PREFIX = "enc1.";

export type CryptoSaltHex = string;

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const clean = hex.trim().toLowerCase();
  if (clean.length % 2 !== 0 || !/^[0-9a-f]+$/.test(clean)) {
    throw new Error("Invalid crypto salt");
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function isEncryptedName(value: string): boolean {
  return value.startsWith(ENC_PREFIX);
}

const keyCache = new Map<string, CryptoKey>();

function cacheKey(code: string, saltHex: string): string {
  return `${code.toUpperCase()}::${saltHex.toLowerCase()}`;
}

export async function deriveHouseholdKey(
  code: string,
  saltHex: string,
): Promise<CryptoKey> {
  const id = cacheKey(code, saltHex);
  const cached = keyCache.get(id);
  if (cached) return cached;

  const enc = new TextEncoder();
  const saltBytes = hexToBytes(saltHex);
  // Combine app pepper + household salt so keys are app-scoped
  const combinedSalt = new Uint8Array(saltBytes.length + APP_PEPPER.length);
  combinedSalt.set(saltBytes, 0);
  combinedSalt.set(enc.encode(APP_PEPPER), saltBytes.length);

  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(code.trim().toUpperCase()),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: combinedSalt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );

  keyCache.set(id, key);
  return key;
}

export async function encryptItemName(
  plaintext: string,
  key: CryptoKey,
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const cipherBuf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext),
  );
  return `${ENC_PREFIX}${bytesToBase64Url(iv)}.${bytesToBase64Url(new Uint8Array(cipherBuf))}`;
}

export async function decryptItemName(
  envelope: string,
  key: CryptoKey,
): Promise<string> {
  if (!isEncryptedName(envelope)) return envelope;
  const rest = envelope.slice(ENC_PREFIX.length);
  const dot = rest.indexOf(".");
  if (dot < 0) throw new Error("Corrupt encrypted name");
  const iv = base64UrlToBytes(rest.slice(0, dot));
  const ct = base64UrlToBytes(rest.slice(dot + 1));
  const plainBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    ct as BufferSource,
  );
  return new TextDecoder().decode(plainBuf);
}

/** Decrypt household item names; leave plaintext as-is (pre-migration). */
export async function decryptHouseholdItems<
  T extends { name: string },
>(items: T[], key: CryptoKey): Promise<T[]> {
  return Promise.all(
    items.map(async (item) => {
      if (!isEncryptedName(item.name)) return item;
      try {
        const name = await decryptItemName(item.name, key);
        return { ...item, name };
      } catch {
        return { ...item, name: "…" };
      }
    }),
  );
}
