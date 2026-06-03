export type DisplayMode = 'realDistance' | 'teaching' | 'trueScale' | 'sizeComparison';

export type CameraView = 'inner' | 'outer' | 'all' | 'top' | 'side';

export type ReferenceFrame = 'heliocentric' | 'barycentric' | 'galactic';

export type GravityVisualization = 'none' | 'equipotential' | 'volume' | 'spatialGrid' | 'lensing';

export type LabelLanguage = 'zh' | 'en';

export interface VisualizationSettings {
  labelLanguage: LabelLanguage;
  referenceFrame: ReferenceFrame;
  showOrbits: boolean;
  showEclipticGrid: boolean;
  showLabels: boolean;
  showAxes: boolean;
  showBarycenter: boolean;
  showBarycenterVector: boolean;
  showLagrangePoints: boolean;
  showMoon: boolean;
  showJupiterTrojan: boolean;
  showSunWobble: boolean;
  showFullSunInSizeComparison: boolean;
  prioritizeInnerPlanetsInSizeComparison: boolean;
  gravityVisualization: GravityVisualization;
  planetSizeScale: number;
  sunWobbleScale: number;
  inclinationScale: number;
  galacticTrailYears: number;
  orbitOpacity: number;
}
