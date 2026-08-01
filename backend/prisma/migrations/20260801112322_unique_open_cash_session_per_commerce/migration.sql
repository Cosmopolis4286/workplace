-- Garantiza a nivel de DB que un comercio no puede tener más de una
-- CashSession con status = 'OPEN' simultáneamente. Antes de este índice, la
-- única protección era un check-then-create en CashService.open() (findFirst
-- + create), lo que permite una ventana de carrera: dos requests concurrentes
-- (doble-click, reintento de red, o dos instancias del backend) podían pasar
-- el chequeo antes de que cualquiera creara la fila, resultando en 2 cajas
-- abiertas para el mismo comercio — un estado irrecuperable sin intervención
-- manual en los datos.
--
-- Prisma no soporta índices únicos parciales (WHERE) en su DSL, de ahí el SQL
-- crudo. CashService.open() sigue haciendo su chequeo previo para devolver un
-- ConflictException legible en el caso común; este índice es la garantía real
-- — si dos requests pasan el chequeo a la vez, el segundo INSERT falla con
-- P2002 (Prisma) y el AllExceptionsFilter global ya lo traduce a 409.
CREATE UNIQUE INDEX "cash_sessions_commerceId_open_unique"
  ON "cash_sessions" ("commerceId")
  WHERE "status" = 'OPEN';
