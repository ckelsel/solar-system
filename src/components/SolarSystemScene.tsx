import { useEffect, useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { PLANET_ELEMENTS, SUN_MASS_KG, SUN_RADIUS_KM } from '../data/planetElements';
import { getMoonGeocentricPositionAU, getMoonOrbitPointsAU } from '../astro/moon';
import { dateToJulianDate } from '../astro/time';
import { bodyName, getCopy, localText } from '../i18n';
import {
  calculateBarycenter,
  getHeliocentricPositionAU,
  getOrbitalElementsAtDate,
  getOrbitPointsAU,
  type Vector3AU,
} from '../astro/orbit';
import type { CameraView, DisplayMode, LabelLanguage, VisualizationSettings } from '../types';

const AU_KM = 149_597_870.7;
const J2000_JD = 2_451_545.0;
const REAL_DISTANCE_UNITS_PER_AU = 100;
const TEACHING_DISTANCE_K = 150;
const GALACTIC_UNITS_PER_AU = 4;
const GALACTIC_TARGET_TRAIL_UNITS = 1900;
const GALACTIC_TRAIL_ORBIT_ENHANCEMENT = 36;
const GALACTIC_SUN_SPEED_KM_PER_S = 220;
const GALACTIC_SUN_SPEED_AU_PER_DAY = (GALACTIC_SUN_SPEED_KM_PER_S * 86_400) / AU_KM;
const SIZE_COMPARISON_MIN_RADIUS_UNITS = 1.15;
const SIZE_COMPARISON_SUN_RADIUS_UNITS = 150;
const SIZE_COMPARISON_FULL_SUN_RADIUS_UNITS = 72;
const EARTH_MIN_VISIBLE_RADIUS_UNITS = 1.05;
const MOON_MIN_VISIBLE_RADIUS_UNITS = 0.5;

interface SolarSystemSceneProps {
  cameraView: CameraView;
  currentDate: Date;
  displayMode: DisplayMode;
  settings: VisualizationSettings;
}

interface SpinBody {
  mesh: THREE.Mesh;
  rotationPeriodHours: number;
}

function bodyLabel(name: string, language: LabelLanguage): string {
  return bodyName(name, language);
}

function textLabel(english: string, chinese: string, language: LabelLanguage): string {
  return localText(language, english, chinese);
}

function magnitude(vector: Vector3AU): number {
  return Math.sqrt(vector.x ** 2 + vector.y ** 2 + vector.z ** 2);
}

function scaleVector(vector: Vector3AU, scale: number): THREE.Vector3 {
  return new THREE.Vector3(vector.x * scale, vector.y * scale, vector.z * scale);
}

function displayPosition(
  vector: Vector3AU,
  displayMode: DisplayMode,
  galacticFrame = false,
  galacticUnitsPerAU = GALACTIC_UNITS_PER_AU,
): THREE.Vector3 {
  if (galacticFrame) {
    return scaleVector(vector, galacticUnitsPerAU);
  }

  if (displayMode === 'realDistance' || displayMode === 'trueScale') {
    return scaleVector(vector, REAL_DISTANCE_UNITS_PER_AU);
  }

  const distance = magnitude(vector);
  if (distance === 0) {
    return new THREE.Vector3(0, 0, 0);
  }

  // Teaching mode compresses distance by sqrt(r) while preserving 3D orbital direction.
  const scaledDistance = TEACHING_DISTANCE_K * Math.sqrt(distance);
  return scaleVector(vector, scaledDistance / distance);
}

function addAU(a: Vector3AU, b: Vector3AU): Vector3AU {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function subtractAU(a: Vector3AU, b: Vector3AU): Vector3AU {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function multiplyAU(vector: Vector3AU, scalar: number): Vector3AU {
  return { x: vector.x * scalar, y: vector.y * scalar, z: vector.z * scalar };
}

function normalizeAU(vector: Vector3AU): Vector3AU {
  const length = magnitude(vector);
  if (length === 0) {
    return { x: 0, y: 0, z: 0 };
  }
  return multiplyAU(vector, 1 / length);
}

function rotateAroundEclipticZ(vector: Vector3AU, angleRad: number): Vector3AU {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  return {
    x: vector.x * cos - vector.y * sin,
    y: vector.x * sin + vector.y * cos,
    z: vector.z,
  };
}

function applyInclinationScale(vector: Vector3AU, inclinationScale: number): Vector3AU {
  return { x: vector.x, y: vector.y, z: vector.z * inclinationScale };
}

function getGalacticUnitsPerAU(trailYears: number): number {
  const trailAU = Math.max(1, trailYears * 365.25 * GALACTIC_SUN_SPEED_AU_PER_DAY);
  return Math.min(GALACTIC_UNITS_PER_AU, GALACTIC_TARGET_TRAIL_UNITS / trailAU);
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if (child instanceof CSS2DObject) {
      child.element.remove();
    }

    const mesh = child as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(material)) {
      material.forEach((item) => item.dispose());
    } else if (material) {
      material.dispose();
    }
  });
}

function createLabel(text: string, className = '', description?: string) {
  const element = document.createElement('div');
  element.className = `spaceLabel ${className}`.trim();
  element.textContent = text;
  if (description) {
    element.title = description;
  }
  return new CSS2DObject(element);
}

