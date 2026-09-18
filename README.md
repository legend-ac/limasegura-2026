# LimaSegura 2026

Navegación Urbana Inteligente con Protección Activa y Factor de Aglomeración para Lima Metropolitana.

Proyecto de Alto Rendimiento — Algoritmos y Estructuras de Datos · 2026

Demo en vivo: https://limasegura-2026.vercel.app

---

## Qué es LimaSegura

LimaSegura 2026 es una plataforma de navegación geoespacial diseñada para la realidad urbana de Lima Metropolitana. A diferencia de los navegadores convencionales que solo priorizan la distancia más corta y envían al usuario por zonas peligrosas o calles abarrotadas, LimaSegura opera bajo un criterio único de Protección Activa:

- Monitoreo de Zonas de Aglomeración: penaliza tramos con densidad humana crítica (Gamarra, Mercado Central, paraderos congestionados, inmediaciones de estadios).
- Gestión de Incidentes en Tiempo Real: evita focos delictivos activos, disturbios y obras viales de alto riesgo.
- Motor Heurístico de Alto Rendimiento: implementado con Cola de Prioridad Binaria (MinPriorityQueue) para cálculo en tiempo logarítmico O(log V).
- Corredor de Calles Reales: los puntos seguros guían la geometría sobre el asfalto real de Lima (OpenStreetMap / OSRM), sin cortar por zonas rojas.
- Geocodificación Inversa Precisa: al tocar cualquier punto del mapa identifica la calle, número y distrito exacto sin confusiones, filtrando nombres genéricos.

---

## Cómo usar la aplicación

### Paso 1 — Punto de partida
- Haz clic en "Seleccionar en mapa" bajo "Punto de partida".
- Toca cualquier calle, avenida o esquina del mapa de Lima. El sistema detectará el nombre real de la calle.
- O pulsa el botón GPS para detectar tu ubicación en tiempo real.
- Puedes arrastrar el marcador verde (A) para afinar la posición.

### Paso 2 — Destino
- Haz clic en "Seleccionar en mapa" bajo "Destino".
- Toca el punto donde deseas llegar. El marcador rojo (B) confirmará la ubicación.
- Puedes invertir el sentido con el botón "Invertir origen y destino".

### Paso 3 — Calcular ruta segura
- Pulsa el botón verde "Calcular ruta más segura".
- El sistema traza el corredor protegido en verde brillante sobre las calles de Lima.
- Opcional: activa "Mostrar ruta directa para comparar" para ver la diferencia de riesgo evitado.

---

## Modo Caminata

Diseñado para peatones que transitan por la ciudad:

| Ritmo | Velocidad | Propósito |
|---|---|---|
| Tranquilo | 3.5 km/h | Paseo o compras con precaución |
| Normal | 5.0 km/h | Caminata estándar de desplazamiento urbano |
| Rápido | 7.0 km/h | Marcha rápida o traslado urgente |

Métricas en tiempo real al activar el modo caminata:
- Tiempo estimado y hora de llegada según el ritmo seleccionado.
- Conteo de pasos estimados (1,300 pasos por kilómetro).
- Calorías quemadas (65 kcal por kilómetro).
- Alertas automáticas si la ruta bordea áreas de precaución.

---

## Funcionalidades

| Función | Descripción |
|---|---|
| Navegación Protegida | Criterio unificado que elude aglomeraciones e incidentes de seguridad |
| Mapa Interactivo Leaflet | Cartografía OpenStreetMap libre de API keys, modo oscuro y claro |
| Geocodificación Inversa | Direcciones exactas por calle y distrito al hacer clic, sin nombres genéricos |
| Fusión Topología + Asfalto | Nodos seguros fuerzan a OSRM a generar desvíos reales por calzadas transitables |
| Telemetría de Seguridad | Score 0-100%, metros de peligro evitados e instrucciones de giro paso a paso |
| Diseño Responsivo | Layout adaptado para móvil (bottom sheet táctil), tablet (sidebar izquierdo) y escritorio |
| Rutas Favoritas | Almacenamiento local persistente de trayectos frecuentes |
| Tema Inteligente | Detección automática del tema del sistema con alternancia manual día/noche |

---

## Arquitectura y Algoritmos

