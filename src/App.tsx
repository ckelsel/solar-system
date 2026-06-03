import { useEffect, useMemo, useRef, useState } from 'react';
import SolarSystemScene from './components/SolarSystemScene';
import ControlPanel from './components/ControlPanel';
import { addDays } from './astro/time';
import { getCopy } from './i18n';
import type {
  CameraView,
  DisplayMode,
  GravityVisualization,
  LabelLanguage,
  ReferenceFrame,
  VisualizationSettings,
} from './types';

const displayModes: DisplayMode[] = ['realDistance', 'teaching', 'trueScale', 'sizeComparison'];
const referenceFrames: ReferenceFrame[] = ['heliocentric', 'barycentric', 'galactic'];
const cameraViews: CameraView[] = ['inner', 'outer', 'all', 'top', 'side'];
const gravityVisualizations: GravityVisualization[] = ['none', 'equipotential', 'volume', 'spatialGrid', 'lensing'];
const labelLanguages: LabelLanguage[] = ['en', 'zh'];

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function fromDateInputValue(value: string): Date {
  return new Date(`${value}T12:00:00.000Z`);
}

function getQueryValue<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  const params = new URLSearchParams(window.location.search);
  const value = params.get(key);
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function getQueryNumber(key: string, fallback: number, min: number, max: number): number {
  const params = new URLSearchParams(window.location.search);
  const value = Number(params.get(key));
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, value));
}

function getQueryDate(key: string, fallback: Date): Date {
  const params = new URLSearchParams(window.location.search);
  const value = params.get(key);
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return fallback;
  }

  const date = fromDateInputValue(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function getQueryBoolean(key: string, fallback: boolean): boolean {
  const params = new URLSearchParams(window.location.search);
  const value = params.get(key);
  if (value === null) {
    return fallback;
  }
  return value === '1' || value === 'true';
}

function App() {
  const [currentDate, setCurrentDate] = useState(() => getQueryDate('date', new Date()));
  const [displayMode, setDisplayMode] = useState<DisplayMode>(() =>
    getQueryValue('mode', displayModes, 'teaching'),
  );
  const [timeSpeedDaysPerSecond, setTimeSpeedDaysPerSecond] = useState(() =>
    getQueryNumber('speed', 10, 0, 1000),
  );
  const [cameraView, setCameraView] = useState<CameraView>(() => getQueryValue('view', cameraViews, 'all'));
  const [settings, setSettings] = useState<VisualizationSettings>({
    labelLanguage: getQueryValue('lang', labelLanguages, 'en'),
    referenceFrame: getQueryValue('frame', referenceFrames, 'heliocentric'),
    showOrbits: true,
    showEclipticGrid: true,
    showLabels: true,
    showAxes: true,
    showBarycenter: true,
    showBarycenterVector: true,
    showLagrangePoints: true,
    showMoon: true,
    showJupiterTrojan: true,
    showSunWobble: true,
    showFullSunInSizeComparison: getQueryBoolean('fullSun', false),
    prioritizeInnerPlanetsInSizeComparison: getQueryBoolean('inner', true),
    gravityVisualization: getQueryValue('gravity', gravityVisualizations, 'none'),
    planetSizeScale: 2200,
    sunWobbleScale: 120,
    inclinationScale: getQueryNumber('tilt', 1, 1, 50),
    galacticTrailYears: getQueryNumber('trail', 10, 1, 1000),
    orbitOpacity: 0.42,
  });

  const lastFrameTime = useRef<number | null>(null);
  const pendingSimulatedDays = useRef(0);

  useEffect(() => {
    let animationFrame = 0;

    const tick = (timestamp: number) => {
      if (lastFrameTime.current !== null && timeSpeedDaysPerSecond !== 0) {
        const seconds = Math.min((timestamp - lastFrameTime.current) / 1000, 0.1);
        pendingSimulatedDays.current += seconds * timeSpeedDaysPerSecond;

        // Rebuilding orbit positions through React at display-frame rate is unnecessary.
        // Batch simulation time into small steps; Three.js still renders camera and spin every frame.
        if (Math.abs(pendingSimulatedDays.current) >= 0.1) {
          const daysToApply = pendingSimulatedDays.current;
          pendingSimulatedDays.current = 0;
          setCurrentDate((date) => addDays(date, daysToApply));
        }
      }

      lastFrameTime.current = timestamp;
      animationFrame = requestAnimationFrame(tick);
    };

    lastFrameTime.current = null;
    pendingSimulatedDays.current = 0;
    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [timeSpeedDaysPerSecond]);

  const dateInputValue = useMemo(() => toDateInputValue(currentDate), [currentDate]);
  const copy = getCopy(settings.labelLanguage).app;
  const showTruthPanel = getQueryBoolean('notes', true);

  return (
    <main className="appShell">
      <ControlPanel
        currentDateInput={dateInputValue}
        displayMode={displayMode}
        settings={settings}
        timeSpeedDaysPerSecond={timeSpeedDaysPerSecond}
        onCameraViewChange={setCameraView}
        onDateChange={(value) => {
          lastFrameTime.current = null;
          pendingSimulatedDays.current = 0;
          setCurrentDate(fromDateInputValue(value));
        }}
        onDisplayModeChange={setDisplayMode}
        onSettingsChange={setSettings}
        onTimeSpeedChange={setTimeSpeedDaysPerSecond}
      />
      <SolarSystemScene
        cameraView={cameraView}
        currentDate={currentDate}
        displayMode={displayMode}
        settings={settings}
      />
      {showTruthPanel ? (
        <aside className="truthPanel" aria-label={copy.truthAria}>
          <h2>{copy.truthTitle}</h2>
          {copy.truthParagraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </aside>
      ) : null}
    </main>
  );
}

export default App;
