/**
 * Geocoding & Reverse Geocoding Utility
 * Usa el servicio público de OpenStreetMap (Nominatim) para obtener nombres
 * de calles reales en Lima al tocar cualquier punto del mapa.
 */

const geocodeCache = new Map<string, string>();

// Palabras genéricas que NO son útiles como nombre de ubicación
const GENERIC_NAMES = new Set([
  'Lima', 'Perú', 'Peru', 'Lima Province', 'Lima Region',
  'Provincia de Lima', 'Región Lima', 'Lima Metropolitana',
]);

function isUsefulName(name: string): boolean {
  if (!name || name.trim().length < 3) return false;
  // Rechazar si es solo un nombre genérico de ciudad/país
  const parts = name.split(',').map(p => p.trim());
  return parts.some(p => !GENERIC_NAMES.has(p) && p.length > 2);
}

/**
 * Obtiene el nombre real de la calle o lugar según coordenadas (lat, lng)
 */
export async function reverseGeocodeStreet(lat: number, lng: number): Promise<string> {
  // Redondear a 4 decimales para caché (~11 metros de precisión)
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (geocodeCache.has(key)) {
    return geocodeCache.get(key)!;
  }

  try {
    // zoom=17 da mejor precisión de calle sin ser demasiado granular
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=17&addressdetails=1`;
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'es-PE,es;q=0.9' },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return '';

    const data = await res.json();
    const addr = data.address;

    if (addr) {
      // Prioridad: calle/vía > nombre del lugar > barrio
      const road =
        addr.road ||
        addr.pedestrian ||
        addr.footway ||
        addr.path ||
        addr.cycleway ||
        addr.living_street ||
        addr.service;

      const houseNumber = addr.house_number ? ` ${addr.house_number}` : '';

      // Usar el distrito más específico disponible
      const district =
        addr.suburb ||
        addr.neighbourhood ||
        addr.city_district ||
        addr.town ||
        addr.village ||
        '';

      if (road) {
        const streetName = `${road}${houseNumber}`;
        const result = district && !GENERIC_NAMES.has(district)
          ? `${streetName}, ${district}`
          : streetName;
        geocodeCache.set(key, result);
        return result;
      }

      // Si no hay calle, intentar usar el nombre del lugar
      const placeName =
        addr.amenity ||
        addr.building ||
        addr.shop ||
        addr.leisure ||
        addr.tourism ||
        addr.office;

      if (placeName && district && !GENERIC_NAMES.has(district)) {
        const result = `${placeName}, ${district}`;
        geocodeCache.set(key, result);
        return result;
      }
    }

    // Último recurso: usar display_name pero solo los primeros segmentos útiles
    if (data.display_name) {
      const parts = data.display_name.split(',').map((p: string) => p.trim());
      // Filtrar partes genéricas y tomar las más específicas
      const useful = parts.filter((p: string) => !GENERIC_NAMES.has(p) && p.length > 2);
      if (useful.length > 0) {
        const clean = useful.slice(0, 2).join(', ');
        if (isUsefulName(clean)) {
          geocodeCache.set(key, clean);
          return clean;
        }
      }
    }
  } catch {
    // Si falla o no hay conexión, retorna vacío para usar el fallback local
  }

  return '';
}
