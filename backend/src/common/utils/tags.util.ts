/**
 * Normaliza un tag para guardarlo: recorta espacios y baja a minúsculas.
 * Todos los módulos que persisten tags (Product, Service, Job) deben pasar
 * por acá antes de guardar, para que la búsqueda sea case-insensitive sin
 * tener que normalizar en cada query de lectura.
 */
export function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase();
}

export function normalizeTags(tags?: string[]): string[] | undefined {
  if (!tags) return undefined;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const t = normalizeTag(raw);
    if (t && !seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}

/**
 * Prisma `hasSome` no hace substring, solo igualdad exacta de elemento —
 * por eso el término de búsqueda del usuario se normaliza igual que al
 * guardar (trim + lowercase). Cubre el caso principal: click en un chip de
 * tag sugerido, o escribir el tag completo. Para "empieza a escribir y
 * sugerir" está el endpoint de tags populares (ese sí hace substring, pero
 * en memoria contra la lista ya acotada de tags existentes).
 */
export function tagSearchCondition(search: string): { hasSome: string[] } {
  return { hasSome: [normalizeTag(search)] };
}
