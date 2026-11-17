-- ADMIN necesita abrir la matriz de permisos desde el sidebar.
-- La edición de destinos sigue restringida por canAssignRole(): ADMIN no
-- puede cambiar permisos de ADMIN/SUPERADMIN ni su propia matriz.
-- Actualizamos la fila existente porque seedPermissions() preserva
-- deliberadamente los ajustes de RolePermission ya persistidos.
UPDATE "role_permissions" AS rp
SET "granted" = TRUE,
    "updatedAt" = CURRENT_TIMESTAMP
FROM "permissions" AS p
WHERE rp."permissionId" = p."id"
  AND rp."role" = 'ADMIN'
  AND p."key" = 'permissions:manage'
  AND rp."granted" = FALSE;
