import type { DisplayMode, GravityVisualization, LabelLanguage, ReferenceFrame } from './types';

const bodyNamesZh: Record<string, string> = {
  Sun: '太阳',
  Mercury: '水星',
  Venus: '金星',
  Earth: '地球',
  Mars: '火星',
  Jupiter: '木星',
  Saturn: '土星',
  Uranus: '天王星',
  Neptune: '海王星',
  Moon: '月球',
};

export function bodyName(name: string, language: LabelLanguage): string {
  return language === 'zh' ? bodyNamesZh[name] ?? name : name;
}

export function localText(language: LabelLanguage, english: string, chinese: string): string {
  return language === 'zh' ? chinese : english;
}

export const uiCopy: Record<LabelLanguage, {
  app: {
    truthAria: string;
    truthTitle: string;
    truthParagraphs: string[];
  };
  control: {
    ariaLabel: string;
    title: string;
    subtitle: string;
    dateTime: string;
    setTimeSpeed: (label: string) => string;
    timeSpeed: (value: string) => string;
    timePresets: Array<{ label: string; value: number }>;
    referenceFrame: string;
    referenceFrameLabels: Record<ReferenceFrame, string>;
    referenceFrameNotes: Record<ReferenceFrame, string>;
    displayScale: string;
    displayModeLabels: Record<DisplayMode, string>;
    displayModeNotes: Record<DisplayMode, string>;
    showFullSun: string;
    prioritizeInnerPlanets: string;
    layers: string;
    layerLabels: {
      showOrbits: string;
      showEclipticGrid: string;
      showLabels: string;
      showAxes: string;
      showBarycenter: string;
      showBarycenterVector: string;
      showLagrangePoints: string;
      showMoon: string;
      showJupiterTrojan: string;
      showSunWobble: string;
    };
    layerDescriptions: {
      showOrbits: string;
      showEclipticGrid: string;
      showLabels: string;
      showAxes: string;
      showBarycenter: string;
      showBarycenterVector: string;
      showLagrangePoints: string;
      showMoon: string;
      showJupiterTrojan: string;
      showSunWobble: string;
    };
    interfaceLanguage: string;
    languageTooltip: string;
    languageLabels: Record<LabelLanguage, string>;
    gravityVisualization: string;
    gravityLabels: Record<GravityVisualization, string>;
    gravityNote: string;
    adjustments: string;
    planetSizeScale: (value: string) => string;
    sunWobbleScale: (value: string) => string;
    inclinationScale: (value: string) => string;
    galacticTrail: (value: string) => string;
    trailPreset: (years: number) => string;
    orbitOpacity: (value: string) => string;
    view: string;
    viewLabels: Record<'inner' | 'outer' | 'all' | 'top' | 'side', string>;
    viewTitles: Record<'inner' | 'outer' | 'all' | 'top' | 'side', string>;
  };
  scene: {
    ariaLabel: string;
    referenceFrameBadges: Record<ReferenceFrame, string>;
    displayModeBadges: Record<DisplayMode, string>;
    galacticTrailSuffix: string;
  };
}> = {
  en: {
    app: {
      truthAria: 'Reality notes',
      truthTitle: 'Reality Notes',
      truthParagraphs: [
        'Planetary orbits are ellipses, rotated into 3D space using the J2000 ecliptic plane, inclination, ascending node, and perihelion direction.',
        'The Sun is not absolutely fixed. When Sun wobble is enabled, its small offset relative to the solar-system barycenter is amplified by the slider.',
        'At true scale, planets are extremely small and distances are very large. True-scale mode does not enlarge radii; teaching mode does.',
        'Inclination amplification, galactic trail duration, and Moon-distance enhancement are display aids. They do not change the Keplerian orbit calculation.',
        'Gravity Visualization shows educational layers for potential, spatial compression, or light deflection. It is not four-dimensional spacetime itself and does not affect orbits.',
        'The galactic frame uses approximate solar motion at 220 km/s and keeps the current Sun position centered so the trail remains visible.',
      ],
    },
    control: {
      ariaLabel: 'Solar system control panel',
      title: '3D Solar System',
      subtitle: 'J2000 elliptical-orbit educational demo',
      dateTime: 'Date & Time',
      setTimeSpeed: (label) => `Set time speed to ${label}`,
      timeSpeed: (value) => `Time speed ${value} days/s`,
      timePresets: [
        { label: 'Pause', value: 0 },
        { label: '1 day/s', value: 1 },
        { label: '10 days/s', value: 10 },
        { label: '100 days/s', value: 100 },
        { label: '1 year/s', value: 365.25 },
        { label: '1000 days/s', value: 1000 },
      ],
      referenceFrame: 'Reference Frame',
      referenceFrameLabels: {
        heliocentric: 'Heliocentric',
        barycentric: 'Barycentric',
        galactic: 'Galactic',
      },
      referenceFrameNotes: {
        heliocentric: 'Heliocentric frame: the Sun is fixed at the origin for inspecting Keplerian orbits.',
        barycentric: 'Barycentric frame: the Sun and planets move around the solar-system barycenter.',
        galactic: 'Galactic frame: 220 km/s solar motion shows that planet paths are not closed in this frame.',
      },
      displayScale: 'Display Scale',
      displayModeLabels: {
        realDistance: 'Real Distance',
        teaching: 'Teaching',
        trueScale: 'True Scale',
        sizeComparison: 'Size Compare',
      },
      displayModeNotes: {
        realDistance: '1 AU = 100 units. Planet sizes are enhanced because true radii would be nearly invisible.',
        teaching: 'Distances use square-root compression, and planet sizes are enhanced for classroom inspection.',
        trueScale: '1 AU = 100 units. The Sun and planets use the same radius scale.',
        sizeComparison: 'Compares only Sun and planet radii. Orbits are hidden.',
      },
      showFullSun: 'Show Full Sun',
      prioritizeInnerPlanets: 'Prioritize Inner Planets',
      layers: 'Layers',
      layerLabels: {
        showOrbits: 'Show Orbits',
        showEclipticGrid: 'Show Ecliptic',
        showLabels: 'Show Labels',
        showAxes: 'Show Spin Axes',
        showBarycenter: 'Show Barycenter',
        showBarycenterVector: 'Barycenter Vector',
        showLagrangePoints: 'Sun-Earth L Points',
        showMoon: 'Real Moon System',
        showJupiterTrojan: 'Jupiter Trojans',
        showSunWobble: 'Show Sun Wobble',
      },
      layerDescriptions: {
        showOrbits: 'Shows each planet ellipse generated from Keplerian orbital elements.',
        showEclipticGrid: 'Shows the J2000 ecliptic reference grid; orbital inclinations are displayed relative to this plane.',
        showLabels: 'Shows text labels for the Sun, planets, Moon, barycenter, L points, and other markers.',
        showAxes: 'Shows planetary spin-axis direction using each planet axial tilt.',
        showBarycenter: 'Shows the solar-system barycenter computed from mass-weighted Sun and planet positions.',
        showBarycenterVector: 'Shows the vector from the Sun to the solar-system barycenter to explain Sun wobble.',
        showLagrangePoints: 'Shows Sun-Earth L1-L5; L2 is also marked as the approximate JWST region.',
        showMoon: 'Shows a simplified real Moon system: the Moon orbits Earth while Earth orbits the Sun.',
        showJupiterTrojan: 'Shows point clouds near Jupiter L4/L5, about 60 degrees ahead of and behind Jupiter.',
        showSunWobble: 'Shows the small barycentric Sun offset; the slider can amplify it for visibility.',
      },
      interfaceLanguage: 'Interface Language',
      languageTooltip: 'Switch the entire interface and celestial-body labels.',
      languageLabels: {
        en: 'English',
        zh: '中文',
      },
      gravityVisualization: 'Gravity Visualization',
      gravityLabels: {
        none: 'Off',
        equipotential: 'Equipotential',
        volume: 'Volume Field',
        spatialGrid: '3D Grid',
        lensing: 'Lensing',
      },
      gravityNote: 'Uses 3D potential, spatial-grid compression, or light-deflection layers instead of a 2D funnel. These layers do not affect orbit calculation.',
      adjustments: 'Adjustments',
      planetSizeScale: (value) => `Planet size boost x${value}`,
      sunWobbleScale: (value) => `Sun wobble boost x${value}`,
      inclinationScale: (value) => `Inclination display boost x${value}`,
      galacticTrail: (value) => `Galactic trail ${value} years`,
      trailPreset: (years) => `${years}y trail`,
      orbitOpacity: (value) => `Orbit opacity ${value}`,
      view: 'View',
      viewLabels: {
        inner: 'Inner',
        outer: 'Outer',
        all: 'All',
        top: 'Top',
        side: 'Side',
      },
      viewTitles: {
        inner: 'Inspect inner planets',
        outer: 'Inspect outer planets',
        all: 'Inspect the full Solar System',
        top: 'Top view of the ecliptic plane',
        side: 'Side view for orbital inclinations',
      },
    },
    scene: {
      ariaLabel: '3D Solar System view',
      referenceFrameBadges: {
        heliocentric: 'Heliocentric frame',
        barycentric: 'Solar-system barycentric frame',
        galactic: 'Galactic frame: current Sun centered; trail uses 220 km/s solar motion',
      },
      displayModeBadges: {
        realDistance: 'Real distance: 1 AU = 100 units; planet sizes are enhanced',
        teaching: 'Teaching scale: sqrt distance compression; planet sizes are enhanced',
        trueScale: 'True scale: distance and radius use the same scale; planets become very small',
        sizeComparison: 'True size comparison: Sun and planet radii are arranged proportionally',
      },
      galacticTrailSuffix: '; trail transverse orbit radius is enhanced to reveal the helical tube',
    },
  },
  zh: {
    app: {
      truthAria: '真实性说明',
      truthTitle: '真实性说明',
      truthParagraphs: [
        '行星轨道是椭圆，并按 J2000 黄道面、轨道倾角、升交点和近日点方向旋转到 3D 空间。',
        '太阳不是绝对静止；显示太阳摆动时，太阳相对太阳系质心的小位移已按滑块放大。',
        '真实比例下行星非常小且距离很大；真实比例模式不增强半径，教学模式才增强大小并压缩距离。',
        '轨道倾角增强、银河尾迹年限和月球距离增强都是显示辅助，不改变开普勒轨道计算。',
        '引力可视化显示重力势、空间压缩或光线偏折的教学层，不是四维时空本体，也不参与轨道计算。',
        '银河参考系用约 220 km/s 的太阳平动显示轨迹，并以当前太阳位置居中，避免视图漂出画面。',
      ],
    },
    control: {
      ariaLabel: '太阳系控制面板',
      title: '3D 太阳系',
      subtitle: 'J2000 椭圆轨道教学演示',
      dateTime: '日期与时间',
      setTimeSpeed: (label) => `设置时间速度为 ${label}`,
      timeSpeed: (value) => `时间速度 ${value} 天/秒`,
      timePresets: [
        { label: '暂停', value: 0 },
        { label: '1天/秒', value: 1 },
        { label: '10天/秒', value: 10 },
        { label: '100天/秒', value: 100 },
        { label: '1年/秒', value: 365.25 },
        { label: '1000天/秒', value: 1000 },
      ],
      referenceFrame: '参考系',
      referenceFrameLabels: {
        heliocentric: '日心',
        barycentric: '质心',
        galactic: '银河',
      },
      referenceFrameNotes: {
        heliocentric: '日心参考系：太阳固定在原点，便于观察开普勒轨道。',
        barycentric: '质心参考系：太阳和行星共同围绕太阳系质心运动。',
        galactic: '银河参考系：用 220 km/s 太阳平动显示行星的非闭合轨迹。',
      },
      displayScale: '显示比例',
      displayModeLabels: {
        realDistance: '真实距离',
        teaching: '教学压缩',
        trueScale: '真实比例',
        sizeComparison: '大小对比',
      },
      displayModeNotes: {
        realDistance: '1 AU = 100 units；行星大小已增强，否则多数行星几乎不可见。',
        teaching: '距离使用平方根压缩，行星大小增强用于课堂观察。',
        trueScale: '1 AU = 100 units；太阳和行星半径也使用同一真实比例。',
        sizeComparison: '只比较太阳和行星半径，不显示轨道。',
      },
      showFullSun: '完整显示太阳',
      prioritizeInnerPlanets: '优先显示内行星',
      layers: '图层',
      layerLabels: {
        showOrbits: '显示轨道',
        showEclipticGrid: '显示黄道面',
        showLabels: '显示标签',
        showAxes: '显示自转轴',
        showBarycenter: '显示质心',
        showBarycenterVector: '质心向量',
        showLagrangePoints: '地日拉格朗日点',
        showMoon: '真实月球系统',
        showJupiterTrojan: '木星特洛伊群',
        showSunWobble: '显示太阳摆动',
      },
      layerDescriptions: {
        showOrbits: '显示每颗行星按开普勒方程生成的椭圆轨道线。',
        showEclipticGrid: '显示 J2000 黄道面参考网格；行星轨道倾角相对这个平面展示。',
        showLabels: '显示太阳、行星、月球、质心、L 点等文字标签。',
        showAxes: '显示行星自转轴方向；轴倾角按行星自转轴倾角设置。',
        showBarycenter: '显示太阳系质心位置。质心由太阳和行星质量、位置加权计算。',
        showBarycenterVector: '显示从太阳指向太阳系质心的向量，用于解释太阳摆动。',
        showLagrangePoints: '显示地日系统 L1-L5；L2 同时标注 JWST 所在的近似区域。',
        showMoon: '显示简化真实月球系统：月球绕地球运动，地球同时绕太阳运动。',
        showJupiterTrojan: '显示木星轨道前后约 60° 的特洛伊小行星群 L4/L5 点云。',
        showSunWobble: '在质心参考系下显示太阳相对质心的小幅摆动，可用滑块放大。',
      },
      interfaceLanguage: '界面语言',
      languageTooltip: '切换整个界面和天体名称显示语言。',
      languageLabels: {
        en: 'English',
        zh: '中文',
      },
      gravityVisualization: '引力可视化',
      gravityLabels: {
        none: '关闭',
        equipotential: '等势面',
        volume: '体积场',
        spatialGrid: '3D网格',
        lensing: '引力透镜',
      },
      gravityNote: '用三维势场、网格压缩或光线偏折示意替代二维漏斗；这些层不参与轨道计算。',
      adjustments: '调节',
      planetSizeScale: (value) => `行星大小增强 x${value}`,
      sunWobbleScale: (value) => `太阳摆动增强 x${value}`,
      inclinationScale: (value) => `轨道倾角显示增强 x${value}`,
      galacticTrail: (value) => `银河尾迹 ${value} 年`,
      trailPreset: (years) => `${years}年尾迹`,
      orbitOpacity: (value) => `轨道线透明度 ${value}`,
      view: '视角',
      viewLabels: {
        inner: '内行星',
        outer: '外行星',
        all: '全太阳系',
        top: '俯视',
        side: '侧视',
      },
      viewTitles: {
        inner: '看内行星',
        outer: '看外行星',
        all: '看全太阳系',
        top: '俯视黄道面',
        side: '侧视轨道倾角',
      },
    },
    scene: {
      ariaLabel: '3D 太阳系视图',
      referenceFrameBadges: {
        heliocentric: '日心参考系',
        barycentric: '太阳系质心参考系',
        galactic: '银河参考系：当前太阳居中，轨迹按太阳 220 km/s 平动计算',
      },
      displayModeBadges: {
        realDistance: '真实距离：1 AU = 100 units；行星大小已增强',
        teaching: '教学比例：距离 sqrt 压缩；行星大小已增强',
        trueScale: '真实比例：距离和半径使用同一比例，行星会非常小',
        sizeComparison: '真实大小对比：太阳与行星半径按比例排列',
      },
      galacticTrailSuffix: '；银河尾迹的绕日横向半径已增强以显示螺旋管',
    },
  },
};

export function getCopy(language: LabelLanguage) {
  return uiCopy[language];
}
