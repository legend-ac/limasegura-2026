import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, Bell, Bookmark, AlertTriangle,
  WifiOff, Volume2, VolumeX, Menu, X, Smartphone,
  Download, Zap, ChevronDown
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface HeaderProps {
  isEmergencyOffline: boolean;
  onToggleEmergencyOffline: () => void;
  isOnline: boolean;
  onOpenMobileSync: () => void;
  onOpenFavorites: () => void;
  onOpenAlerts: () => void;
  onOpenEmergencySOS: () => void;
  favoriteCount: number;
  activeAlertsCount: number;
  pushPermission: NotificationPermission;
  onRequestPush: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isEmergencyOffline, onToggleEmergencyOffline, isOnline,
  onOpenMobileSync, onOpenFavorites, onOpenAlerts, onOpenEmergencySOS,
  favoriteCount, activeAlertsCount, pushPermission, onRequestPush,
  soundEnabled, onToggleSound,
}) => {
  const { isInstallable, install } = usePWAInstall();
  const [menuOpen, setMenuOpen] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const online = isOnline && !isEmergencyOffline;

  return (
    <header style={{
      background: 'var(--c-surface)',
      borderBottom: '1px solid var(--c-border)',
      position: 'sticky', top: 0, zIndex: 50,
      height: '56px',
      display: 'flex', alignItems: 'center',
    }}>
      <div style={{
        maxWidth: '1480px', margin: '0 auto', padding: '0 1rem',
        width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
      }}>

        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexShrink: 0 }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'var(--c-green-dim)',
            border: '1px solid var(--c-green-glow)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ShieldCheck style={{ width: '17px', height: '17px', color: 'var(--c-green)' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                fontFamily: 'var(--font-head)', fontSize: '0.9375rem', fontWeight: 800,
                color: 'var(--c-text-1)', letterSpacing: '-0.025em',
              }}>
                Lima<span style={{ color: 'var(--c-green)' }}>Segura</span>
              </span>
              <span className="badge badge-green" style={{ fontSize: '0.5625rem', padding: '1px 6px' }}>2026</span>
            </div>
          </div>
        </div>

        {/* Status pill */}
        <button
          onClick={onToggleEmergencyOffline}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '4px 10px', borderRadius: '99px',
            background: online ? 'rgba(45,212,160,0.1)' : 'rgba(227,179,65,0.1)',
            border: `1px solid ${online ? 'rgba(45,212,160,0.25)' : 'rgba(227,179,65,0.25)'}`,
            cursor: 'pointer', transition: 'all 0.15s',
            fontFamily: 'var(--font-sans)', fontSize: '0.6875rem', fontWeight: 600,
            color: online ? 'var(--c-green)' : 'var(--c-amber)',
          }}
        >
          <span
            className="dot animate-pulse-dot"
            style={{ background: online ? 'var(--c-green)' : 'var(--c-amber)' }}
          />
          <span className="hidden sm:inline">
            {online ? 'Sistema activo' : isEmergencyOffline ? 'Modo offline' : 'Sin conexión'}
          </span>
          {!online && <WifiOff style={{ width: '11px', height: '11px' }} />}
        </button>

        {/* Live time — desktop only */}
        <span className="hidden lg:block" style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', fontWeight: 600,
          color: 'var(--c-text-2)', marginLeft: 'auto',
        }}>
          {time.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
        </span>

        {/* Spacer */}
        <div style={{ flex: 1 }} className="hidden lg:block" />

        {/* Desktop controls */}
        <div className="hidden md:flex" style={{ alignItems: 'center', gap: '0.375rem' }}>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onToggleSound} title={soundEnabled ? 'Silenciar' : 'Activar sonidos'}>
            {soundEnabled
              ? <Volume2 style={{ width: '15px', height: '15px' }} />
              : <VolumeX style={{ width: '15px', height: '15px' }} />}
          </button>

          <button
            className="btn btn-ghost btn-sm"
            onClick={onRequestPush}
            style={{ color: pushPermission === 'granted' ? 'var(--c-green)' : undefined }}
          >
            <Bell style={{ width: '14px', height: '14px' }} />
            <span>{pushPermission === 'granted' ? 'Alertas ✓' : 'Notificaciones'}</span>
          </button>

          <button className="btn btn-ghost btn-sm" onClick={onOpenMobileSync}>
            <Smartphone style={{ width: '14px', height: '14px', color: 'var(--c-blue)' }} />
            <span>Móvil</span>
          </button>

          <button
            className="btn btn-ghost btn-sm"
            onClick={onOpenFavorites}
            style={{ position: 'relative' }}
          >
            <Bookmark style={{ width: '14px', height: '14px', color: 'var(--c-amber)' }} />
            <span>Guardadas</span>
            {favoriteCount > 0 && (
              <span className="badge badge-amber" style={{ padding: '1px 5px', fontSize: '0.5625rem' }}>
                {favoriteCount}
              </span>
            )}
          </button>

          <button
            className="btn btn-ghost btn-sm"
            onClick={onOpenAlerts}
            style={{ color: activeAlertsCount > 0 ? 'var(--c-red)' : undefined }}
          >
            <AlertTriangle style={{ width: '14px', height: '14px' }} />
            <span>Incidentes</span>
            {activeAlertsCount > 0 && (
              <span className="badge badge-red" style={{ padding: '1px 5px', fontSize: '0.5625rem' }}>
                {activeAlertsCount}
              </span>
            )}
          </button>

          {isInstallable && (
            <button className="btn btn-secondary btn-sm" onClick={install}>
              <Download style={{ width: '13px', height: '13px' }} />
              <span>Instalar</span>
            </button>
          )}

          <button
            className="btn btn-danger btn-sm"
            onClick={onOpenEmergencySOS}
            style={{ fontWeight: 800, letterSpacing: '0.03em' }}
          >
            <Zap style={{ width: '13px', height: '13px' }} />
            SOS
          </button>
        </div>

        {/* Mobile hamburger */}
        <div className="flex md:hidden" style={{ marginLeft: 'auto', alignItems: 'center', gap: '0.375rem' }}>
          {activeAlertsCount > 0 && (
            <button className="btn btn-ghost btn-icon btn-sm" onClick={onOpenAlerts} style={{ color: 'var(--c-red)' }}>
              <AlertTriangle style={{ width: '16px', height: '16px' }} />
            </button>
          )}
          <button
            className="btn btn-danger btn-sm"
            onClick={onOpenEmergencySOS}
            style={{ fontWeight: 800 }}
          >
            <Zap style={{ width: '13px', height: '13px' }} />
            SOS
          </button>
          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X style={{ width: '18px', height: '18px' }} /> : <Menu style={{ width: '18px', height: '18px' }} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{
          position: 'absolute', top: '56px', left: 0, right: 0,
          background: 'var(--c-surface)',
          borderBottom: '1px solid var(--c-border)',
          padding: '0.75rem 1rem',
          display: 'flex', flexDirection: 'column', gap: '0.5rem',
          zIndex: 49,
          boxShadow: 'var(--shadow-lg)',
        }}>
          <button className="btn btn-ghost btn-sm" onClick={() => { onOpenFavorites(); setMenuOpen(false); }} style={{ justifyContent: 'flex-start', gap: '0.5rem' }}>
            <Bookmark style={{ width: '14px', height: '14px', color: 'var(--c-amber)' }} />
            Rutas Guardadas {favoriteCount > 0 && `(${favoriteCount})`}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => { onOpenAlerts(); setMenuOpen(false); }} style={{ justifyContent: 'flex-start', gap: '0.5rem' }}>
            <AlertTriangle style={{ width: '14px', height: '14px', color: 'var(--c-red)' }} />
            Incidentes {activeAlertsCount > 0 && `(${activeAlertsCount})`}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => { onOpenMobileSync(); setMenuOpen(false); }} style={{ justifyContent: 'flex-start', gap: '0.5rem' }}>
            <Smartphone style={{ width: '14px', height: '14px', color: 'var(--c-blue)' }} />
            Sincronizar con móvil
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onRequestPush} style={{ justifyContent: 'flex-start', gap: '0.5rem' }}>
            <Bell style={{ width: '14px', height: '14px' }} />
            {pushPermission === 'granted' ? 'Notificaciones activas ✓' : 'Activar notificaciones'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onToggleSound} style={{ justifyContent: 'flex-start', gap: '0.5rem' }}>
            {soundEnabled ? <Volume2 style={{ width: '14px', height: '14px' }} /> : <VolumeX style={{ width: '14px', height: '14px' }} />}
            {soundEnabled ? 'Silenciar sonidos' : 'Activar sonidos'}
          </button>
          {isInstallable && (
            <button className="btn btn-secondary btn-sm" onClick={install} style={{ justifyContent: 'flex-start', gap: '0.5rem' }}>
              <Download style={{ width: '13px', height: '13px' }} />
              Instalar aplicación
            </button>
          )}
        </div>
      )}
    </header>
  );
};
