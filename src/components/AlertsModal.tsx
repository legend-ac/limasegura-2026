import React, { useState } from 'react';
import { RiskIncident, CrowdHotspot } from '../types';
import { Radio, AlertTriangle, Users, Plus, X, Bell, Send, Check } from 'lucide-react';

interface AlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  incidents: RiskIncident[];
  hotspots: CrowdHotspot[];
  onAddIncident: (incident: Omit<RiskIncident, 'id' | 'timestamp' | 'active'>) => void;
  onSendZoneAlertPush: (title: string, body: string) => void;
}

export const AlertsModal: React.FC<AlertsModalProps> = ({
  isOpen,
  onClose,
  incidents,
  hotspots,
  onAddIncident,
  onSendZoneAlertPush,
}) => {
  const [showReportForm, setShowReportForm] = useState(false);
  const [title, setTitle] = useState('');
  const [district, setDistrict] = useState('Cercado de Lima');
  const [type, setType] = useState<RiskIncident['type']>('aglomeracion_masiva');
  const [severity, setSeverity] = useState<RiskIncident['severity']>('alta');
  const [radiusMeters, setRadiusMeters] = useState(400);
  const [description, setDescription] = useState('');
  const [alertSentId, setAlertSentId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    // Estimate coordinates based on district
    let lat = -12.0520;
    let lng = -77.0289;
    if (district === 'La Victoria') {
      lat = -12.0673;
      lng = -77.0135;
    } else if (district === 'San Isidro') {
      lat = -12.0910;
      lng = -77.0335;
    } else if (district === 'Miraflores') {
      lat = -12.1217;
      lng = -77.0297;
    } else if (district === 'Lince') {
      lat = -12.0845;
      lng = -77.0320;
    }

    onAddIncident({
      title: title.trim(),
      district,
      type,
      severity,
      lat,
      lng,
      radiusMeters,
      description: description.trim() || 'Incidente reportado en tiempo real en la red vial metropolitana.',
    });

    // Automatically trigger push notification for this new risk alert
    onSendZoneAlertPush(
      `ALERTA EN TIEMPO REAL: ${title.trim()}`,
      `Riesgo ${severity.toUpperCase()} reportado en ${district} (Radio de impacto: ${radiusMeters}m). El algoritmo A* recalculó rutas seguras.`
    );

    setTitle('');
    setDescription('');
    setShowReportForm(false);
  };

  const handlePushSingleAlert = (inc: RiskIncident) => {
    onSendZoneAlertPush(
      `Alerta de Riesgo en ${inc.district}`,
      `${inc.title} - Severidad: ${inc.severity.toUpperCase()}. Evitar transitar en un radio de ${inc.radiusMeters}m.`
    );
    setAlertSentId(inc.id);
    setTimeout(() => setAlertSentId(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl text-white max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Radio className="w-5 h-5 text-amber-400 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Centro de Monitoreo de Alertas en Tiempo Real
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  Lima 2026
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Detección activa de cuellos de botella, manifestaciones y factores de aglomeración
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

        {/* Action button: Toggle create incident form */}
        <div className="py-3 flex justify-between items-center border-b border-slate-800/80">
          <span className="text-xs text-slate-300 font-medium">
            {incidents.filter(i => i.active).length} incidentes viales activos en el perímetro de Lima
          </span>
          <button
            onClick={() => setShowReportForm(!showReportForm)}
            className="flex items-center gap-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs px-3 py-1.5 rounded-xl font-medium transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{showReportForm ? 'Cancelar Reporte' : 'Simular / Reportar Riesgo'}</span>
          </button>
        </div>

        {/* Form to simulate / report incident */}
        {showReportForm && (
          <form onSubmit={handleSubmit} className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 my-3 space-y-3 text-xs">
            <div className="font-bold text-slate-200 text-sm flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Nuevo Reporte de Incidente / Aglomeración
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-slate-400 mb-1">Título del incidente</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Saturación masiva en paraderos..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Distrito afectado</label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="Cercado de Lima">Cercado de Lima</option>
                  <option value="La Victoria">La Victoria</option>
                  <option value="San Isidro">San Isidro</option>
                  <option value="Miraflores">Miraflores</option>
                  <option value="Lince">Lince</option>
                  <option value="Jesús María">Jesús María</option>
                  <option value="Breña">Breña</option>
                  <option value="San Borja">San Borja</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Tipo de Evento</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as RiskIncident['type'])}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="aglomeracion_masiva">Aglomeración Peatonal Masiva</option>
                  <option value="congestion">Congestión Vehicular Extrema</option>
                  <option value="manifestacion">Marcha / Concentración Ciudadana</option>
                  <option value="obras">Obras Viales / Desvío Forzado</option>
                  <option value="inseguridad">Punto Crítico de Inseguridad</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Severidad del Riesgo</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as RiskIncident['severity'])}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="critica">Crítica (Evasión Obligatoria)</option>
                  <option value="alta">Alta (Impacto severo)</option>
                  <option value="moderada">Moderada (Tránsito lento)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">
                Radio de Aglomeración / Afectación: <strong>{radiusMeters} metros</strong>
              </label>
              <input
                type="range"
                min="150"
                max="1000"
                step="50"
                value={radiusMeters}
                onChange={(e) => setRadiusMeters(parseInt(e.target.value))}
                className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Detalles adicionales</label>
              <input
                type="text"
                placeholder="Breve descripción del motivo o vía bloqueada..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowReportForm(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 font-bold text-white flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Publicar Alerta y Recalcular A*</span>
              </button>
            </div>
          </form>
        )}

        {/* Incidents Feed */}
        <div className="flex-1 overflow-y-auto py-2 space-y-3 pr-1">
          {incidents.map((inc) => (
            <div
              key={inc.id}
              className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <div
                    className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                      inc.severity === 'critica'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : inc.severity === 'alta'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{inc.title}</h3>
                    <div className="text-xs text-slate-400">
                      {inc.district} &bull; <span className="text-slate-500">{inc.timestamp}</span>
                    </div>
                  </div>
                </div>

                {/* Send push notification button */}
                <button
                  onClick={() => handlePushSingleAlert(inc)}
                  className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition shrink-0"
                  title="Enviar alerta inmediata a dispositivo móvil"
                >
                  {alertSentId === inc.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Enviada</span>
                    </>
                  ) : (
                    <>
                      <Bell className="w-3.5 h-3.5" />
                      <span>Notificar Push</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs text-slate-300 pl-8">{inc.description}</p>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pl-8 pt-1 border-t border-slate-800/80">
                <span>Radio de Impacto: <strong>{inc.radiusMeters}m</strong></span>
                <span className="uppercase font-semibold text-rose-400">
                  Severidad: {inc.severity}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
