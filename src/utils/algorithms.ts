import { GraphNode, GraphEdge, CrowdHotspot, RiskIncident, RouteResult, AlgorithmType } from '../types';

/**
 * Priority Queue (Min-Heap) for high-performance O(log V) A* search
 */
export class MinPriorityQueue<T> {
  private heap: { item: T; priority: number }[] = [];

  push(item: T, priority: number): void {
    this.heap.push({ item, priority });
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): T | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0].item;
    const bottom = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = bottom;
      this.sinkDown(0);
    }
    return top;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  get size(): number {
    return this.heap.length;
  }

  private bubbleUp(idx: number): void {
    const element = this.heap[idx];
    while (idx > 0) {
      const parentIdx = Math.floor((idx - 1) / 2);
      const parent = this.heap[parentIdx];
      if (element.priority >= parent.priority) break;
      this.heap[idx] = parent;
      this.heap[parentIdx] = element;
      idx = parentIdx;
    }
  }

  private sinkDown(idx: number): void {
    const length = this.heap.length;
    const element = this.heap[idx];
    while (true) {
      let leftChildIdx = 2 * idx + 1;
      let rightChildIdx = 2 * idx + 2;
      let swapIdx: number | null = null;

      if (leftChildIdx < length) {
        if (this.heap[leftChildIdx].priority < element.priority) {
          swapIdx = leftChildIdx;
        }
      }

      if (rightChildIdx < length) {
        const compareIdx = swapIdx === null ? idx : swapIdx;
        if (this.heap[rightChildIdx].priority < this.heap[compareIdx].priority) {
          swapIdx = rightChildIdx;
        }
      }

      if (swapIdx === null) break;
      this.heap[idx] = this.heap[swapIdx];
      this.heap[swapIdx] = element;
      idx = swapIdx;
    }
  }
}

/**
 * Calculates Haversine distance in kilometers between two points
 */
export function calculateHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates distance in meters
 */
export function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  return calculateHaversineKm(lat1, lon1, lat2, lon2) * 1000;
}

/**
 * Evaluates the Crowd Factor Penalty at a specific location
 * Based on the Lima 2026 Crowd Radius (Radio de Aglomeración)
 */
export function evaluateCrowdPenalty(
  lat: number,
  lng: number,
  hotspots: CrowdHotspot[],
  crowdRadiusMultiplier: number = 1.0
): { penalty: number; nearestHotspotName?: string; density: number } {
  let totalPenalty = 0;
  let maxDensity = 0;
  let nearestName: string | undefined;

  for (const spot of hotspots) {
    const effectiveRadiusMeters = spot.radiusMeters * crowdRadiusMultiplier;
    const distMeters = calculateDistanceMeters(lat, lng, spot.lat, spot.lng);

    if (distMeters < effectiveRadiusMeters) {
      // Proximity ratio: 1.0 at center, drops to 0 at edge
      const proximityFactor = 1 - (distMeters / effectiveRadiusMeters);
      // Quadratic decay for aggressive crowd avoidance near center
      const spotPenalty = Math.pow(proximityFactor, 1.8) * spot.crowdFactor * 4.5;
      totalPenalty += spotPenalty;

      if (spot.crowdFactor > maxDensity) {
        maxDensity = spot.crowdFactor;
        nearestName = spot.name;
      }
    }
  }

  return {
    penalty: totalPenalty,
    nearestHotspotName: nearestName,
    density: Math.min(1.0, maxDensity),
  };
}

/**
 * Evaluates risk penalty from active incidents
 */
export function evaluateIncidentPenalty(
  lat: number,
  lng: number,
  incidents: RiskIncident[]
): { penalty: number; incidentWarning?: string } {
  let penalty = 0;
  let warning: string | undefined;

  for (const inc of incidents) {
    if (!inc.active) continue;
    const distMeters = calculateDistanceMeters(lat, lng, inc.lat, inc.lng);
    if (distMeters < inc.radiusMeters) {
      const severityMultiplier =
        inc.severity === 'critica' ? 6.0 :
        inc.severity === 'alta' ? 3.5 : 1.8;
      
      const ratio = 1 - (distMeters / inc.radiusMeters);
      penalty += ratio * severityMultiplier;
      warning = `${inc.title} (${inc.severity.toUpperCase()})`;
    }
  }

  return { penalty, incidentWarning: warning };
}

/**
 * Checks if a sequence of coordinates traverses within active crowd hotspots or high-severity incidents.
 */
