# 🛡️ LimaSegura 2026

Navegación Urbana Inteligente con Protección Activa y Factor de Aglomeración para Lima Metropolitana.

Proyecto de Alto Rendimiento — Algoritmos y Estructuras de Datos · 2026

---

## 🎯 ¿Qué es LimaSegura?

LimaSegura 2026 es una plataforma de navegación geoespacial diseñada para la realidad urbana de Lima Metropolitana. A diferencia de los navegadores convencionales (que solo priorizan la distancia geométrica más corta y envían al usuario a través de zonas peligrosas o calles abarrotadas), LimaSegura opera bajo un Criterio Único de Protección Activa:

- 🚨 Monitoreo de Zonas de Aglomeración: Penaliza tramos con densidad humana crítica (Gamarra, Mercado Central, paraderos congestionados, inmediaciones de estadios).
- ⚠️ Gestión de Incidentes en Tiempo Real: Evita focos delictivos activos, disturbios y obras viales de alto riesgo.
- 🧠 Motor Heurístico de Alto Rendimiento: Implementado con una Cola de Prioridad Binaria (MinPriorityQueue) para cálculo instantáneo en tiempo logarítmico O(log V).
- 🛣️ Corredor de Calles Reales Garantizado: Los puntos seguros calculados por el algoritmo guían la geometría sobre el asfalto (OpenStreetMap / OSRM), asegurando que el trazado no corte por zonas rojas.
- 📍 Geocodificación Inversa de Calles: Al tocar cualquier punto del mapa, identifica la calle, número y distrito exacto sin confusiones.

---

## 🗺️ Cómo usar la aplicación

### Paso 1 — Selecciona tu punto de partida
- Haz clic en "Seleccionar en mapa" bajo "Punto de partida".
- Toca cualquier calle, avenida o esquina del mapa de Lima (el sistema detectará el nombre real de la calle).
- O pulsa el botón GPS para detectar tu ubicación geográfica en tiempo real.
- Puedes arrastrar el marcador verde (A) para afinar la posición.

### Paso 2 — Selecciona tu destino
- Haz clic en "Seleccionar en mapa" bajo "Destino".
- Toca el punto donde deseas llegar. El marcador rojo (B) confirmará la ubicación.
- Puedes invertir el sentido en cualquier momento con el botón "Invertir origen y destino".

### Paso 3 — Calcula tu ruta segura
- Pulsa el botón verde: "Calcular ruta más segura".
- El sistema traza el corredor protegido en verde brillante sobre las calles de Lima.
- Opcional: Activa el interruptor "Mostrar ruta directa en el mapa para comparar" para ver la línea gris punteada que atraviesa el peligro y evaluar el porcentaje de riesgo evitado.

---

## 🚶 Modo Caminata (A Pie)

Diseñado especialmente para peatones que transitan por la ciudad:

| Ritmo | Velocidad | Propósito |
|---|---|---|
| 🚶 Tranquilo | 3.5 km/h | Paseo o compras con precaución |
| 🚶‍♂️ Normal | 5.0 km/h | Caminata estándar de desplazamiento urbano |
| 🏃 Rápido | 7.0 km/h | Marcha rápida o traslado urgente |

### Métricas de caminata en tiempo real:
- ⏱️ Tiempo estimado y hora de llegada aproximada según el ritmo seleccionado.
- 🦶 Conteo de pasos estimados (~1,300 pasos por kilómetro).
- 🔥 Calorías quemadas (~65 kcal por kilómetro).
- ⚠️ Alertas peatonales automáticas si la ruta bordea áreas de precaución.

---

## 🔧 Funcionalidades Principales

| Función | Descripción |
|---|---|
| 🛡️ Navegación Protegida | Criterio unificado que elude focos de aglomeración e incidentes de seguridad |
| 🗺️ Mapa Interactivo Leaflet | Cartografía OpenStreetMap libre de API keys, con modo oscuro y claro |
| 📍 Geocodificación Inversa | Identificación de direcciones exactas por calle y distrito al hacer clic |
| 🛣️ Fusión Topología + Asfalto | Los nodos seguros fuerzan a OSRM a generar desvíos reales por calzadas transitables |
| 📊 Telemetría de Seguridad | Score del 0 al 100%, metros ahorrados en peligro e instrucciones de giro |
| 📱 Diseño Responsivo Adaptable | Experiencia optimizada para móviles (bottom sheet táctil) y escritorio |
| ⭐ Rutas Favoritas | Almacenamiento local persistente de trayectos frecuentes |
| 🌙☀️ Tema Inteligente | Detección automática del tema del sistema con alternancia manual rápida |

