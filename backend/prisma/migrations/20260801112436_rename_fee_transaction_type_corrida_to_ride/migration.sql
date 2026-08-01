-- FeeTransactionType.CORRIDA quedó fuera del rename masivo es->en (migración
-- 20260728150000_rename_spanish_enums_and_ride_model), que sí renombró el
-- modelo Corrida->Ride y sus enums propios (CorridaStatus/VehicleType/ServiceType)
-- pero no tocó este enum de platform-fees. RENAME VALUE preserva los datos
-- existentes en PlatformFeeRate/PlatformFeeOverride (operación de catálogo,
-- no reescribe filas).
ALTER TYPE "FeeTransactionType" RENAME VALUE 'CORRIDA' TO 'RIDE';