### Función de Evaluación Heurística con Factor de Aglomeración

```
f(n) = g(n) + h(n)
```

- g(n) — Costo Acumulado Penalizado:
  ```
  g(padre) + distancia(u,v) × (1 + penalización_aglomeración(v) × alpha + penalización_incidente(v) × beta)
  ```
- h(n) — Heurística Admisible: distancia esférica al destino mediante Haversine. Al no sobrestimar la distancia real, se garantiza optimalidad y convergencia matemática.
- Decaimiento Cuadrático del Riesgo: la severidad de un foco disminuye hacia su periferia con exponente gamma = 1.8, evitando acercamientos al epicentro.

### Estructura de Rendimiento

- MinPriorityQueue: Min-Heap binario propio en TypeScript. Extrae el nodo mínimo en O(1) y actualiza prioridades en O(log V).

---

## Estructura del Proyecto

```
src/
├── App.tsx                   Orquestador principal, flujo de selección y resultados
├── index.css                 Sistema de diseño, tokens CSS, modo dia/noche y responsive
├── main.tsx                  Punto de entrada de la aplicación
├── types.ts                  Interfaces TypeScript (nodos, aristas, incidentes, rutas)
│
├── components/
│   ├── MapContainer.tsx      Renderizado Leaflet, marcadores, polilíneas y ResizeObserver
│   ├── GuidedTour.tsx        Tutorial guiado opt-in para nuevos usuarios (botón ?)
│   ├── FavoritesDrawer.tsx   Panel de rutas guardadas con persistencia local
│   └── ErrorBoundary.tsx     Captura errores de renderizado para evitar pantallas en blanco
│
├── data/
│   └── limaGraph.ts          Red topológica de Lima: nodos, aristas, zonas críticas
│
└── utils/
    ├── algorithms.ts         Motor de búsqueda con MinPriorityQueue y Haversine
    ├── osrm.ts               Cliente OSRM para trazado en calles reales con waypoints
    └── geocoding.ts          Geocodificación inversa con filtrado de nombres genéricos
```

---

## Tecnologías Utilizadas

- Frontend: React 18 + TypeScript
- Construcción: Vite 6 + PWA (Service Worker con precaché)
- Mapas: Leaflet + OpenStreetMap
- Enrutamiento real: OSRM API pública
- Geocodificación: Nominatim (OpenStreetMap)
- Estilos: CSS custom properties nativas con Tailwind CSS v4
- Iconografía: Lucide React
- Animaciones: Motion (Framer Motion v11)
- Despliegue: Vercel

---

## Instalación y Ejecución Local

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo
npm run dev

# 3. Abrir en el navegador
# http://localhost:3000
```

Para validar tipos sin levantar el servidor:

```bash
npx tsc --noEmit
```

Para generar el build de producción:

```bash
npm run build
```

---

## Escala de Puntaje de Seguridad

| Rango | Clasificación | Interpretación |
|---|---|---|
| 75% – 100% | Ruta Segura | Corredor con mínima o nula exposición a tumultos, sin incidentes cercanos |
| 50% – 74% | Riesgo Moderado | Proximidad a zonas comerciales o tránsito con congestión media |
| 15% – 49% | Zona Crítica | Trayecto desaconsejado con alta densidad humana o peligro reportado |

---

## Historial de Mejoras Recientes

- v2.1 (sep 2026): Geocodificación corregida — filtro de nombres genéricos, soporte para amenity/building/shop, timeout robusto y Accept-Language es-PE.
- v2.1 (sep 2026): ResizeObserver en MapContainer — el mapa redibuja tiles automáticamente al abrir/cerrar el panel lateral.
- v2.1 (sep 2026): Fix race condition en drag de marcadores — previene que geocode desactualizado sobreescriba la posición actual.
- v2.0 (sep 2026): Tour guiado convertido a opt-in mediante botón de ayuda — ya no bloquea la pantalla al iniciar.
- v2.0 (sep 2026): Layout responsivo con tres diseños independientes: Desktop (sidebar derecha), Tablet (sidebar izquierda), Móvil (bottom sheet deslizable).

---

## Licencia

MIT License — Proyecto académico y de investigación tecnológica 2026.
