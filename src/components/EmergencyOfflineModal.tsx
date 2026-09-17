import React, { useState } from 'react';
import { SafeHaven, GraphNode, SavedRoute, RiskIncident } from '../types';
import { 
  WifiOff, 
  LifeBuoy, 
  PhoneCall, 
  ShieldCheck, 
  Hospital, 
  Flame, 
  CheckCircle2, 
  X, 
  ArrowRight,
  Database,
  Bookmark,
  AlertTriangle,
  MapPin,
  Compass
} from 'lucide-react';

interface EmergencyOfflineModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEmergencyOffline: boolean;
  onToggleEmergencyOffline: () => void;
  safeHavens: SafeHaven[];
  onRouteToHaven: (haven: SafeHaven) => void;
  currentOrigin: GraphNode | null;
  savedRoutes?: SavedRoute[];
  onLoadSavedRoute?: (route: SavedRoute) => void;
  crucialAlerts?: RiskIncident[];
}

export const EmergencyOfflineModal: React.FC<EmergencyOfflineModalProps> = ({
  isOpen,
  onClose,
  isEmergencyOffline,
  onToggleEmergencyOffline,
  safeHavens,
  onRouteToHaven,
  currentOrigin,
  savedRoutes = [],
  onLoadSavedRoute,
  crucialAlerts = [],
}) => {
  const [activeTab, setActiveTab] = useState<'refugios' | 'rutas' | 'alertas'>('refugios');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl text-white max-h-[92vh] flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <LifeBuoy className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Modo Offline de Emergencia (Lima 2026)
              </h2>
              <p className="text-xs text-slate-400">
                Garantía de operatividad constante ante colapso de red móvil o corte de internet
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Offline Mode Switcher */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isEmergencyOffline ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>
              <WifiOff className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-200">
                {isEmergencyOffline ? 'Modo Emergencia Offline ACTIVADO' : 'Modo Offline Desactivado'}
              </div>
              <div className="text-xs text-slate-400">
                {isEmergencyOffline
                  ? 'El sistema y el plano vectorial operan 100% autónomos sin consumir datos ni red.'
                  : 'Activa este modo para forzar la navegación local sin depender de internet.'}
              </div>
            </div>
          </div>

          <button
            onClick={onToggleEmergencyOffline}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              isEmergencyOffline
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md'
                : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700'
            }`}
          >
            {isEmergencyOffline ? 'Desactivar Modo Offline' : 'Activar Modo Offline'}
          </button>
        </div>

        {/* Local Storage & Cache Verification Indicator */}
        <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-xs space-y-2">
          <div className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>Datos Almacenados en Memoria Local (Offline Ready):</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            <div className="bg-slate-900 border border-slate-800 p-2 rounded-lg flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-3 h-3 shrink-0" />
              <span>Plano Vectorial</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-2 rounded-lg flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-3 h-3 shrink-0" />
              <span>A* Motor Autónomo</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-2 rounded-lg flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-3 h-3 shrink-0" />
              <span>{savedRoutes.length} Rutas Guardadas</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-2 rounded-lg flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-3 h-3 shrink-0" />
              <span>{safeHavens.length} Refugios SOS</span>
            </div>
          </div>
        </div>

        {/* Offline Navigation Tabs */}
        <div className="flex border-b border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('refugios')}
            className={`px-4 py-2 font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'refugios'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Refugios y Auxilio ({safeHavens.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('rutas')}
            className={`px-4 py-2 font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'rutas'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Rutas Guardadas Offline ({savedRoutes.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('alertas')}
            className={`px-4 py-2 font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'alertas'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Alertas Cruciales ({crucialAlerts.length})</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-56">
          {/* 1. Safe Havens */}
          {activeTab === 'refugios' && (
            <div className="space-y-2">
              {safeHavens.map((h) => (
                <div
                  key={h.id}
                  className="bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-xl p-3 flex items-center justify-between gap-3 text-xs transition"
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                        h.type === 'hospital'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : h.type === 'comisaria'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {h.type === 'hospital' ? (
                        <Hospital className="w-4 h-4" />
                      ) : h.type === 'comisaria' ? (
                        <ShieldCheck className="w-4 h-4" />
                      ) : (
                        <Flame className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-slate-100">{h.name}</div>
                      <div className="text-slate-400 text-[11px]">{h.district} &bull; {h.address}</div>
                      <div className="text-slate-300 font-mono mt-0.5 flex items-center gap-1 text-[11px]">
                        <PhoneCall className="w-3 h-3 text-emerald-400" />
                        <span>{h.emergencyPhone}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onRouteToHaven(h);
                      onClose();
                    }}
                    className="bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white px-3 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition shrink-0 border border-slate-700 hover:border-rose-500"
                  >
                    <span>Trazar SOS Offline</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 2. Saved Routes */}
          {activeTab === 'rutas' && (
            <div className="space-y-2">
              {savedRoutes.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-xs">
                  No hay rutas guardadas en este dispositivo. Guarda tus recorridos habituales para poder consultarlos sin red.
                </div>
              ) : (
                savedRoutes.map((r) => (
                  <div
                    key={r.id}
                    className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-100">{r.name}</div>
                      <div className="text-slate-400 text-[11px]">
                        {r.distanceKm} km &bull; {r.estimatedTimeMinutes} min &bull;{' '}
                        <strong className="text-emerald-400">{r.safetyScore}% Segura</strong>
                      </div>
                    </div>
                    {onLoadSavedRoute && (
                      <button
                        onClick={() => {
                          onLoadSavedRoute(r);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white text-[11px] font-semibold transition"
                      >
                        Cargar en Mapa
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* 3. Crucial Alerts */}
          {activeTab === 'alertas' && (
            <div className="space-y-2">
              {crucialAlerts.map((a) => (
                <div
                  key={a.id}
                  className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-400 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {a.title}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{a.district}</span>
                  </div>
                  <p className="text-slate-300 text-[11px]">{a.description}</p>
                  <div className="text-[10px] text-slate-500">
                    Radio de impacto: {a.radiusMeters}m &bull; Protocolo de evasión autónomo activo
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Central National Emergency Numbers */}
        <div className="border-t border-slate-800 pt-3 grid grid-cols-4 gap-2 text-center text-xs">
          <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Policía</span>
            <strong className="text-xs font-mono text-blue-400 font-black">105</strong>
          </div>
          <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Bomberos</span>
            <strong className="text-xs font-mono text-amber-400 font-black">116</strong>
          </div>
          <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 block">SAMU</span>
            <strong className="text-xs font-mono text-rose-400 font-black">106</strong>
          </div>
          <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Indeci</span>
            <strong className="text-xs font-mono text-purple-400 font-black">115</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
