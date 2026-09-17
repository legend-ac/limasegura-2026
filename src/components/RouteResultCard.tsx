import React, { useState, useEffect, useRef } from 'react';
import {
  RouteResult,
  SavedRoute,
  GraphNode,
} from '../types';
import {
  ShieldCheck, Clock, Footprints, TrendingUp, AlertTriangle,
  ChevronDown, ChevronUp, Bookmark, Smartphone, Play, Pause,
  RotateCcw, MapPin, CheckCircle2, ArrowRight, Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RouteResultCardProps {
  safeRoute: RouteResult | null;
  standardRoute: RouteResult | null;
  activeAlgorithm: string;
  onSaveRoute: () => void;
  onSyncMobile: () => void;
  originName?: string;
  destName?: string;
}

// Safety score to color/label
function safetyMeta(score: number) {
  if (score >= 85) return { color: 'var(--c-green)', label: 'Óptimo', bg: 'var(--c-green-dim)' };
  if (score >= 65) return { color: 'var(--c-amber)', label: 'Moderado', bg: 'rgba(227,179,65,0.12)' };
  return { color: 'var(--c-red)', label: 'Riesgo', bg: 'rgba(248,81,73,0.1)' };
}

// Safety gauge SVG
const SafetyGauge: React.FC<{ score: number; size?: number }> = ({ score, size = 80 }) => {
  const r = 30;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const arc = circ * 0.75;
  const offset = arc - (arc * score) / 100;
  const { color } = safetyMeta(score);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      {/* Track */}
      <circle
        cx={cx} cy={cy} r={r}
        fill="none" stroke="var(--c-surface-3)"
        strokeWidth={5}
        strokeDasharray={`${arc} ${circ - arc}`}
        strokeLinecap="round"
        transform={`rotate(135 ${cx} ${cy})`}
      />
      {/* Fill */}
      <motion.circle
        cx={cx} cy={cy} r={r}
        fill="none" stroke={color}
        strokeWidth={5}
        strokeDasharray={`${arc} ${circ - arc}`}
        strokeLinecap="round"
        transform={`rotate(135 ${cx} ${cy})`}
        initial={{ strokeDashoffset: arc }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: [0.34, 1.56, 0.64, 1] }}
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />
      {/* Score text */}
      <text
        x={cx} y={cy + 2}
        textAnchor="middle" dominantBaseline="middle"
        fill={color}
        fontSize={size * 0.22}
        fontWeight="800"
        fontFamily="var(--font-mono)"
      >
        {score}%
      </text>
    </svg>
  );
};

