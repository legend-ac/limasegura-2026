import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MapPin, Navigation, Crosshair, Shield, Star,
  ChevronRight, ChevronLeft, X, Smartphone, Monitor, Tablet,
  MousePointer, Fingerprint, Hand,
} from 'lucide-react';

const TOUR_STORAGE_KEY = 'lima_segura_tour_completed_2026';

type DeviceType = 'mobile' | 'tablet' | 'desktop';

function detectDevice(): DeviceType {
  const w = window.innerWidth;
  if (w < 640) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

interface TourStep {
  title: string;
  description: string;
  icon: React.ElementType;
  accentColor: string;
  tips: Record<DeviceType, string>;
  image?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: '¡Bienvenido a LimaSegura 2026!',
    description: 'Te guiaremos paso a paso para que encuentres la ruta más segura por Lima. Esta herramienta usa algoritmos de inteligencia artificial para evitar zonas de aglomeración y riesgo.',
    icon: Shield,
    accentColor: 'var(--c-green)',
    tips: {
      mobile: 'Desliza hacia abajo para ver el panel de control debajo del mapa.',
      tablet: 'El panel de control está a la izquierda del mapa. Toca para interactuar.',
      desktop: 'Usa el panel izquierdo para configurar tu ruta y el mapa a la derecha para visualizarla.',
    },
  },
  {
    title: 'Selecciona tu punto de origen',
    description: 'Indica desde dónde vas a salir. Puedes elegir de la lista desplegable, escribir el nombre del lugar, o marcar directamente en el mapa.',
    icon: MapPin,
    accentColor: 'var(--c-green)',
    tips: {
      mobile: 'Toca "Marcar en mapa" y luego toca el punto en el mapa donde estás.',
      tablet: 'Toca "Marcar en mapa" o usa el botón GPS para detectar tu ubicación automáticamente.',
      desktop: 'Haz clic en "Marcar en mapa" y luego clic en el mapa, o usa el botón GPS.',
    },
  },
  {
    title: 'Selecciona tu destino',
    description: 'Indica a dónde quieres llegar. Mismas opciones: lista, búsqueda o clic en el mapa.',
    icon: Navigation,
    accentColor: '#F85149',
    tips: {
      mobile: 'Desliza abajo del mapa y toca el campo "Punto de destino" para seleccionar.',
      tablet: 'Selecciona el destino en el panel lateral izquierdo debajo del origen.',
      desktop: 'En el panel izquierdo, paso 2, selecciona o marca tu destino en el mapa.',
    },
  },
  {
    title: 'Protección urbana inteligente',
    description: 'LimaSegura analiza en tiempo real las zonas de aglomeración y riesgo en Lima para trazar la ruta más segura.',
    icon: Crosshair,
    accentColor: 'var(--c-blue)',
    tips: {
      mobile: 'El sistema calcula automáticamente la trayectoria más protegida.',
      tablet: 'Puedes activar la comparación para ver la diferencia con una ruta directa.',
      desktop: 'Visualiza en el mapa cómo la ruta bordea las zonas de mayor peligro.',
    },
  },
  {
    title: '¡Listo! Calcula tu ruta',
    description: 'Presiona el botón verde "Calcular ruta más segura" y verás la ruta trazada en el mapa con su índice de seguridad, distancia y tiempo estimado.',
    icon: Star,
    accentColor: 'var(--c-amber)',
    tips: {
      mobile: 'La ruta aparecerá en el mapa arriba. Desliza abajo para ver los detalles.',
      tablet: 'La ruta se muestra en el mapa y los resultados aparecen debajo del panel.',
      desktop: 'La ruta se traza en el mapa. Los resultados detallados aparecen en el panel izquierdo.',
    },
  },
];

