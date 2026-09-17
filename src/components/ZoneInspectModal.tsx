import React from 'react';
import { GraphNode, CrowdHotspot, RiskIncident } from '../types';
import { 
  evaluateCrowdPenalty, 
  evaluateIncidentPenalty, 
  calculateDistanceMeters 
} from '../utils/algorithms';
import { ShieldCheck, Users, AlertTriangle, MapPin, X, ArrowRight } from 'lucide-react';

interface ZoneInspectModalProps {
  isOpen: boolean;
  onClose: () => void;
  lat: number;
  lng: number;
  nearestNode: GraphNode;
  hotspots: CrowdHotspot[];
  incidents: RiskIncident[];
  crowdRadiusMultiplier: number;
  onSetAsOrigin: (node: GraphNode) => void;
  onSetAsDestination: (node: GraphNode) => void;
}

export const ZoneInspectModal: React.FC<ZoneInspectModalProps> = ({
  isOpen,
  onClose,
  lat,
  lng,
  nearestNode,
  hotspots,
  incidents,
  crowdRadiusMultiplier,
  onSetAsOrigin,
  onSetAsDestination,
}) => {
  if (!isOpen) return null;

  const crowdEval = evaluateCrowdPenalty(lat, lng, hotspots, crowdRadiusMultiplier);
  const incidentEval = evaluateIncidentPenalty(lat, lng, incidents);

  // Proximity to hotspots
  const nearbyHotspots = hotspots
    .map(h => ({
      ...h,
      distanceMeters: Math.round(calculateDistanceMeters(lat, lng, h.lat, h.lng)),
      effectiveRadius: Math.round(h.radiusMeters * crowdRadiusMultiplier),
    }))
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, 3);

  const isInsideCrowdRadius = nearbyHotspots.some(h => h.distanceMeters < h.effectiveRadius);
  const estimatedSafety = Math.max(20, Math.min(99, Math.round(100 - (crowdEval.penalty * 15) - (incidentEval.penalty * 20))));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl text-white space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Inspección de Zona Seleccionada</h3>
              <p className="text-xs text-slate-400">{nearestNode.name} &bull; {nearestNode.district}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Safety & Aglomeración Score */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-center">
            <span className="text-slate-400 block text-[11px]">Nivel de Seguridad</span>
            <span className={`text-xl font-black ${estimatedSafety > 75 ? 'text-emerald-400' : estimatedSafety > 50 ? 'text-amber-400' : 'text-rose-400'}`}>
              {estimatedSafety}%
            </span>
            <span className="text-[10px] text-slate-500 block">
              {estimatedSafety > 75 ? 'Zona Segura' : 'Precaución sugerida'}
            </span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-center">
            <span className="text-slate-400 block text-[11px]">Factor Aglomeración</span>
            <span className={`text-xl font-black ${isInsideCrowdRadius ? 'text-rose-400' : 'text-emerald-400'}`}>
              {isInsideCrowdRadius ? 'Dentro del Radio' : 'Despejado'}
            </span>
            <span className="text-[10px] text-slate-500 block">
              {crowdEval.density > 0 ? `${Math.round(crowdEval.density * 100)}% densidad` : 'Baja afluencia'}
            </span>
          </div>
        </div>

        {/* Proximity Details */}
        <div className="space-y-1.5 text-xs bg-slate-950/50 border border-slate-800 rounded-xl p-3">
          <div className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-rose-400" />
            <span>Focos de Aglomeración Cercanos:</span>
          </div>
          <div className="space-y-1 mt-1">
            {nearbyHotspots.map(h => (
              <div key={h.id} className="flex justify-between items-center text-[11px] text-slate-300">
                <span className="truncate max-w-[180px]">{h.name}:</span>
                <span className={h.distanceMeters <= h.effectiveRadius ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                  a {h.distanceMeters}m (Radio: {h.effectiveRadius}m)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Incidents in vicinity */}
        {incidentEval.incidentWarning && (
          <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{incidentEval.incidentWarning}</span>
          </div>
        )}

        {/* Quick Assign Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => {
              onSetAsOrigin(nearestNode);
              onClose();
            }}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
          >
            <span>Fijar como Origen</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              onSetAsDestination(nearestNode);
              onClose();
            }}
            className="bg-rose-600 hover:bg-rose-500 text-white font-semibold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
          >
            <span>Fijar como Destino</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
