/**
 * Detecta y oculta datos de contacto directo en texto libre (chat, notas,
 * descripciones). La conversación entre cliente y proveedor se hace dentro de
 * WorkPlace: compartir teléfonos, correos, enlaces de mensajería o usuarios
 * de redes permite cerrar el trato por fuera de la plataforma.
 */
const DIGIT_WORDS =
  '(?:cero|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|dieciséis|dieciseis|diecisiete|dieciocho|diecinueve|veinte|treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa|cien)';

const PATTERNS: { reason: string; regex: RegExp }[] = [
  {
    reason: 'enlace de mensajería o red social',
    regex:
      /\b(?:https?:\/\/)?(?:www\.)?(?:wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com|t\.me|telegram\.me|instagram\.com|facebook\.com|fb\.me|m\.me|tiktok\.com|x\.com|twitter\.com)\/?\S*/gi,
  },
  {
    reason: 'correo electrónico',
    regex:
      /[A-Z0-9._%+-]+\s*(?:@|\(at\)|\[at\]|\barroba\b)\s*[A-Z0-9-]+(?:\s*(?:\.|\(dot\)|\[dot\]|\bpunto\b)\s*[A-Z0-9-]+)+/gi,
  },
  {
    // Números escritos en letras para esquivar el filtro.
    reason: 'número de teléfono escrito en letras',
    regex: new RegExp(
      `\\b${DIGIT_WORDS}(?:[\\s,.\\-]+(?:y\\s+)?${DIGIT_WORDS}){6,}\\b`,
      'gi'
    ),
  },
  {
    reason: 'usuario de red social',
    regex: /(?:^|[\s(])@[A-Za-z0-9._]{3,}/g,
  },
  {
    reason: 'pedido de contacto por fuera de la app',
    regex:
      /\b(?:whats?app|wasap|guasap|wsp|telegram|instagram|insta|signal|mi\s+(?:n[uú]mero|cel(?:ular)?|tel[eé]fono|correo|email|ig))\b/gi,
  },
];

// Candidatos a teléfono: 7+ dígitos aunque vengan separados (0414-123.45.67,
// +58 (414) 123 4567, 0 4 1 4 1 2 3 4 5 6 7). Se filtran después con
// looksLikePhone para no confundir montos en bolívares (Bs 1.250.000,00).
const PHONE_CANDIDATE = /\+?\d(?:[\s().\-_/]*\d){6,}/g;
const CURRENCY_BEFORE =
  /(?:bs\.?s?|bs\.f|ves|usd|us\$|\$|ref\.?|precio|monto|total|cuesta|cobro|pago)\s*:?\s*$/i;
const CURRENCY_AFTER =
  /^\s*(?:,\d{1,2}\b|bs\b|bs\.|bol[ií]vares|ves\b|usd\b|d[oó]lares|\$)/i;

function looksLikePhone(match: string, before: string, after: string) {
  const digits = match.replace(/\D/g, '');
  if (CURRENCY_BEFORE.test(before) || CURRENCY_AFTER.test(after)) return false;
  // Venezuela: 0414..., 0212..., 58414..., +58 ...
  if (/^(?:0|58)\d{9,11}$/.test(digits)) return true;
  // Número local de 7 dígitos con forma de teléfono (123-4567, 123 45 67).
  if (digits.length === 7 && /\d{3}[\s.-]\d{2}[\s.-]?\d{2}/.test(match)) {
    return true;
  }
  // 7-9 dígitos sin puntos de miles ni coma decimal: muy probablemente un
  // teléfono escrito de corrido o separado por espacios.
  if (
    digits.length >= 7 &&
    digits.length <= 12 &&
    !/\d\.\d{3}(?:\.|$)/.test(match)
  ) {
    return true;
  }
  return false;
}

function findPhones(text: string): { start: number; end: number }[] {
  const found: { start: number; end: number }[] = [];
  PHONE_CANDIDATE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = PHONE_CANDIDATE.exec(text))) {
    const start = m.index;
    const end = start + m[0].length;
    if (
      looksLikePhone(
        m[0],
        text.slice(Math.max(0, start - 12), start),
        text.slice(end, end + 12)
      )
    ) {
      found.push({ start, end });
    }
  }
  return found;
}

export const CONTACT_INFO_NOT_ALLOWED_MESSAGE =
  'Por seguridad, toda la conversación se hace dentro de WorkPlace: no compartas teléfonos, correos, enlaces ni usuarios de redes sociales.';

export const REDACTED_CONTACT = '[dato de contacto oculto]';

/** Motivos detectados (vacío si el texto no contiene datos de contacto). */
export function detectContactInfo(text: string | null | undefined): string[] {
  if (!text) return [];
  const reasons = new Set<string>();
  if (findPhones(text).length) reasons.add('número de teléfono');
  for (const { reason, regex } of PATTERNS) {
    regex.lastIndex = 0;
    if (regex.test(text)) reasons.add(reason);
    regex.lastIndex = 0;
  }
  return [...reasons];
}

/** Reemplaza los datos de contacto por un marcador (p. ej. mensajes antiguos). */
export function redactContacts(text: string): {
  text: string;
  redacted: boolean;
} {
  let redacted = false;
  let result = text;
  // Teléfonos primero, de atrás hacia adelante para no correr los índices.
  for (const { start, end } of findPhones(result).reverse()) {
    result = result.slice(0, start) + REDACTED_CONTACT + result.slice(end);
    redacted = true;
  }
  for (const { regex } of PATTERNS) {
    regex.lastIndex = 0;
    result = result.replace(regex, (match) => {
      redacted = true;
      // Conserva el espacio/paréntesis inicial del patrón de @usuario.
      const lead = /^[\s(]/.test(match) ? match[0] : '';
      return `${lead}${REDACTED_CONTACT}`;
    });
  }
  return { text: result, redacted };
}
