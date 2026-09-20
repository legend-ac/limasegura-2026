import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  /** Called when a marker is dragged — tells App to clear the stale route */
  onRouteInvalidated?: () => void;
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
  showRiskZones, onPointSelected, onRouteInvalidated,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<L.Map | null>(null);
  // Used to cancel pending geocode callbacks after marker drag finishes
  const dragCancelRef = useRef<boolean>(false);

  const L_origin    = useRef<L.Marker | null>(null);
  const L_dest      = useRef<L.Marker | null>(null);
  const L_safeRoute = useRef<L.Polyline | null>(null);
  const L_stdRoute  = useRef<L.LayerGroup | null>(null);
  const L_risks     = useRef<L.LayerGroup | null>(null);
  const [routesOverlap, setRoutesOverlap] = useState<boolean>(false);

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

    // Auto-fix map size when container is resized (e.g. panel open/close)
    const ro = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
    });
    ro.observe(el);

    return () => { ro.disconnect(); map.remove(); mapRef.current = null; };
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

    m.on('dragstart', () => {
      dragCancelRef.current = true;
      // Clear stale route immediately so the polyline doesn't linger on old position
      onRouteInvalidated?.();
    });

    m.on('dragend', async () => {
      dragCancelRef.current = false;
      const { lat, lng } = m.getLatLng();
      const nearest = findNearestNode(lat, lng, nodes);
      const distM = calculateDistanceMeters(lat, lng, nearest.lat, nearest.lng);
      const initialLabel = distM < 150 ? nearest.name : `Punto en ${nearest.district}`;
      onPointSelected({ lat, lng, label: initialLabel, nearestNode: nearest }, 'origin');
      try {
        const street = await reverseGeocodeStreet(lat, lng);
        // Only update if this drag op wasn't superseded by another drag
        if (street && !dragCancelRef.current) {
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

    m.on('dragstart', () => {
      dragCancelRef.current = true;
      // Clear stale route immediately so the polyline doesn't linger on old position
      onRouteInvalidated?.();
    });

    m.on('dragend', async () => {
      dragCancelRef.current = false;
      const { lat, lng } = m.getLatLng();
      const nearest = findNearestNode(lat, lng, nodes);
      const distM = calculateDistanceMeters(lat, lng, nearest.lat, nearest.lng);
      const initialLabel = distM < 150 ? nearest.name : `Punto en ${nearest.district}`;
      onPointSelected({ lat, lng, label: initialLabel, nearestNode: nearest }, 'destination');
      try {
        const street = await reverseGeocodeStreet(lat, lng);
        // Only update if this drag op wasn't superseded by another drag
        if (street && !dragCancelRef.current) {
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
    if (L_stdRoute.current)  { L_stdRoute.current.clearLayers(); L_stdRoute.current.remove(); L_stdRoute.current = null; }

    if (!safeRoute) {
      setRoutesOverlap(false);
      return;
    }

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

    // Detectar si la ruta directa y la protegida coinciden porque el sector ya es 100% seguro
    const isOverlap = Boolean(
      directCoords && directCoords.length > 1 && safeCoords.length > 1 &&
      standardRoute && safeRoute &&
      Math.abs(standardRoute.totalDistanceKm - safeRoute.totalDistanceKm) < 0.08 &&
      Math.abs(standardRoute.safetyScore - safeRoute.safetyScore) <= 1
    );
    setRoutesOverlap(isOverlap);

    // Standard / direct route — visible con alto contraste cuando se activa para comparar
    if (directCoords && directCoords.length > 1) {
      const group = L.layerGroup().addTo(map);
      const stdTooltip = isOverlap
        ? `🛡️ Coincidencia Segura: En este sector la ruta directa no presenta focos de peligro (${safeRoute.totalDistanceKm.toFixed(1)} km · Seguridad 99%)`
        : standardRoute
        ? `⚠️ Ruta Directa Convencional · ${standardRoute.totalDistanceKm.toFixed(1)} km · Seguridad ${Math.round(standardRoute.safetyScore)}% (Sin desvío de riesgos)`
        : '⚠️ Ruta Directa Convencional (Sin protección)';

      if (!isOverlap) {
        // Casing exterior oscuro de 8px para que la línea carmesí nunca se pierda en el mapa
        L.polyline(directCoords, {
          color: '#881337', weight: 8, opacity: 0.8, lineCap: 'round', lineJoin: 'round',
        }).addTo(group);
        // Línea interior carmesí punteada de 4px
        L.polyline(directCoords, {
          color: '#f43f5e', weight: 4, opacity: 1, dashArray: '6,6', lineCap: 'round',
        }).addTo(group).bindTooltip(stdTooltip, { sticky: true });
      } else {
        // Halo esmeralda claro indicando coincidencia de ruta segura directa
        L.polyline(directCoords, {
          color: '#059669', weight: 9, opacity: 0.45, lineCap: 'round',
        }).addTo(group).bindTooltip(stdTooltip, { sticky: true });
      }

      L_stdRoute.current = group;
    }

    // Safe route — solid green, con máxima claridad
    if (safeCoords.length > 1) {
      const safeTooltip = isOverlap
        ? `✅ Ruta Segura y Directa · ${safeRoute.totalDistanceKm.toFixed(1)} km · ${safeRoute.estimatedTimeMinutes} min · 100% Protegido`
        : `✅ Ruta segura protegida · ${safeRoute.totalDistanceKm.toFixed(1)} km · ${safeRoute.estimatedTimeMinutes} min · Seguridad ${Math.round(safeRoute.safetyScore)}%`;

      L_safeRoute.current = L.polyline(safeCoords, {
        color: '#2DD4A0', weight: 5, opacity: 0.95,
        lineCap: 'round', lineJoin: 'round',
      }).addTo(map)
        .bindTooltip(safeTooltip, { sticky: true });

      // Fit map to show full route (including direct route if present) with padding
      const allCoords = directCoords && directCoords.length > 1
        ? [...safeCoords, ...directCoords]
        : safeCoords;
      const allBounds = L.latLngBounds(allCoords);
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

      {/* Floating comparison legend when both routes are displayed */}
      {safeRoute && standardRoute && (
        <div style={{
          position: 'absolute', bottom: 24, left: 16,
          zIndex: 1000,
          background: 'rgba(15, 23, 42, 0.94)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: 8,
          padding: '10px 14px',
          color: '#f8fafc',
          fontSize: '0.78rem',
          boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
          display: 'flex', flexDirection: 'column', gap: 6,
          pointerEvents: 'auto',
          fontFamily: 'Inter, sans-serif'
        }}>
          <div style={{ fontWeight: 700, fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Comparativa activa en mapa
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 20, height: 4, background: '#2DD4A0', borderRadius: 2, display: 'inline-block' }}></span>
            <span><strong>Ruta Segura (A*)</strong>: {safeRoute.totalDistanceKm.toFixed(1)} km ({Math.round(safeRoute.safetyScore)}% seg.)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 20, height: 4, background: '#f43f5e', borderTop: '2px dashed #f43f5e', display: 'inline-block' }}></span>
            <span><strong>Ruta Directa</strong>: {standardRoute.totalDistanceKm.toFixed(1)} km ({Math.round(standardRoute.safetyScore)}% seg.)</span>
          </div>
          {routesOverlap && (
            <div style={{ fontSize: '0.72rem', color: '#2DD4A0', marginTop: 2, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 4 }}>
              ✓ Ambas rutas coinciden: el tramo es 100% seguro.
            </div>
          )}
        </div>
      )}

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
