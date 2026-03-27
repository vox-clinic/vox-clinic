import { createCipheriv, createDecipheriv, randomBytes } from "crypto"
import { env } from "@/lib/env"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12

function getEncryptionKey(): Buffer {
  const key = env.ENCRYPTION_KEY
  if (!key) {
    throw new Error(
      "ENCRYPTION_KEY environment variable is required for token encryption"
    )
  }
  // Key should be 32 bytes (64 hex chars) for AES-256
  return Buffer.from(key, "hex")
}

export function encrypt(plaintext: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, "utf8")
  encrypted = Buffer.concat([encrypted, cipher.final()])
  const tag = cipher.getAuthTag()

  // Format: iv:tag:ciphertext (all base64)
  return [
    iv.toString("base64"),
    tag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":")
}

export function decrypt(encryptedText: string): string {
  const key = getEncryptionKey()
  const parts = encryptedText.split(":")

  if (parts.length !== 3) {
    // Not encrypted (legacy plaintext token) — return as-is for backwards compatibility
    return encryptedText
  }

  const [ivB64, tagB64, ciphertextB64] = parts
  const iv = Buffer.from(ivB64, "base64")
  const tag = Buffer.from(tagB64, "base64")
  const ciphertext = Buffer.from(ciphertextB64, "base64")

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  let decrypted = decipher.update(ciphertext)
  decrypted = Buffer.concat([decrypted, decipher.final()])

  return decrypted.toString("utf8")
}
