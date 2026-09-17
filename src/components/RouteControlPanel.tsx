import React, { useState, useMemo } from 'react';
import {
  Navigation, MapPin, Crosshair, ChevronDown,
  ArrowUpDown, Search, Settings, Users, AlertTriangle,
  CheckCircle2, SlidersHorizontal, HelpCircle, LocateFixed,
  Shield, Zap, Route
} from 'lucide-react';
import { GraphNode, AlgorithmType } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface RouteControlPanelProps {
  nodes: GraphNode[];
  originNode: GraphNode | null;
  destNode: GraphNode | null;
  algorithm: AlgorithmType;
  crowdRadiusMultiplier: number;
  crowdAvoidanceWeight: number;
  isCalculating: boolean;
  onOriginChange: (node: GraphNode) => void;
  onDestChange: (node: GraphNode) => void;
  onAlgorithmChange: (alg: AlgorithmType) => void;
  onCrowdRadiusMultiplierChange: (v: number) => void;
  onCrowdAvoidanceWeightChange: (v: number) => void;
  onCalculate: () => void;
  onSwapNodes: () => void;
  clickMode: 'idle' | 'set_origin' | 'set_destination' | 'inspect';
  onSetClickMode: (mode: 'idle' | 'set_origin' | 'set_destination' | 'inspect') => void;
  onDetectLocation: () => void;
  isDetectingLocation: boolean;
}

// Algorithm definitions — clear descriptions for new users
const ALGORITHMS: { id: AlgorithmType; name: string; shortDesc: string; color: string; Icon: React.ElementType }[] = [
  {
    id: 'astar_safe',
    name: 'A* Seguro',
    shortDesc: 'Evita aglomeraciones y zonas de riesgo. Recomendado.',
    color: 'var(--c-green)',
    Icon: Shield,
  },
  {
    id: 'dijkstra',
    name: 'Dijkstra',
    shortDesc: 'Ruta más corta ignorando el factor de riesgo.',
    color: 'var(--c-blue)',
    Icon: Route,
  },
  {
    id: 'greedy',
    name: 'Greedy',
    shortDesc: 'Ruta rápida, heurística directa sin pesos.',
    color: 'var(--c-amber)',
    Icon: Zap,
  },
  {
    id: 'astar_distance',
    name: 'A* Distancia',
    shortDesc: 'Ruta más corta priorizando menor distancia.',
    color: 'var(--c-purple)',
    Icon: Users,
  },
];

// Crowd presets
const CROWD_PRESETS = [
  { label: 'Normal', radius: 1.0, weight: 2.0 },
  { label: 'Hora Punta', radius: 1.5, weight: 3.5 },
  { label: 'Festivo', radius: 2.0, weight: 4.5 },
  { label: 'Crisis', radius: 2.8, weight: 6.0 },
];

interface NodePickerProps {
  label: string;
  badge: 'A' | 'B';
  selected: GraphNode | null;
  nodes: GraphNode[];
  onSelect: (n: GraphNode) => void;
  onPickOnMap: () => void;
  isPickingOnMap: boolean;
  onDetectLocation?: () => void;
  isDetecting?: boolean;
}

