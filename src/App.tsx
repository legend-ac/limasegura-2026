import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GraphNode, RouteResult, SavedRoute, CrowdHotspot, RiskIncident } from './types';
import { LIMA_NODES, LIMA_EDGES, INITIAL_CROWD_HOTSPOTS, INITIAL_INCIDENTS } from './data/limaGraph';
import { solveRoute, findNearestNode, extractCorridorWaypoints, calculateDistanceMeters } from './utils/algorithms';
import { fetchOsrmRoute, fetchOsrmSafeCorridorRoute, OsrmRoute } from './utils/osrm';
import { reverseGeocodeStreet } from './utils/geocoding';
import { MapContainer, FreePoint, SelectionMode } from './components/MapContainer';
import { GuidedTour } from './components/GuidedTour';
import { FavoritesDrawer } from './components/FavoritesDrawer';
import {
  MapPin, Navigation, Route, Shield, Star, X,
  RefreshCw, Crosshair, AlertTriangle, Clock, Ruler,
  ShieldCheck, Bookmark, RotateCcw, Check, Info,
  ChevronDown, ChevronUp, Sun, Moon, ArrowUpDown,
  Footprints, Flame, Timer, PersonStanding, HelpCircle,
  GitCompare, CheckCircle2
} from 'lucide-react';

const FAV_KEY = 'ls2026_favorites';
const INCIDENTS_KEY = 'ls2026_incidents';

type Step = 1 | 2 | 3;
type WalkPace = 'slow' | 'normal' | 'fast';

const WALK_PACES: { id: WalkPace; label: string; kmh: number; icon: string }[] = [
  { id: 'slow',   label: 'Tranquilo',  kmh: 3.5, icon: '🚶' },
  { id: 'normal', label: 'Normal',     kmh: 5.0, icon: '🚶‍♂️' },
  { id: 'fast',   label: 'Rápido',     kmh: 7.0, icon: '🏃' },
];

/** Pasos aproximados por km caminando (adulto promedio) */
const STEPS_PER_KM = 1300;
/** Calorías quemadas por km a pie (adulto ~70 kg) */
const CALS_PER_KM = 65;

function walkingTime(distKm: number, pace: WalkPace): number {
  const kmh = WALK_PACES.find(p => p.id === pace)!.kmh;
  return Math.max(1, Math.round((distKm / kmh) * 60));
}

function safetyColor(score: number) {
  if (score >= 75) return '#2DD4A0';
  if (score >= 50) return '#F59E0B';
  return '#F85149';
}

function safetyLabel(score: number) {
  if (score >= 75) return '✅ Ruta Segura';
  if (score >= 50) return '⚠️ Riesgo Moderado';
  return '🚨 Zona Peligrosa';
}