---

## 🧠 Arquitectura y Algoritmos

### Función de Evaluación Heurística con Factor de Aglomeración

f(n) = g(n) + h(n)

Donde:
- g(n) (Costo Acumulado Penalizado): g(padre) + distancia(u, v) × (1 + penalización_aglomeración(v) × alpha + penalización_incidente(v) × beta)
- h(n) (Heurística Admisible): Distancia esférica en línea recta al destino mediante la fórmula de Haversine. Al cumplirse que la heurística no sobrestima la distancia real, se garantiza matemáticamente la optimalidad y convergencia.
- Decaimiento Cuadrático del Riesgo: La severidad de un foco de aglomeración disminuye hacia su periferia con exponente no lineal gamma = 1.8, evitando acercamientos peligrosos al epicentro.

### Estructura de Rendimiento
- MinPriorityQueue: Estructura de datos binaria Min-Heap propia en TypeScript que extrae el nodo mínimo en O(1) y actualiza prioridades en O(log V).

---

## 🗂️ Estructura del Proyecto

```
src/
├── App.tsx                   // Orquestador principal, flujo de selección y resultados
├── index.css                 // Sistema de diseño, tokens CSS, modo día/noche y responsive
├── main.tsx                  // Punto de entrada de la aplicación
├── types.ts                  // Interfaces TypeScript (nodos, aristas, incidentes, rutas)
│
├── components/
│   ├── MapContainer.tsx      // Renderizado de mapa Leaflet, marcadores y polilíneas
│   ├── GuidedTour.tsx        // Tutorial guiado para nuevos usuarios
│   ├── FavoritesDrawer.tsx   // Panel lateral de rutas guardadas
│   ├── RouteResultCard.tsx   // Tarjeta de métricas y seguridad
│   └── ...                   // Modales de alertas y sincronización móvil
│
├── data/
│   └── limaGraph.ts          // Red topológica de Lima: nodos, aristas, zonas críticas
│
└── utils/
    ├── algorithms.ts         // Motor de búsqueda optimizado con MinPriorityQueue y Haversine
    ├── osrm.ts               // Cliente OSRM para trazado en calles reales con waypoints
    └── geocoding.ts          // Geocodificación inversa para nombres de calles reales
```

---

## 🛠️ Tecnologías Utilizadas

- Frontend Core: React 18 + TypeScript
- Entorno de Construcción: Vite
- Mapas y Geometría: Leaflet + OpenStreetMap
- Enrutamiento por Calles: Open Source Routing Machine (OSRM API pública)
- Geocodificación: OpenStreetMap Nominatim
- Iconografía: Lucide React
- Estilos: Vanilla CSS con variables nativas (alto rendimiento, sin frameworks pesados)

---

## 🚀 Instalación y Ejecución Local

```bash
// 1. Instalar las dependencias
npm install

// 2. Iniciar el servidor de desarrollo
npm run dev

// 3. Abrir en el navegador en http://localhost:3000
```

Para validar tipos y correctitud sin levantar el servidor:

```bash
npx tsc --noEmit
```

---

## 📐 Escala de Puntaje de Seguridad

| Rango | Clasificación | Interpretación |
|---|---|---|
| 75% – 100% | ✅ Ruta Segura | Corredor con mínima o nula exposición a tumultos y sin incidentes cercanos |
| 50% – 74% | ⚠️ Riesgo Moderado | Proximidad a zonas comerciales o tránsito con congestión media |
| 15% – 49% | 🚨 Zona Crítica | Trayecto desaconsejado con alta densidad humana o peligro reportado |

---

## 📄 Licencia

MIT License — Proyecto académico y de investigación tecnológica · 2026.