export function isRouteExposedToRisk(
  coordinates: [number, number][],
  hotspots: CrowdHotspot[],
  incidents: RiskIncident[],
  crowdThreshold: number = 0.65
): boolean {
  for (const [lat, lng] of coordinates) {
    for (const h of hotspots) {
      if (h.crowdFactor >= crowdThreshold) {
        const d = calculateDistanceMeters(lat, lng, h.lat, h.lng);
        if (d < h.radiusMeters * 0.9) return true;
      }
    }
    for (const inc of incidents) {
      if (inc.active && (inc.severity === 'critica' || inc.severity === 'alta')) {
        const d = calculateDistanceMeters(lat, lng, inc.lat, inc.lng);
        if (d < inc.radiusMeters) return true;
      }
    }
  }
  return false;
}

interface AdjacencyEdge {
  toNodeId: string;
  distanceKm: number;
  streetName: string;
  edgeType?: string;
}

function buildAdjacencyList(edges: GraphEdge[]): Map<string, AdjacencyEdge[]> {
  const adj = new Map<string, AdjacencyEdge[]>();

  for (const edge of edges) {
    if (!adj.has(edge.from)) adj.set(edge.from, []);
    if (!adj.has(edge.to)) adj.set(edge.to, []);

    // Metropolitan streets in this graph are modeled bidirectionally for pedestrian and safe corridor transit
    adj.get(edge.from)!.push({
      toNodeId: edge.to,
      distanceKm: edge.distanceKm,
      streetName: edge.streetName,
      edgeType: edge.type,
    });
    adj.get(edge.to)!.push({
      toNodeId: edge.from,
      distanceKm: edge.distanceKm,
      streetName: edge.streetName,
      edgeType: edge.type,
    });
  }

  return adj;
}

/**
 * Solves the routing problem according to the selected algorithm
 * with specific support for "Factor Radio de Aglomeración Lima 2026"
 */
