import { env } from "@/app/env";
import { Buffer } from "buffer";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto";
import {
  CRYPTO_AUTH_TAG_SPLIT_INDEX,
  CRYPTO_IV_LENGTH_BYTES,
  CRYPTO_RANDOM_BYTES_LENGTH,
} from "../workflow";

const algorithm = "aes-256-gcm";

/**
 * Derive the symmetric key used for encryption from the environment.
 *
 * @returns Raw encryption key
 */
function getKey(): Buffer {
  const keyString = env.AUTH_SECRET;
  return Buffer.from(keyString, "hex");
}

/**
 * Encrypt arbitrary text using AES-GCM.
 *
 * @param text - Plaintext value to encrypt
 * @returns Encrypted string containing IV and auth tag
 */
export function encrypt(text: string): string {
  const iv = randomBytes(CRYPTO_IV_LENGTH_BYTES);
  const cipher = createCipheriv(algorithm, getKey(), iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return iv.toString("hex") + ":" + authTag.toString("hex") + ":" + encrypted;
}

/**
 * Decrypt a value previously encrypted with `encrypt`.
 *
 * @param encryptedData - Output from {@link encrypt}
 * @returns Decrypted plaintext
 */
export function decrypt(encryptedData: string): string {
  const parts = encryptedData.split(":");
  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encrypted = parts[CRYPTO_AUTH_TAG_SPLIT_INDEX];

  const decipher = createDecipheriv(algorithm, getKey(), iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Generate a cryptographically strong state value.
 *
 * @returns Random hex string
 */
export function generateState(): string {
  return randomBytes(CRYPTO_RANDOM_BYTES_LENGTH).toString("hex");
}

/**
 * Create a PKCE code verifier.
 *
 * @returns Random base64url string
 */
export function generateCodeVerifier(): string {
  return randomBytes(CRYPTO_RANDOM_BYTES_LENGTH).toString("base64url");
}

/**
 * Convert a verifier into a code challenge string.
 *
 * @param verifier - Code verifier string
 * @returns Corresponding code challenge
 */
export function generateCodeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}
