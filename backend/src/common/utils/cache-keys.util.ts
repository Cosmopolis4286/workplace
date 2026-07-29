/**
 * Convenciones de claves de caché Redis compartidas entre dominios. Vive en
 * common/ (no en users/ ni en ningún otro dominio) porque quien construye la
 * clave y quien la invalida no son necesariamente el mismo dominio — ej.
 * menu/plans/settings invalidan el caché de `findById` de un usuario cuando
 * cambian datos que afectan esa respuesta (crear un Restaurant, cambiar
 * accountType), sin necesitar importar UsersService para eso.
 */
export const userFindByIdCacheKey = (id: string) => `user:find-by-id:${id}`;
