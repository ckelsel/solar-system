import type { PlanetElements } from '../data/planetElements';

export interface ElementsAtDate extends PlanetElements {
  julianCenturiesSinceJ2000: number;
}

export interface Vector3AU {
  x: number;
  y: number;
  z: number;
}

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function normalizeAngleDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

export function solveKepler(Mrad: number, e: number): number {
  let E = e < 0.8 ? Mrad : Math.PI;

  for (let iteration = 0; iteration < 20; iteration += 1) {
    // Newton-Raphson on f(E) = E - e sin(E) - M.
    const f = E - e * Math.sin(E) - Mrad;
    const fp = 1 - e * Math.cos(E);
    const delta = f / fp;
    E -= delta;
    if (Math.abs(delta) < 1e-10) {
      break;
    }
  }

  return E;
}

export function getOrbitalElementsAtDate(baseElements: PlanetElements, jd: number): ElementsAtDate {
  const T = (jd - 2_451_545.0) / 36_525;

  return {
    ...baseElements,
    julianCenturiesSinceJ2000: T,
    semiMajorAxisAU: baseElements.semiMajorAxisAU + baseElements.semiMajorAxisRateAUPerCentury * T,
    eccentricity: baseElements.eccentricity + baseElements.eccentricityRatePerCentury * T,
    inclinationDeg: baseElements.inclinationDeg + baseElements.inclinationRateDegPerCentury * T,
    meanLongitudeDeg: normalizeAngleDeg(
      baseElements.meanLongitudeDeg + baseElements.meanLongitudeRateDegPerCentury * T,
    ),
    longitudeOfPerihelionDeg: normalizeAngleDeg(
      baseElements.longitudeOfPerihelionDeg +
        baseElements.longitudeOfPerihelionRateDegPerCentury * T,
    ),
    longitudeOfAscendingNodeDeg: normalizeAngleDeg(
      baseElements.longitudeOfAscendingNodeDeg +
        baseElements.longitudeOfAscendingNodeRateDegPerCentury * T,
    ),
  };
}

export function rotateOrbitalPlaneToEcliptic(
  xPrime: number,
  yPrime: number,
  elements: ElementsAtDate,
): Vector3AU {
  const omega = degToRad(
    normalizeAngleDeg(elements.longitudeOfPerihelionDeg - elements.longitudeOfAscendingNodeDeg),
  );
  const inclination = degToRad(elements.inclinationDeg);
  const ascendingNode = degToRad(elements.longitudeOfAscendingNodeDeg);

  const cosO = Math.cos(ascendingNode);
  const sinO = Math.sin(ascendingNode);
  const cosI = Math.cos(inclination);
  const sinI = Math.sin(inclination);
  const cosW = Math.cos(omega);
  const sinW = Math.sin(omega);

  // Rotate from the planet's orbital plane into the J2000 ecliptic frame:
  // Rz(Ω) * Rx(i) * Rz(ω) * [x', y', 0].
  return {
    x: (cosO * cosW - sinO * sinW * cosI) * xPrime +
      (-cosO * sinW - sinO * cosW * cosI) * yPrime,
    y: (sinO * cosW + cosO * sinW * cosI) * xPrime +
      (-sinO * sinW + cosO * cosW * cosI) * yPrime,
    z: sinW * sinI * xPrime + cosW * sinI * yPrime,
  };
}

export function getHeliocentricPositionAU(elementsAtDate: ElementsAtDate): Vector3AU {
  const meanAnomalyDeg = normalizeAngleDeg(
    elementsAtDate.meanLongitudeDeg - elementsAtDate.longitudeOfPerihelionDeg,
  );
  const M = degToRad(meanAnomalyDeg);
  const E = solveKepler(M, elementsAtDate.eccentricity);

  // Keplerian ellipse in its own orbital plane. The Sun is at one focus.
  const xPrime = elementsAtDate.semiMajorAxisAU * (Math.cos(E) - elementsAtDate.eccentricity);
  const yPrime =
    elementsAtDate.semiMajorAxisAU *
    Math.sqrt(1 - elementsAtDate.eccentricity ** 2) *
    Math.sin(E);

  return rotateOrbitalPlaneToEcliptic(xPrime, yPrime, elementsAtDate);
}

export function getOrbitPointsAU(elementsAtDate: ElementsAtDate, segments = 512): Vector3AU[] {
  const points: Vector3AU[] = [];

  for (let index = 0; index <= segments; index += 1) {
    const E = (index / segments) * Math.PI * 2;
    const xPrime = elementsAtDate.semiMajorAxisAU * (Math.cos(E) - elementsAtDate.eccentricity);
    const yPrime =
      elementsAtDate.semiMajorAxisAU *
      Math.sqrt(1 - elementsAtDate.eccentricity ** 2) *
      Math.sin(E);
    points.push(rotateOrbitalPlaneToEcliptic(xPrime, yPrime, elementsAtDate));
  }

  return points;
}

export function calculateBarycenter(
  planetPositions: Vector3AU[],
  masses: number[],
  sunMass: number,
): Vector3AU {
  const totalMass = masses.reduce((sum, mass) => sum + mass, sunMass);
  const weighted = planetPositions.reduce<Vector3AU>(
    (sum, position, index) => ({
      x: sum.x + position.x * masses[index],
      y: sum.y + position.y * masses[index],
      z: sum.z + position.z * masses[index],
    }),
    { x: 0, y: 0, z: 0 },
  );

  return {
    x: weighted.x / totalMass,
    y: weighted.y / totalMass,
    z: weighted.z / totalMass,
  };
}