export function solveRoute(
  startNodeId: string,
  endNodeId: string,
  nodes: GraphNode[],
  edges: GraphEdge[],
  hotspots: CrowdHotspot[],
  incidents: RiskIncident[],
  algorithm: AlgorithmType,
  crowdRadiusMultiplier: number = 1.0,
  crowdAvoidanceWeight: number = 2.5,
  /** When true: heavily penalizes vias_rapidas + increases crowd/safety sensitivity for pedestrians */
  walkingMode: boolean = false
): RouteResult | null {
  const startTime = performance.now();
  const nodeMap = new Map<string, GraphNode>();
  for (const n of nodes) nodeMap.set(n.id, n);

  const startNode = nodeMap.get(startNodeId);
  const endNode = nodeMap.get(endNodeId);

  if (!startNode || !endNode) return null;
  if (startNodeId === endNodeId) {
    const sameDirections = [{
      instruction: `Origen y destino coinciden en ${startNode.name}`,
      distanceMeters: 0,
      nodeName: startNode.name,
      streetName: 'Mismo punto',
    }];
    return {
      algorithm,
      algorithmName: getAlgorithmDisplayName(algorithm),
      pathNodeIds: [startNodeId],
      pathNodes: [startNode],
      pathCoordinates: [[startNode.lat, startNode.lng]],
      totalDistanceKm: 0,
      estimatedTimeMinutes: 0,
      safetyScore: 100,
      crowdExposureScore: 0,
      nodesExplored: 1,
      executionTimeMs: 0.1,
      stepByStepDirections: sameDirections,
      turnByTurnDirections: sameDirections,
    };
  }

  const adj = buildAdjacencyList(edges);

  // Tracking structures
  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();
  const cameFrom = new Map<string, { nodeId: string; streetName: string; dist: number }>();
  const closedSet = new Set<string>();
  const pq = new MinPriorityQueue<string>();

  let nodesExploredCount = 0;

  gScore.set(startNodeId, 0);

  // Compute initial heuristic
  const startH = calculateHaversineKm(startNode.lat, startNode.lng, endNode.lat, endNode.lng);
  fScore.set(startNodeId, startH);
  pq.push(startNodeId, algorithm === 'dijkstra' ? 0 : startH);

  while (!pq.isEmpty()) {
    const currentId = pq.pop();
    if (!currentId) break;

    // Skip if already evaluated
    if (closedSet.has(currentId)) continue;

    // Target reached!
    if (currentId === endNodeId) {
      break;
    }

    closedSet.add(currentId);
    nodesExploredCount++;

    const currentNode = nodeMap.get(currentId)!;
    const neighbors = adj.get(currentId) || [];

    for (const neighbor of neighbors) {
      const neighborId = neighbor.toNodeId;
      if (closedSet.has(neighborId)) continue;

      const neighborNode = nodeMap.get(neighborId);
      if (!neighborNode) continue;

      // Base edge cost is real distance in km
      let edgeWeight = neighbor.distanceKm;

      // Penalización estricta de vías no caminables en modo peatonal
      // Vías expresas y rápidas (Paseo de la República, Evitamiento, Panamericana) son prohibidas/peligrosas para peatones
      if (walkingMode && (neighbor.edgeType === 'via_rapida' || neighbor.edgeType === 'via_expresa' || neighbor.edgeType === 'autopista')) {
        edgeWeight *= 15.0; // 1500% de penalización → el algoritmo buscará cualquier vía transitable a pie
      }

      // In safe mode, we penalize paths traversing inside the crowd radius or near risk incidents
      if (algorithm === 'astar_safe') {
        const crowdEval = evaluateCrowdPenalty(
          neighborNode.lat,
          neighborNode.lng,
          hotspots,
          crowdRadiusMultiplier
        );
        const incidentEval = evaluateIncidentPenalty(
          neighborNode.lat,
          neighborNode.lng,
          incidents
        );

        // En modo peatonal:
        // 1. Mayor sensibilidad a aglomeraciones y robos (un peatón no tiene blindaje ni velocidad de auto)
        // 2. Bonificación para jirones, calles y pasajes peatonales más tranquilos
        const pedestrianMultiplier = walkingMode ? 2.8 : 1.0;

        if (walkingMode) {
          if (neighbor.edgeType === 'peatonal' || neighbor.edgeType === 'jiron' || neighbor.edgeType === 'calle') {
            edgeWeight *= 0.85; // Favorece vías peatonales seguras
          } else if (neighbor.edgeType === 'avenida') {
            edgeWeight *= 1.20; // Avenidas de alto tráfico vehicular son menos cómodas a pie
          }
        }

        // Multi-criteria cost function: distance amplified by crowd penalty factor
        const crowdMultiplier = 1
          + (crowdEval.penalty * crowdAvoidanceWeight * pedestrianMultiplier)
          + (incidentEval.penalty * 2.0 * pedestrianMultiplier);
        edgeWeight = edgeWeight * crowdMultiplier;
      }

      const tentativeG = (gScore.get(currentId) ?? Infinity) + edgeWeight;

      if (tentativeG < (gScore.get(neighborId) ?? Infinity)) {
        cameFrom.set(neighborId, {
          nodeId: currentId,
          streetName: neighbor.streetName,
          dist: neighbor.distanceKm,
        });
        gScore.set(neighborId, tentativeG);

        const h = calculateHaversineKm(neighborNode.lat, neighborNode.lng, endNode.lat, endNode.lng);
        const priority = algorithm === 'dijkstra' 
          ? tentativeG 
          : algorithm === 'greedy' 
            ? h 
            : tentativeG + h;

        fScore.set(neighborId, tentativeG + h);
        pq.push(neighborId, priority);
      }
    }
  }

  // Reconstruct path
  if (!cameFrom.has(endNodeId)) {
    return null; // No path found
  }

  const pathNodeIds: string[] = [endNodeId];
  let curr = endNodeId;
  let totalKm = 0;
  const segments: { from: string; to: string; street: string; dist: number }[] = [];

  while (cameFrom.has(curr)) {
    const prev = cameFrom.get(curr)!;
    totalKm += prev.dist;
    segments.unshift({
      from: prev.nodeId,
      to: curr,
      street: prev.streetName,
      dist: prev.dist,
    });
    pathNodeIds.unshift(prev.nodeId);
    curr = prev.nodeId;
  }

  const pathCoordinates: [number, number][] = pathNodeIds.map(id => {
    const n = nodeMap.get(id)!;
    return [n.lat, n.lng];
  });

  // Calculate safety score and crowd exposure
  let totalCrowdPenalty = 0;
  let totalIncidentPenalty = 0;

  for (const nodeId of pathNodeIds) {
    const n = nodeMap.get(nodeId)!;
    const c = evaluateCrowdPenalty(n.lat, n.lng, hotspots, crowdRadiusMultiplier);
    const inc = evaluateIncidentPenalty(n.lat, n.lng, incidents);
    totalCrowdPenalty += c.penalty;
    totalIncidentPenalty += inc.penalty;
  }

  const avgCrowdPenalty = totalCrowdPenalty / pathNodeIds.length;
  const avgIncidentPenalty = totalIncidentPenalty / pathNodeIds.length;

  // Safety Score: 100 is optimal safe corridor, reduced by crowd exposure & incident proximity
  const safetyPenalty = (avgCrowdPenalty * 22) + (avgIncidentPenalty * 18);
  const safetyScore = Math.max(15, Math.min(99, Math.round(100 - safetyPenalty)));
  const crowdExposureScore = Math.min(100, Math.round(avgCrowdPenalty * 28));

  // Time estimate: average 4.8 km/h walking or mixed safe urban transit with crowd slowdown
  const baseWalkingHours = totalKm / 4.8;
  const crowdDelayMultiplier = 1 + (crowdExposureScore / 100) * 0.45;
  const estimatedTimeMinutes = Math.max(3, Math.round(baseWalkingHours * 60 * crowdDelayMultiplier));

  // Step by step directions
  const stepByStepDirections = segments.map((seg) => {
    const toNode = nodeMap.get(seg.to)!;
    const crowdCheck = evaluateCrowdPenalty(toNode.lat, toNode.lng, hotspots, crowdRadiusMultiplier);
    const incidentCheck = evaluateIncidentPenalty(toNode.lat, toNode.lng, incidents);

    let warning: string | undefined;
    if (incidentCheck.incidentWarning) {
      warning = incidentCheck.incidentWarning;
    } else if (crowdCheck.density > 0.6) {
      warning = `Zona de aglomeración activa (${crowdCheck.nearestHotspotName || 'Alta densidad'})`;
    }

    return {
      instruction: `Continuar por ${seg.street} hacia ${toNode.name}`,
      distanceMeters: Math.round(seg.dist * 1000),
      nodeName: toNode.name,
      streetName: seg.street,
      warning,
    };
  });

  const pathNodes = pathNodeIds.map(id => nodeMap.get(id)!).filter(Boolean);
  const endTime = performance.now();

  return {
    algorithm,
    algorithmName: getAlgorithmDisplayName(algorithm),
    pathNodeIds,
    pathNodes,
    pathCoordinates,
    totalDistanceKm: Number(totalKm.toFixed(2)),
    estimatedTimeMinutes,
    safetyScore,
    crowdExposureScore,
    nodesExplored: nodesExploredCount,
    executionTimeMs: Number((endTime - startTime).toFixed(2)),
    stepByStepDirections,
    turnByTurnDirections: stepByStepDirections,
  };
}

