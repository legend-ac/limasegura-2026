/**
 * OSRM Routing Client
 * Servidor público OSRM — 100% gratuito, sin API key
 * Soporta rutas alternativas para elegir la más segura
 */

export interface OsrmRoute {
  coordinates: [number, number][]; // [lat, lng][] para Leaflet
  distanceKm: number;
  /** Tiempo a pie a 5 km/h (más realista para navegación urbana) */
  walkingMinutes: number;
}

function parseRoute(route: any): OsrmRoute {
  const coordinates: [number, number][] = route.geometry.coordinates.map(
    ([lng, lat]: [number, number]) => [lat, lng]
  );
  const distanceKm = route.distance / 1000;
  // Tiempo a pie: 5 km/h = 83.3 m/min
  const walkingMinutes = Math.max(1, Math.round((route.distance / 1000 / 5) * 60));
  return { coordinates, distanceKm, walkingMinutes };
}

/**
 * Obtiene la ruta de calles respetando los waypoints seguros calculados por A*.
 * Esto garantiza que el trazado sobre el asfalto rodee efectivamente las zonas de aglomeración.
 */
export async function fetchOsrmSafeCorridorRoute(
  originLat: number, originLng: number,
  destLat:   number, destLng:   number,
  waypoints: { lat: number; lng: number }[] = [],
  profile: 'driving' | 'walking' = 'driving'
): Promise<OsrmRoute | null> {
  // If no intermediate waypoints, use standard 2-point fetch
  if (!waypoints.length) {
    const direct = await fetchOsrmRoute(originLat, originLng, destLat, destLng, { alternatives: false, profile });
    return direct[0] ?? null;
  }

  try {
    // Build coordinate string: origin ; waypoint1 ; waypoint2 ; ... ; destination
    const coordParts = [
      `${originLng},${originLat}`,
      ...waypoints.map(w => `${w.lng},${w.lat}`),
      `${destLng},${destLat}`
    ];
    const coordsStr = coordParts.join(';');
    const url = `https://router.project-osrm.org/route/v1/${profile}/${coordsStr}?overview=full&geometries=geojson&steps=false`;

    const resp = await fetch(url, { signal: AbortSignal.timeout(7000) });
    if (!resp.ok) {
      // Fallback to direct route if waypoint route fails
      const direct = await fetchOsrmRoute(originLat, originLng, destLat, destLng, { alternatives: false, profile });
      return direct[0] ?? null;
    }

    const data = await resp.json();
    if (data.code !== 'Ok' || !data.routes?.length) {
      const direct = await fetchOsrmRoute(originLat, originLng, destLat, destLng, { alternatives: false, profile });
      return direct[0] ?? null;
    }

    return parseRoute(data.routes[0]);
  } catch {
    const direct = await fetchOsrmRoute(originLat, originLng, destLat, destLng, { alternatives: false, profile });
    return direct[0] ?? null;
  }
}

/**
 * Obtiene la ruta más directa entre dos puntos (solo 2 puntos)
 * Opcionalmente pide hasta 3 alternativas de ruta
 */
export async function fetchOsrmRoute(
  originLat: number, originLng: number,
  destLat:   number, destLng:   number,
  options: { alternatives?: boolean; profile?: 'driving' | 'walking' } = {}
): Promise<OsrmRoute[]> {
  try {
    const profile = options.profile || 'driving';
    const altParam = options.alternatives ? '&alternatives=3' : '';
    const url =
      `https://router.project-osrm.org/route/v1/${profile}/` +
      `${originLng},${originLat};${destLng},${destLat}` +
      `?overview=full&geometries=geojson&steps=false${altParam}`;

    const resp = await fetch(url, { signal: AbortSignal.timeout(7000) });
    if (!resp.ok) return [];

    const data = await resp.json();
    if (data.code !== 'Ok' || !data.routes?.length) return [];

    return (data.routes as any[]).map(parseRoute);
  } catch {
    return [];
  }
}

/**
 * @deprecated Mantener por compatibilidad temporal.
 */
export async function fetchOsrmMultiRoute(
  waypoints: { lat: number; lng: number }[]
): Promise<OsrmRoute | null> {
  if (waypoints.length < 2) return null;
  const [o, d] = [waypoints[0], waypoints[waypoints.length - 1]];
  const routes = await fetchOsrmRoute(o.lat, o.lng, d.lat, d.lng);
  return routes[0] ?? null;
}