function createBodyLabel(
  name: string,
  realRadiusKm: number,
  trueRadiusUnits: number,
  displayRadiusUnits: number,
  language: LabelLanguage,
) {
  const element = document.createElement('div');
  element.className = 'spaceLabel bodyLabel';

  const title = document.createElement('span');
  title.textContent = name;
  element.appendChild(title);

  const tooltip = document.createElement('span');
  tooltip.className = 'bodyTooltip';
  const scaleFactor = trueRadiusUnits > 0 ? displayRadiusUnits / trueRadiusUnits : 1;
  tooltip.innerHTML = [
    `<strong>${name}</strong>`,
    `${textLabel('Real Radius', '真实半径', language)}: ${realRadiusKm.toLocaleString()} km`,
    `${textLabel('Display Radius', '显示半径', language)}: ${displayRadiusUnits.toFixed(2)} units`,
    `${textLabel('Scale Factor', '显示放大倍数', language)}: ${scaleFactor.toFixed(2)}x`,
  ].join('<br />');
  element.appendChild(tooltip);

  return new CSS2DObject(element);
}

function getSizeComparisonSunRadius(showFullSun: boolean) {
  return showFullSun ? SIZE_COMPARISON_FULL_SUN_RADIUS_UNITS : SIZE_COMPARISON_SUN_RADIUS_UNITS;
}

function getSizeComparisonSunPosition(showFullSun: boolean, prioritizeInnerPlanets: boolean) {
  if (showFullSun) {
    return new THREE.Vector3(-58, 0, 0);
  }
  return new THREE.Vector3(prioritizeInnerPlanets ? -112 : -82, 0, 0);
}

function getSizeComparisonPlanetPosition(
  index: number,
  sunPosition: THREE.Vector3,
  sunRadius: number,
  prioritizeInnerPlanets: boolean,
) {
  const innerPriorityOffsets = [12, 30, 51, 74, 113, 158, 199, 235];
  const fullLineOffsets = [14, 39, 70, 103, 148, 198, 248, 292];
  const offsets = prioritizeInnerPlanets ? innerPriorityOffsets : fullLineOffsets;
  return new THREE.Vector3(sunPosition.x + sunRadius + offsets[index], 0, 0);
}

function createAxis(radius: number, axialTiltDeg: number) {
  const tilt = THREE.MathUtils.degToRad(axialTiltDeg);
  const axis = new THREE.Vector3(0, Math.sin(tilt), Math.cos(tilt)).normalize();
  const points = [axis.clone().multiplyScalar(-radius * 1.7), axis.clone().multiplyScalar(radius * 1.7)];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color: '#e8f4ff', transparent: true, opacity: 0.72 });
  return new THREE.Line(geometry, material);
}

function positionBodyLabel(label: CSS2DObject, radius: number) {
  label.center.set(0, 0.5);
  label.position.set(radius * 1.45 + 0.8, 0, radius * 1.2 + 0.8);
}

function createVisibilityHalo(radius: number, color: string) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.45, 24, 16),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      side: THREE.BackSide,
    }),
  );
}

function createGravityEquipotentialShells(sunPosition: THREE.Vector3, size: number, language: LabelLanguage) {
  const group = new THREE.Group();
  group.position.copy(sunPosition);
  const radii = [size * 0.045, size * 0.075, size * 0.125, size * 0.2];

  radii.forEach((radius, index) => {
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 48, 24),
      new THREE.MeshBasicMaterial({
        color: ['#ffe08a', '#ffbc6b', '#f2784b', '#a95cff'][index],
        wireframe: true,
        transparent: true,
        opacity: 0.18 - index * 0.025,
        depthWrite: false,
      }),
    );
    group.add(shell);

    const label = createLabel(
      textLabel(`V ∝ -1/r  level ${index + 1}`, `V ∝ -1/r  等势层 ${index + 1}`, language),
      'gravityLabel',
    );
    label.position.set(radius * 0.72, -radius * 0.42, radius * 0.18);
    group.add(label);
  });

  return group;
}

function createGravityVolumeField(sunPosition: THREE.Vector3, size: number) {
  const group = new THREE.Group();
  group.position.copy(sunPosition);

  [
    { radius: size * 0.055, color: '#ffdd74', opacity: 0.2 },
    { radius: size * 0.105, color: '#ff8d55', opacity: 0.11 },
    { radius: size * 0.18, color: '#b268ff', opacity: 0.07 },
    { radius: size * 0.3, color: '#4f8cff', opacity: 0.035 },
  ].forEach(({ radius, color, opacity }) => {
    group.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(radius, 48, 24),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      ),
    );
  });

  return group;
}

function distortGravityGridPoint(point: THREE.Vector3, size: number) {
  const r = point.length();
  if (r === 0) {
    return point.clone();
  }

  const compression = 0.24 * Math.exp(-r / (size * 0.18));
  return point.clone().multiplyScalar(1 - compression);
}

