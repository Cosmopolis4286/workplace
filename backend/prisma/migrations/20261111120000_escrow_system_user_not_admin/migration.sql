-- El usuario técnico que intermedia las garantías se creaba con rol ADMIN y
-- activo: aparecía en los listados de administradores y se podía usar para
-- iniciar sesión si alguien obtenía su contraseña. Pasa a NORMAL y desactivado;
-- los movimientos de garantía no dependen de ninguna de las dos cosas.
UPDATE "users"
SET "role" = 'NORMAL', "isActive" = false
WHERE "email" = 'escrow-system@workplace.internal';
