import React, { useState } from 'react';
import { Smartphone, Bell, QrCode, CheckCircle2, X, Send, Radio, AlertCircle } from 'lucide-react';
import { PushNotification } from '../hooks/usePushNotifications';

interface MobileSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  permission: NotificationPermission;
  onRequestPermission: () => Promise<boolean>;
  onSendPush: (title: string, body: string, severity?: 'info' | 'warning' | 'danger') => void;
  notificationHistory: PushNotification[];
}

export const MobileSyncModal: React.FC<MobileSyncModalProps> = ({
  isOpen,
  onClose,
  permission,
  onRequestPermission,
  onSendPush,
  notificationHistory,
}) => {
  const [testSent, setTestSent] = useState(false);
  const [syncCode] = useState(() => `LIMA-${Math.floor(1000 + Math.random() * 9000)}-SYNC`);

  if (!isOpen) return null;

  const handleTestPush = () => {
    onSendPush(
      'LimaSegura 2026: Sincronización Móvil Exitosa',
      'Tu dispositivo está sincronizado. Recibirás alertas viales y de aglomeración en tiempo real.',
      'info'
    );
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://lima-segura.app';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl text-white max-h-[90vh] flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Sincronización con Smartphone</h2>
              <p className="text-xs text-slate-400">Notificaciones Push en tiempo real y alertas por vibración</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sync Status Banner */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${permission === 'granted' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></div>
            <div className="text-xs">
              <span className="text-slate-300 font-medium">Estado Push Web: </span>
              <strong className={permission === 'granted' ? 'text-emerald-400' : 'text-amber-400'}>
                {permission === 'granted' ? 'Autorizado y Activo' : 'Pendiente de Autorización'}
              </strong>
            </div>
          </div>
          {permission !== 'granted' && (
            <button
              onClick={onRequestPermission}
              className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded-lg font-semibold transition"
            >
              Habilitar Permiso
            </button>
          )}
        </div>

        {/* QR Code and Pairing Code */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center bg-slate-950/50 border border-slate-800/80 rounded-xl p-4">
          {/* Simulated clean QR code matrix */}
          <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl shadow-inner">
            <svg viewBox="0 0 120 120" className="w-28 h-28">
              {/* Corner position markers */}
              <rect x="10" y="10" width="30" height="30" fill="#0f172a" rx="4" />
              <rect x="16" y="16" width="18" height="18" fill="#ffffff" rx="2" />
              <rect x="20" y="20" width="10" height="10" fill="#0f172a" rx="1" />

              <rect x="80" y="10" width="30" height="30" fill="#0f172a" rx="4" />
              <rect x="86" y="16" width="18" height="18" fill="#ffffff" rx="2" />
              <rect x="90" y="20" width="10" height="10" fill="#0f172a" rx="1" />

              <rect x="10" y="80" width="30" height="30" fill="#0f172a" rx="4" />
              <rect x="16" y="86" width="18" height="18" fill="#ffffff" rx="2" />
              <rect x="20" y="90" width="10" height="10" fill="#0f172a" rx="1" />

              {/* Data modules */}
              <circle cx="55" cy="20" r="4" fill="#0f172a" />
              <circle cx="65" cy="25" r="3" fill="#0f172a" />
              <circle cx="20" cy="55" r="4" fill="#0f172a" />
              <circle cx="35" cy="65" r="3" fill="#0f172a" />
              <circle cx="50" cy="50" r="5" fill="#10b981" />
              <circle cx="65" cy="60" r="4" fill="#0f172a" />
              <circle cx="80" cy="55" r="3" fill="#0f172a" />
              <circle cx="95" cy="65" r="4" fill="#0f172a" />
              <circle cx="55" cy="85" r="3" fill="#0f172a" />
              <circle cx="70" cy="90" r="4" fill="#0f172a" />
              <circle cx="85" cy="85" r="3" fill="#0f172a" />
              <circle cx="100" cy="95" r="4" fill="#0f172a" />
            </svg>
            <span className="text-[10px] text-slate-800 font-bold mt-1">Escanear para Vincular</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="text-slate-300">
              <strong>1. Escanea el código</strong> con la cámara de tu móvil para abrir LimaSegura 2026.
            </div>
            <div className="text-slate-300">
              <strong>2. Código de Enlace Seguro:</strong>
              <div className="mt-1 font-mono text-sm tracking-wider font-black text-indigo-300 bg-indigo-950/60 border border-indigo-500/30 p-1.5 rounded-lg text-center">
                {syncCode}
              </div>
            </div>
            <div className="text-slate-400 text-[11px]">
              Al vincularte, tu smartphone vibrará automáticamente cuando estés dentro del radio de aglomeración o zona de riesgo.
            </div>
          </div>
        </div>

        {/* Test Push Button */}
        <div className="pt-2">
          <button
            onClick={handleTestPush}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold py-2.5 px-4 rounded-xl shadow-lg flex items-center justify-center gap-2 text-xs transition"
          >
            {testSent ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>¡Notificación y Vibración Disparadas!</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Probar Notificación Push y Vibración Háptica</span>
              </>
            )}
          </button>
        </div>

        {/* Recent push alerts log */}
        <div className="space-y-1.5 flex-1 overflow-y-auto">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Historial de Notificaciones Enviadas:
          </span>
          {notificationHistory.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No hay alertas despachadas en esta sesión.</p>
          ) : (
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {notificationHistory.slice(0, 5).map((n) => (
                <div key={n.id} className="bg-slate-950/60 border border-slate-800 rounded-lg p-2 text-xs flex justify-between items-start gap-2">
                  <div>
                    <div className="font-semibold text-slate-200">{n.title}</div>
                    <div className="text-slate-400 text-[11px]">{n.body}</div>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono shrink-0">{n.timestamp}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
