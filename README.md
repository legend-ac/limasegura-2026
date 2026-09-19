# 🛡️ LimaSegura 2026

**Plataforma de navegación urbana segura para Lima Metropolitana**
Algoritmos de búsqueda inteligente + Factor de Aglomeración en tiempo real

[![Deploy](https://img.shields.io/badge/Vercel-Live-brightgreen?logo=vercel)](https://limasegura-2026.vercel.app)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646cff?logo=vite)](https://vitejs.dev/)
[![PWA](https://img.shields.io/badge/PWA-Offline--ready-orange)](https://web.dev/progressive-web-apps/)

---

## 📌 ¿Qué es esto y para qué sirve?

Lima es una de las ciudades más densas y complejas de Sudamérica. Moverse por ella tiene un problema que los mapas convencionales (Google Maps, Waze) **ignoran completamente**: la seguridad de la ruta.

**LimaSegura** resuelve ese problema. Dado un punto de origen y un destino dentro de Lima Metropolitana, la aplicación:

1. Calcula la ruta **más segura** usando A\* con penalización de zonas peligrosas y aglomeraciones
2. Traza esa ruta sobre calles reales usando OpenStreetMap + OSRM
3. Opcionalmente muestra la ruta directa convencional para que el usuario compare visualmente cuánto rodea la ruta segura y por qué vale la pena
4. Da instrucciones paso a paso con alertas de zonas de riesgo

No es solo un calculador de rutas. Es un sistema que toma en cuenta **incidentes activos**, **zonas de alta densidad peatonal**, **horario** y **perfil de caminata** del usuario.

---

## 🧠 ¿Por qué A\* y no Dijkstra?

### Dijkstra (lo que usan los mapas convencionales)

Dijkstra explora **todos los nodos** del grafo desde el origen, en todas las direcciones posibles, hasta llegar al destino. Garantiza encontrar el camino **más corto en distancia o tiempo**. El problema: no tiene ninguna noción de "dirección", es ciego hacia el destino. Para un mapa de Lima con ~80 nodos es manejable, pero en grafos reales de millones de intersecciones sería computacionalmente inviable en tiempo real.

### A\* (lo que usa LimaSegura)

A\* agrega una **función heurística** `h(n)` que estima el costo restante desde cualquier nodo hasta el destino. Usamos la **distancia de Haversine** (distancia real entre coordenadas geográficas sobre la esfera terrestre) como heurística admisible (nunca sobreestima, por lo tanto A\* garantiza encontrar el óptimo). Esto hace que A\* explore primero los nodos que están geográficamente más cerca al destino, convergiendo hasta **10× más rápido** que Dijkstra.

```
f(n) = g(n) + h(n)

g(n) = costo real acumulado desde el origen hasta n
       (distancia física + penalización de peligro acumulada)

h(n) = distancia de Haversine desde n hasta el destino
       (heurística admisible: nunca sobreestima el costo real)
```

### El Factor de Aglomeración Lima 2026

El costo de cada arista del grafo no es solo la distancia física. Se calcula como:

```
costo(arista) = distanciaKm × (1 + penalizacionSeguridad + penalizacionAglomeracion)

penalizacionSeguridad   = suma de pesos de incidentes activos (robos, accidentes,
                           zonas peligrosas) dentro de 500m del arco
penalizacionAglomeracion = factor de densidad de hotspots × intensidad por hora

Parámetros del solver:
  safetyWeight      = 1.5   (cuánto pondera zonas de riesgo reportadas)
  aglomerationWeight = 5.0  (cuánto pondera la densidad peatonal)
```

Esto significa que A\* puede elegir una ruta 30% más larga en kilómetros si esa ruta evita zonas con 200% más riesgo. El usuario ve ambas opciones (activando el checkbox de comparación) y entiende el tradeoff directamente en el mapa.

---

## 🗺️ Grafo de Lima

El grafo está en `src/data/limaGraph.ts` y cubre los principales corredores de la ciudad:

| Zona | Nodos incluidos |
|------|----------------|
| Centro Histórico | Plaza Mayor, La Victoria, Cercado |
| Miraflores | Larcomar, Óvalo Miraflores, Kennedy |
| San Isidro | CC El Golf, Conquistadores, Javier Prado |
| La Molina | Av. La Molina, Mall Molina Plaza |
| Surco / Barranco | Bulevar, Plaza Barranco |
| SJL | Metro SJL, Bayóvar, Canto Grande |
| Callao | Bellavista, Terminal Marítimo |
| La Victoria | Gamarra, Estación La Cultura, Av. Aviación |
| Ate / Santa Anita | Huancayo, Estadio Monumental |
| Comas / Los Olivos | Metropolitano Norte, Plaza Comas |

Cada nodo tiene coordenadas reales (lat/lng), distrito y nombre. Cada arista tiene distanciaKm real, streetName y tipo de vía.

---

## 🔧 Arquitectura técnica

```
src/
├── App.tsx                    # Orquestador: estado global, flujo de 3 pasos
├── types.ts                   # Interfaces TypeScript (GraphNode, RouteResult, etc.)
├── index.css                  # Sistema de diseño (vars CSS, dark mode, responsive)
│
├── components/
│   ├── MapContainer.tsx       # Mapa Leaflet: rutas, riesgos, marcadores arrastrables
│   ├── GuidedTour.tsx         # Onboarding paso a paso
│   ├── FavoritesPanel.tsx     # Rutas guardadas en localStorage
│   └── IncidentReporter.tsx   # Reporte de incidentes
│
├── utils/
│   ├── algorithms.ts          # A*, Dijkstra, MinPriorityQueue, heurísticas
│   ├── geocoding.ts           # Reverse geocoding Nominatim (OSM)
│   └── osrm.ts                # OSRM: trazado sobre calles reales
│
└── data/
    └── limaGraph.ts           # Grafo: nodos, aristas, hotspots, incidentes iniciales
```

### Flujo de una consulta

```
1. Usuario toca el mapa (elige origen y destino)
           ↓
2. A* con Factor de Aglomeración Lima 2026
   (< 5ms, sincrónico, en el navegador)
           ↓
3. OSRM API pública
   Recibe los waypoints del corredor seguro de A*
   y los proyecta sobre calles reales de OSM
   (~500ms–2s según latencia de red)
           ↓
4. Mapa dibuja la ruta en verde + panel de resultados
   Instrucciones paso a paso generadas desde los arcos
   del grafo (con alertas ⚠️ en tramos de riesgo)
```

---

## 🎛️ Funcionalidades

### Navegación y cálculo

| Feature | Descripción |
|---------|-------------|
| Selección origen/destino | Tap en mapa o GPS del dispositivo |
| Marcadores arrastrables | Al soltar, limpia la ruta anterior y recalcula |
| A\* ruta segura | Evita zonas de riesgo e incidentes activos |
| **Ruta directa (comparación)** | **Checkbox que activa Dijkstra sin penalización de seguridad — traza ruta gris punteada sobre el mapa junto a la verde segura** |
| Instrucciones paso a paso | Con alertas ⚠️ cuando el tramo cruza zona peligrosa |
| OSRM calles reales | La ruta se dibuja por vías reales, no líneas rectas |
| Geocoding inverso | Nombre de calle real al tocar cualquier punto |

### Sobre el botón "Mostrar ruta directa para comparar"

Este checkbox activa una comparación visual **sin borrar la ruta segura**:
- Ejecuta **Dijkstra** desde el mismo origen al mismo destino, ignorando penalizaciones de seguridad
- Traza esa ruta en **gris punteado** en el mapa
- La ruta segura de A\* permanece en **verde sólido** encima
- El panel de resultado muestra `+X% más segura que la ruta directa`

Esto permite entender visualmente **exactamente dónde y cuánto rodea** la ruta segura, y por qué.

> **Nota (v2.3):** Antes de esta versión el checkbox recalculaba todo desde cero, borrando la ruta segura y volviéndola a dibujar, lo que lo hacía parecer inútil (el mapa parpadeaba y el resultado era el mismo). Ahora solo calcula la ruta de comparación de forma independiente y la superpone.

### Modos

| Modo | Descripción |
|------|-------------|
| 🚶 Caminata | Métricas para ir a pie: pasos, calorías, hora de llegada estimada |
| 🌙 Noche | Tema oscuro para uso nocturno |
| ⚠️ Zonas de riesgo | Capa visual de hotspots y densidades de aglomeración |
| 🔖 Favoritos | Guardar y cargar rutas frecuentes (localStorage, persiste entre sesiones) |

---

## ⚙️ Configuración de despliegue

### No se requieren API keys

La app usa únicamente servicios públicos y gratuitos:
- **OSRM** (`router.project-osrm.org`) — gratuito, sin key, máximo recomendado 1 req/seg
- **Nominatim OSM** (`nominatim.openstreetmap.org`) — gratuito, requiere `User-Agent` en cada petición (bloquea con HTTP 403 si no se envía)

### `vercel.json` — Por qué es crítico

```json
{
  "headers": [
    {
      "source": "/(sw.js|registerSW.js|manifest.webmanifest|manifest.json)",
      "headers": [{ "key": "Cache-Control", "value": "no-cache, no-store, must-revalidate" }]
    },
    {
      "source": "/assets/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    }
  ]
}
```

Sin este archivo, la CDN de Vercel cachea el Service Worker (`sw.js`) por horas o días. Esto significa que cuando despliegas una nueva versión, los usuarios siguen viendo la versión vieja porque su navegador no sabe que el SW cambió. Con `no-cache` en el SW, cada visita verifica si hay una versión nueva.

Los archivos de `/assets/` sí deben cachearse con `immutable` porque Vite les genera un hash en el nombre (ejemplo: `index-oKAmGgzy.js`). Si el contenido cambia, el nombre también cambia, por lo que nunca habrá conflicto.

---

## 🚀 Desarrollo local

```bash
# Instalar dependencias
npm install

# Servidor de desarrollo (Vite HMR)
npm run dev

# Verificar tipos TypeScript sin compilar
npx tsc --noEmit

# Build de producción
npm run build

# Preview del build generado en dist/
npm run preview
```

---

## 📦 Stack técnico

| Librería | Uso |
|----------|-----|
| React 19 + TypeScript 5 | UI reactiva con tipado estático |
| Vite 6 | Bundler, HMR, plugin PWA |
| Leaflet 1.9 | Mapa interactivo, polilíneas, marcadores |
| Framer Motion 11 | Animaciones de paneles y transiciones |
| Lucide React | Iconografía consistente |
| vite-plugin-pwa | Genera Service Worker y manifest automáticamente |
| OSRM API pública | Trazado de calles reales sobre OSM |
| Nominatim API | Reverse geocoding (coordenadas → nombre de calle) |

---

## 📊 Detalles de algoritmos

### `MinPriorityQueue` (heap binario)
Implementada desde cero en `src/utils/algorithms.ts`. Es la estructura central que hace eficiente a A\*: siempre extrae el nodo con menor `f(n)` en `O(log n)`. Sin esta estructura, A\* degeneraría a `O(n²)`.

### `solveRoute(originId, destId, nodes, edges, hotspots, incidents, algorithm, safetyWeight, aglomerationWeight)`

Parámetros clave:
- `algorithm: 'astar_safe' | 'dijkstra'` — modo de búsqueda
- `safetyWeight` — multiplicador para penalizaciones de incidentes (recomendado: 1.5)
- `aglomerationWeight` — multiplicador para densidad peatonal (recomendado: 5.0)

Retorna `RouteResult` con:
- `pathNodes` — nodos del camino
- `totalDistanceKm` — distancia física
- `safetyScore` — 0-100%, donde 100 = sin riesgo detectado
- `stepByStepDirections` — instrucciones con `warning` opcional

### `reverseGeocodeStreet(lat, lng)` en `geocoding.ts`

Nominatim requiere por política:
- Header `User-Agent` identificando la aplicación (sin esto: HTTP 403 inmediato)
- Máximo 1 petición por segundo (sin esto: HTTP 429 rate limit)

La función implementa caché en memoria (Map) para no re-consultar la misma posición (redondeada a 4 decimales ≈ 11m de precisión) y un rate-limiter de 1100ms entre peticiones.

---

## 📝 Changelog

### v2.3 — 19 Sep 2026 — Fixes críticos
- `vercel.json` con headers de caché correctos para PWA
- Eliminado tag `<link rel="manifest">` duplicado en `index.html`
- `geocoding.ts`: `User-Agent` obligatorio + rate-limiter 1100ms (corrige HTTP 403/429)
- Favoritos auto-calculan la ruta al cargar (sin necesitar presionar Calcular de nuevo)
- `swapPoints` recalcula la ruta inversa automáticamente
- Modo caminata 🚶 recalcula con perfil correcto
- **Checkbox "Mostrar ruta directa": CORREGIDO** — ahora superpone la ruta directa sin borrar la segura
- Marcadores arrastrables limpian la ruta fantasma inmediatamente
- Grafo: conectados arcos faltantes Av. Aviación (Gamarra ↔ La Cultura) + Higuereta → Bulevar
- Instrucciones paso a paso muestran advertencias ⚠️ en tramos peligrosos

### v2.2 — 17 Sep 2026
- Modal de tour centrado correctamente (conflicto con Framer Motion)
- Soporte tecla Escape para cerrar tour
- Inicialización no bloqueante del tour (opt-in)

### v2.1 — 16 Sep 2026
- Modo caminata con pasos, calorías y hora de llegada
- Panel de incidentes en tiempo real
- Dark mode persistente

### v2.0 — 15 Sep 2026
- Rediseño completo con sistema de diseño CSS
- Layout responsive (mobile/tablet/desktop)
- Integración OSRM (reemplaza líneas rectas)
- Factor de Aglomeración Lima 2026

### v1.0 — Sep 2026
- A\* y Dijkstra sobre grafo de Lima
- Mapa Leaflet básico + cálculo de seguridad estático

---

## 📚 Referencias

- Hart, P. E., Nilsson, N. J., & Raphael, B. (1968). *A formal basis for the heuristic determination of minimum cost paths.* IEEE Transactions on Systems Science and Cybernetics.
- Dijkstra, E. W. (1959). *A note on two problems in connexion with graphs.* Numerische Mathematik.
- OpenStreetMap Foundation. *Nominatim Usage Policy.* https://operations.osmfoundation.org/policies/nominatim/
- Project OSRM. *Open Source Routing Machine.* http://project-osrm.org/
- INEI (2024). *Lima Metropolitana: Densidad Poblacional por Distritos 2024.*

---

## 📄 Licencia

MIT — Proyecto académico LimaSegura 2026
Universidad — Algoritmos de Búsqueda y Factor de Aglomeración
