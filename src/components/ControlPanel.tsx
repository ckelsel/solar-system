import { CalendarDays, Compass, Eye, FastForward, Gauge, Orbit, Pause, Ruler, Sun } from 'lucide-react';
import { getCopy } from '../i18n';
import type {
  CameraView,
  DisplayMode,
  GravityVisualization,
  LabelLanguage,
  ReferenceFrame,
  VisualizationSettings,
} from '../types';

interface ControlPanelProps {
  currentDateInput: string;
  displayMode: DisplayMode;
  settings: VisualizationSettings;
  timeSpeedDaysPerSecond: number;
  onCameraViewChange: (view: CameraView) => void;
  onDateChange: (value: string) => void;
  onDisplayModeChange: (mode: DisplayMode) => void;
  onSettingsChange: (settings: VisualizationSettings) => void;
  onTimeSpeedChange: (daysPerSecond: number) => void;
}

const jumpYears = [1900, 1950, 2000, 2050, 2100];
const referenceFrames: ReferenceFrame[] = ['heliocentric', 'barycentric', 'galactic'];
const displayModes: DisplayMode[] = ['realDistance', 'teaching', 'trueScale', 'sizeComparison'];
const gravityModes: GravityVisualization[] = ['none', 'equipotential', 'volume', 'spatialGrid', 'lensing'];
const cameraViews: CameraView[] = ['inner', 'outer', 'all', 'top', 'side'];
const languageOptions: LabelLanguage[] = ['en', 'zh'];

