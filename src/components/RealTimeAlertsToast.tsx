import React, { useEffect, useState } from 'react';
import { AlertTriangle, X, ShieldAlert, Users, Zap, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface ToastAlert {
  id: string;
  title: string;
  message: string;
  type: 'danger' | 'warning' | 'info' | 'success';
  district?: string;
  duration?: number; // ms, default 8000
}

interface RealTimeAlertsToastProps {
  alerts: ToastAlert[];
  onDismiss: (id: string) => void;
}

const TYPE_CONFIG = {
  danger: {
    bg: 'rgba(255, 71, 87, 0.12)',
    border: 'rgba(255, 71, 87, 0.35)',
    accentBar: '#FF4757',
    iconColor: '#FF4757',
    labelColor: '#FF4757',
    label: 'ALERTA CRÍTICA',
    Icon: ShieldAlert,
  },
  warning: {
    bg: 'rgba(245, 158, 11, 0.10)',
    border: 'rgba(245, 158, 11, 0.30)',
    accentBar: '#F59E0B',
    iconColor: '#F59E0B',
    labelColor: '#F59E0B',
    label: 'AVISO',
    Icon: AlertTriangle,
  },
  info: {
    bg: 'rgba(59, 158, 255, 0.08)',
    border: 'rgba(59, 158, 255, 0.25)',
    accentBar: '#3B9EFF',
    iconColor: '#3B9EFF',
    labelColor: '#3B9EFF',
    label: 'INFO',
    Icon: Info,
  },
  success: {
    bg: 'rgba(0, 229, 160, 0.08)',
    border: 'rgba(0, 229, 160, 0.25)',
    accentBar: '#00E5A0',
    iconColor: '#00E5A0',
    labelColor: '#00E5A0',
    label: 'OK',
    Icon: Zap,
  },
};

function SingleToast({
  alert,
  onDismiss,
}: {
  alert: ToastAlert;
  onDismiss: (id: string) => void;
}) {
  const duration = alert.duration ?? 8000;
  const config = TYPE_CONFIG[alert.type];
  const Icon = config.Icon;

  // Auto-dismiss
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(alert.id), duration);
    return () => clearTimeout(timer);
  }, [alert.id, duration, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.92 }}
      transition={{ type: 'spring', damping: 22, stiffness: 300 }}
      style={{
        background: config.bg,
        border: `1px solid ${config.border}`,
        borderRadius: '14px',
        padding: '0.875rem',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.625rem',
        backdropFilter: 'blur(20px)',
        boxShadow: `0 8px 32px rgba(0,0,0,0.45), 0 0 0 1px ${config.border}`,
        minWidth: '280px',
        maxWidth: '340px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Left accent bar */}
      <div style={{
        position: 'absolute',
        left: 0, top: 0, bottom: 0,
        width: '3px',
        background: config.accentBar,
        borderRadius: '14px 0 0 14px',
        boxShadow: `0 0 10px ${config.accentBar}60`,
      }} />

      {/* Progress drain bar */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        height: '2px',
        background: 'rgba(255,255,255,0.06)',
      }}>
        <div
          style={{
            height: '100%',
            background: config.accentBar,
            opacity: 0.5,
            animation: `progress-drain ${duration}ms linear forwards`,
          }}
        />
      </div>

      {/* Icon */}
      <div style={{
        width: '32px', height: '32px', flexShrink: 0,
        borderRadius: '8px',
        background: `${config.accentBar}18`,
        border: `1px solid ${config.accentBar}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon style={{ width: '16px', height: '16px', color: config.iconColor }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, paddingLeft: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.25rem' }}>
          <span style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.5625rem', fontWeight: 800,
            color: config.labelColor,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}>
            {config.label}
          </span>
          {alert.district && (
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '0.5rem',
              color: 'rgba(148,163,184,0.6)',
              background: 'rgba(255,255,255,0.04)',
              padding: '0.05rem 0.3rem',
              borderRadius: '4px',
            }}>
              {alert.district}
            </span>
          )}
        </div>
        <p style={{
          fontFamily: 'Sora, Inter, sans-serif',
          fontSize: '0.75rem', fontWeight: 700,
          color: '#EFF6FF', margin: '0 0 0.25rem 0',
          lineHeight: '1.3',
          overflow: 'hidden', textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {alert.title}
        </p>
        <p style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: '0.6875rem',
          color: 'rgba(148,163,184,0.85)',
          margin: 0, lineHeight: '1.4',
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        } as React.CSSProperties}>
          {alert.message}
        </p>
      </div>

      {/* Dismiss */}
      <button
        onClick={() => onDismiss(alert.id)}
        style={{
          width: '22px', height: '22px', flexShrink: 0,
          borderRadius: '6px', border: 'none',
          background: 'rgba(255,255,255,0.04)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'rgba(148,163,184,0.6)',
          transition: 'all 0.15s',
          marginTop: '-2px',
        }}
        onMouseEnter={e => { (e.currentTarget.style.background = 'rgba(255,255,255,0.1)'); (e.currentTarget.style.color = '#EFF6FF'); }}
        onMouseLeave={e => { (e.currentTarget.style.background = 'rgba(255,255,255,0.04)'); (e.currentTarget.style.color = 'rgba(148,163,184,0.6)'); }}
      >
        <X style={{ width: '11px', height: '11px' }} />
      </button>
    </motion.div>
  );
}

export const RealTimeAlertsToast: React.FC<RealTimeAlertsToastProps> = ({
  alerts,
  onDismiss,
}) => {
  return (
    <div style={{
      position: 'fixed',
      bottom: '1.25rem',
      right: '1.25rem',
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column-reverse',
      gap: '0.625rem',
      pointerEvents: 'none',
    }}>
      <AnimatePresence mode="popLayout">
        {alerts.slice(0, 5).map(alert => (
          <div key={alert.id} style={{ pointerEvents: 'auto' }}>
            <SingleToast alert={alert} onDismiss={onDismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};
