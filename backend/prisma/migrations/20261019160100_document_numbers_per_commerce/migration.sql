-- Los números de pedido (ORD-AAAA-NNNN) y de comprobante (COMP-AAAA-NNNNN)
-- son correlativos POR COMERCIO (se cuentan los del comercio), pero sus
-- índices únicos eran globales: el primer pedido/comprobante de un segundo
-- comercio chocaba con el del primero. El pedido fallaba con 500 y el
-- comprobante automático al entregar se perdía en silencio.
-- Seguro de aplicar: los índices globales ya garantizaban unicidad, así que
-- no hay duplicados por (commerceId, número).

-- DropIndex
DROP INDEX "orders_orderNumber_key";

-- CreateIndex
CREATE UNIQUE INDEX "orders_commerceId_orderNumber_key" ON "orders"("commerceId", "orderNumber");

-- DropIndex
DROP INDEX "receipts_receiptNumber_key";

-- CreateIndex
CREATE UNIQUE INDEX "receipts_commerceId_receiptNumber_key" ON "receipts"("commerceId", "receiptNumber");