function createGravitySpatialGrid(sunPosition: THREE.Vector3, size: number) {
  const group = new THREE.Group();
  group.position.copy(sunPosition);
  const linePositions: number[] = [];
  const extent = size * 0.32;
  const divisions = 8;
  const samples = 36;

  const addLine = (start: THREE.Vector3, end: THREE.Vector3) => {
    for (let sample = 0; sample < samples; sample += 1) {
      const a = start.clone().lerp(end, sample / samples);
      const b = start.clone().lerp(end, (sample + 1) / samples);
      const da = distortGravityGridPoint(a, size);
      const db = distortGravityGridPoint(b, size);
      linePositions.push(da.x, da.y, da.z, db.x, db.y, db.z);
    }
  };

  for (let i = 0; i <= divisions; i += 1) {
    const a = -extent + (i / divisions) * extent * 2;
    for (let j = 0; j <= divisions; j += 1) {
      const b = -extent + (j / divisions) * extent * 2;
      addLine(new THREE.Vector3(-extent, a, b), new THREE.Vector3(extent, a, b));
      addLine(new THREE.Vector3(a, -extent, b), new THREE.Vector3(a, extent, b));
      addLine(new THREE.Vector3(a, b, -extent), new THREE.Vector3(a, b, extent));
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
  group.add(
    new THREE.LineSegments(
      geometry,
      new THREE.LineBasicMaterial({
        color: '#7dd3ff',
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
      }),
    ),
  );

  return group;
}

function createGravityLensingLayer(sunPosition: THREE.Vector3, size: number, language: LabelLanguage) {
  const group = new THREE.Group();
  group.position.copy(sunPosition);
  const material = new THREE.LineBasicMaterial({
    color: '#cdd8ff',
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
  });

  [0.07, 0.105, 0.15].forEach((scale, ringIndex) => {
    const radius = size * scale;
    for (let arc = 0; arc < 6; arc += 1) {
      const points: THREE.Vector3[] = [];
      const start = arc * (Math.PI / 3) + ringIndex * 0.18;
      const span = Math.PI / 6;
      for (let i = 0; i <= 24; i += 1) {
        const angle = start + (i / 24) * span;
        points.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, ringIndex * 1.4));
      }
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material));
    }
  });

  const label = createLabel(
    textLabel(
      'Gravitational lensing: light deflection exaggerated',
      '引力透镜：光线偏折已夸张显示',
      language,
    ),
    'gravityLabel',
  );
  label.position.set(size * 0.12, size * 0.08, size * 0.035);
  group.add(label);

  return group;
}

function createStarField() {
  const geometry = new THREE.BufferGeometry();
  const positions: number[] = [];

  for (let index = 0; index < 1200; index += 1) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
    const radius = THREE.MathUtils.randFloat(1800, 3600);
    positions.push(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.sin(phi) * Math.sin(theta),
      radius * Math.cos(phi),
    );
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({ color: '#f6fbff', size: 2, sizeAttenuation: true, opacity: 0.52, transparent: true }),
  );
}

function getSceneRadius(displayMode: DisplayMode) {
  if (displayMode === 'realDistance' || displayMode === 'trueScale') {
    return 3200;
  }
  if (displayMode === 'sizeComparison') {
    return 90;
  }
  return 920;
}

