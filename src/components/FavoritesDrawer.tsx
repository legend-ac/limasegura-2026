import React from 'react';
import { SavedRoute } from '../types';
import { Bookmark, Trash2, ArrowRight, X, Clock, Compass, ShieldCheck, Route, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FavoritesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  savedRoutes: SavedRoute[];
  onLoadRoute: (route: SavedRoute) => void;
  onDeleteRoute: (id: string) => void;
  onClearAll: () => void;
}

const ALGO_LABELS: Record<string, string> = {
  astar_safe: 'Ruta Segura',
  astar_distance: 'Ruta Rápida',
  dijkstra: 'Ruta Directa',
  greedy: 'Ruta Directa',
};

function ScoreBar({ score }: { score: number }) {
  const color = score >= 75 ? '#00E5A0' : score >= 50 ? '#F59E0B' : '#FF4757';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{ flex: 1, height: '4px', borderRadius: '99px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: '99px', boxShadow: `0 0 6px ${color}60` }} />
      </div>
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.625rem', fontWeight: 700, color, minWidth: '2.5rem', textAlign: 'right' }}>
        {score}%
      </span>
    </div>
  );
}

export const FavoritesDrawer: React.FC<FavoritesDrawerProps> = ({
  isOpen, onClose, savedRoutes, onLoadRoute, onDeleteRoute, onClearAll,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, zIndex: 50,
              background: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(4px)',
            }}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            style={{
              position: 'fixed', right: 0, top: 0, bottom: 0,
              width: '100%', maxWidth: '420px',
              background: 'rgba(4, 8, 15, 0.97)',
              backdropFilter: 'blur(24px)',
              borderLeft: '1px solid rgba(56,120,220,0.18)',
              boxShadow: '-8px 0 40px rgba(0,0,0,0.6)',
              zIndex: 51,
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Top accent bar */}
            <div style={{ height: '2px', background: 'linear-gradient(90deg, transparent, #F59E0B, transparent)' }} />

            {/* Header */}
            <div style={{
              padding: '1.25rem 1.25rem 1rem',
              borderBottom: '1px solid rgba(56,120,220,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Star style={{ width: '18px', height: '18px', color: '#F59E0B', fill: '#F59E0B' }} />
                </div>
                <div>
                  <h2 style={{ fontFamily: 'Sora, Inter, sans-serif', fontSize: '1rem', fontWeight: 700, color: '#EFF6FF', margin: 0, letterSpacing: '-0.02em' }}>
                    Rutas Favoritas
                  </h2>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6875rem', color: '#4E6080', margin: 0 }}>
                    {savedRoutes.length} recorrido{savedRoutes.length !== 1 ? 's' : ''} guardado{savedRoutes.length !== 1 ? 's' : ''} · Disponible offline
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(56,120,220,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#94A3B8',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#EFF6FF')}
                onMouseLeave={e => (e.currentTarget.style.color = '#94A3B8')}
              >
                <X style={{ width: '15px', height: '15px' }} />
              </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.125rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {savedRoutes.length === 0 ? (
                <div style={{
                  flex: 1, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  textAlign: 'center', padding: '3rem 2rem',
                  gap: '1rem',
                }}>
                  <div style={{
                    width: '64px', height: '64px', borderRadius: '50%',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(56,120,220,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Bookmark style={{ width: '28px', height: '28px', color: '#4E6080' }} />
                  </div>
                  <div>
                    <p style={{ fontFamily: 'Sora, Inter, sans-serif', fontSize: '0.9375rem', fontWeight: 700, color: '#EFF6FF', margin: '0 0 0.375rem 0' }}>
                      Sin rutas guardadas aún
                    </p>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', color: '#4E6080', margin: 0, lineHeight: '1.5', maxWidth: '260px' }}>
                      Calcula cualquier trayecto y pulsa <strong style={{ color: '#F59E0B' }}>Guardar Ruta</strong> para acceder rápidamente incluso sin conexión a internet.
                    </p>
                  </div>
                </div>
              ) : (
                savedRoutes.map((r, i) => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    style={{
                      background: 'rgba(255,255,255,0.025)',
                      border: '1px solid rgba(56,120,220,0.12)',
                      borderRadius: '14px',
                      padding: '0.875rem',
                      transition: 'border-color 0.2s',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(56,120,220,0.25)'}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(56,120,220,0.12)'}
                  >
                    {/* Route Name & Delete */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.625rem' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <span className="badge badge-amber" style={{ fontSize: '0.5625rem' }}>
                            {ALGO_LABELS[r.algorithm] || r.algorithm}
                          </span>
                          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.5625rem', color: '#4E6080' }}>{r.createdAt}</span>
                        </div>
                        <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', fontWeight: 700, color: '#EFF6FF', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.name}
                        </h3>
                      </div>
                      <button
                        onClick={() => onDeleteRoute(r.id)}
                        style={{
                          width: '28px', height: '28px', borderRadius: '7px', flexShrink: 0,
                          background: 'rgba(255,71,87,0.06)', border: '1px solid rgba(255,71,87,0.12)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', color: '#FF4757', transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,71,87,0.15)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,71,87,0.06)')}
                        title="Eliminar de favoritos"
                      >
                        <Trash2 style={{ width: '12px', height: '12px' }} />
                      </button>
                    </div>

                    {/* Origin → Dest */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.625rem', overflow: 'hidden' }}>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6875rem', fontWeight: 600, color: '#00E5A0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '45%' }}>
                        {r.originName}
                      </span>
                      <ArrowRight style={{ width: '11px', height: '11px', color: '#4E6080', flexShrink: 0 }} />
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6875rem', fontWeight: 600, color: '#FF4757', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '45%' }}>
                        {r.destinationName}
                      </span>
                    </div>

                    {/* Safety score bar */}
                    <div style={{ marginBottom: '0.625rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.5625rem', fontWeight: 600, color: '#4E6080', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          Índice de Seguridad
                        </span>
                      </div>
                      <ScoreBar score={r.safetyScore} />
                    </div>

                    {/* Quick stats */}
                    <div style={{ display: 'flex', gap: '0.875rem', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3125rem' }}>
                        <Compass style={{ width: '11px', height: '11px', color: '#4E6080' }} />
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.6875rem', fontWeight: 600, color: '#94A3B8' }}>{r.distanceKm} km</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3125rem' }}>
                        <Clock style={{ width: '11px', height: '11px', color: '#4E6080' }} />
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.6875rem', fontWeight: 600, color: '#94A3B8' }}>~{r.estimatedTimeMinutes} min</span>
                      </div>
                    </div>

                    {/* Load Button */}
                    <button
                      onClick={() => { onLoadRoute(r); onClose(); }}
                      style={{
                        width: '100%', padding: '0.5625rem',
                        borderRadius: '10px', cursor: 'pointer',
                        fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
                        background: 'rgba(0,229,160,0.08)',
                        border: '1px solid rgba(0,229,160,0.2)',
                        color: '#00E5A0',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,229,160,0.15)';
                        (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 14px rgba(0,229,160,0.15)';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,229,160,0.08)';
                        (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
                      }}
                    >
                      <Route style={{ width: '13px', height: '13px' }} />
                      Cargar trayecto en el mapa
                      <ArrowRight style={{ width: '13px', height: '13px' }} />
                    </button>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer */}
            {savedRoutes.length > 0 && (
              <div style={{
                padding: '0.75rem 1.125rem',
                borderTop: '1px solid rgba(56,120,220,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.625rem', color: '#4E6080' }}>
                  💾 Almacenado localmente · Offline Ready
                </span>
                <button
                  onClick={onClearAll}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: 'Inter, sans-serif', fontSize: '0.6875rem', fontWeight: 600,
                    color: '#FF4757', padding: 0, transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                  Borrar todas
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
