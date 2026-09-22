export interface GeoPoint {
  lat: number;
  lng: number;
}

// Fórmula de Haversine — distancia en metros entre dos puntos lat/lng.
// Fuente única para cualquier cálculo de distancia geográfica del sistema
// (routing de delivery, MatchingService) — no reimplementar por dominio.
export function haversineDistanceMeters(a: GeoPoint, b: GeoPoint): number {
  const R = 6371000; // radio terrestre en metros
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
