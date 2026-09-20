import { CrowdHotspot, RiskIncident } from '../types';
import { isRouteExposedToRisk } from './algorithms';

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
 * Si la ruta directa por asfalto/veredas ya está 100% libre de riesgos (no pasa por
 * aglomeraciones ni incidentes), devuelve directamente la ruta óptima para no generar
 * desvíos artificiales o innecesarios.
 * Si la ruta directa atraviesa un foco de peligro, fuerza el paso por los waypoints seguros.
 */
export async function fetchOsrmSafeCorridorRoute(
  originLat: number, originLng: number,
  destLat:   number, destLng:   number,
  waypoints: { lat: number; lng: number }[] = [],
  profile: 'driving' | 'walking' = 'driving',
  hazardsCheck?: { hotspots: CrowdHotspot[]; incidents: RiskIncident[] }
): Promise<OsrmRoute | null> {
  // 1. Obtener la ruta directa como primera referencia
  const directRoutes = await fetchOsrmRoute(originLat, originLng, destLat, destLng, { alternatives: false, profile });
  const direct = directRoutes[0] ?? null;

  // Si no hay waypoints intermedios, o si no se pudo calcular la ruta directa, retornar direct
  if (!waypoints.length || !direct) {
    return direct;
  }

  // 2. Si se proporcionó verificación de peligros:
  // Si la ruta directa por calles está 100% libre de aglomeraciones e incidentes,
  // la ruta directa es la ruta más segura y eficiente (sin desvíos absurdos).
  if (hazardsCheck) {
    const isExposed = isRouteExposedToRisk(
      direct.coordinates,
      hazardsCheck.hotspots,
      hazardsCheck.incidents
    );
    if (!isExposed) {
      return direct;
    }
  }

  // 3. La ruta directa cruza un foco de peligro: forzar el paso por los waypoints seguros de A*
  try {
    const coordParts = [
      `${originLng},${originLat}`,
      ...waypoints.map(w => `${w.lng},${w.lat}`),
      `${destLng},${destLat}`
    ];
    const coordsStr = coordParts.join(';');
    const url = `https://router.project-osrm.org/route/v1/${profile}/${coordsStr}?overview=full&geometries=geojson&steps=false`;

    const resp = await fetch(url, { signal: AbortSignal.timeout(7000) });
    if (!resp.ok) return direct;

    const data = await resp.json();
    if (data.code !== 'Ok' || !data.routes?.length) return direct;

    return parseRoute(data.routes[0]);
  } catch {
    return direct;
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

