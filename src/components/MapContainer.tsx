import React, { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import { GraphNode, GraphEdge, CrowdHotspot, RiskIncident, RouteResult } from '../types';
import { findNearestNode, calculateDistanceMeters } from '../utils/algorithms';
import { reverseGeocodeStreet } from '../utils/geocoding';

// Fix Leaflet default icon paths (required with Vite bundling)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export type SelectionMode = 'idle' | 'origin' | 'destination';

export interface FreePoint {
  lat: number;
  lng: number;
  label: string;
  nearestNode: GraphNode;
}

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
  hotspots: CrowdHotspot[];
  incidents: RiskIncident[];
  originPoint: FreePoint | null;
  destPoint: FreePoint | null;
  selectionMode: SelectionMode;
  safeRoute: RouteResult | null;
  standardRoute: RouteResult | null;
  /** Real street coordinates from OSRM — if present, use these instead of straight lines */
  safeStreetCoords: [number, number][] | null;
  stdStreetCoords:  [number, number][] | null;
  showRiskZones: boolean;
  onPointSelected: (point: FreePoint, role: 'origin' | 'destination') => void;
}

// ── Marker icon factories ───────────────────────────────────────
function makeOriginIcon() {
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width:36px;height:44px;
        display:flex;flex-direction:column;align-items:center;
      ">
        <div style="
          width:36px;height:36px;border-radius:50% 50% 50% 0;
          background:#2DD4A0;border:3px solid #fff;
          transform:rotate(-45deg);
          box-shadow:0 4px 14px rgba(45,212,160,0.55);
          display:flex;align-items:center;justify-content:center;
        ">
          <span style="transform:rotate(45deg);font-size:14px;font-weight:900;color:#0D1117;">A</span>
        </div>
        <div style="width:2px;height:8px;background:#2DD4A0;margin-top:-2px;"></div>
      </div>`,
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    popupAnchor: [0, -46],
  });
}

function makeDestIcon() {
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width:36px;height:44px;
        display:flex;flex-direction:column;align-items:center;
      ">
        <div style="
          width:36px;height:36px;border-radius:50% 50% 50% 0;
          background:#F85149;border:3px solid #fff;
          transform:rotate(-45deg);
          box-shadow:0 4px 14px rgba(248,81,73,0.55);
          display:flex;align-items:center;justify-content:center;
        ">
          <span style="transform:rotate(45deg);font-size:14px;font-weight:900;color:#fff;">B</span>
        </div>
        <div style="width:2px;height:8px;background:#F85149;margin-top:-2px;"></div>
      </div>`,
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    popupAnchor: [0, -46],
  });
}