export const RouteResultCard: React.FC<RouteResultCardProps> = ({
  safeRoute, standardRoute, activeAlgorithm,
  onSaveRoute, onSyncMobile, originName, destName,
}) => {
  const [showSteps, setShowSteps] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [saved, setSaved] = useState(false);
  const [simStep, setSimStep] = useState(0);
  const [simRunning, setSimRunning] = useState(false);
  const simRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const route = safeRoute;
  if (!route) return null;

  const score = Math.round(route.safetyScore);
  const meta = safetyMeta(score);
  const advantage = standardRoute
    ? Math.round(route.safetyScore - standardRoute.safetyScore)
    : null;

  // Helper to detect node risk from hotspots context (approximation)
  const getNodeRisk = (_node: GraphNode): 'low' | 'medium' | 'high' => 'low';

  // Simulation
  useEffect(() => {
    if (simRunning && route.pathNodes.length > 0) {
      simRef.current = setInterval(() => {
        setSimStep(prev => {
          if (prev >= route.pathNodes.length - 1) {
            setSimRunning(false);
            return prev;
          }
          return prev + 1;
        });
      }, 900);
    }
    return () => { if (simRef.current) clearInterval(simRef.current); };
  }, [simRunning, route.pathNodes.length]);

  const handleSave = () => {
    onSaveRoute();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };


  const simProgress = route.pathNodes.length > 1
    ? (simStep / (route.pathNodes.length - 1)) * 100
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
      style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}
    >
      {/* Result header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '8px',
          background: meta.bg, border: `1px solid ${meta.color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <ShieldCheck style={{ width: '16px', height: '16px', color: meta.color }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '2px' }}>Ruta calculada</h3>
          {originName && destName && (
            <p style={{ fontSize: '0.6875rem', color: 'var(--c-text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {originName} → {destName}
            </p>
          )}
        </div>
        <span className={`badge ${score >= 85 ? 'badge-green' : score >= 65 ? 'badge-amber' : 'badge-red'}`}>
          {meta.label}
        </span>
      </div>

      {/* Score + metrics row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <SafetyGauge score={score} size={76} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', flex: 1 }}>
          <div className="stat-card">
            <div className="stat-value" style={{ fontSize: '1.125rem' }}>{route.totalDistanceKm} km</div>
            <div className="stat-label">Distancia</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ fontSize: '1.125rem' }}>{route.estimatedTimeMinutes} min</div>
            <div className="stat-label">Tiempo est.</div>
          </div>
          <div className="stat-card" style={{ gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div>
                <div style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--c-text-3)', marginBottom: '2px' }}>Algoritmo</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--c-text-1)' }}>{activeAlgorithm.replace('_', ' ').toUpperCase()}</div>
              </div>
              {advantage !== null && advantage > 0 && (
                <span className="badge badge-green">+{advantage}% más segura</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Route simulation */}
      {route.pathNodes.length > 0 && (
        <div className="card-inner" style={{ padding: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--c-text-2)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <MapPin style={{ width: '12px', height: '12px', color: 'var(--c-green)' }} />
              Simulación del trayecto
            </span>
            <div style={{ display: 'flex', gap: '0.375rem' }}>
              <button
                className="btn btn-ghost btn-icon btn-sm"
                onClick={() => { setSimStep(0); setSimRunning(false); }}
                title="Reiniciar"
              >
                <RotateCcw style={{ width: '12px', height: '12px' }} />
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setSimRunning(!simRunning)}
              >
                {simRunning
                  ? <><Pause style={{ width: '11px', height: '11px' }} /> Pausar</>
                  : <><Play style={{ width: '11px', height: '11px' }} /> {simStep === 0 ? 'Simular' : 'Continuar'}</>
                }
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="progress-track" style={{ marginBottom: '0.375rem' }}>
            <div className="progress-fill" style={{ width: `${simProgress}%` }} />
          </div>

          {/* Current node label */}
          <div style={{ fontSize: '0.6875rem', color: 'var(--c-text-3)' }}>
            Tramo {simStep + 1}/{route.pathNodes.length} —{' '}
            <span style={{ color: 'var(--c-text-2)', fontWeight: 600 }}>
              {route.pathNodes[simStep]?.name ?? '—'}
            </span>
          </div>
        </div>
      )}

      {/* Step-by-step toggle */}
      {route.pathNodes.length > 0 && (
        <>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowSteps(!showSteps)}
            style={{ justifyContent: 'space-between', width: '100%', color: 'var(--c-text-2)' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <Footprints style={{ width: '13px', height: '13px' }} />
              Instrucciones paso a paso ({route.pathNodes.length} tramos)
            </span>
            {showSteps ? <ChevronUp style={{ width: '13px', height: '13px' }} /> : <ChevronDown style={{ width: '13px', height: '13px' }} />}
          </button>

          <AnimatePresence>
            {showSteps && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', maxHeight: '240px', overflowY: 'auto', paddingRight: '2px' }}>
                  {route.pathNodes.map((node, i) => {
                    const isActive = i === simStep;
                    const isDone = i < simStep;
                    return (
                      <div
                        key={node.id}
                        className={`step-item`}
                        style={{
                          background: isActive ? 'rgba(45,212,160,0.06)' : isDone ? 'rgba(255,255,255,0.02)' : undefined,
                          borderColor: isActive ? 'rgba(45,212,160,0.3)' : undefined,
                          opacity: isDone ? 0.55 : 1,
                        }}
                      >
                        <div style={{
                          width: '20px', height: '20px', borderRadius: '50%',
                          background: isDone ? 'var(--c-green-dim)' : isActive ? 'var(--c-green)' : 'var(--c-surface-3)',
                          border: `1.5px solid ${isActive ? 'var(--c-green)' : 'var(--c-border-md)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, fontSize: '0.5625rem', fontWeight: 700,
                          color: isActive ? '#04150F' : isDone ? 'var(--c-green)' : 'var(--c-text-3)',
                          fontFamily: 'var(--font-mono)',
                        }}>
                          {isDone ? '✓' : i + 1}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: isActive ? 'var(--c-text-1)' : 'var(--c-text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {node.name}
                          </div>
                          <div style={{ fontSize: '0.625rem', color: 'var(--c-text-3)' }}>{node.district}</div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Compare toggle */}
      {standardRoute && (
        <>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowCompare(!showCompare)}
            style={{ justifyContent: 'space-between', width: '100%', color: 'var(--c-text-2)' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <TrendingUp style={{ width: '13px', height: '13px' }} />
              Comparar con ruta directa
            </span>
            {showCompare ? <ChevronUp style={{ width: '13px', height: '13px' }} /> : <ChevronDown style={{ width: '13px', height: '13px' }} />}
          </button>

          <AnimatePresence>
            {showCompare && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{ overflow: 'hidden' }}
              >
                <div className="card-inner" style={{ padding: '0.75rem' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', color: 'var(--c-text-3)', fontWeight: 600, padding: '0 0 0.5rem 0', fontSize: '0.625rem', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Métrica</th>
                        <th style={{ textAlign: 'right', color: 'var(--c-green)', fontWeight: 700, padding: '0 0 0.5rem 0', fontSize: '0.6875rem' }}>A* Segura</th>
                        <th style={{ textAlign: 'right', color: 'var(--c-text-3)', fontWeight: 600, padding: '0 0 0.5rem 0', fontSize: '0.6875rem' }}>Directa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: 'Índice de seguridad', a: `${Math.round(route.safetyScore)}%`, b: `${Math.round(standardRoute.safetyScore)}%` },
                        { label: 'Distancia', a: `${route.totalDistanceKm} km`, b: `${standardRoute.totalDistanceKm} km` },
                        { label: 'Tiempo estimado', a: `${route.estimatedTimeMinutes} min`, b: `${standardRoute.estimatedTimeMinutes} min` },
                      ].map(row => (
                        <tr key={row.label} style={{ borderTop: '1px solid var(--c-border)' }}>
                          <td style={{ color: 'var(--c-text-3)', padding: '0.375rem 0' }}>{row.label}</td>
                          <td style={{ textAlign: 'right', color: 'var(--c-text-1)', fontWeight: 600, padding: '0.375rem 0', fontFamily: 'var(--font-mono)', fontSize: '0.6875rem' }}>{row.a}</td>
                          <td style={{ textAlign: 'right', color: 'var(--c-text-3)', padding: '0.375rem 0', fontFamily: 'var(--font-mono)', fontSize: '0.6875rem' }}>{row.b}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button className="btn btn-secondary btn-sm" onClick={handleSave} style={{ flex: 1, color: saved ? 'var(--c-green)' : undefined, borderColor: saved ? 'var(--c-green-glow)' : undefined }}>
          {saved ? <CheckCircle2 style={{ width: '13px', height: '13px', color: 'var(--c-green)' }} /> : <Bookmark style={{ width: '13px', height: '13px', color: 'var(--c-amber)' }} />}
          {saved ? 'Guardada ✓' : 'Guardar ruta'}
        </button>
        <button className="btn btn-secondary btn-sm" onClick={onSyncMobile} style={{ flex: 1 }}>
          <Smartphone style={{ width: '13px', height: '13px', color: 'var(--c-blue)' }} />
          Enviar al móvil
        </button>
      </div>
    </motion.div>
  );
};
