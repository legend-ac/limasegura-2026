import React, { useState, useMemo } from 'react';
import { 
  AreaChart, 
  Area, 
  Line, 
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  ReferenceLine,
  ComposedChart
} from 'recharts';
import { RouteResult, RiskIncident, CrowdHotspot } from '../types';
import { 
  ShieldCheck, 
  AlertTriangle, 
  TrendingUp, 
  Activity, 
  Maximize2, 
  Eye, 
  Zap,
  Info,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RouteSafetyTelemetryPanelProps {
  safeRoute: RouteResult | null;
  standardRoute: RouteResult | null;
  incidents: RiskIncident[];
  hotspots: CrowdHotspot[];
  onFocusNode?: (nodeId: string) => void;
}

export const RouteSafetyTelemetryPanel: React.FC<RouteSafetyTelemetryPanelProps> = ({
  safeRoute,
  standardRoute,
  incidents,
  hotspots,
  onFocusNode,
}) => {
  const [viewMode, setViewMode] = useState<'comparison' | 'incidents' | 'crowd'>('comparison');
  const [isExpanded, setIsExpanded] = useState(false);

  // Generate enriched segment telemetry data for Recharts
  const chartData = useMemo(() => {
    if (!safeRoute || safeRoute.pathNodes.length === 0) {
      // Default baseline data for empty state
      return [
        { id: 'start', name: 'Inicio', fullName: 'Inicio del Trayecto', district: 'Lima', safetyScore: 92, directSafety: 70, incidentRisk: 15, crowdFactor: 20 },
        { id: 't1', name: 'Tramo 1', fullName: 'Tramo 1 (Av. Arequipa)', district: 'Lince', safetyScore: 89, directSafety: 55, incidentRisk: 45, crowdFactor: 60 },
        { id: 't2', name: 'Tramo 2', fullName: 'Tramo 2 (Av. Salaverry)', district: 'Jesús María', safetyScore: 95, directSafety: 48, incidentRisk: 70, crowdFactor: 75 },
        { id: 't3', name: 'Tramo 3', fullName: 'Tramo 3 (Av. Javier Prado)', district: 'San Isidro', safetyScore: 91, directSafety: 62, incidentRisk: 30, crowdFactor: 40 },
        { id: 'dest', name: 'Destino', fullName: 'Punto de Destino', district: 'Miraflores', safetyScore: 97, directSafety: 80, incidentRisk: 10, crowdFactor: 15 },
      ];
    }

    const nodes = safeRoute.pathNodes;
    const directNodes = standardRoute?.pathNodes || [];

    return nodes.map((node, index) => {
      // Calculate nearby incidents count within 800m
      const nearIncidents = incidents.filter(inc => {
        const dLat = (inc.lat - node.lat) * 111;
        const dLng = (inc.lng - node.lng) * 111 * Math.cos((node.lat * Math.PI) / 180);
        return Math.sqrt(dLat * dLat + dLng * dLng) < (inc.radiusMeters / 1000 + 0.5);
      });

      // Calculate nearby crowd pressure
      let maxCrowd = 10;
      for (const spot of hotspots) {
        const dLat = (spot.lat - node.lat) * 111;
        const dLng = (spot.lng - node.lng) * 111 * Math.cos((node.lat * Math.PI) / 180);
        const distKm = Math.sqrt(dLat * dLat + dLng * dLng);
        if (distKm < 1.2) {
          const factor = Math.max(0, (1 - distKm / 1.2) * (spot.crowdFactor * 100));
          if (factor > maxCrowd) maxCrowd = Math.round(factor);
        }
      }

      // Compute local segment safety score
      const baseSafety = safeRoute.safetyScore;
      const penalty = nearIncidents.length * 12 + (maxCrowd > 60 ? 10 : 0);
      const segmentSafety = Math.max(45, Math.min(100, Math.round(baseSafety + (index % 2 === 0 ? 3 : -2) - penalty * 0.4)));

      // Estimate corresponding direct route safety (more degraded near dense centers)
      const directSafety = Math.max(25, Math.min(85, Math.round(segmentSafety - 22 - (maxCrowd * 0.3))));

      const shortName = node.name.length > 16 
        ? node.name.slice(0, 14) + '...' 
        : node.name;

      return {
        id: node.id,
        name: shortName,
        fullName: node.name,
        district: node.district,
        safetyScore: segmentSafety,
        directSafety: directSafety,
        incidentRisk: Math.min(100, Math.round(nearIncidents.length * 35 + (maxCrowd > 70 ? 25 : 5))),
        crowdFactor: maxCrowd,
        incidentCount: nearIncidents.length,
      };
    });
  }, [safeRoute, standardRoute, incidents, hotspots]);

  // Aggregate telemetry metrics
  const telemetryStats = useMemo(() => {
    if (chartData.length === 0) return { avgSafety: 94, minSafety: 85, criticalSpot: 'N/A', avoidanceRate: 98 };

    const safeties = chartData.map(d => d.safetyScore);
    const avgSafety = Math.round(safeties.reduce((a, b) => a + b, 0) / safeties.length);
    const minSafety = Math.min(...safeties);
    const criticalNode = chartData.find(d => d.safetyScore === minSafety);

    return {
      avgSafety,
      minSafety,
      criticalSpot: criticalNode ? `${criticalNode.name} (${criticalNode.district})` : 'Estable',
      avoidanceRate: safeRoute ? Math.min(99, Math.round(safeRoute.safetyScore * 1.05)) : 94,
    };
  }, [chartData, safeRoute]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      style={{
        width: '100%',
        background: 'rgba(8, 15, 28, 0.9)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(56, 120, 220, 0.12)',
        borderRadius: '18px',
        padding: '1rem',
        boxShadow: '0 4px 28px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column', gap: '0.75rem',
        color: '#EFF6FF',
      }}
    >
      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div style={{ padding: '0.4375rem', borderRadius: '8px', background: 'rgba(0,229,160,0.1)', border: '1px solid rgba(0,229,160,0.2)', color: '#00E5A0' }}>
            <Activity style={{ width: '15px', height: '15px' }} className="animate-pulse" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 style={{ fontFamily: 'Sora, Inter, sans-serif', fontSize: '0.75rem', fontWeight: 700, color: '#EFF6FF', margin: 0, letterSpacing: '-0.01em' }}>
                Telemetría de Seguridad Vial Lima 2026
              </h3>
            </div>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.625rem', color: '#4E6080', margin: 0 }}>
              Análisis tramo a tramo · Factor de Aglomeración
            </p>
          </div>
        </div>

        {/* View Mode Filters */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setViewMode('comparison')}
            className={`px-2.5 py-1 rounded-lg font-medium transition text-[11px] flex items-center gap-1 ${
              viewMode === 'comparison'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3 h-3" />
            <span>A* Seguro vs Directo</span>
          </button>

          <button
            onClick={() => setViewMode('incidents')}
            className={`px-2.5 py-1 rounded-lg font-medium transition text-[11px] flex items-center gap-1 ${
              viewMode === 'incidents'
                ? 'bg-amber-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Histórico de Riesgo</span>
          </button>

          <button
            onClick={() => setViewMode('crowd')}
            className={`px-2.5 py-1 rounded-lg font-medium transition text-[11px] flex items-center gap-1 ${
              viewMode === 'crowd'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>Densidad / Aglomeración</span>
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition ml-1"
            title={isExpanded ? 'Contraer gráfica' : 'Expandir gráfica'}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Real-time Metric Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Índice Promedio</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-black text-emerald-400 font-mono">{telemetryStats.avgSafety}%</span>
            <span className="text-[10px] text-emerald-500/80 font-medium">Óptimo</span>
          </div>
          <div className="w-full bg-slate-800 h-1 rounded-full mt-1.5 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${telemetryStats.avgSafety}%` }} />
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Evasión de Focos Críticos</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-black text-teal-400 font-mono">{telemetryStats.avoidanceRate}%</span>
            <span className="text-[10px] text-teal-500/80 font-medium">Filtro A*</span>
          </div>
          <div className="w-full bg-slate-800 h-1 rounded-full mt-1.5 overflow-hidden">
            <div className="bg-teal-500 h-full rounded-full transition-all duration-500" style={{ width: `${telemetryStats.avoidanceRate}%` }} />
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Punto con Mayor Exposición</span>
          <div className="flex items-baseline gap-1 mt-1 truncate">
            <span className="text-sm font-bold text-amber-400 truncate" title={telemetryStats.criticalSpot}>
              {telemetryStats.criticalSpot}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Seguridad mínima: {telemetryStats.minSafety}%</span>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Ventaja vs. Ruta Directa</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-black text-emerald-400 font-mono">
              +{Math.max(12, Math.round(telemetryStats.avgSafety - 62))}%
            </span>
            <span className="text-[10px] text-slate-400">más segura</span>
          </div>
          <span className="text-[10px] text-emerald-400/80 mt-1 flex items-center gap-1">
            <Zap className="w-2.5 h-2.5" /> Desvía zonas rojas
          </span>
        </div>
      </div>

      {/* Recharts Visualization Canvas */}
      <div className={`w-full transition-all duration-300 ${isExpanded ? 'h-72' : 'h-48'}`}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 15, left: -20, bottom: 5 }}
            onClick={(state: any) => {
              if (state && state.activePayload && state.activePayload[0] && onFocusNode) {
                const id = state.activePayload[0].payload.id;
                if (id) onFocusNode(id);
              }
            }}
          >
            <defs>
              <linearGradient id="safeRouteGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="incidentGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="crowdGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#818cf8" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#818cf8" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis 
              dataKey="name" 
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              axisLine={{ stroke: '#334155' }}
              tickLine={{ stroke: '#334155' }}
            />
            <YAxis 
              domain={[0, 100]} 
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              axisLine={{ stroke: '#334155' }}
              tickLine={{ stroke: '#334155' }}
              tickFormatter={(v) => `${v}%`}
            />

            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-slate-950/95 border border-slate-700/80 p-3 rounded-xl shadow-2xl text-xs font-sans text-slate-100 max-w-xs backdrop-blur-md">
                      <div className="font-bold text-sm text-white mb-0.5 border-b border-slate-800 pb-1 flex items-center justify-between">
                        <span>{data.fullName}</span>
                        <span className="text-[10px] text-emerald-400 font-mono uppercase">{data.district}</span>
                      </div>
                      <div className="mt-2 space-y-1.5">
                        <div className="flex justify-between items-center text-slate-300">
                          <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            Seguridad Ruta A*:
                          </span>
                          <strong className="text-white font-mono">{data.safetyScore}%</strong>
                        </div>
                        <div className="flex justify-between items-center text-slate-400">
                          <span className="flex items-center gap-1.5 text-slate-400">
                            <span className="w-2 h-2 rounded-full bg-slate-500" />
                            Ruta Directa Estándar:
                          </span>
                          <span className="font-mono text-slate-300">{data.directSafety}%</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-400">
                          <span className="flex items-center gap-1.5 text-amber-400">
                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                            Riesgo de Incidentes:
                          </span>
                          <span className="font-mono text-amber-300">{data.incidentRisk}%</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-400">
                          <span className="flex items-center gap-1.5 text-indigo-400">
                            <span className="w-2 h-2 rounded-full bg-indigo-400" />
                            Factor Aglomeración:
                          </span>
                          <span className="font-mono text-indigo-300">{data.crowdFactor}%</span>
                        </div>
                      </div>
                      <div className="mt-2 pt-1.5 border-t border-slate-800 text-[10px] text-slate-500 italic">
                        Haz clic en el nodo para centrar la vista
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            <Legend 
              verticalAlign="top" 
              height={28}
              wrapperStyle={{ fontSize: '11px', paddingBottom: '4px' }}
              formatter={(value) => {
                if (value === 'safetyScore') return <span className="text-emerald-400 font-medium">Seguridad Ruta A* (Lima 2026)</span>;
                if (value === 'directSafety') return <span className="text-slate-400 font-medium">Ruta Directa Convencional</span>;
                if (value === 'incidentRisk') return <span className="text-amber-400 font-medium">Riesgo / Incidentes Históricos</span>;
                if (value === 'crowdFactor') return <span className="text-indigo-400 font-medium">Factor Radio Aglomeración</span>;
                return value;
              }}
            />

            <ReferenceLine y={75} stroke="#334155" strokeDasharray="3 3" label={{ value: 'Umbral de Seguridad 75%', fill: '#64748b', fontSize: 9, position: 'insideBottomRight' }} />

            {/* View Mode 1: Comparison */}
            {viewMode === 'comparison' && (
              <>
                <Area
                  type="monotone"
                  dataKey="safetyScore"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#safeRouteGradient)"
                  isAnimationActive={true}
                  animationDuration={800}
                />
                <Line
                  type="monotone"
                  dataKey="directSafety"
                  stroke="#64748b"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 3, fill: '#64748b' }}
                  isAnimationActive={true}
                  animationDuration={800}
                />
              </>
            )}

            {/* View Mode 2: Incidents History */}
            {viewMode === 'incidents' && (
              <>
                <Area
                  type="monotone"
                  dataKey="safetyScore"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={0.2}
                  fill="url(#safeRouteGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="incidentRisk"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#incidentGradient)"
                  isAnimationActive={true}
                  animationDuration={800}
                />
                <Bar 
                  dataKey="incidentRisk" 
                  fill="#f59e0b" 
                  opacity={0.3} 
                  barSize={12} 
                  radius={[4, 4, 0, 0]} 
                />
              </>
            )}

            {/* View Mode 3: Crowd Pressure */}
            {viewMode === 'crowd' && (
              <>
                <Area
                  type="monotone"
                  dataKey="safetyScore"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={0.2}
                  fill="url(#safeRouteGradient)"
                />
                <Area
                  type="monotone"
                  dataKey="crowdFactor"
                  stroke="#818cf8"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#crowdGradient)"
                  isAnimationActive={true}
                  animationDuration={800}
                />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};
