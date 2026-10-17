import {
  randomBytes,
  createCipheriv,
  createDecipheriv,
  createHash,
} from 'crypto';

const ALGORITHM = 'aes-256-gcm';

/**
 * Cifra `plain` con AES-256-GCM usando `key` (hex de 64 caracteres / 32 bytes).
 * Formato almacenado: iv:authTag:ciphertext (todo en hex).
 */
export function encryptSecret(plain: string, key: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, Buffer.from(key, 'hex'), iv);
  const encrypted = Buffer.concat([
    cipher.update(plain, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Descifra un valor generado por `encryptSecret` usando `key` (hex de 64
 * caracteres / 32 bytes).
 */
export function decryptSecret(stored: string, key: string): string {
  const [ivHex, authTagHex, dataHex] = stored.split(':');
  const decipher = createDecipheriv(
    ALGORITHM,
    Buffer.from(key, 'hex'),
    Buffer.from(ivHex, 'hex')
  );
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

/**
 * Hash determinístico (SHA-256, hex) para tokens de un solo uso o de sesión
 * que se guardan en DB solo para poder buscarlos por igualdad exacta
 * (refresh tokens, tokens de reset de contraseña, tokens de verificación de
 * email). No usar para contraseñas — ahí bcrypt sigue siendo correcto
 * porque no necesitamos buscar por igualdad, solo comparar.
 * SHA-256 simple (no HMAC) es apropiado aquí porque el "secreto" ya es un
 * valor aleatorio de alta entropía (JWT firmado o uuidv4) generado por el
 * propio servidor, no una contraseña de usuario adivinable.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