export function getAlgorithmDisplayName(alg: AlgorithmType): string {
  switch (alg) {
    case 'astar_safe':
      return 'A* Multicriterio (Ruta Segura - Factor Aglomeración)';
    case 'astar_distance':
      return 'A* Estándar (Ruta Más Corta)';
    case 'dijkstra':
      return 'Dijkstra (Distancia Mínima Exhaustiva)';
    case 'greedy':
      return 'Greedy Best-First (Heurística Voraz)';
  }
}

/**
 * Finds the nearest graph node to any given geographic coordinate in Lima
 */
export function findNearestNode(lat: number, lng: number, nodes: GraphNode[]): GraphNode {
  let nearest = nodes[0];
  let minDistance = Infinity;

  for (const node of nodes) {
    const d = calculateHaversineKm(lat, lng, node.lat, node.lng);
    if (d < minDistance) {
      minDistance = d;
      nearest = node;
    }
  }

  return nearest;
}

/**
 * Extracts key waypoints along a safe path to guide OSRM real street routing
 * without overloading the API with too many points.
 */
export function extractCorridorWaypoints(pathNodes: GraphNode[], maxPoints: number = 4): { lat: number; lng: number }[] {
  if (pathNodes.length <= 2) return [];
  // Exclude origin and destination as they are provided separately
  const intermediates = pathNodes.slice(1, -1);
  if (intermediates.length <= maxPoints) {
    return intermediates.map(n => ({ lat: n.lat, lng: n.lng }));
  }

  // Sample evenly spaced key nodes along the corridor
  const step = Math.ceil(intermediates.length / maxPoints);
  const sampled: { lat: number; lng: number }[] = [];
  for (let i = 0; i < intermediates.length; i += step) {
    sampled.push({ lat: intermediates[i].lat, lng: intermediates[i].lng });
  }
  return sampled;
}