export const GuidedTour: React.FC<{ forceShow?: boolean; onClose?: () => void }> = ({ forceShow, onClose }) => {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [device, setDevice] = useState<DeviceType>('desktop');

  useEffect(() => {
    if (forceShow) {
      setVisible(true);
      setStep(0);
    } else {
      // Ensure tour is always hidden when forceShow is false
      setVisible(false);
    }
  }, [forceShow]);

  useEffect(() => {
    setDevice(detectDevice());
    const handleResize = () => setDevice(detectDevice());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleComplete = useCallback(() => {
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    setVisible(false);
    onClose?.();
  }, [onClose]);

  const handleNext = () => {
    if (step < TOUR_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSkip = () => {
    handleComplete();
  };

  // HARD GUARD: never render unless explicitly triggered by user action
  if (!forceShow || !visible) return null;

  const currentStep = TOUR_STEPS[step];
  const Icon = currentStep.icon;
  const isLast = step === TOUR_STEPS.length - 1;
  const progress = ((step + 1) / TOUR_STEPS.length) * 100;

  const DeviceIcon = device === 'mobile' ? Smartphone : device === 'tablet' ? Tablet : Monitor;
  const InteractionIcon = device === 'mobile' ? Fingerprint : device === 'tablet' ? Hand : MousePointer;

  // Responsive sizing
  const isMobile = device === 'mobile';
  const modalWidth = isMobile ? '92vw' : device === 'tablet' ? '460px' : '520px';
  const padding = isMobile ? '1.25rem' : '1.75rem';

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleSkip}
            style={{
              position: 'fixed', inset: 0, zIndex: 9998,
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(4px)',
            }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            style={{
              position: 'fixed',
              zIndex: 9999,
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: modalWidth,
              maxWidth: '95vw',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: 'var(--c-surface)',
              border: '1px solid var(--c-border-md)',
              borderRadius: isMobile ? 'var(--r-xl)' : 'var(--r-2xl)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
              padding,
              display: 'flex', flexDirection: 'column', gap: '1rem',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <DeviceIcon style={{ width: '14px', height: '14px', color: 'var(--c-text-3)' }} />
                <span style={{
                  fontFamily: 'var(--font-sans)', fontSize: '0.625rem', fontWeight: 600,
                  color: 'var(--c-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em',
                }}>
                  {device === 'mobile' ? 'Versión Móvil' : device === 'tablet' ? 'Versión Tablet' : 'Versión Escritorio'}
                </span>
              </div>
              <button
                onClick={handleSkip}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--c-text-3)', padding: '4px',
                  transition: 'color 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--c-text-1)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--c-text-3)')}
              >
                <X style={{ width: '16px', height: '16px' }} />
              </button>
            </div>

            {/* Progress bar */}
            <div className="progress-track">
              <motion.div
                className="progress-fill"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
              />
            </div>

            {/* Step indicator */}
            <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'center' }}>
              {TOUR_STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  style={{
                    width: i === step ? '24px' : '8px',
                    height: '8px',
                    borderRadius: '99px',
                    background: i === step ? currentStep.accentColor : i < step ? 'var(--c-green-dim)' : 'var(--c-surface-3)',
                    border: 'none', cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                />
              ))}
            </div>

            {/* Icon + Title */}
            <div style={{ textAlign: 'center' }}>
              <motion.div
                key={step}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                style={{
                  width: isMobile ? '52px' : '64px',
                  height: isMobile ? '52px' : '64px',
                  borderRadius: '16px',
                  background: `${currentStep.accentColor}18`,
                  border: `1px solid ${currentStep.accentColor}35`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 0.75rem',
                }}
              >
                <Icon style={{
                  width: isMobile ? '24px' : '28px',
                  height: isMobile ? '24px' : '28px',
                  color: currentStep.accentColor,
                }} />
              </motion.div>

              <motion.h2
                key={`title-${step}`}
                initial={{ y: 8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.25, delay: 0.15 }}
                style={{
                  fontFamily: 'var(--font-head)',
                  fontSize: isMobile ? '1.0625rem' : '1.25rem',
                  fontWeight: 800,
                  color: 'var(--c-text-1)',
                  marginBottom: '0.5rem',
                  lineHeight: 1.3,
                }}
              >
                {currentStep.title}
              </motion.h2>

              <motion.p
                key={`desc-${step}`}
                initial={{ y: 6, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.25, delay: 0.2 }}
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: isMobile ? '0.8125rem' : '0.875rem',
                  color: 'var(--c-text-2)',
                  lineHeight: 1.6,
                  maxWidth: '420px',
                  margin: '0 auto',
                }}
              >
                {currentStep.description}
              </motion.p>
            </div>

            {/* Device-specific tip */}
            <motion.div
              key={`tip-${step}-${device}`}
              initial={{ y: 6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.2, delay: 0.25 }}
              style={{
                background: 'var(--c-surface-2)',
                border: '1px solid var(--c-border)',
                borderRadius: 'var(--r-md)',
                padding: '0.75rem',
                display: 'flex', alignItems: 'flex-start', gap: '0.625rem',
              }}
            >
              <InteractionIcon style={{
                width: '16px', height: '16px',
                color: currentStep.accentColor,
                flexShrink: 0, marginTop: '1px',
              }} />
              <div>
                <span style={{
                  fontFamily: 'var(--font-sans)', fontSize: '0.625rem', fontWeight: 700,
                  color: 'var(--c-text-3)', textTransform: 'uppercase', letterSpacing: '0.07em',
                  display: 'block', marginBottom: '3px',
                }}>
                  {device === 'mobile' ? 'En tu celular' : device === 'tablet' ? 'En tu tablet' : 'En tu computadora'}
                </span>
                <span style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: isMobile ? '0.75rem' : '0.8125rem',
                  color: 'var(--c-text-2)',
                  lineHeight: 1.5,
                }}>
                  {currentStep.tips[device]}
                </span>
              </div>
            </motion.div>

            {/* Navigation buttons */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: '0.75rem', marginTop: '0.25rem',
            }}>
              {step > 0 ? (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={handlePrev}
                  style={{ gap: '0.25rem' }}
                >
                  <ChevronLeft style={{ width: '14px', height: '14px' }} />
                  Anterior
                </button>
              ) : (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={handleSkip}
                  style={{ color: 'var(--c-text-3)' }}
                >
                  Saltar tour
                </button>
              )}

              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.6875rem',
                color: 'var(--c-text-3)', fontWeight: 600,
              }}>
                {step + 1}/{TOUR_STEPS.length}
              </span>

              <button
                className={`btn ${isLast ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                onClick={handleNext}
                style={{ gap: '0.25rem' }}
              >
                {isLast ? '¡Empezar!' : 'Siguiente'}
                {!isLast && <ChevronRight style={{ width: '14px', height: '14px' }} />}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
