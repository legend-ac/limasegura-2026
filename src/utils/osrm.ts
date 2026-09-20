/**
 * OSRM Routing Client
 * Servidor público OSRM — 100% gratuito, sin API key
 * Soporta rutas alternativas para elegir la más segura
 */

export interface OsrmRoute {
  coordinates: [number, number][]; // [lat, lng][] para Leaflet
  distanceKm: number;
  /** Duración calculada según el perfil (conducción en tráfico real o caminata) */
  durationMinutes: number;
  /** Tiempo a pie a 5 km/h */
  walkingMinutes: number;
}

function parseRoute(route: any, profile: 'driving' | 'walking' = 'driving'): OsrmRoute {
  const coordinates: [number, number][] = route.geometry.coordinates.map(
    ([lng, lat]: [number, number]) => [lat, lng]
  );
  const distanceKm = route.distance / 1000;
  // route.duration viene en segundos desde OSRM
  const rawDurationMin = Math.max(1, Math.round(route.duration / 60));
  // Tiempo a pie estándar a 5 km/h
  const walkingMinutes = Math.max(1, Math.round((distanceKm / 5) * 60));
  // En modo auto se usa la duración real del tráfico OSRM; en modo caminata se usa la velocidad peatonal
  const durationMinutes = profile === 'walking' ? walkingMinutes : rawDurationMin;
  return { coordinates, distanceKm, durationMinutes, walkingMinutes };
}

/**
 * Obtiene la ruta de calles respetando los waypoints del corredor seguro calculados por A*.
 * Si existen waypoints intermedios, fuerza el trazado por dichos puntos para garantizar
 * que el usuario evite focos delictivos o de aglomeración.
 */
export async function fetchOsrmSafeCorridorRoute(
  originLat: number, originLng: number,
  destLat:   number, destLng:   number,
  waypoints: { lat: number; lng: number }[] = [],
  profile: 'driving' | 'walking' = 'driving'
): Promise<OsrmRoute | null> {
  // Si no hay waypoints intermedios de desvío, la ruta directa es el trazado natural
  if (!waypoints.length) {
    const directRoutes = await fetchOsrmRoute(originLat, originLng, destLat, destLng, { alternatives: false, profile });
    return directRoutes[0] ?? null;
  }

  // Trazar a través de los waypoints del corredor seguro de A*
  try {
    const coordParts = [
      `${originLng},${originLat}`,
      ...waypoints.map(w => `${w.lng},${w.lat}`),
      `${destLng},${destLat}`
    ];
    const coordsStr = coordParts.join(';');
    const url = `https://router.project-osrm.org/route/v1/${profile}/${coordsStr}?overview=full&geometries=geojson&steps=false`;

    const resp = await fetch(url, { signal: AbortSignal.timeout(7000) });
    if (!resp.ok) {
      const directRoutes = await fetchOsrmRoute(originLat, originLng, destLat, destLng, { alternatives: false, profile });
      return directRoutes[0] ?? null;
    }

    const data = await resp.json();
    if (data.code !== 'Ok' || !data.routes?.length) {
      const directRoutes = await fetchOsrmRoute(originLat, originLng, destLat, destLng, { alternatives: false, profile });
      return directRoutes[0] ?? null;
    }

    return parseRoute(data.routes[0], profile);
  } catch {
    const directRoutes = await fetchOsrmRoute(originLat, originLng, destLat, destLng, { alternatives: false, profile });
    return directRoutes[0] ?? null;
  }
}

/**
 * Obtiene la ruta directa convencional entre dos puntos (sin desvío de seguridad)
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

    return (data.routes as any[]).map(r => parseRoute(r, profile));
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