const NodePicker: React.FC<NodePickerProps> = ({
  label, badge, selected, nodes, onSelect, onPickOnMap, isPickingOnMap, onDetectLocation, isDetecting,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const isOrigin = badge === 'A';
  const accentColor = isOrigin ? 'var(--c-green)' : 'var(--c-red)';

  const filtered = useMemo(() =>
    search.trim()
      ? nodes.filter(n =>
          n.name.toLowerCase().includes(search.toLowerCase()) ||
          n.district.toLowerCase().includes(search.toLowerCase())
        ).slice(0, 8)
      : nodes.slice(0, 8),
    [nodes, search]
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
        <span style={{
          width: '20px', height: '20px', borderRadius: '50%',
          background: accentColor, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.625rem', fontWeight: 800, fontFamily: 'var(--font-mono)',
          flexShrink: 0,
        }}>{badge}</span>
        <span className="section-label" style={{ color: 'var(--c-text-2)' }}>{label}</span>
      </div>

      {/* Selected value display */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '0.5rem', padding: '0.625rem 0.75rem',
          background: 'var(--c-surface-2)', border: `1px solid ${open ? accentColor : 'var(--c-border)'}`,
          borderRadius: 'var(--r-md)', cursor: 'pointer', transition: 'border-color 0.15s',
          textAlign: 'left',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = accentColor; }}
        onMouseLeave={e => { if (!open) (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--c-border)'; }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
          <MapPin style={{ width: '14px', height: '14px', color: accentColor, flexShrink: 0 }} />
          {selected ? (
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--c-text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selected.name}
              </div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--c-text-3)' }}>
                {selected.district}
              </div>
            </div>
          ) : (
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', color: 'var(--c-text-3)' }}>
              Seleccionar ubicación...
            </span>
          )}
        </div>
        <ChevronDown style={{
          width: '14px', height: '14px', color: 'var(--c-text-3)',
          transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s', flexShrink: 0,
        }} />
      </button>

      {/* Map picker + GPS row */}
      <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.375rem' }}>
        <button
          className={`btn btn-secondary btn-sm`}
          onClick={onPickOnMap}
          style={{
            flex: 1,
            background: isPickingOnMap ? `${accentColor}18` : undefined,
            borderColor: isPickingOnMap ? accentColor : undefined,
            color: isPickingOnMap ? accentColor : undefined,
          }}
        >
          <Crosshair style={{ width: '12px', height: '12px' }} />
          <span>{isPickingOnMap ? 'Clic en el mapa…' : 'Marcar en mapa'}</span>
        </button>

        {isOrigin && onDetectLocation && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={onDetectLocation}
            disabled={isDetecting}
            title="Detectar mi ubicación GPS actual"
          >
            <LocateFixed style={{ width: '12px', height: '12px', color: 'var(--c-blue)', animation: isDetecting ? 'spin 1s linear infinite' : undefined }} />
            <span className="hidden sm:inline">GPS</span>
          </button>
        )}
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scaleY: 0.95 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -4, scaleY: 0.95 }}
            transition={{ duration: 0.12 }}
            style={{
              marginTop: '0.25rem', position: 'relative', zIndex: 30,
              background: 'var(--c-surface)',
              border: '1px solid var(--c-border-md)',
              borderRadius: 'var(--r-md)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            {/* Search */}
            <div style={{
              padding: '0.5rem',
              borderBottom: '1px solid var(--c-border)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '4px 8px', background: 'var(--c-surface-2)', borderRadius: 'var(--r-sm)' }}>
                <Search style={{ width: '12px', height: '12px', color: 'var(--c-text-3)', flexShrink: 0 }} />
                <input
                  type="text"
                  autoFocus
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar lugar o distrito..."
                  style={{
                    background: 'transparent', border: 'none', outline: 'none',
                    width: '100%', fontSize: '0.75rem', color: 'var(--c-text-1)',
                    fontFamily: 'var(--font-sans)',
                  }}
                />
              </div>
            </div>

            {/* Options */}
            <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
              {filtered.map(n => (
                <button
                  key={n.id}
                  className="node-option"
                  onClick={() => { onSelect(n); setOpen(false); setSearch(''); }}
                  style={{
                    background: selected?.id === n.id ? `${accentColor}10` : undefined,
                    borderLeft: selected?.id === n.id ? `2px solid ${accentColor}` : '2px solid transparent',
                  }}
                >
                  <div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--c-text-1)' }}>{n.name}</div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', color: 'var(--c-text-3)' }}>{n.district}</div>
                  </div>
                  {selected?.id === n.id && <CheckCircle2 style={{ width: '14px', height: '14px', color: accentColor, flexShrink: 0 }} />}
                </button>
              ))}
              {filtered.length === 0 && (
                <div style={{ padding: '0.75rem 0.875rem', fontSize: '0.75rem', color: 'var(--c-text-3)', textAlign: 'center' }}>
                  No hay resultados
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const RouteControlPanel: React.FC<RouteControlPanelProps> = ({
  nodes, originNode, destNode, algorithm,
  crowdRadiusMultiplier, crowdAvoidanceWeight,
  isCalculating, onOriginChange, onDestChange,
  onAlgorithmChange, onCrowdRadiusMultiplierChange, onCrowdAvoidanceWeightChange,
  onCalculate, onSwapNodes, clickMode, onSetClickMode, onDetectLocation, isDetectingLocation,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const ready = originNode && destNode && originNode.id !== destNode.id;

  return (
    <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
        <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'var(--c-green-dim)', border: '1px solid var(--c-green-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Navigation style={{ width: '16px', height: '16px', color: 'var(--c-green)' }} />
        </div>
        <div>
          <h2 style={{ fontSize: '0.9375rem', fontWeight: 700 }}>Planificador de Ruta</h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--c-text-3)' }}>Lima Metropolitana 2026</p>
        </div>
      </div>

      {/* Step 1 — Origin */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.5rem' }}>
          <span style={{
            width: '18px', height: '18px', borderRadius: '50%',
            background: 'var(--c-surface-3)', border: '1px solid var(--c-border-md)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.5625rem', fontWeight: 700, color: 'var(--c-text-3)', flexShrink: 0,
          }}>1</span>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--c-text-2)' }}>¿Desde dónde salís?</span>
        </div>
        <NodePicker
          label="Punto de origen"
          badge="A"
          selected={originNode}
          nodes={nodes}
          onSelect={onOriginChange}
          onPickOnMap={() => onSetClickMode(clickMode === 'set_origin' ? 'idle' : 'set_origin')}
          isPickingOnMap={clickMode === 'set_origin'}
          onDetectLocation={onDetectLocation}
          isDetecting={isDetectingLocation}
        />
      </div>

      {/* Swap button */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button
          className="btn btn-ghost btn-icon btn-sm"
          onClick={onSwapNodes}
          title="Intercambiar origen y destino"
          style={{ transform: 'rotate(90deg)' }}
        >
          <ArrowUpDown style={{ width: '14px', height: '14px' }} />
        </button>
      </div>

      {/* Step 2 — Destination */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.5rem' }}>
          <span style={{
            width: '18px', height: '18px', borderRadius: '50%',
            background: 'var(--c-surface-3)', border: '1px solid var(--c-border-md)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.5625rem', fontWeight: 700, color: 'var(--c-text-3)', flexShrink: 0,
          }}>2</span>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--c-text-2)' }}>¿A dónde vas?</span>
        </div>
        <NodePicker
          label="Punto de destino"
          badge="B"
          selected={destNode}
          nodes={nodes}
          onSelect={onDestChange}
          onPickOnMap={() => onSetClickMode(clickMode === 'set_destination' ? 'idle' : 'set_destination')}
          isPickingOnMap={clickMode === 'set_destination'}
        />
      </div>

      <div className="divider" style={{ margin: '0' }} />

      {/* Step 3 — Algorithm */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.625rem' }}>
          <span style={{
            width: '18px', height: '18px', borderRadius: '50%',
            background: 'var(--c-surface-3)', border: '1px solid var(--c-border-md)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.5625rem', fontWeight: 700, color: 'var(--c-text-3)', flexShrink: 0,
          }}>3</span>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--c-text-2)' }}>Tipo de ruta</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          {ALGORITHMS.map(alg => {
            const Icon = alg.Icon;
            const active = algorithm === alg.id;
            return (
              <button
                key={alg.id}
                onClick={() => onAlgorithmChange(alg.id)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px',
                  padding: '0.625rem 0.75rem',
                  background: active ? `${alg.color}14` : 'var(--c-surface-2)',
                  border: `1px solid ${active ? alg.color : 'var(--c-border)'}`,
                  borderRadius: 'var(--r-md)', cursor: 'pointer', transition: 'all 0.15s',
                  textAlign: 'left',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--c-border-md)'; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--c-border)'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Icon style={{ width: '12px', height: '12px', color: active ? alg.color : 'var(--c-text-3)', flexShrink: 0 }} />
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: 700, color: active ? alg.color : 'var(--c-text-1)' }}>
                    {alg.name}
                  </span>
                </div>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.625rem', color: 'var(--c-text-3)', lineHeight: 1.4 }}>
                  {alg.shortDesc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Advanced settings toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          padding: '0', color: 'var(--c-text-3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <SlidersHorizontal style={{ width: '13px', height: '13px' }} />
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: 600 }}>
            Ajustes de aglomeración
          </span>
        </div>
        <ChevronDown style={{
          width: '13px', height: '13px',
          transform: showAdvanced ? 'rotate(180deg)' : undefined,
          transition: 'transform 0.15s',
        }} />
      </button>

      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {/* Presets */}
              <div>
                <p style={{ fontSize: '0.6875rem', color: 'var(--c-text-3)', marginBottom: '0.375rem', fontWeight: 600 }}>Presupuesto de riesgo ambiental:</p>
                <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                  {CROWD_PRESETS.map(p => {
                    const active = Math.abs(crowdRadiusMultiplier - p.radius) < 0.05;
                    return (
                      <button
                        key={p.label}
                        className="btn btn-sm"
                        onClick={() => { onCrowdRadiusMultiplierChange(p.radius); onCrowdAvoidanceWeightChange(p.weight); }}
                        style={{
                          background: active ? 'var(--c-green-dim)' : 'var(--c-surface-2)',
                          border: `1px solid ${active ? 'var(--c-green-glow)' : 'var(--c-border)'}`,
                          color: active ? 'var(--c-green)' : 'var(--c-text-2)',
                        }}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sliders */}
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--c-text-2)', fontWeight: 500, display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span>Radio de aglomeración</span>
                  <span className="font-mono" style={{ color: 'var(--c-green)', fontSize: '0.75rem' }}>×{crowdRadiusMultiplier.toFixed(1)}</span>
                </label>
                <input type="range" min={0.5} max={3.0} step={0.1} value={crowdRadiusMultiplier}
                  onChange={e => onCrowdRadiusMultiplierChange(parseFloat(e.target.value))} />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--c-text-2)', fontWeight: 500, display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span>Peso de evasión</span>
                  <span className="font-mono" style={{ color: 'var(--c-green)', fontSize: '0.75rem' }}>{crowdAvoidanceWeight.toFixed(1)}</span>
                </label>
                <input type="range" min={1.0} max={8.0} step={0.5} value={crowdAvoidanceWeight}
                  onChange={e => onCrowdAvoidanceWeightChange(parseFloat(e.target.value))} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Calculate button */}
      <button
        className="btn btn-primary btn-full btn-lg"
        onClick={onCalculate}
        disabled={!ready || isCalculating}
        style={{ marginTop: '0.25rem' }}
      >
        {isCalculating ? (
          <>
            <div style={{ width: '16px', height: '16px', border: '2px solid rgba(4,21,15,0.3)', borderTopColor: '#04150F', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            Calculando ruta...
          </>
        ) : (
          <>
            <Navigation style={{ width: '16px', height: '16px' }} />
            {ready ? 'Calcular ruta más segura' : 'Selecciona origen y destino'}
          </>
        )}
      </button>

      {/* Hint if not ready */}
      {!ready && (
        <p style={{ textAlign: 'center', fontSize: '0.6875rem', color: 'var(--c-text-3)' }}>
          <HelpCircle style={{ width: '11px', height: '11px', display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
          Completa los pasos 1 y 2 para calcular la ruta.
        </p>
      )}
    </div>
  );
};
