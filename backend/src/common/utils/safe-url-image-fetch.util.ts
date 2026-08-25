import { BadRequestException } from '@nestjs/common';
import { promises as dns } from 'dns';
import * as net from 'net';
import * as https from 'https';
import { URL } from 'url';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB, igual límite que la subida manual
const FETCH_TIMEOUT_MS = 8000;

const ALLOWED_CONTENT_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

// Magic numbers para verificar que el contenido real es una imagen del tipo
// declarado — un servidor malicioso puede mentir en el header Content-Type.
const MAGIC_NUMBERS: { type: string; bytes: number[] }[] = [
  { type: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { type: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { type: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38] },
  // WebP: 'RIFF'....'WEBP' — se valida por separado abajo (firma no contigua)
];

function isPrivateOrReservedIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    const [a, b] = parts;
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 127) return true; // loopback
    if (a === 169 && b === 254) return true; // link-local
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 0) return true; // 0.0.0.0/8
    if (a >= 224) return true; // multicast/reserved
    return false;
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === '::1') return true; // loopback
    if (lower.startsWith('fe80:')) return true; // link-local
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique local
    if (lower.startsWith('::ffff:')) {
      // IPv4-mapped: revalidar la parte v4
      const v4 = lower.split(':').pop()!;
      if (net.isIPv4(v4)) return isPrivateOrReservedIp(v4);
    }
    return false;
  }
  return true; // no es una IP reconocible, tratar como no seguro
}

function detectImageType(buffer: Buffer): string | null {
  for (const { type, bytes } of MAGIC_NUMBERS) {
    if (bytes.every((b, i) => buffer[i] === b)) return type;
  }
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

export interface FetchedImage {
  buffer: Buffer;
  contentType: string;
  extension: string;
}

/**
 * Descarga una imagen desde una URL provista por el usuario de forma segura:
 * resuelve el DNS y rechaza IPs privadas/loopback/reservadas (mitiga SSRF),
 * fuerza HTTPS, limita tamaño y tiempo, y verifica que el contenido sea
 * realmente una imagen (magic numbers) y no solo lo que diga el header.
 */
export async function fetchImageFromUrlSafely(rawUrl: string): Promise<FetchedImage> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new BadRequestException('URL de imagen inválida');
  }

  if (url.protocol !== 'https:') {
    throw new BadRequestException('La URL de imagen debe usar HTTPS');
  }

  let resolvedIp: string;
  try {
    const { address } = await dns.lookup(url.hostname);
    resolvedIp = address;
  } catch {
    throw new BadRequestException('No se pudo resolver la URL de imagen');
  }

  if (isPrivateOrReservedIp(resolvedIp)) {
    throw new BadRequestException('URL de imagen no permitida');
  }

  const buffer = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;

    const req = https.request(
      {
        // Conectamos directo a la IP ya validada (evita TOCTOU/DNS rebinding
        // entre la resolución y la conexión real) pero preservamos el
        // hostname original para SNI/Host/certificado.
        host: resolvedIp,
        servername: url.hostname,
        headers: { Host: url.hostname },
        path: url.pathname + url.search,
        method: 'GET',
        timeout: FETCH_TIMEOUT_MS,
        rejectUnauthorized: true,
      },
      (res) => {
        if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
          res.destroy();
          reject(new BadRequestException(`No se pudo descargar la imagen (HTTP ${res.statusCode})`));
          return;
        }

        res.on('data', (chunk: Buffer) => {
          totalBytes += chunk.length;
          if (totalBytes > MAX_IMAGE_BYTES) {
            res.destroy();
            reject(new BadRequestException('La imagen supera el tamaño máximo permitido (5 MB)'));
            return;
          }
          chunks.push(chunk);
        });
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      }
    );

    req.on('timeout', () => {
      req.destroy(new BadRequestException('Tiempo de espera agotado al descargar la imagen'));
    });
    req.on('error', (err) => {
      reject(err instanceof BadRequestException ? err : new BadRequestException('No se pudo descargar la imagen'));
    });
    req.end();
  });

  const detectedType = detectImageType(buffer);
  if (!detectedType || !ALLOWED_CONTENT_TYPES[detectedType]) {
    throw new BadRequestException('El contenido de la URL no es una imagen válida (jpeg, png, webp, gif)');
  }

  return {
    buffer,
    contentType: detectedType,
    extension: ALLOWED_CONTENT_TYPES[detectedType],
  };
}
