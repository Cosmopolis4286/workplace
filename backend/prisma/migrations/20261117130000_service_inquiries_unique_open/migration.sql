-- Garantiza una sola consulta OPEN por servicio y solicitante, incluso con peticiones concurrentes.
-- Conserva el historial existente: si ya hay duplicados abiertos, mantiene la consulta más reciente
-- y marca las anteriores como CANCELLED antes de crear el índice.
WITH ranked_open_inquiries AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "serviceId", "requesterId"
      ORDER BY "createdAt" DESC, "id" DESC
    ) AS position
  FROM "service_inquiries"
  WHERE "status" = 'OPEN'
)
UPDATE "service_inquiries" AS inquiry
SET "status" = 'CANCELLED',
    "updatedAt" = CURRENT_TIMESTAMP
FROM ranked_open_inquiries AS ranked
WHERE inquiry."id" = ranked."id"
  AND ranked.position > 1;

CREATE UNIQUE INDEX "service_inquiries_one_open_per_service_requester"
  ON "service_inquiries"("serviceId", "requesterId")
  WHERE "status" = 'OPEN';
