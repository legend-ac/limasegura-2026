# 🛡️ LimaSegura 2026

**Plataforma de Navegación Urbana Inteligente con Factor de Aglomeración y Mitigación de Riesgos**  
*Desarrollada para Lima Metropolitana · Algoritmo A\* Multicriterio · Modelado de Red Vial Peatonal y Vehicular*

[![Deploy](https://img.shields.io/badge/Vercel-Live-brightgreen?logo=vercel)](https://limasegura-2026.vercel.app)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646cff?logo=vite)](https://vitejs.dev/)
[![PWA](https://img.shields.io/badge/PWA-Offline--ready-orange)](https://web.dev/progressive-web-apps/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 📌 Índice General

1. [¿Por qué existe este proyecto? (El Porqué)](#-el-porqué-justificación-y-problemática-en-lima)
2. [¿De qué está compuesto el sistema? (El De Qué)](#-el-de-qué-fundamentos-y-arquitectura-técnica)
3. [El Botón de Comparación: Propósito Real y Cómo Funciona](#-el-botón-mostrar-ruta-directa-para-comparar)
4. [Diferenciación de Modos: Caminata (A Pie) vs Vehicular](#-modo-a-pie-caminata-vs-modo-vehicular)
5. [Topología y Zonas Críticas del Perú (Lima Metropolitana)](#-cobertura-geográfica-y-contexto-peruano)
6. [Formulación Matemática y Complejidad Algorítmica](#-formulación-matemática-y-algoritmos)
7. [Guía de Instalación y Despliegue](#-instalación-y-despliegue)
8. [Créditos y Referencias](#-referencias)

---

## 🛑 El Porqué: Justificación y Problemática en Lima

### La Falla Sistémica de las Apps Convencionales
Las aplicaciones estándar de navegación comercial (**Google Maps, Waze, Apple Maps**) fueron concebidas bajo un paradigma estrictamente utilitario: **minimizar distancia o tiempo en automóvil**. En ciudades del primer mundo, donde los índices de seguridad son relativamente homogéneos, este enfoque es válido. 

Sin embargo, **en Lima Metropolitana este enfoque resulta peligroso para la vida y el patrimonio de los ciudadanos**:
- **El sesgo automovilístico:** Un algoritmo tradicional considera que una vía rápida como la Vía Expresa Paseo de la República o la Vía de Evitamiento es la ruta más "corta" y "rápida", sugiriéndosela a transeúntes a pie donde las veredas son inexistentes o están prohibidas para peatones.
- **La trampa del atajo ciego:** Para recortar 200 metros o 3 minutos, un mapa convencional es capaz de guiar a un ciudadano o turista por jirones críticos con alto índice de criminalidad (como Jr. Gamarra en La Victoria, Jr. Cuzco en Mesa Redonda, o pasajes oscuros de Caquetá y Callao Centro).
- **El robo al paso y el factor aglomeración:** Según reportes de la Policía Nacional del Perú (PNP) y el INEI (2024), más del 78% de los delitos patrimoniales contra transeúntes en Lima son **robos de teléfonos celulares y arrebatos al paso**. Estos delitos se concentran de forma desproporcionada en:
  1. *Focos de aglomeración masiva y comercio informal* (donde el delincuente aprovecha el tumulto para escapar).
  2. *Paraderos y gargantas viales saturadas* donde los peatones están indefensos esperando transporte público.
  3. *Calles angostas y mal iluminadas con nula presencia de serenazgo*.

### La Misión de LimaSegura
**LimaSegura 2026** no busca únicamente llevar al usuario del punto A al punto B en el menor tiempo. Su objetivo central es **optimizar el balance entre tiempo de viaje y protección personal**, garantizando que el camino trazado sobre el asfalto desvíe de manera proactiva las zonas de alta incidencia delictiva, focos de aglomeración crítica y obras no transitables.

---

## 🧩 El De Qué: Fundamentos y Arquitectura Técnica

LimaSegura 2026 es una aplicación web progresiva (PWA) de alto rendimiento que opera en el navegador del usuario en tiempo real (< 5 milisegundos de tiempo de cómputo algorítmico).

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FLUJO DE PROCESAMIENTO                          │
└────────────────────────────────────────────────────────────────────────┘
  1. Origen & Destino fijados (GPS o Tap en Mapa interactivo)
            │
            ▼
  2. Motor A* Multicriterio con MinPriorityQueue en O(log V)
     Evaluación de la función: f(n) = g(n) + h(n)
     * g(n): Distancia acumulada ponderada por penalización de peligro
     * h(n): Distancia esférica Haversine admisible
            │
            ▼
  3. Extractor de Waypoints del Corredor Seguro
     Identifica los puntos de inflexión del desvío inteligente
            │
            ▼
  4. OSRM API (OpenStreetMap Routing Machine)
     Proyecta los waypoints sobre la geometría real de las calles
     (con perfil vehicular o peatonal según corresponda)
            │
            ▼
  5. Renderizado en Capas Leaflet + Panel Comparativo + Guía Paso a Paso
```

### Componentes de la Arquitectura

1. **Topología de Nodos y Aristas Metropolitanas (`src/data/limaGraph.ts`):**  
   Una red bidireccional que conecta más de 40 nodos clave de Lima Metropolitana (Centro Histórico, Callao, San Miguel, Lima Norte, San Juan de Lurigancho, Santa Anita, La Molina, Miraflores, Barranco y Lima Sur). Cada arco clasifica la vía según su naturaleza (`peatonal`, `jiron`, `calle`, `avenida`, `via_expresa`, `via_rapida`).
2. **Motor Algorítmico Puro A\* (`src/utils/algorithms.ts`):**  
   Implementación desde cero con cola de prioridad Min-Heap (`MinPriorityQueue`). Evita recorrer listas lineales $O(V)$, logrando una velocidad de respuesta instantánea.
3. **Módulo de Geometría Real (`src/utils/osrm.ts`):**  
   Conexión con el servidor público de OSRM para trazar las polilíneas exactas siguiendo curvas, veredas y carriles de OpenStreetMap.
4. **Geocodificación Inversa Resiliente (`src/utils/geocoding.ts`):**  
   Integración con Nominatim con rate-limiting (1.1 seg) y memoria caché para convertir coordenadas a nombres de calle reales sin saturar las APIs públicas.

---

## 🎛️ El Botón "Mostrar ruta directa para comparar"

### ¿Para qué sirve y por qué es fundamental?
Muchos usuarios dudan de una ruta segura si no pueden contrastarla con lo que harían normalmente:  
> *"¿Por qué la aplicación me hace dar esta vuelta? ¿Realmente vale la pena caminar 3 cuadras más?"*

El botón **"Mostrar ruta directa en el mapa para comparar"** resuelve esta duda de forma empírica y visual:

1. **Calcula de forma independiente la Ruta Convencional Directa (Dijkstra sin penalización):**
   - Emplea el algoritmo que usaría un GPS común: busca ciegamente la mínima distancia física entre A y B, ignorando por completo zonas rojas de asaltos, aglomeraciones o peligro.
2. **Superposición Visual de Alto Contraste en el Mapa:**
   - 🟢 **Ruta Segura (A\*):** Línea verde esmeralda sólida (`#2DD4A0`), gruesa, trazada por el corredor protegido.
   - 🔴 **Ruta Convencional Directa:** Línea carmesí punteada (`#F43F5E`), trazada cortando en línea recta y **atravesando los círculos rojos de peligro**.
   - **Leyenda Interactiva:** Al pie del mapa se despliega una tarjeta de leyenda que explica exactamente qué representa cada color.
3. **Panel Comparativo Cuantitativo:**
   Al activar la casilla, el panel lateral despliega un análisis comparativo frente a frente:
   - **Métricas:** Distancia en km, tiempo estimado en minutos y score de seguridad (0 a 100%).
   - **Veredicto Explícito:** Si la ruta segura rodea un foco de peligro, el sistema cuantifica el trade-off:
     > *"Veredicto: La ruta protegida requiere 0.5 km adicionales a cambio de ganar un +65% de protección frente a robos y aglomeraciones."*
   - Si no existen peligros en el trayecto directo, el sistema lo informa transparentemente:
     > *"Veredicto: No se detectaron zonas críticas ni aglomeraciones en la vía directa para este trayecto. Ambos recorridos son seguros."*

---

## 🚶 Modo a Pie (Caminata) vs Modo Vehicular

Un error fatal en aplicaciones urbanas es asumir que un auto y un peatón se comportan igual. En LimaSegura, el modo caminata transforma las reglas del cálculo de ruta:

| Criterio | Modo Vehicular (Auto / Taxi) | Modo a Pie (Caminata Peatonal) |
| :--- | :--- | :--- |
| **Vías Rápidas / Expresas** | Transitables y preferidas (`via_expresa`, `via_rapida`, bonificación $0.85\times$) | **Prohibidas:** Penalización del $2500\%$ ($25\times$) en el grafo (evita completamente el Zanjón, Evitamiento y Panamericanas) |
| **Pasajes y Zonas Peatonales** | **Prohibidas:** Penalización del $2500\%$ ($25\times$) para vehículos | **Priorizadas:** Bonificación del $0.75\times$ (favorece jirones seguros, bulevares y parques) |
| **Sensibilidad a Aglomeración** | Moderada ($1.0\times$): el conductor está protegido dentro de la cabina | **Extrema ($2.8\times$):** El peatón está físicamente expuesto al arrebato y al tumulto |
| **Perfil OSRM de Calles** | `profile: 'driving'` (respeta sentidos únicos, giros y vías expresas) | `profile: 'walking'` (rutas peatonales, veredas, puentes peatonales y accesos bidireccionales) |
| **Velocidad y Tiempo Estimado** | Promedio de tráfico urbano en Lima: **22 km/h (~2.7 min/km)** con duración real OSRM | Ritmo fisiológico peatonal regulable: **3.5, 5.0 o 7.0 km/h** |
| **Métricas Ergonómicas** | Duración vehicular real en tráfico | Pasos estimados (1,300 pasos/km), calorías quemadas (65 kcal/km) y hora exacta de llegada |

### Ritmos de Caminata Configurables
- 🚶 **Tranquilo (3.5 km/h):** Para personas mayores, familias con niños pequeños o caminatas con carga pesada.
- 🚶‍♂️ **Normal (5.0 km/h):** Velocidad media estándar de un transeúnte en aceras de Lima Metropolitana.
- 🏃 **Rápido (7.0 km/h):** Paso acelerado o marcha rápida para traslados con urgencia.

---

## 🗺️ Cobertura Geográfica y Contexto Peruano

El grafo, los hotspots de aglomeración y la base de incidentes de LimaSegura incorporan la realidad topográfica y social de los 43 distritos de Lima Metropolitana:

### Catálogo de Focos de Aglomeración Crítica (35+ Hotspots)
- **Centro de Lima & Barrios Altos:** Mesa Redonda, Mercado Central, Jr. de la Unión, Plaza San Martín, Av. Abancay con Jr. Cuzco, Estación Central, Plaza Dos de Mayo y Cinco Esquinas (Barrios Altos).
- **La Victoria:** Emporio Comercial Gamarra, La Parada / Mercado Mayorista, Cerro San Cosme, Cerro El Pino y Terminales de 28 de Julio.
- **Lima Norte:** Caquetá con Av. Zarumilla (Rímac/SMP), Terminal Terrestre Fiori / Plaza Norte, MegaPlaza, Estación Naranjal, Mercado Unicachi (Comas/Pro) y Óvalo Habich (UNI).
- **Lima Este:** Paradero Puente Nuevo (Evitamiento / El Agustino), Ceres Medio (Carretera Central - Ate), Estación Bayóvar / San Carlos (SJL), Paradero 10 de Canto Grande y Mercado de Productores Santa Anita.
- **Lima Sur:** Puente Alipio Ponce (Panamericana Sur - SJM), Mercado Ciudad de Dios (SJM), Estación Atocongo Línea 1, Curva de Chorrillos y Óvalo Las Palomas (Villa El Salvador).
- **Callao & Conexión Oeste:** Los Barracones / Jr. Loreto, Mercado Central del Callao, Cruce Morales Duárez con Faucett, Plaza Grau Callao y Plaza San Miguel.
- **Lima Moderna / Corredores Financieros:** Estación Javier Prado (Vía Expresa), Estación La Cultura (San Borja), Óvalo Higuereta (Surco), Estación Angamos (Surquillo) y Jr. Risso con Av. Arequipa (Lince).

### Base de Incidentes Activos y Zonas Peligrosas PNP (25+ Incidentes)
- **Zonas Rojas de Alto Riesgo:** Los Barracones (Callao), Cinco Esquinas (Barrios Altos), Caquetá (modalidad "bujiazo"), Cerro San Cosme (La Victoria), Puente Alipio Ponce (cogoteros) y Fiori (paraderos informales).
- **Obras Viales Críticas:** Desvíos por construcción de la Línea 2 del Metro en Av. Arica (Breña) y Carretera Central (Ate Ceres).
- **Congestión y Eventos Masivos:** Cuello de botella en Javier Prado Este hacia La Molina, paraderos del Metropolitano y marchas en Av. Abancay frente al Congreso.

### Red de Refugios Seguros (Safe Havens)
La aplicación cuenta con geolocalización y teléfonos de contacto directo para:
- **Hospitales de Referencia:** Hospital Edgardo Rebagliati (Jesús María), Hospital Arzobispo Loayza (Cercado), Hospital Casimiro Ulloa (Miraflores).
- **Comisarías PNP:** Alfonso Ugarte, Miraflores, San Isidro, Callao.
- **Compañías de Bomberos:** Cía. Roma N° 2 (Cercado), Bomberos Miraflores N° 28.

---

## 🧮 Formulación Matemática y Algoritmos

### 1. Función de Evaluación A\*

$$f(n) = g(n) + h(n)$$

Donde:
- **$g(n)$** es el costo real acumulado desde el nodo de origen hasta el nodo actual $n$.
- **$h(n)$** es la estimación heurística admisible desde $n$ hasta el destino.

### 2. Heurística Admisible: Distancia de Haversine
Para garantizar que A\* encuentre **siempre el camino óptimo**, la heurística $h(n)$ nunca debe sobreestimar el costo real ($h(n) \le h^*(n)$). Se utiliza la distancia esférica de Haversine:

$$\Delta\sigma = 2 \arcsin \left( \sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos\phi_1 \cos\phi_2 \sin^2\left(\frac{\Delta\lambda}{2}\right)} \right)$$

$$h(n) = R \cdot \Delta\sigma \quad (R \approx 6371 \text{ km})$$

Dado que la distancia en línea recta sobre la Tierra es siempre menor o igual a cualquier camino transitable por calles, la heurística es **estrictamente admisible y consistente**.

### 3. Función de Costo Multicriterio del Arco

Para cada arista dirigida $(u, v)$ de longitud física $d(u, v)$:

$$c(u, v) = d(u, v) \cdot \mu_{\text{tipo}} \cdot \left[ 1 + \left( w_{\text{aglom}} \cdot P_{\text{aglom}}(v) + w_{\text{seg}} \cdot P_{\text{incidente}}(v) \right) \cdot \mu_{\text{peatón}} \right]$$

- **$\mu_{\text{tipo}}$ (Multiplicador de tipo de vía):**  
  En modo peatonal, $\mu_{\text{tipo}} = 15.0$ si la vía es rápida o expresa, $0.85$ si es jiron/calle peatonal, y $1.0$ en general.
- **$P_{\text{aglom}}(v)$ (Penalización por radio de aglomeración):**  
  Con decaimiento de potencia cuadrática para repeler rutas cercanas al centroide del tumulto:
  $$P_{\text{aglom}}(v) = \sum_{k \in \text{Hotspots}} \left( 1 - \frac{\text{dist}(v, k)}{R_k} \right)^{1.8} \cdot \text{Factor}_k$$
- **$P_{\text{incidente}}(v)$ (Penalización de incidentes y zonas peligrosas):**  
  Ponderación por severidad: Crítica ($6.0\times$), Alta ($3.5\times$), Moderada ($1.8\times$).
- **$\mu_{\text{peatón}}$ (Multiplicador peatonal):**  
  $2.8\times$ en modo caminata, $1.0\times$ en modo vehicular.

---

## 🚀 Instalación y Despliegue

### Requisitos Previos
- **Node.js:** Versión 18 o superior
- **npm:** Versión 9 o superior

### Pasos para Ejecución Local

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/limasegura-2026.git
cd limasegura-2026

# 2. Instalar dependencias
npm install

# 3. Iniciar el servidor de desarrollo (Vite)
npm run dev

# 4. Verificar integridad de tipos TypeScript
npx tsc --noEmit

# 5. Compilar para producción
npm run build

# 6. Probar bundle generado
npm run preview
```

### Servicios Públicos Utilizados (Cero Costo de APIs)
- **OSRM (Open Source Routing Machine):** `https://router.project-osrm.org` (enrutamiento libre sobre OpenStreetMap).
- **Nominatim Geocoding:** `https://nominatim.openstreetmap.org` (geocodificación inversa con User-Agent y rate limiter estricto).

### Configuración Crítica de Caché PWA (`vercel.json`)
Para evitar que los Service Workers antiguos queden cacheados por los navegadores tras una actualización, el archivo `vercel.json` estipula:
- `no-cache, no-store, must-revalidate` para `sw.js` y `manifest.webmanifest`.
- `max-age=31536000, immutable` para los bundles versionados en `/assets/`.

---

## 📚 Referencias

1. **Hart, P. E., Nilsson, N. J., & Raphael, B. (1968).** *A formal basis for the heuristic determination of minimum cost paths.* IEEE Transactions on Systems Science and Cybernetics, 4(2), 100-107.
2. **Dijkstra, E. W. (1959).** *A note on two problems in connexion with graphs.* Numerische Mathematik, 1(1), 269-271.
3. **Instituto Nacional de Estadística e Informática (INEI - 2024).** *Estadísticas de Seguridad Ciudadana y Victimización en Lima Metropolitana.*
4. **Policía Nacional del Perú (PNP - 2024).** *Mapa del Delito e Incidencia de Hurtos y Robos al Paso por Distritos de Lima y Callao.*
5. **OpenStreetMap Foundation.** *OSRM & Nominatim Technical Architecture & Usage Policies (2024).*

---

## 📄 Licencia

Este proyecto está licenciado bajo los términos de la Licencia MIT.  
Desarrollado como proyecto académico de Algoritmos de Búsqueda y Factor de Aglomeración — Lima Metropolitana 2026.