function SolarSystemScene({ cameraView, currentDate, displayMode, settings }: SolarSystemSceneProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const labelRendererRef = useRef<CSS2DRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const contentGroupRef = useRef<THREE.Group | null>(null);
  const spinBodiesRef = useRef<SpinBody[]>([]);

  useLayoutEffect(() => {
    if (!mountRef.current) {
      return;
    }

    const mount = mountRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#05070b');
    scene.add(createStarField());

    const camera = new THREE.PerspectiveCamera(48, mount.clientWidth / mount.clientHeight, 0.1, 9000);
    camera.up.set(0, 0, 1);
    camera.position.set(720, -820, 520);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(mount.clientWidth, mount.clientHeight);
    labelRenderer.domElement.className = 'labelLayer';
    mount.appendChild(labelRenderer.domElement);

    const controls = new OrbitControls(camera, labelRenderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxDistance = 6500;
    controls.target.set(0, 0, 0);

    scene.add(new THREE.AmbientLight('#ffffff', 0.18));

    const contentGroup = new THREE.Group();
    scene.add(contentGroup);

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    labelRendererRef.current = labelRenderer;
    controlsRef.current = controls;
    contentGroupRef.current = contentGroup;

    let previousTime = performance.now();
    let animationFrame = 0;

    const animate = (time: number) => {
      const deltaSeconds = Math.min((time - previousTime) / 1000, 0.05);
      previousTime = time;

      spinBodiesRef.current.forEach(({ mesh, rotationPeriodHours }) => {
        const sign = rotationPeriodHours < 0 ? -1 : 1;
        const periodDays = Math.max(Math.abs(rotationPeriodHours) / 24, 0.1);
        mesh.rotation.z += sign * deltaSeconds * (Math.PI * 2) * (0.2 / periodDays);
      });

      controls.update();
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);

    const resize = () => {
      if (!mountRef.current) {
        return;
      }
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      labelRenderer.setSize(width, height);
    };

    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', resize);
      controls.dispose();
      disposeObject(scene);
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      mount.removeChild(labelRenderer.domElement);
    };
  }, []);

  useLayoutEffect(() => {
    const scene = sceneRef.current;
    const group = contentGroupRef.current;
    if (!scene || !group) {
      return;
    }

    group.children.forEach((child) => disposeObject(child));
    group.clear();
    spinBodiesRef.current = [];

    const jd = dateToJulianDate(currentDate);
    const datedElements = PLANET_ELEMENTS.map((planet) => getOrbitalElementsAtDate(planet, jd));
    const heliocentricPositions = datedElements.map(getHeliocentricPositionAU);
    const masses = PLANET_ELEMENTS.map((planet) => planet.massKg);
    const barycenterAU = calculateBarycenter(heliocentricPositions, masses, SUN_MASS_KG);
    const isGalacticFrame = settings.referenceFrame === 'galactic';
    const galacticUnitsPerAU = getGalacticUnitsPerAU(settings.galacticTrailYears);
    const displayAU = (positionAU: Vector3AU) =>
      displayPosition(
        applyInclinationScale(positionAU, settings.inclinationScale),
        displayMode,
        isGalacticFrame,
        galacticUnitsPerAU,
      );

    const weightedPlanetOffsetAU = heliocentricPositions.reduce<Vector3AU>(
      (sum, position, index) => ({
        x: sum.x + (position.x * masses[index]) / SUN_MASS_KG,
        y: sum.y + (position.y * masses[index]) / SUN_MASS_KG,
        z: sum.z + (position.z * masses[index]) / SUN_MASS_KG,
      }),
      { x: 0, y: 0, z: 0 },
    );
    // In barycentric mode the Sun is offset by -Σ(m_planet * r_planet) / M_sun.
    const trueSunOffsetAU = {
      x: -weightedPlanetOffsetAU.x,
      y: -weightedPlanetOffsetAU.y,
      z: -weightedPlanetOffsetAU.z,
    };
    const visualSunOffsetAU =
      settings.referenceFrame === 'barycentric'
        ? settings.showSunWobble
          ? multiplyAU(trueSunOffsetAU, settings.sunWobbleScale)
          : trueSunOffsetAU
        : { x: 0, y: 0, z: 0 };
    const sizeComparisonSunRadius = getSizeComparisonSunRadius(settings.showFullSunInSizeComparison);
    const sizeComparisonSunPosition = getSizeComparisonSunPosition(
      settings.showFullSunInSizeComparison,
      settings.prioritizeInnerPlanetsInSizeComparison,
    );
    const sunDisplayPosition =
      displayMode === 'sizeComparison'
        ? sizeComparisonSunPosition
        : displayAU(visualSunOffsetAU);

    if (settings.showEclipticGrid && displayMode !== 'sizeComparison') {
      const grid = new THREE.GridHelper(getSceneRadius(displayMode) * 2, 32, '#52616c', '#26313a');
      grid.rotateX(Math.PI / 2);
      const material = grid.material as THREE.Material;
      material.transparent = true;
      material.opacity = 0.28;
      group.add(grid);
    }

    const sunGroup = new THREE.Group();
    sunGroup.position.copy(sunDisplayPosition);
    const trueSunRadius =
      (SUN_RADIUS_KM / AU_KM) * (isGalacticFrame ? galacticUnitsPerAU : REAL_DISTANCE_UNITS_PER_AU);
    const sunRadius =
      displayMode === 'sizeComparison'
        ? sizeComparisonSunRadius
        : displayMode === 'trueScale'
          ? trueSunRadius
          : displayMode === 'realDistance'
            ? 3.2
            : 5.8;
    const sunMaterial = new THREE.MeshBasicMaterial({ color: '#fff2a8' });
    const sun = new THREE.Mesh(new THREE.SphereGeometry(sunRadius, 48, 32), sunMaterial);
    sunGroup.add(sun);
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(sunRadius * 1.35, 48, 32),
      new THREE.MeshBasicMaterial({ color: '#ffb84a', transparent: true, opacity: 0.18, depthWrite: false }),
    );
    sunGroup.add(glow);
    const pointLight = new THREE.PointLight('#fff3ca', 2.4, 0, 1.8);
    pointLight.position.copy(sunGroup.position);
    group.add(pointLight);
    if (settings.showLabels) {
      const sunName = bodyLabel('Sun', settings.labelLanguage);
      const label =
        displayMode === 'sizeComparison'
          ? createBodyLabel(sunName, SUN_RADIUS_KM, sunRadius, sunRadius, settings.labelLanguage)
          : createLabel(
              settings.referenceFrame === 'barycentric' && settings.showSunWobble
                ? textLabel('Sun (wobble exaggerated)', '太阳（摆动已放大）', settings.labelLanguage)
                : sunName,
              'sunLabel',
            );
      label.position.set(0, 0, sunRadius * 1.55);
      sunGroup.add(label);
    }
    group.add(sunGroup);

    if (settings.gravityVisualization !== 'none' && displayMode !== 'sizeComparison') {
      const gravitySize = displayMode === 'realDistance' || displayMode === 'trueScale' ? 1200 : 520;
      const gravityLayer =
        settings.gravityVisualization === 'equipotential'
          ? createGravityEquipotentialShells(sunDisplayPosition, gravitySize, settings.labelLanguage)
          : settings.gravityVisualization === 'volume'
            ? createGravityVolumeField(sunDisplayPosition, gravitySize)
            : settings.gravityVisualization === 'spatialGrid'
              ? createGravitySpatialGrid(sunDisplayPosition, gravitySize)
              : createGravityLensingLayer(sunDisplayPosition, gravitySize, settings.labelLanguage);
      group.add(gravityLayer);
    }

    if (settings.showBarycenter && displayMode !== 'sizeComparison') {
      const barycenterPosition = settings.referenceFrame === 'barycentric'
        ? new THREE.Vector3(0, 0, 0)
        : displayAU(barycenterAU);
      const marker = new THREE.Group();
      marker.position.copy(barycenterPosition);
      marker.add(
        new THREE.Mesh(
          new THREE.SphereGeometry(1.6, 16, 12),
          new THREE.MeshBasicMaterial({ color: '#5ff0bd' }),
        ),
      );
      const crossMaterial = new THREE.LineBasicMaterial({ color: '#5ff0bd' });
      [
        [new THREE.Vector3(-5, 0, 0), new THREE.Vector3(5, 0, 0)],
        [new THREE.Vector3(0, -5, 0), new THREE.Vector3(0, 5, 0)],
        [new THREE.Vector3(0, 0, -5), new THREE.Vector3(0, 0, 5)],
      ].forEach(([start, end]) => {
        marker.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([start, end]), crossMaterial));
      });
      if (settings.showLabels) {
        const label = createLabel(
          textLabel('Solar System Barycenter', '太阳系质心', settings.labelLanguage),
          'baryLabel',
          textLabel(
            'Mass-weighted center of the Sun and planets.',
            '太阳和行星按质量加权后的共同质心。',
            settings.labelLanguage,
          ),
        );
        label.position.set(0, 0, 9);
        marker.add(label);
      }
      group.add(marker);

      if (settings.showBarycenterVector) {
        const vectorMaterial = new THREE.LineBasicMaterial({
          color: '#5ff0bd',
          transparent: true,
          opacity: 0.72,
        });
        const vectorLine = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([sunDisplayPosition, barycenterPosition]),
          vectorMaterial,
        );
        group.add(vectorLine);

        if (settings.showLabels) {
          const label = createLabel(
            textLabel('Sun -> barycenter vector', '太阳 → 质心向量', settings.labelLanguage),
            'baryLabel',
            textLabel(
              'Shows why the Sun wobbles around the solar-system barycenter.',
              '用于解释太阳为什么会围绕太阳系质心产生小幅摆动。',
              settings.labelLanguage,
            ),
          );
          label.position.copy(sunDisplayPosition.clone().lerp(barycenterPosition, 0.52).add(new THREE.Vector3(0, 0, 8)));
          group.add(label);
        }
      }
    }

    if (settings.showOrbits && displayMode !== 'sizeComparison') {
      datedElements.forEach((elements) => {
        const points = getOrbitPointsAU(elements).map((point) =>
          displayAU(addAU(point, visualSunOffsetAU)),
        );
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
          color: elements.color,
          transparent: true,
          opacity: settings.orbitOpacity,
        });
        group.add(new THREE.Line(geometry, material));
      });
    }

    if (isGalacticFrame && displayMode !== 'sizeComparison') {
      const trailMaterial = new THREE.LineBasicMaterial({
        color: '#f5f7ff',
        transparent: true,
        opacity: 0.62,
      });
      const sunTrailPoints: THREE.Vector3[] = [];
      for (let sample = 0; sample <= 180; sample += 1) {
        const galacticTrailDays = settings.galacticTrailYears * 365.25;
        const deltaDays = -galacticTrailDays + (sample / 180) * galacticTrailDays;
        sunTrailPoints.push(
          displayPosition({ x: deltaDays * GALACTIC_SUN_SPEED_AU_PER_DAY, y: 0, z: 0 }, displayMode, true, galacticUnitsPerAU),
        );
      }
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(sunTrailPoints), trailMaterial));

      if (settings.showLabels) {
        const motionLabel = createLabel(
          textLabel('Solar motion ~220 km/s', '太阳平动约 220 km/s', settings.labelLanguage),
          'galacticLabel',
          textLabel(
            'Approximate orbital speed of the Sun around the Milky Way center.',
            '太阳绕银河系中心运动的近似速度。',
            settings.labelLanguage,
          ),
        );
        motionLabel.position.copy(sunTrailPoints[18] ?? new THREE.Vector3(-200, 0, 0));
        group.add(motionLabel);
      }

      ['Mercury', 'Earth', 'Jupiter', 'Saturn'].forEach((name) => {
        const base = PLANET_ELEMENTS.find((planet) => planet.name === name);
        if (!base) {
          return;
        }

        const trailPoints: THREE.Vector3[] = [];
        const samples = Math.min(900, Math.max(220, Math.round(settings.galacticTrailYears * 18)));
        for (let sample = 0; sample <= samples; sample += 1) {
          const galacticTrailDays = settings.galacticTrailYears * 365.25;
          const deltaDays = -galacticTrailDays + (sample / samples) * galacticTrailDays;
          const sampleElements = getOrbitalElementsAtDate(base, jd + deltaDays);
          const planetAU = getHeliocentricPositionAU(sampleElements);
          trailPoints.push(
            displayPosition(
              applyInclinationScale({
                x: deltaDays * GALACTIC_SUN_SPEED_AU_PER_DAY + planetAU.x,
                y: planetAU.y * GALACTIC_TRAIL_ORBIT_ENHANCEMENT,
                z: planetAU.z * GALACTIC_TRAIL_ORBIT_ENHANCEMENT,
              }, settings.inclinationScale),
              displayMode,
              true,
              galacticUnitsPerAU,
            ),
          );
        }

        group.add(
          new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(trailPoints),
            new THREE.LineBasicMaterial({
              color: base.color,
              transparent: true,
              opacity: name === 'Earth' ? 0.9 : 0.58,
            }),
          ),
        );
      });
    }

    datedElements.forEach((elements, index) => {
      const planetGroup = new THREE.Group();
      const position =
        displayMode === 'sizeComparison'
          ? getSizeComparisonPlanetPosition(
              index,
              sizeComparisonSunPosition,
              sizeComparisonSunRadius,
              settings.prioritizeInnerPlanetsInSizeComparison,
            )
          : displayAU(addAU(heliocentricPositions[index], visualSunOffsetAU));
      planetGroup.position.copy(position);

      const trueSizeComparisonRadius = (elements.radiusKm / SUN_RADIUS_KM) * sizeComparisonSunRadius;
      const enhancedPlanetRadius = Math.max(
        (elements.radiusKm / SUN_RADIUS_KM) * sunRadius * (settings.planetSizeScale / 300),
        elements.name === 'Earth' ? EARTH_MIN_VISIBLE_RADIUS_UNITS : 0.38,
      );
      const visualRadius =
        displayMode === 'sizeComparison'
          ? Math.max(trueSizeComparisonRadius, SIZE_COMPARISON_MIN_RADIUS_UNITS)
          : displayMode === 'trueScale'
            ? Math.max((elements.radiusKm / AU_KM) * (isGalacticFrame ? galacticUnitsPerAU : REAL_DISTANCE_UNITS_PER_AU), 0.0005)
            : enhancedPlanetRadius;

      const material =
        displayMode === 'sizeComparison'
          ? new THREE.MeshBasicMaterial({ color: elements.visibleColor })
          : new THREE.MeshStandardMaterial({
              color: elements.color,
              roughness: 0.72,
              metalness: 0.02,
              emissive: new THREE.Color(elements.color).multiplyScalar(0.025),
            });
      const planet = new THREE.Mesh(new THREE.SphereGeometry(visualRadius, 32, 20), material);
      planetGroup.add(planet);
      if (elements.name === 'Earth' && displayMode !== 'trueScale' && displayMode !== 'sizeComparison') {
        planetGroup.add(createVisibilityHalo(visualRadius, elements.visibleColor));
      }
      spinBodiesRef.current.push({ mesh: planet, rotationPeriodHours: elements.rotationPeriodHours });

      if (elements.name === 'Saturn') {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(visualRadius * 1.35, visualRadius * 2.25, 72),
          new THREE.MeshBasicMaterial({
            color: displayMode === 'sizeComparison' ? '#c9b77d' : '#d8c995',
            transparent: true,
            opacity: displayMode === 'sizeComparison' ? 0.82 : 0.58,
            side: THREE.DoubleSide,
          }),
        );
        ring.rotateX(Math.PI / 2 + THREE.MathUtils.degToRad(elements.axialTiltDeg));
        planetGroup.add(ring);
      }

      if (settings.showAxes && displayMode !== 'sizeComparison') {
        planetGroup.add(createAxis(visualRadius, elements.axialTiltDeg));
      }

      if (settings.showLabels) {
        const displayName = bodyLabel(elements.name, settings.labelLanguage);
        const label =
          displayMode === 'sizeComparison'
            ? createBodyLabel(displayName, elements.radiusKm, trueSizeComparisonRadius, visualRadius, settings.labelLanguage)
            : createLabel(displayName);
        if (displayMode === 'sizeComparison') {
          label.position.set(0, 0, visualRadius * 1.85 + 0.8);
        } else {
          positionBodyLabel(label, visualRadius);
        }
        planetGroup.add(label);
      }

      group.add(planetGroup);

      if (settings.showMoon && elements.name === 'Earth' && displayMode !== 'sizeComparison') {
        const moonDistanceEnhancement =
          displayMode === 'trueScale' ? 1 : displayMode === 'realDistance' ? 12 : 35;
        const localMoonUnitsPerAU = isGalacticFrame
          ? galacticUnitsPerAU
          : displayMode === 'teaching'
            ? TEACHING_DISTANCE_K
            : REAL_DISTANCE_UNITS_PER_AU;
        const moonGeocentricAU = getMoonGeocentricPositionAU(jd);
        const moonOffset = scaleVector(
          applyInclinationScale(moonGeocentricAU, settings.inclinationScale),
          localMoonUnitsPerAU * moonDistanceEnhancement,
        );
        const moonOrbitPoints = getMoonOrbitPointsAU(jd).map((point) =>
          position
            .clone()
            .add(
              scaleVector(
                applyInclinationScale(point, settings.inclinationScale),
                localMoonUnitsPerAU * moonDistanceEnhancement,
              ),
            ),
        );
        group.add(
          new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(moonOrbitPoints),
            new THREE.LineBasicMaterial({
              color: '#b8bec7',
              transparent: true,
              opacity: settings.orbitOpacity * 0.85,
            }),
          ),
        );

        const moonRadius =
          displayMode === 'trueScale'
            ? Math.max((1737.4 / AU_KM) * (isGalacticFrame ? galacticUnitsPerAU : REAL_DISTANCE_UNITS_PER_AU), 0.001)
            : Math.max(visualRadius * 0.27, MOON_MIN_VISIBLE_RADIUS_UNITS);
        const moon = new THREE.Mesh(
          new THREE.SphereGeometry(moonRadius, 18, 12),
          new THREE.MeshStandardMaterial({ color: '#b8bec7', roughness: 0.85 }),
        );
        moon.position.copy(position).add(moonOffset);
        if (displayMode !== 'trueScale') {
          moon.add(createVisibilityHalo(moonRadius, '#d9dde3'));
        }
        if (settings.showLabels) {
          const label = createLabel(
            displayMode === 'trueScale'
              ? bodyLabel('Moon', settings.labelLanguage)
              : textLabel('Moon (orbit distance enhanced)', '月球（轨道距离已增强）', settings.labelLanguage),
          );
          positionBodyLabel(label, moonRadius);
          moon.add(label);
        }
        group.add(moon);
      }
    });

    if (settings.showLagrangePoints && displayMode !== 'sizeComparison') {
      const earthIndex = datedElements.findIndex((elements) => elements.name === 'Earth');
      const earthElements = datedElements[earthIndex];
      const earthAU = heliocentricPositions[earthIndex];

      if (earthElements && earthAU) {
        const earthDistanceAU = magnitude(earthAU);
        const earthDirection = normalizeAU(earthAU);
        const mu = earthElements.massKg / (SUN_MASS_KG + earthElements.massKg);
        // First-order circular restricted three-body approximations for Sun-Earth L1/L2/L3.
        const collinearOffsetAU = earthDistanceAU * Math.cbrt(mu / 3);
        const lagrangePoints = [
          { name: 'L1', position: subtractAU(earthAU, multiplyAU(earthDirection, collinearOffsetAU)) },
          { name: 'L2 / JWST', position: addAU(earthAU, multiplyAU(earthDirection, collinearOffsetAU)) },
          { name: 'L3', position: multiplyAU(earthDirection, -earthDistanceAU * (1 + (5 * mu) / 12)) },
          { name: 'L4', position: rotateAroundEclipticZ(earthAU, Math.PI / 3) },
          { name: 'L5', position: rotateAroundEclipticZ(earthAU, -Math.PI / 3) },
        ];

        lagrangePoints.forEach(({ name, position }) => {
          const marker = new THREE.Group();
          marker.position.copy(displayAU(addAU(position, visualSunOffsetAU)));
          marker.add(
            new THREE.Mesh(
              new THREE.SphereGeometry(name.includes('JWST') ? 1.45 : 1.05, 16, 10),
              new THREE.MeshBasicMaterial({
                color: name.includes('JWST') ? '#9ec7ff' : '#f6e27f',
                transparent: true,
                opacity: 0.92,
              }),
            ),
          );

          const crossMaterial = new THREE.LineBasicMaterial({
            color: name.includes('JWST') ? '#9ec7ff' : '#f6e27f',
            transparent: true,
            opacity: 0.72,
          });
          marker.add(
            new THREE.Line(
              new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(-3.2, 0, 0),
                new THREE.Vector3(3.2, 0, 0),
              ]),
              crossMaterial,
            ),
          );
          marker.add(
            new THREE.Line(
              new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, -3.2, 0),
                new THREE.Vector3(0, 3.2, 0),
              ]),
              crossMaterial,
            ),
          );

          if (settings.showLabels) {
            const label = createLabel(
              name,
              name.includes('JWST') ? 'jwstLabel' : 'lagrangeLabel',
              textLabel(
                name.includes('JWST')
                  ? 'Sun-Earth L2: approximate region used by JWST.'
                  : `Sun-Earth ${name}: a Lagrange point in the restricted three-body model.`,
                name.includes('JWST')
                  ? '地日 L2：JWST 所在的近似区域。'
                  : `地日 ${name}：限制性三体模型中的拉格朗日点。`,
                settings.labelLanguage,
              ),
            );
            label.position.set(0, 0, 4.8);
            marker.add(label);
          }

          group.add(marker);
        });
      }
    }

    if (settings.showJupiterTrojan && displayMode !== 'sizeComparison') {
      const jupiterIndex = datedElements.findIndex((elements) => elements.name === 'Jupiter');
      const jupiterAU = heliocentricPositions[jupiterIndex];
      const jupiterElements = datedElements[jupiterIndex];

      if (jupiterAU && jupiterElements) {
        const trojanGroup = new THREE.Group();
        const positions: number[] = [];
        const colors: number[] = [];

        [-Math.PI / 3, Math.PI / 3].forEach((offsetAngle, swarmIndex) => {
          const base = rotateAroundEclipticZ(jupiterAU, offsetAngle);
          const radial = normalizeAU(base);
          const tangent = normalizeAU({ x: -radial.y, y: radial.x, z: radial.z * 0.1 });

          for (let index = 0; index < 110; index += 1) {
            const pseudoRandomA = Math.sin((index + 1) * (swarmIndex + 2) * 12.9898) * 43758.5453;
            const pseudoRandomB = Math.sin((index + 7) * (swarmIndex + 5) * 78.233) * 24634.6345;
            const spreadAlongOrbit = ((pseudoRandomA - Math.floor(pseudoRandomA)) - 0.5) * 0.9;
            const spreadRadial = ((pseudoRandomB - Math.floor(pseudoRandomB)) - 0.5) * 0.36;
            const cloudPoint = addAU(
              addAU(base, multiplyAU(tangent, spreadAlongOrbit)),
              multiplyAU(radial, spreadRadial),
            );
            const displayed = displayAU(addAU(cloudPoint, visualSunOffsetAU));
            positions.push(displayed.x, displayed.y, displayed.z);
            colors.push(1.0, swarmIndex === 0 ? 0.78 : 0.56, 0.35);
          }
        });

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        trojanGroup.add(
          new THREE.Points(
            geometry,
            new THREE.PointsMaterial({
              size: isGalacticFrame ? 2.6 : 3.2,
              vertexColors: true,
              transparent: true,
              opacity: 0.78,
              sizeAttenuation: true,
            }),
          ),
        );

        if (settings.showLabels) {
          const l4Label = createLabel(
            textLabel('Jupiter Trojans L4', '木星特洛伊群 L4', settings.labelLanguage),
            'trojanLabel',
            textLabel(
              'Asteroid swarm near Jupiter L4, about 60 degrees ahead of Jupiter.',
              '木星 L4 附近的小行星群，约领先木星 60 度。',
              settings.labelLanguage,
            ),
          );
          l4Label.position.copy(displayAU(addAU(rotateAroundEclipticZ(jupiterAU, Math.PI / 3), visualSunOffsetAU)));
          trojanGroup.add(l4Label);
          const l5Label = createLabel(
            textLabel('Jupiter Trojans L5', '木星特洛伊群 L5', settings.labelLanguage),
            'trojanLabel',
            textLabel(
              'Asteroid swarm near Jupiter L5, about 60 degrees behind Jupiter.',
              '木星 L5 附近的小行星群，约落后木星 60 度。',
              settings.labelLanguage,
            ),
          );
          l5Label.position.copy(displayAU(addAU(rotateAroundEclipticZ(jupiterAU, -Math.PI / 3), visualSunOffsetAU)));
          trojanGroup.add(l5Label);
        }

        group.add(trojanGroup);
      }
    }

    if (displayMode === 'trueScale') {
      const guideMaterial = new THREE.LineBasicMaterial({
        color: '#ffffff',
        transparent: true,
        opacity: 0.68,
      });
      const guideNames = ['Sun', 'Earth', 'Jupiter', 'Neptune'];
      guideNames.forEach((name) => {
        const marker = new THREE.Group();
        const planetIndex = datedElements.findIndex((elements) => elements.name === name);
        const position =
          name === 'Sun'
            ? sunDisplayPosition
            : planetIndex >= 0
              ? displayAU(addAU(heliocentricPositions[planetIndex], visualSunOffsetAU))
              : new THREE.Vector3();
        marker.position.copy(position);
        marker.add(
          new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(-5, 0, 0),
              new THREE.Vector3(5, 0, 0),
            ]),
            guideMaterial,
          ),
        );
        marker.add(
          new THREE.Line(
            new THREE.BufferGeometry().setFromPoints([
              new THREE.Vector3(0, -5, 0),
              new THREE.Vector3(0, 5, 0),
            ]),
            guideMaterial,
          ),
        );
        if (settings.showLabels) {
          const displayName = bodyLabel(name, settings.labelLanguage);
          const label = createLabel(
            textLabel(`${displayName} true-scale body`, `${displayName} 真实比例本体`, settings.labelLanguage),
            'guideLabel',
          );
          label.position.set(0, 0, 8);
          marker.add(label);
        }
        group.add(marker);
      });

      const sunToNeptune = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          sunDisplayPosition,
          displayAU(
            addAU(heliocentricPositions[datedElements.findIndex((elements) => elements.name === 'Neptune')], visualSunOffsetAU),
          ),
        ]),
        new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.18 }),
      );
      group.add(sunToNeptune);
    }

  }, [currentDate, displayMode, settings]);

  useEffect(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) {
      return;
    }

    const radius = settings.referenceFrame === 'galactic' ? 2600 : getSceneRadius(displayMode);
    const distance = cameraView === 'inner' ? 260 : cameraView === 'outer' ? radius * 0.85 : radius * 1.25;
    const target = new THREE.Vector3(0, 0, 0);

    if (cameraView === 'top') {
      camera.position.set(0, 0, distance);
    } else if (cameraView === 'side') {
      const sideDistance = settings.referenceFrame === 'galactic' ? 1150 : displayMode === 'teaching' ? 420 : distance;
      camera.position.set(0, -sideDistance, sideDistance * 0.035);
    } else if (displayMode === 'sizeComparison') {
      const sunRadius = getSizeComparisonSunRadius(settings.showFullSunInSizeComparison);
      const sunPosition = getSizeComparisonSunPosition(
        settings.showFullSunInSizeComparison,
        settings.prioritizeInnerPlanetsInSizeComparison,
      );
      const mercuryPosition = getSizeComparisonPlanetPosition(
        0,
        sunPosition,
        sunRadius,
        settings.prioritizeInnerPlanetsInSizeComparison,
      );
      const marsPosition = getSizeComparisonPlanetPosition(
        3,
        sunPosition,
        sunRadius,
        settings.prioritizeInnerPlanetsInSizeComparison,
      );
      const neptunePosition = getSizeComparisonPlanetPosition(
        7,
        sunPosition,
        sunRadius,
        settings.prioritizeInnerPlanetsInSizeComparison,
      );

      if (settings.showFullSunInSizeComparison) {
        target.set((sunPosition.x + marsPosition.x) / 2, 0, 0);
        camera.position.set(target.x, -360, 34);
      } else if (settings.prioritizeInnerPlanetsInSizeComparison) {
        target.set((mercuryPosition.x + marsPosition.x) / 2, 0, 0);
        camera.position.set(target.x, -260, 28);
      } else {
        target.set((sunPosition.x + neptunePosition.x) / 2, 0, 0);
        camera.position.set(target.x, -420, 38);
      }
    } else if (settings.referenceFrame === 'galactic') {
      camera.position.set(980, -2350, 720);
    } else {
      camera.position.set(distance * 0.62, -distance * 0.78, distance * 0.45);
    }

    controls.target.copy(target);
    controls.update();
  }, [
    cameraView,
    displayMode,
    settings.referenceFrame,
    settings.showFullSunInSizeComparison,
    settings.prioritizeInnerPlanetsInSizeComparison,
  ]);

  const copy = getCopy(settings.labelLanguage).scene;
  const referenceFrameLabel = copy.referenceFrameBadges[settings.referenceFrame];

  return (
    <section className="sceneWrap" aria-label={copy.ariaLabel}>
      <div ref={mountRef} className="sceneMount" />
      <div className="scaleBadge">
        {referenceFrameLabel}
        {' / '}
        {copy.displayModeBadges[displayMode]}
        {settings.referenceFrame === 'galactic' ? copy.galacticTrailSuffix : ''}
      </div>
    </section>
  );
}

export default SolarSystemScene;
