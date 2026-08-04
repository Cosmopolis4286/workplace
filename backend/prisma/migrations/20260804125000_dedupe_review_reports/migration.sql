-- Evita que un mismo usuario reporte la misma reseña más de una vez —
-- previamente cada intento duplicado disparaba notifyReviewReported a todos
-- los moderadores, permitiendo spam de notificaciones con requests repetidos.
CREATE UNIQUE INDEX "review_reports_reviewId_reporterId_key" ON "review_reports"("reviewId", "reporterId");
