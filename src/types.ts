export type AlgorithmType = 'astar_safe' | 'astar_distance' | 'dijkstra' | 'greedy';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface GraphNode {
  id: string;
  name: string;
  lat: number;
  lng: number;
  district: string;
  category: 'transit' | 'plaza' | 'avenue' | 'commercial' | 'landmark' | 'emergency' | 'calle';
}

export interface GraphEdge {
  from: string;
  to: string;
  distanceKm: number;
  streetName: string;
  type?: 'avenida' | 'via_expresa' | 'calle' | 'jiron' | 'peatonal' | 'via_rapida' | 'autopista';
}

export interface CrowdHotspot {
  id: string;
  name: string;
  district: string;
  lat: number;
  lng: number;
  radiusMeters: number; // Radio de aglomeración configurable
  baseRadiusMeters: number;
  crowdFactor: number; // 0.1 a 1.0 (densidad humana estimada en tiempo real)
  densityLevel: 'leve' | 'moderada' | 'alta' | 'critica';
  description: string;
  peakHour: string;
}

export interface RiskIncident {
  id: string;
  title: string;
  district: string;
  type: 'congestion' | 'manifestacion' | 'obras' | 'inseguridad' | 'aglomeracion_masiva' | 'zona_peligrosa' | 'accidente';
  severity: 'moderada' | 'alta' | 'critica';
  lat: number;
  lng: number;
  radiusMeters: number;
  timestamp: string;
  description: string;
  active: boolean;
}

export interface SafeHaven {
  id: string;
  name: string;
  type: 'hospital' | 'comisaria' | 'bomberos' | 'refugio';
  district: string;
  lat: number;
  lng: number;
  address: string;
  emergencyPhone: string;
}

export interface RouteDirectionStep {
  instruction: string;
  distanceMeters: number;
  nodeName: string;
  streetName?: string;
  warning?: string;
}

export interface RouteResult {
  algorithm: AlgorithmType;
  algorithmName: string;
  pathNodeIds: string[];
  pathNodes: GraphNode[];
  pathCoordinates: [number, number][];
  totalDistanceKm: number;
  estimatedTimeMinutes: number;
  safetyScore: number; // 0 to 100%
  crowdExposureScore: number; // 0 to 100 (lower is better)
  nodesExplored: number;
  executionTimeMs: number;
  stepByStepDirections: RouteDirectionStep[];
  turnByTurnDirections: RouteDirectionStep[];
}

export interface SavedRoute {
  id: string;
  name: string;
  originId: string;
  originName: string;
  destinationId: string;
  destinationName: string;
  createdAt: string;
  algorithm: AlgorithmType;
  distanceKm: number;
  safetyScore: number;
  estimatedTimeMinutes: number;
}
