import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

const ALGORITHM = 'aes-256-gcm';

/**
 * Cifra `plain` con AES-256-GCM usando `key` (hex de 64 caracteres / 32 bytes).
 * Formato almacenado: iv:authTag:ciphertext (todo en hex).
 */
export function encryptSecret(plain: string, key: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, Buffer.from(key, 'hex'), iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Descifra un valor generado por `encryptSecret` usando `key` (hex de 64
 * caracteres / 32 bytes).
 */
export function decryptSecret(stored: string, key: string): string {
  const [ivHex, authTagHex, dataHex] = stored.split(':');
  const decipher = createDecipheriv(ALGORITHM, Buffer.from(key, 'hex'), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
  return decrypted.toString('utf8');
}
