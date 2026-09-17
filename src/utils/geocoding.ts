/**
 * Geocoding & Reverse Geocoding Utility
 * Usa el servicio público de OpenStreetMap (Nominatim) para obtener nombres
 * de calles reales en Lima al tocar cualquier punto del mapa.
 */

const geocodeCache = new Map<string, string>();

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
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'es',
      },
      signal: AbortSignal.timeout(3500),
    });

    if (!res.ok) return '';

    const data = await res.json();
    const addr = data.address;

    if (addr) {
      const road = addr.road || addr.pedestrian || addr.footway || addr.path || addr.cycleway;
      const houseNumber = addr.house_number ? ` ${addr.house_number}` : '';
      const district = addr.city_district || addr.suburb || addr.neighbourhood || addr.city || '';

      if (road && district) {
        const result = `${road}${houseNumber}, ${district}`;
        geocodeCache.set(key, result);
        return result;
      }
      if (road) {
        geocodeCache.set(key, `${road}${houseNumber}`);
        return `${road}${houseNumber}`;
      }
    }

    if (data.display_name) {
      const parts = data.display_name.split(',').map((p: string) => p.trim());
      const clean = parts.slice(0, 2).join(', ');
      geocodeCache.set(key, clean);
      return clean;
    }
  } catch {
    // Si falla o no hay conexión, retorna vacío para usar el fallback local
  }

  return '';
}