export const MapContainer: React.FC<Props> = ({
  nodes, hotspots, incidents,
  originPoint, destPoint,
  selectionMode, safeRoute, standardRoute,
  safeStreetCoords, stdStreetCoords,
  showRiskZones, onPointSelected,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<L.Map | null>(null);

  const L_origin    = useRef<L.Marker | null>(null);
  const L_dest      = useRef<L.Marker | null>(null);
  const L_safeRoute = useRef<L.Polyline | null>(null);
  const L_stdRoute  = useRef<L.Polyline | null>(null);
  const L_risks     = useRef<L.LayerGroup | null>(null);

  // ── Init map ─────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) return;
    if ((el as any)._leaflet_id) delete (el as any)._leaflet_id;

    const map = L.map(el, {
      center: [-12.085, -77.032],
      zoom: 13,
      zoomControl: false,
      attributionControl: true,
    });

    // Standard OSM tiles — free, no API key
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
      subdomains: 'abc',
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L_risks.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 250);

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // ── Cursor for selection mode ────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.style.cursor = selectionMode !== 'idle' ? 'crosshair' : '';
  }, [selectionMode]);

  // ── Click handler ─────────────────────────────────────────────
  const handleClick = useCallback(async (e: L.LeafletMouseEvent) => {
    if (selectionMode === 'idle') return;
    const { lat, lng } = e.latlng;
    const nearest = findNearestNode(lat, lng, nodes);
    const distM = calculateDistanceMeters(lat, lng, nearest.lat, nearest.lng);

    // Si el clic fue a menos de 150m de un punto conocido, usamos ese nombre.
    // Si fue en una calle cualquiera de la ciudad, ponemos temporalmente el distrito para no mentir.
    const initialLabel = distM < 150
      ? nearest.name
      : `Punto en ${nearest.district}`;

    const role = selectionMode as 'origin' | 'destination';

    onPointSelected({ lat, lng, label: initialLabel, nearestNode: nearest }, role);

    // Consulta en segundo plano el nombre exacto de la calle en OpenStreetMap
    try {
      const street = await reverseGeocodeStreet(lat, lng);
      if (street) {
        onPointSelected({ lat, lng, label: street, nearestNode: nearest }, role);
      }
    } catch {}
  }, [selectionMode, nodes, onPointSelected]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.on('click', handleClick);
    return () => { map.off('click', handleClick); };
  }, [handleClick]);

  // ── Origin marker ─────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (L_origin.current) { L_origin.current.remove(); L_origin.current = null; }
    if (!originPoint) return;

    const m = L.marker([originPoint.lat, originPoint.lng], { icon: makeOriginIcon(), draggable: true })
      .addTo(map)
      .bindTooltip(`<b>Origen (A):</b> ${originPoint.label}`, { direction: 'top' });

    m.on('dragend', async () => {
      const { lat, lng } = m.getLatLng();
      const nearest = findNearestNode(lat, lng, nodes);
      const distM = calculateDistanceMeters(lat, lng, nearest.lat, nearest.lng);
      const initialLabel = distM < 150 ? nearest.name : `Punto en ${nearest.district}`;

      onPointSelected({ lat, lng, label: initialLabel, nearestNode: nearest }, 'origin');
      try {
        const street = await reverseGeocodeStreet(lat, lng);
        if (street) {
          onPointSelected({ lat, lng, label: street, nearestNode: nearest }, 'origin');
        }
      } catch {}
    });
    L_origin.current = m;
  }, [originPoint, nodes, onPointSelected]);

  // ── Destination marker ────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (L_dest.current) { L_dest.current.remove(); L_dest.current = null; }
    if (!destPoint) return;

    const m = L.marker([destPoint.lat, destPoint.lng], { icon: makeDestIcon(), draggable: true })
      .addTo(map)
      .bindTooltip(`<b>Destino (B):</b> ${destPoint.label}`, { direction: 'top' });

    m.on('dragend', async () => {
      const { lat, lng } = m.getLatLng();
      const nearest = findNearestNode(lat, lng, nodes);
      const distM = calculateDistanceMeters(lat, lng, nearest.lat, nearest.lng);
      const initialLabel = distM < 150 ? nearest.name : `Punto en ${nearest.district}`;

      onPointSelected({ lat, lng, label: initialLabel, nearestNode: nearest }, 'destination');
      try {
        const street = await reverseGeocodeStreet(lat, lng);
        if (street) {
          onPointSelected({ lat, lng, label: street, nearestNode: nearest }, 'destination');
        }
      } catch {}
    });
    L_dest.current = m;
  }, [destPoint, nodes, onPointSelected]);

  // ── Routes ────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (L_safeRoute.current) { L_safeRoute.current.remove(); L_safeRoute.current = null; }
    if (L_stdRoute.current)  { L_stdRoute.current.remove();  L_stdRoute.current = null; }

    if (!safeRoute) return;

    // Build coordinate list: prefer OSRM real street coords, fall back to node-to-node
    const buildFallbackCoords = (
      route: RouteResult,
      origin: FreePoint | null,
      dest: FreePoint | null
    ): [number, number][] => {
      const pts: [number, number][] = [];
      if (origin) pts.push([origin.lat, origin.lng]);
      route.pathNodes.forEach(n => pts.push([n.lat, n.lng]));
      if (dest && (!route.pathNodes.length || route.pathNodes[route.pathNodes.length - 1].id !== dest.nearestNode.id))
        pts.push([dest.lat, dest.lng]);
      return pts;
    };

    const safeCoords  = safeStreetCoords  ?? buildFallbackCoords(safeRoute, originPoint, destPoint);
    const directCoords = stdStreetCoords ?? (standardRoute ? buildFallbackCoords(standardRoute, originPoint, destPoint) : null);

    // Standard / direct route — dashed gray, drawn first (below)
    if (directCoords && directCoords.length > 1) {
      L_stdRoute.current = L.polyline(directCoords, {
        color: '#64748b', weight: 3, opacity: 0.45, dashArray: '8,6',
      }).addTo(map).bindTooltip('Ruta directa sin optimización de seguridad', { sticky: true });
    }

    // Safe route — solid green, on top
    if (safeCoords.length > 1) {
      L_safeRoute.current = L.polyline(safeCoords, {
        color: '#2DD4A0', weight: 5, opacity: 0.95,
        lineCap: 'round', lineJoin: 'round',
      }).addTo(map)
        .bindTooltip(
          `✅ Ruta segura · ${safeRoute.totalDistanceKm.toFixed(1)} km · ${safeRoute.estimatedTimeMinutes} min · Seguridad ${Math.round(safeRoute.safetyScore)}%`,
          { sticky: true }
        );

      // Fit map to show full route with padding
      const allBounds = L.latLngBounds(safeCoords);
      map.fitBounds(allBounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [safeRoute, standardRoute, safeStreetCoords, stdStreetCoords, originPoint, destPoint]);

  // ── Risk zones ────────────────────────────────────────────────
  useEffect(() => {
    const group = L_risks.current;
    if (!group) return;
    group.clearLayers();
    if (!showRiskZones) return;

    for (const h of hotspots) {
      const color = h.densityLevel === 'critica' ? '#ef4444'
        : h.densityLevel === 'alta'     ? '#f97316'
        : '#f59e0b';
      L.circle([h.lat, h.lng], {
        radius: h.radiusMeters, color, weight: 1.5,
        fillColor: color, fillOpacity: 0.15, dashArray: '4,4',
      }).bindTooltip(
        `<b>⚠ ${h.name}</b><br/>` +
        `Aglomeración ${h.densityLevel.toUpperCase()}<br/>` +
        `Factor: ${Math.round(h.crowdFactor * 100)}% · Radio: ${h.radiusMeters}m`
      ).addTo(group);
    }

    for (const inc of incidents.filter(i => i.active)) {
      const color = inc.severity === 'critica' ? '#ef4444' : inc.severity === 'alta' ? '#f97316' : '#f59e0b';
      L.circle([inc.lat, inc.lng], {
        radius: inc.radiusMeters, color, weight: 2,
        fillColor: color, fillOpacity: 0.2,
      }).bindTooltip(`<b>🚨 ${inc.title}</b><br/>${inc.district} · Severidad: ${inc.severity.toUpperCase()}`)
        .addTo(group);
    }
  }, [hotspots, incidents, showRiskZones]);

  // ── Banner when selecting ─────────────────────────────────────
  const banner = selectionMode === 'origin'
    ? { text: '📍 Toca cualquier punto del mapa para fijar tu ORIGEN (A)', bg: '#2DD4A0', fg: '#0D1117' }
    : selectionMode === 'destination'
    ? { text: '🎯 Toca cualquier punto del mapa para fijar tu DESTINO (B)', bg: '#F85149', fg: '#fff' }
    : null;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {banner && (
        <div style={{
          position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
          zIndex: 1000, pointerEvents: 'none',
          background: banner.bg, color: banner.fg,
          fontWeight: 700, fontSize: '0.8125rem',
          padding: '9px 20px', borderRadius: 99,
          boxShadow: '0 4px 18px rgba(0,0,0,0.4)',
          whiteSpace: 'nowrap', fontFamily: 'Inter,sans-serif',
          letterSpacing: '0.01em',
        }}>
          {banner.text}
        </div>
      )}
    </div>
  );
};