export default function App() {
  const [nodes]    = useState<GraphNode[]>(LIMA_NODES);
  const [edges]    = useState(LIMA_EDGES);
  const [hotspots] = useState<CrowdHotspot[]>(INITIAL_CROWD_HOTSPOTS);
  const [incidents] = useState<RiskIncident[]>(() => {
    try { return JSON.parse(localStorage.getItem(INCIDENTS_KEY) || 'null') || INITIAL_INCIDENTS; }
    catch { return INITIAL_INCIDENTS; }
  });

  const [originPoint, setOriginPoint] = useState<FreePoint | null>(null);
  const [destPoint,   setDestPoint]   = useState<FreePoint | null>(null);
  const [selMode,     setSelMode]     = useState<SelectionMode>('idle');
  const [compareConventional, setCompareConventional] = useState(false);
  const [comparingLoading,    setComparingLoading]    = useState(false);
  const [showRisk,    setShowRisk]    = useState(true);

  const [safeRoute,    setSafeRoute]    = useState<RouteResult | null>(null);
  const [stdRoute,     setStdRoute]     = useState<RouteResult | null>(null);
  // Real street geometry from OSRM
  const [safeOsrm,    setSafeOsrm]     = useState<OsrmRoute | null>(null);
  const [stdOsrm,     setStdOsrm]      = useState<OsrmRoute | null>(null);
  const [calculating,  setCalculating]  = useState(false);
  const [calcError,    setCalcError]    = useState<string | null>(null);
  const [osrmFailed,   setOsrmFailed]   = useState(false);

  const [step,         setStep]        = useState<Step>(1);
  const [favOpen,      setFavOpen]     = useState(false);
  const [panelOpen,    setPanelOpen]   = useState(true);
  const [showDirs,     setShowDirs]    = useState(false);
  const [walkingMode,  setWalkingMode] = useState(false);
  const [walkPace,     setWalkPace]    = useState<WalkPace>('normal');
  const [showTour,     setShowTour]    = useState(false);

  const [saved, setSaved] = useState<SavedRoute[]>(() => {
    try { return JSON.parse(localStorage.getItem(FAV_KEY) || 'null') || []; }
    catch { return []; }
  });

  // Tema día/noche — detecta preferencia del sistema, permite cambio manual
  const [isDark, setIsDark] = useState<boolean>(() => {
    const stored = localStorage.getItem('ls2026_theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('light-mode', !isDark);
    localStorage.setItem('ls2026_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => { localStorage.setItem(FAV_KEY, JSON.stringify(saved)); }, [saved]);

  const handlePointSelected = useCallback((point: FreePoint, role: 'origin' | 'destination') => {
    if (role === 'origin') {
      setOriginPoint(point);
      setSelMode('idle');
      setStep(prev => prev === 1 ? 2 : prev);
      setPanelOpen(true);
    } else {
      setDestPoint(point);
      setSelMode('idle');
      setStep(prev => prev === 2 ? 3 : prev);
      setPanelOpen(true);
    }
    setSafeRoute(null); setStdRoute(null);
    setSafeOsrm(null);  setStdOsrm(null);
    setCalcError(null);
  }, []);

  // Ref to break forward reference: swapPoints and loadRoute need calculateRoute
  // but calculateRoute is declared after them. The ref is updated after mount.
  const calculateRouteRef = useRef<(compare?: boolean) => Promise<void>>(async () => {});

  const swapPoints = useCallback(() => {
    if (!originPoint && !destPoint) return;
    const hadRoute = !!safeRoute;
    const tempOrigin = originPoint;
    const tempDest = destPoint;
    setOriginPoint(tempDest);
    setDestPoint(tempOrigin);
    setSafeRoute(null); setStdRoute(null);
    setSafeOsrm(null);  setStdOsrm(null);
    setCalcError(null);
    if (hadRoute && tempDest && tempOrigin) {
      setTimeout(() => calculateRouteRef.current(compareConventional), 80);
    }
  }, [originPoint, destPoint, safeRoute, compareConventional]);

  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) { setCalcError('Tu dispositivo no soporta geolocalización.'); return; }
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude: lat, longitude: lng } }) => {
        const nearest = findNearestNode(lat, lng, nodes);
        const distM = calculateDistanceMeters(lat, lng, nearest.lat, nearest.lng);
        const initialLabel = distM < 150 ? `${nearest.name} (tu ubicación)` : `Tu ubicación (${nearest.district})`;
        handlePointSelected({ lat, lng, label: initialLabel, nearestNode: nearest }, 'origin');
        try {
          const street = await reverseGeocodeStreet(lat, lng);
          if (street) {
            handlePointSelected({ lat, lng, label: `${street} (tu ubicación)`, nearestNode: nearest }, 'origin');
          }
        } catch {}
      },
      () => setCalcError('No se pudo obtener tu ubicación. Toca el mapa para seleccionar manualmente.')
    );
  }, [nodes, handlePointSelected]);

  const calculateRoute = useCallback(async (
    compare: boolean = compareConventional,
    isWalking: boolean = walkingMode
  ) => {
    if (!originPoint || !destPoint) return;
    setCalculating(true);
    setCalcError(null);
    setOsrmFailed(false);
    // Limpiar ruta anterior para no mostrar líneas fantasma
    setSafeRoute(null);
    setSafeOsrm(null);
    setStdRoute(null);
    setStdOsrm(null);

    await new Promise(r => setTimeout(r, 20));

    // ── 1. A* con Factor de Aglomeración Lima 2026 ──
    // En modo peatonal: mayor peso de aglomeración (2.8×) + evita vías rápidas
    // En modo vehicular: peso estándar de aglomeración
    const safe = solveRoute(
      originPoint.nearestNode.id, destPoint.nearestNode.id,
      nodes, edges, hotspots, incidents,
      'astar_safe',
      isWalking ? 2.0 : 1.5,   // crowdRadiusMultiplier: radio mayor a pie
      isWalking ? 8.0 : 5.0,   // crowdAvoidanceWeight: peatón 8×, vehículo 5×
      isWalking                // activa penalización de vías rápidas + 2.8× sensibilidad
    );

    if (!safe) {
      setCalcError('No se encontró ruta segura. Intenta seleccionar puntos más cercanos a zonas transitables de Lima.');
      setCalculating(false);
      return;
    }

    // Ruta convencional para contraste solo si el usuario activó la comparación
    const direct = compare ? solveRoute(
      originPoint.nearestNode.id, destPoint.nearestNode.id,
      nodes, edges, hotspots, incidents, 'dijkstra', 0.8, 0, isWalking
    ) : null;

    setSafeRoute(safe);
    setStdRoute(direct ?? null);
    setStep(3);

    // ── 2. OSRM Calles Reales guiado por los waypoints seguros de A* ──
    const corridorWaypoints = extractCorridorWaypoints(safe.pathNodes);
    const profile = isWalking ? 'walking' : 'driving';

    const safeOsrmRoute = await fetchOsrmSafeCorridorRoute(
      originPoint.lat, originPoint.lng,
      destPoint.lat,   destPoint.lng,
      corridorWaypoints,
      profile
    );

    if (!safeOsrmRoute) {
      setOsrmFailed(true);
      setSafeOsrm(null);
    } else {
      setSafeOsrm(safeOsrmRoute);
    }

    if (compare) {
      const directRoutes = await fetchOsrmRoute(
        originPoint.lat, originPoint.lng,
        destPoint.lat,   destPoint.lng,
        { alternatives: false, profile }
      );
      setStdOsrm(directRoutes[0] ?? null);
    } else {
      setStdOsrm(null);
    }

    setCalculating(false);
  }, [originPoint, destPoint, nodes, edges, hotspots, incidents, compareConventional, walkingMode]);

  // Keep the ref in sync so swapPoints/loadRoute always call the latest version
  calculateRouteRef.current = calculateRoute;

  /**
   * Activar/desactivar la ruta de comparación SIN re-calcular la ruta segura.
   * Si se activa y ya hay una ruta segura calculada, calcula solo la directa.
   * Si se desactiva, limpia inmediatamente la ruta directa del mapa.
   */
  const toggleCompare = useCallback(async (show: boolean) => {
    setCompareConventional(show);

    if (!show) {
      // Desactivar: quitar ruta directa del mapa al instante
      setStdRoute(null);
      setStdOsrm(null);
      setComparingLoading(false);
      return;
    }

    // Activar: solo calcular ruta directa si ya existe ruta segura
    if (!safeRoute || !originPoint || !destPoint) return;

    setComparingLoading(true);
    const direct = solveRoute(
      originPoint.nearestNode.id, destPoint.nearestNode.id,
      nodes, edges, hotspots, incidents, 'dijkstra', 0.8, 0, walkingMode
    );
    setStdRoute(direct ?? null);

    // Trazar ruta directa real por calles con OSRM
    const profile = walkingMode ? 'walking' : 'driving';
    try {
      const directOsrm = await fetchOsrmRoute(
        originPoint.lat, originPoint.lng,
        destPoint.lat,   destPoint.lng,
        { alternatives: false, profile }
      );
      setStdOsrm(directOsrm[0] ?? null);
    } finally {
      setComparingLoading(false);
    }
  }, [safeRoute, originPoint, destPoint, nodes, edges, hotspots, incidents, walkingMode]);

  const saveRoute = () => {
    if (!safeRoute || !originPoint || !destPoint) return;
    if (saved.some(s => s.originId === originPoint.nearestNode.id && s.destinationId === destPoint.nearestNode.id)) return;
    setSaved(prev => [{
      id: `fav_${Date.now()}`,
      name: `${originPoint.label} → ${destPoint.label}`,
      originId: originPoint.nearestNode.id,
      originName: originPoint.label,
      destinationId: destPoint.nearestNode.id,
      destinationName: destPoint.label,
      createdAt: new Date().toLocaleDateString('es-PE'),
      algorithm: 'astar_safe',
      distanceKm: safeRoute.totalDistanceKm,
      safetyScore: safeRoute.safetyScore,
      estimatedTimeMinutes: safeRoute.estimatedTimeMinutes,
    }, ...prev]);
  };

  const loadRoute = useCallback((r: SavedRoute) => {
    const oNode = nodes.find(n => n.id === r.originId);
    const dNode = nodes.find(n => n.id === r.destinationId);
    if (!oNode || !dNode) { setFavOpen(false); return; }
    const oPoint = { lat: oNode.lat, lng: oNode.lng, label: oNode.name, nearestNode: oNode };
    const dPoint = { lat: dNode.lat, lng: dNode.lng, label: dNode.name, nearestNode: dNode };
    setOriginPoint(oPoint);
    setDestPoint(dPoint);
    setSafeRoute(null); setSafeOsrm(null);
    setStdRoute(null);  setStdOsrm(null);
    setStep(3); setFavOpen(false);
    // Auto-draw the saved route immediately — no need to press Calcular again
    setTimeout(() => {
      if (oPoint && dPoint) calculateRouteRef.current(compareConventional);
    }, 100);
  }, [nodes, compareConventional]);

  const reset = () => {
    setOriginPoint(null); setDestPoint(null);
    setSafeRoute(null);   setStdRoute(null);
    setSafeOsrm(null);    setStdOsrm(null);
    setCalcError(null);   setSelMode('idle'); setStep(1);
  };

  const score    = safeRoute ? Math.round(safeRoute.safetyScore) : null;
  const isSaved  = saved.some(s => s.originId === originPoint?.nearestNode.id && s.destinationId === destPoint?.nearestNode.id);
  const realDist = safeOsrm?.distanceKm ?? safeRoute?.totalDistanceKm;
  // Tiempo real: si está a pie usa ritmo de caminata; si está en auto usa duración vehicular
  const realTime = walkingMode
    ? (walkMin ?? safeOsrm?.walkingMinutes ?? (safeRoute ? Math.max(1, Math.round((safeRoute.totalDistanceKm / 5) * 60)) : null))
    : (safeOsrm ? safeOsrm.durationMinutes : (safeRoute ? safeRoute.estimatedTimeMinutes : null));

  // ── Walking mode derived stats ────────────────────────────────
  const walkDist   = realDist ?? 0;
  const walkSteps  = Math.round(walkDist * STEPS_PER_KM);
  const walkCals   = Math.round(walkDist * CALS_PER_KM);
  const walkMin    = walkDist > 0 ? walkingTime(walkDist, walkPace) : null;
  const arrivalTime = walkMin != null ? (() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + walkMin);
    return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  })() : null;

  return (
    <div className="ls-app">

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <header className="ls-header">
        <div className="ls-header-brand">
          <div className="ls-logo"><Shield size={18} /></div>
          <div>
            <span className="ls-brand-name">LimaSegura</span>
            <span className="ls-brand-year">2026</span>
          </div>
        </div>

        <div className="ls-header-center">
          {originPoint && destPoint && (
            <div className="ls-route-summary">
              <span className="ls-rs-origin">{originPoint.label}</span>
              <Route size={12} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
              <span className="ls-rs-dest">{destPoint.label}</span>
            </div>
          )}
        </div>

        <div className="ls-header-actions">
          {/* Modo caminata — recalcula la ruta inmediatamente con el perfil adecuado (a pie o vehículo) */}
          <button
            className={`ls-icon-btn ${walkingMode ? 'active walk-active' : ''}`}
            onClick={() => {
              const next = !walkingMode;
              setWalkingMode(next);
              // Recalcular inmediatamente con el nuevo perfil (a pie / vehículo)
              if (safeRoute && originPoint && destPoint) {
                calculateRoute(compareConventional, next);
              }
            }}
            title={walkingMode ? 'Desactivar modo caminata' : 'Activar modo caminata a pie'}
          >
            <Footprints size={16} />
          </button>

          {/* Zonas de riesgo */}
          <button
            className={`ls-icon-btn ${showRisk ? 'active' : ''}`}
            onClick={() => setShowRisk(v => !v)}
            title={showRisk ? 'Ocultar zonas de riesgo' : 'Mostrar zonas de riesgo'}
          >
            <AlertTriangle size={16} />
          </button>

          {/* Rutas guardadas */}
          <button className="ls-icon-btn" onClick={() => setFavOpen(true)} title="Rutas guardadas">
            <Bookmark size={16} />
            {saved.length > 0 && <span className="ls-badge">{saved.length}</span>}
          </button>

          {/* Modo día / noche */}
          <button
            className="ls-icon-btn"
            onClick={() => setIsDark(v => !v)}
            title={isDark ? 'Cambiar a modo día ☀️' : 'Cambiar a modo noche 🌙'}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Ayuda / Tour */}
          <button
            className="ls-icon-btn"
            onClick={() => setShowTour(true)}
            title="Ver guía de uso"
          >
            <HelpCircle size={16} />
          </button>

          {/* Reiniciar — visible solo cuando hay puntos seleccionados */}
          {(originPoint || destPoint) && (
            <button className="ls-icon-btn danger" onClick={reset} title="Reiniciar ruta">
              <RotateCcw size={16} />
            </button>
          )}
        </div>
      </header>

      {/* (menú hamburger eliminado — todas las opciones están en los botones del header) */}

      {/* ── MAIN LAYOUT ────────────────────────────────────────── */}
      <div className="ls-main">

        {/* MAP */}
        <div className="ls-map-area">
          {selMode !== 'idle' && (
            <div className="ls-map-selection-banner">
              <MapPin size={15} />
              <span>Toca el mapa para marcar {selMode === 'origin' ? 'el origen' : 'el destino'}</span>
              <button onClick={() => { setSelMode('idle'); setPanelOpen(true); }}>
                <X size={13} /> Cancelar
              </button>
            </div>
          )}
          <MapContainer
            nodes={nodes}
            edges={edges}
            hotspots={hotspots}
            incidents={incidents}
            originPoint={originPoint}
            destPoint={destPoint}
            selectionMode={selMode}
            safeRoute={safeRoute}
            standardRoute={stdRoute}
            safeStreetCoords={safeOsrm?.coordinates ?? null}
            stdStreetCoords={stdOsrm?.coordinates ?? null}
            showRiskZones={showRisk}
            onPointSelected={handlePointSelected}
            onRouteInvalidated={() => {
              setSafeRoute(null); setStdRoute(null);
              setSafeOsrm(null);  setStdOsrm(null);
              setCalcError(null);
            }}
          />
        </div>

        {/* PANEL — Bottom Sheet en móvil, sidebar en escritorio */}
        <div className={`ls-panel ${panelOpen ? '' : 'collapsed'}`}>
          {/* Handle/toggle — visible solo en móvil (CSS controla visibilidad) */}
          <button className="ls-panel-toggle" onClick={() => setPanelOpen(v => !v)}>
            {panelOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            <span>
              {panelOpen
                ? 'Ocultar panel de ruta'
                : (safeRoute ? `✅ Ruta · ${realDist != null ? realDist.toFixed(1) + ' km' : 'calculada'}` : 'Ver opciones de ruta')
              }
            </span>
          </button>

          <div className="ls-panel-body">

              {/* ── STEP 1: ORIGIN ─────────────────────────────── */}
              <div className={`ls-step ${step >= 1 ? 'active' : ''}`}>
                <div className="ls-step-header">
                  <div className="ls-step-num origin">1</div>
                  <div className="ls-step-info">
                    <div className="ls-step-title">Punto de partida</div>
                    {originPoint
                      ? <div className="ls-step-value origin">{originPoint.label}</div>
                      : <div className="ls-step-hint">¿Desde dónde sales?</div>
                    }
                  </div>
                  {originPoint && (
                    <button className="ls-clear-btn" onClick={() => { setOriginPoint(null); setSafeRoute(null); setSafeOsrm(null); setStep(1); }}>
                      <X size={12} />
                    </button>
                  )}
                </div>
                <div className="ls-step-actions">
                  <button
                    className={`ls-action-btn ${selMode === 'origin' ? 'selecting' : ''}`}
                    onClick={() => {
                      const next = selMode === 'origin' ? 'idle' : 'origin';
                      setSelMode(next);
                      if (next !== 'idle' && window.innerWidth < 640) setPanelOpen(false);
                    }}
                  >
                    <MapPin size={13} />
                    {selMode === 'origin' ? 'Toca el mapa…' : 'Seleccionar en mapa'}
                  </button>
                  <button className="ls-action-btn gps" onClick={detectLocation} title="Usar mi ubicación GPS">
                    <Crosshair size={13} /> GPS
                  </button>
                </div>
              </div>

              {/* ── SWAP BUTTON (si hay ambos puntos) ──────────── */}
              {originPoint && destPoint && (
                <div className="ls-swap-row">
                  <button className="ls-swap-btn" onClick={swapPoints} title="Invertir origen y destino">
                    <ArrowUpDown size={12} />
                    <span>Invertir origen y destino</span>
                  </button>
                </div>
              )}

              {/* ── STEP 2: DESTINATION ────────────────────────── */}
              <div className={`ls-step ${step >= 2 ? 'active' : ''} ${!originPoint ? 'disabled' : ''}`}>
                <div className="ls-step-header">
                  <div className="ls-step-num dest">2</div>
                  <div className="ls-step-info">
                    <div className="ls-step-title">Destino</div>
                    {destPoint
                      ? <div className="ls-step-value dest">{destPoint.label}</div>
                      : <div className="ls-step-hint">¿A dónde quieres ir?</div>
                    }
                  </div>
                  {destPoint && (
                    <button className="ls-clear-btn" onClick={() => { setDestPoint(null); setSafeRoute(null); setSafeOsrm(null); if (step > 2) setStep(2); }}>
                      <X size={12} />
                    </button>
                  )}
                </div>
                <div className="ls-step-actions">
                  <button
                    className={`ls-action-btn ${selMode === 'destination' ? 'selecting' : ''}`}
                    onClick={() => {
                      const next = selMode === 'destination' ? 'idle' : 'destination';
                      setSelMode(next);
                      if (next !== 'idle' && window.innerWidth < 640) setPanelOpen(false);
                    }}
                    disabled={!originPoint}
                  >
                    <Navigation size={13} />
                    {selMode === 'destination' ? 'Toca el mapa…' : 'Seleccionar en mapa'}
                  </button>
                </div>
              </div>

              {/* ── CRITERIO ÚNICO: RUTA SEGURA INTELIGENTE ── */}
              <div className="ls-criterion-card">
                <div className="ls-criterion-header">
                  <div className="ls-criterion-icon">
                    <ShieldCheck size={18} />
                  </div>
                  <div className="ls-criterion-texts">
                    <div className="ls-criterion-title">Navegación con Protección Activa</div>
                    <div className="ls-criterion-sub">Desvío inteligente de aglomeraciones y zonas de peligro</div>
                  </div>
                </div>
                <label className="ls-compare-toggle">
                  <input
                    type="checkbox"
                    checked={compareConventional}
                    onChange={(e) => toggleCompare(e.target.checked)}
                  />
                  <span>Mostrar ruta directa en el mapa para comparar</span>
                  {comparingLoading && <RefreshCw size={12} className="spin" style={{ marginLeft: 'auto' }} />}
                </label>
              </div>

              {/* ── WALKING MODE BANNER ─────────────────────────── */}
              {walkingMode && (
                <div className="ls-walk-banner">
                  <Footprints size={14} />
                  <span>Modo caminata activo — métricas para ir a pie</span>
                </div>
              )}

              {/* ── CALCULATE BUTTON ───────────────────────────── */}
              <button
                className="ls-calc-btn"
                disabled={!originPoint || !destPoint || calculating}
                onClick={() => calculateRoute(compareConventional)}
              >
                {calculating
                  ? <><RefreshCw size={16} className="spin" /> Trazando ruta segura por calles…</>
                  : <><Shield size={16} /> Calcular ruta más segura</>
                }
              </button>

              {calcError && (
                <div className="ls-error"><AlertTriangle size={13} /> {calcError}</div>
              )}

              {osrmFailed && safeRoute && (
                <div className="ls-info">
                  <Info size={13} />
                  La geometría real de calles no está disponible temporalmente. Se muestra la ruta aproximada.
                </div>
              )}

              {/* ── RESULTS ────────────────────────────────────── */}
              {safeRoute && score !== null && (
                <div className="ls-results">
                  <div className="ls-results-header">
                    <span className="ls-results-title">Ruta calculada</span>
                    <span className="ls-results-alg-badge" style={{ '--ac': safetyColor(score) } as React.CSSProperties}>
                      {safetyLabel(score)}
                    </span>
                  </div>

                  <div className="ls-score-row">
                    <div className="ls-score-circle" style={{ '--sc': safetyColor(score) } as React.CSSProperties}>
                      <span className="ls-score-num">{score}%</span>
                      <span className="ls-score-label">Seguridad</span>
                    </div>
                    <div className="ls-stats">
                      <div className="ls-stat">
                        <Ruler size={13} />
                        <span><strong>{realDist?.toFixed(1) ?? '—'} km</strong> de distancia</span>
                      </div>
                      <div className="ls-stat">
                        <Clock size={13} />
                        <span><strong>{realTime ?? '—'} min</strong> estimado {walkingMode ? '(a pie)' : '(en auto)'}</span>
                      </div>
                      {stdRoute && stdRoute.safetyScore < safeRoute.safetyScore && (
                        <div className="ls-stat good">
                          <ShieldCheck size={13} />
                          <span>+{Math.round(safeRoute.safetyScore - stdRoute.safetyScore)}% más segura que la ruta directa</span>
                        </div>
                      )}
                      <div className="ls-stat muted">
                        <Info size={13} />
                        <span>Protección: Monitoreo activo de tumultos y riesgo</span>
                      </div>
                    </div>
                  </div>

                  {/* ── PANEL COMPARATIVO DETALLADO (A* vs DIJKSTRA DIRECTO) ── */}
                  {compareConventional && stdRoute && (
                    <div className="ls-comparison-card">
                      <div className="ls-comparison-header">
                        <GitCompare size={15} />
                        <span>Comparativa: Ruta Segura (A*) vs Ruta Convencional Directa</span>
                      </div>

                      <div className="ls-comparison-grid">
                        <div className="ls-comp-col safe">
                          <div className="ls-comp-badge">🛡️ Ruta Segura (A*)</div>
                          <div className="ls-comp-val">{realDist?.toFixed(1)} km · {realTime} min {walkingMode ? '(a pie)' : '(en auto)'}</div>
                          <div className="ls-comp-sub" style={{ color: '#2DD4A0', fontWeight: 700 }}>
                            {Math.round(safeRoute.safetyScore)}% de Seguridad
                          </div>
                          <div className="ls-comp-desc">
                            {walkingMode
                              ? 'Evita vías rápidas peligrosas, aglomeraciones críticas y zonas delictivas.'
                              : 'Desvía zonas rojas, confluencias peatonales e incidentes delictivos activos.'}
                          </div>
                        </div>

                        <div className="ls-comp-col direct">
                          <div className="ls-comp-badge direct">⚠️ Ruta Directa Convencional</div>
                          <div className="ls-comp-val">
                            {(stdOsrm ? stdOsrm.distanceKm : stdRoute.totalDistanceKm).toFixed(1)} km · {
                              stdOsrm
                                ? (walkingMode ? stdOsrm.walkingMinutes : stdOsrm.durationMinutes)
                                : stdRoute.estimatedTimeMinutes
                            } min {walkingMode ? '(a pie)' : '(en auto)'}
                          </div>
                          <div className="ls-comp-sub" style={{ color: stdRoute.safetyScore < 70 ? '#f43f5e' : '#e2e8f0', fontWeight: 700 }}>
                            {Math.round(stdRoute.safetyScore)}% de Seguridad
                          </div>
                          <div className="ls-comp-desc">
                            Algoritmo estándar (Dijkstra): optimiza distancia sin esquivar focos de riesgo.
                          </div>
                        </div>
                      </div>

                      <div className="ls-comp-verdict">
                        {safeRoute.safetyScore > stdRoute.safetyScore ? (
                          <>
                            <CheckCircle2 size={15} className="text-emerald" />
                            <span>
                              <strong>Veredicto:</strong> La ruta protegida requiere{' '}
                              <strong>
                                {Math.max(0, Number(((realDist ?? safeRoute.totalDistanceKm) - (stdOsrm ? stdOsrm.distanceKm : stdRoute.totalDistanceKm)).toFixed(1)))} km adicionales
                              </strong>{' '}
                              a cambio de ganar un{' '}
                              <strong className="text-emerald">
                                +{Math.round(safeRoute.safetyScore - stdRoute.safetyScore)}% de protección
                              </strong>{' '}
                              frente a robos y aglomeraciones.
                            </span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={15} className="text-emerald" />
                            <span>
                              <strong>Veredicto:</strong> En este trayecto la vía directa ya es <strong>100% segura</strong> (libre de aglomeraciones y focos delictivos activos). Por ello, ambas rutas coinciden en distancia y recorrido óptimo.
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── WALKING MODE STATS ─────────────────────── */}
                  {walkingMode && walkDist > 0 && (
                    <div className="ls-walk-card">
                      <div className="ls-walk-card-header">
                        <Footprints size={14} />
                        <span>Estadísticas a pie</span>
                      </div>

                      {/* Selector de ritmo */}
                      <div className="ls-walk-pace-row">
                        {WALK_PACES.map(p => (
                          <button
                            key={p.id}
                            className={`ls-walk-pace-btn ${walkPace === p.id ? 'active' : ''}`}
                            onClick={() => setWalkPace(p.id)}
                          >
                            <span className="ls-walk-pace-icon">{p.icon}</span>
                            <span className="ls-walk-pace-label">{p.label}</span>
                            <span className="ls-walk-pace-speed">{p.kmh} km/h</span>
                          </button>
                        ))}
                      </div>

                      {/* Métricas de caminata */}
                      <div className="ls-walk-stats">
                        <div className="ls-walk-stat">
                          <Timer size={14} />
                          <div>
                            <span className="ls-walk-stat-val">{walkMin} min</span>
                            <span className="ls-walk-stat-lbl">Tiempo estimado</span>
                          </div>
                        </div>
                        <div className="ls-walk-stat">
                          <Clock size={14} />
                          <div>
                            <span className="ls-walk-stat-val">{arrivalTime}</span>
                            <span className="ls-walk-stat-lbl">Llegada aprox.</span>
                          </div>
                        </div>
                        <div className="ls-walk-stat">
                          <PersonStanding size={14} />
                          <div>
                            <span className="ls-walk-stat-val">{walkSteps.toLocaleString('es-PE')}</span>
                            <span className="ls-walk-stat-lbl">Pasos estimados</span>
                          </div>
                        </div>
                        <div className="ls-walk-stat">
                          <Flame size={14} />
                          <div>
                            <span className="ls-walk-stat-val">{walkCals} kcal</span>
                            <span className="ls-walk-stat-lbl">Calorías quemadas</span>
                          </div>
                        </div>
                        <div className="ls-walk-stat full">
                          <Ruler size={14} />
                          <div>
                            <span className="ls-walk-stat-val">
                              {walkDist >= 1
                                ? `${walkDist.toFixed(2)} km`
                                : `${Math.round(walkDist * 1000)} m`}
                            </span>
                            <span className="ls-walk-stat-lbl">Distancia total</span>
                          </div>
                        </div>
                      </div>

                      {score !== null && score < 60 && (
                        <div className="ls-walk-warning">
                          <AlertTriangle size={12} />
                          <span>Zona de riesgo moderado. Considera activar «Máxima Seguridad» para mayor protección al caminar.</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Turn-by-turn instructions */}
                  {safeRoute.stepByStepDirections.length > 0 && (
                    <div className="ls-dirs-section">
                      <button className="ls-dirs-toggle" onClick={() => setShowDirs(v => !v)}>
                        <Navigation size={12} />
                        {showDirs ? 'Ocultar instrucciones' : `Ver instrucciones (${safeRoute.stepByStepDirections.length} pasos)`}
                        {showDirs ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                      {showDirs && (
                        <div className="ls-dirs-list">
                          {safeRoute.stepByStepDirections.map((d, i) => (
                            <div key={i} className={`ls-direction-item ${d.warning ? 'has-warning' : ''}`}>
                              <span className="ls-dir-num">{i + 1}</span>
                              <div className="ls-dir-content">
                                <span className="ls-dir-text">{d.instruction}</span>
                                {d.warning && (
                                  <span className="ls-dir-warning">⚠️ {d.warning}</span>
                                )}
                              </div>
                              {d.distanceMeters > 0 && (
                                <span className="ls-dir-dist">
                                  {d.distanceMeters < 1000
                                    ? `${Math.round(d.distanceMeters)}m`
                                    : `${(d.distanceMeters / 1000).toFixed(1)}km`}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Risk zones along route */}
                  {safeRoute.crowdExposureScore > 20 && (
                    <div className="ls-warning-row">
                      <AlertTriangle size={13} />
                      <span>⚠️ Esta ruta bordea algunas zonas con aglomeración. El algoritmo eligió el camino con menor riesgo total disponible en la red vial.</span>
                    </div>
                  )}

                  <button className={`ls-save-btn ${isSaved ? 'saved' : ''}`} onClick={saveRoute} disabled={isSaved}>
                    {isSaved ? <><Check size={13} /> Guardada en favoritos</> : <><Star size={13} /> Guardar esta ruta</>}
                  </button>
                </div>
              )}

            </div>{/* ls-panel-body */}
          </div>{/* ls-panel */}
        </div>{/* ls-main */}

        <FavoritesDrawer
          isOpen={favOpen}
          onClose={() => setFavOpen(false)}
          savedRoutes={saved}
          onLoadRoute={loadRoute}
          onDeleteRoute={(id) => setSaved(prev => prev.filter(r => r.id !== id))}
          onClearAll={() => setSaved([])}
        />

        <GuidedTour
          forceShow={showTour}
          onClose={() => setShowTour(false)}
        />
      </div>
    );
}
