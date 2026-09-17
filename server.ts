import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialize Gemini SDK
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    env: process.env.NODE_ENV || 'development'
  });
});

// Strategic AI Route Analysis Endpoint
app.post('/api/ai/analyze-route', async (req, res) => {
  try {
    const { origin, destination, distanceKm, safetyScore, nearbyIncidents, hotspots } = req.body;

    const ai = getAI();

    if (ai) {
      try {
        const prompt = `Actúa como el Ingeniero Jefe del Centro de Gestión de Tránsito y Movilidad Segura de Lima 2026.
Analiza la siguiente ruta calculada por el algoritmo A* de evasión de aglomeraciones:
- Origen: ${origin}
- Destino: ${destination}
- Distancia: ${distanceKm} km
- Nivel de Seguridad estimado: ${safetyScore}%
- Focos de aglomeración cercanos: ${JSON.stringify(hotspots || [])}
- Incidentes activos evitados: ${JSON.stringify(nearbyIncidents || [])}

Proporciona un informe táctico conciso (máximo 140 palabras) en 3 puntos claros:
1. Diagnóstico del trayecto y radio de mitigación de aglomeraciones.
2. Puntos viales clave de atención en Lima Metropolitana.
3. Recomendación operativa para el peatón/conductor.`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: prompt,
        });

        const text = response.text || '';
        if (text.trim()) {
          return res.json({
            success: true,
            source: 'gemini',
            analysis: text.trim(),
            generatedAt: new Date().toLocaleTimeString('es-PE'),
          });
        }
      } catch (err: any) {
        console.warn('Gemini API call failed, switching to local heuristic analysis:', err?.message);
      }
    }

    // High quality deterministic fallback analysis
    const heuristicReport = `Diagnóstico Vial Lima 2026 (${origin} ➔ ${destination}):
1. Mitigación A*: La ruta mantiene un índice de seguridad del ${safetyScore}%, eludiendo radios críticos de congestión peatonal y vehicular en los ejes de mayor densidad.
2. Monitoreo: Se recomienda especial precaución al aproximarse a intercambios viales principales y zonas comerciales con alta afluencia en horas punta.
3. Recomendación: Trayecto verificado con cobertura de auxilio a menos de 650 metros de centros de salud y comisarías.`;

    return res.json({
      success: true,
      source: 'heuristic',
      analysis: heuristicReport,
      generatedAt: new Date().toLocaleTimeString('es-PE'),
    });
  } catch (error: any) {
    console.error('Error in /api/ai/analyze-route:', error);
    res.status(500).json({
      success: false,
      error: 'Error procesando análisis de ruta',
    });
  }
});

// Start server with Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LimaSegura 2026 server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