function Toggle({
  checked,
  description,
  label,
  onChange,
}: {
  checked: boolean;
  description?: string;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="toggle" title={description}>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function ControlPanel({
  currentDateInput,
  displayMode,
  settings,
  timeSpeedDaysPerSecond,
  onCameraViewChange,
  onDateChange,
  onDisplayModeChange,
  onSettingsChange,
  onTimeSpeedChange,
}: ControlPanelProps) {
  const copy = getCopy(settings.labelLanguage).control;
  const updateSetting = <K extends keyof VisualizationSettings>(
    key: K,
    value: VisualizationSettings[K],
  ) => onSettingsChange({ ...settings, [key]: value });

  return (
    <aside className="controlPanel" aria-label={copy.ariaLabel}>
      <div className="brandRow">
        <Sun aria-hidden="true" />
        <div>
          <h1>{copy.title}</h1>
          <p>{copy.subtitle}</p>
        </div>
      </div>

      <section>
        <h2>
          <CalendarDays aria-hidden="true" />
          {copy.dateTime}
        </h2>
        <input
          className="field"
          type="date"
          value={currentDateInput}
          onChange={(event) => onDateChange(event.target.value)}
        />
        <div className="buttonGrid">
          {copy.timePresets.map((preset) => (
            <button
              className={timeSpeedDaysPerSecond === preset.value ? 'active' : ''}
              key={preset.value}
              type="button"
              onClick={() => onTimeSpeedChange(preset.value)}
              title={copy.setTimeSpeed(preset.label)}
            >
              {preset.value === 0 ? <Pause aria-hidden="true" /> : <FastForward aria-hidden="true" />}
              {preset.label}
            </button>
          ))}
        </div>
        <label className="sliderLabel">
          <span>{copy.timeSpeed(timeSpeedDaysPerSecond.toFixed(1))}</span>
          <input
            type="range"
            min="0"
            max="1000"
            step="0.25"
            value={timeSpeedDaysPerSecond}
            onChange={(event) => onTimeSpeedChange(Number(event.target.value))}
          />
        </label>
        <div className="yearJumpGrid">
          {jumpYears.map((year) => (
            <button key={year} type="button" onClick={() => onDateChange(`${year}-01-01`)}>
              {year}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2>
          <Compass aria-hidden="true" />
          {copy.referenceFrame}
        </h2>
        <div className="segmented">
          {referenceFrames.map((frame) => (
            <button
              className={settings.referenceFrame === frame ? 'active' : ''}
              key={frame}
              type="button"
              onClick={() => updateSetting('referenceFrame', frame)}
            >
              {copy.referenceFrameLabels[frame]}
            </button>
          ))}
        </div>
        <p className="note">{copy.referenceFrameNotes[settings.referenceFrame]}</p>
      </section>

      <section>
        <h2>
          <Ruler aria-hidden="true" />
          {copy.displayScale}
        </h2>
        <div className="modeGrid">
          {displayModes.map((mode) => (
            <button
              className={displayMode === mode ? 'active' : ''}
              key={mode}
              type="button"
              onClick={() => onDisplayModeChange(mode)}
            >
              {copy.displayModeLabels[mode]}
            </button>
          ))}
        </div>
        <p className="note">{copy.displayModeNotes[displayMode]}</p>
        {displayMode === 'sizeComparison' ? (
          <div className="modeOptions">
            <Toggle
              checked={settings.showFullSunInSizeComparison}
              label={copy.showFullSun}
              onChange={(value) => updateSetting('showFullSunInSizeComparison', value)}
            />
            <Toggle
              checked={settings.prioritizeInnerPlanetsInSizeComparison}
              label={copy.prioritizeInnerPlanets}
              onChange={(value) => updateSetting('prioritizeInnerPlanetsInSizeComparison', value)}
            />
          </div>
        ) : null}
      </section>

      <section>
        <h2>
          <Eye aria-hidden="true" />
          {copy.layers}
        </h2>
        <div className="toggleGrid">
          <Toggle
            checked={settings.showOrbits}
            description={copy.layerDescriptions.showOrbits}
            label={copy.layerLabels.showOrbits}
            onChange={(value) => updateSetting('showOrbits', value)}
          />
          <Toggle
            checked={settings.showEclipticGrid}
            description={copy.layerDescriptions.showEclipticGrid}
            label={copy.layerLabels.showEclipticGrid}
            onChange={(value) => updateSetting('showEclipticGrid', value)}
          />
          <Toggle
            checked={settings.showLabels}
            description={copy.layerDescriptions.showLabels}
            label={copy.layerLabels.showLabels}
            onChange={(value) => updateSetting('showLabels', value)}
          />
          <Toggle
            checked={settings.showAxes}
            description={copy.layerDescriptions.showAxes}
            label={copy.layerLabels.showAxes}
            onChange={(value) => updateSetting('showAxes', value)}
          />
          <Toggle
            checked={settings.showBarycenter}
            description={copy.layerDescriptions.showBarycenter}
            label={copy.layerLabels.showBarycenter}
            onChange={(value) => updateSetting('showBarycenter', value)}
          />
          <Toggle
            checked={settings.showBarycenterVector}
            description={copy.layerDescriptions.showBarycenterVector}
            label={copy.layerLabels.showBarycenterVector}
            onChange={(value) => updateSetting('showBarycenterVector', value)}
          />
          <Toggle
            checked={settings.showLagrangePoints}
            description={copy.layerDescriptions.showLagrangePoints}
            label={copy.layerLabels.showLagrangePoints}
            onChange={(value) => updateSetting('showLagrangePoints', value)}
          />
          <Toggle
            checked={settings.showMoon}
            description={copy.layerDescriptions.showMoon}
            label={copy.layerLabels.showMoon}
            onChange={(value) => updateSetting('showMoon', value)}
          />
          <Toggle
            checked={settings.showJupiterTrojan}
            description={copy.layerDescriptions.showJupiterTrojan}
            label={copy.layerLabels.showJupiterTrojan}
            onChange={(value) => updateSetting('showJupiterTrojan', value)}
          />
          <Toggle
            checked={settings.showSunWobble}
            description={copy.layerDescriptions.showSunWobble}
            label={copy.layerLabels.showSunWobble}
            onChange={(value) => updateSetting('showSunWobble', value)}
          />
        </div>
        <div className="languageControl">
          <span>{copy.interfaceLanguage}</span>
          <div className="segmented compactSegmented">
            {languageOptions.map((language) => (
              <button
                className={settings.labelLanguage === language ? 'active' : ''}
                key={language}
                type="button"
                onClick={() => updateSetting('labelLanguage', language)}
                title={copy.languageTooltip}
              >
                {copy.languageLabels[language]}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h2>
          <Orbit aria-hidden="true" />
          {copy.gravityVisualization}
        </h2>
        <div className="gravityGrid">
          {gravityModes.map((mode) => (
            <button
              className={settings.gravityVisualization === mode ? 'active' : ''}
              key={mode}
              type="button"
              onClick={() => updateSetting('gravityVisualization', mode)}
            >
              {copy.gravityLabels[mode]}
            </button>
          ))}
        </div>
        <p className="note">{copy.gravityNote}</p>
      </section>

      <section>
        <h2>
          <Gauge aria-hidden="true" />
          {copy.adjustments}
        </h2>
        <label className="sliderLabel">
          <span>{copy.planetSizeScale(settings.planetSizeScale.toFixed(0))}</span>
          <input
            type="range"
            min="1"
            max="5000"
            step="10"
            value={settings.planetSizeScale}
            onChange={(event) => updateSetting('planetSizeScale', Number(event.target.value))}
          />
        </label>
        <label className="sliderLabel">
          <span>{copy.sunWobbleScale(settings.sunWobbleScale.toFixed(0))}</span>
          <input
            type="range"
            min="1"
            max="500"
            step="1"
            value={settings.sunWobbleScale}
            onChange={(event) => updateSetting('sunWobbleScale', Number(event.target.value))}
          />
        </label>
        <label className="sliderLabel">
          <span>{copy.inclinationScale(settings.inclinationScale.toFixed(0))}</span>
          <input
            type="range"
            min="1"
            max="50"
            step="1"
            value={settings.inclinationScale}
            onChange={(event) => updateSetting('inclinationScale', Number(event.target.value))}
          />
        </label>
        <label className="sliderLabel">
          <span>{copy.galacticTrail(settings.galacticTrailYears.toFixed(0))}</span>
          <input
            type="range"
            min="1"
            max="1000"
            step="1"
            value={settings.galacticTrailYears}
            onChange={(event) => updateSetting('galacticTrailYears', Number(event.target.value))}
          />
        </label>
        <div className="buttonGrid">
          {[1, 10, 100, 1000].map((years) => (
            <button
              className={settings.galacticTrailYears === years ? 'active' : ''}
              key={years}
              type="button"
              onClick={() => updateSetting('galacticTrailYears', years)}
            >
              {copy.trailPreset(years)}
            </button>
          ))}
        </div>
        <label className="sliderLabel">
          <span>{copy.orbitOpacity(settings.orbitOpacity.toFixed(2))}</span>
          <input
            type="range"
            min="0.05"
            max="1"
            step="0.01"
            value={settings.orbitOpacity}
            onChange={(event) => updateSetting('orbitOpacity', Number(event.target.value))}
          />
        </label>
      </section>

      <section>
        <h2>
          <Orbit aria-hidden="true" />
          {copy.view}
        </h2>
        <div className="buttonGrid">
          {cameraViews.map((view) => (
            <button
              key={view}
              type="button"
              onClick={() => onCameraViewChange(view)}
              title={copy.viewTitles[view]}
            >
              {copy.viewLabels[view]}
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}

export default ControlPanel;
