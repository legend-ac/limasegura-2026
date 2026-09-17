import React from 'react';
import { WifiOff, Bookmark, LifeBuoy, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface OfflineNoticeBannerProps {
  isEmergencyOffline: boolean;
  isOnline: boolean;
  onOpenSOSModal: () => void;
  onOpenFavorites: () => void;
  onOpenAlerts: () => void;
  savedRoutesCount: number;
}

export const OfflineNoticeBanner: React.FC<OfflineNoticeBannerProps> = ({
  isEmergencyOffline,
  isOnline,
  onOpenSOSModal,
  onOpenFavorites,
  onOpenAlerts,
  savedRoutesCount,
}) => {
  const show = isEmergencyOffline || !isOnline;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          style={{
            background: 'rgba(120, 53, 15, 0.9)',
            borderBottom: '1px solid rgba(245, 158, 11, 0.3)',
            backdropFilter: 'blur(12px)',
            overflow: 'hidden',
          }}
        >
          <div style={{
            maxWidth: '1400px', margin: '0 auto',
            padding: '0.625rem 1.25rem',
            display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <div style={{
                padding: '0.3125rem', borderRadius: '6px',
                background: 'rgba(245,158,11,0.15)',
              }}>
                <WifiOff style={{ width: '14px', height: '14px', color: '#F59E0B' }} className="animate-pulse" />
              </div>
              <div>
                <span style={{ fontFamily: 'Sora, Inter, sans-serif', fontSize: '0.6875rem', fontWeight: 800, color: '#FFF' }}>
                  {!isOnline ? 'Sin Conexión a Internet' : 'Modo Offline de Emergencia Activo'}:
                </span>{' '}
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6875rem', color: 'rgba(254,215,170,0.85)' }}>
                  Operatividad local garantizada. Mapa vectorial, rutas guardadas y alertas funcionan 100% autónomamente.
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
              <button
                onClick={onOpenFavorites}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.375rem',
                  padding: '0.3125rem 0.75rem', borderRadius: '7px',
                  background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(245,158,11,0.3)',
                  color: 'rgba(254,215,170,0.9)',
                  fontFamily: 'Inter, sans-serif', fontSize: '0.6875rem', fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                <Bookmark style={{ width: '12px', height: '12px', color: '#F59E0B' }} />
                Guardadas ({savedRoutesCount})
              </button>

              <button
                onClick={onOpenAlerts}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.375rem',
                  padding: '0.3125rem 0.75rem', borderRadius: '7px',
                  background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(245,158,11,0.3)',
                  color: 'rgba(254,215,170,0.9)',
                  fontFamily: 'Inter, sans-serif', fontSize: '0.6875rem', fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                <AlertTriangle style={{ width: '12px', height: '12px', color: '#FF4757' }} />
                Alertas
              </button>

              <button
                onClick={onOpenSOSModal}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.375rem',
                  padding: '0.375rem 0.875rem', borderRadius: '7px',
                  background: 'rgba(220,38,38,0.7)', border: '1px solid rgba(239,68,68,0.4)',
                  color: '#FFF',
                  fontFamily: 'Sora, Inter, sans-serif', fontSize: '0.6875rem', fontWeight: 800,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                <LifeBuoy style={{ width: '12px', height: '12px' }} />
                Refugios SOS
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
