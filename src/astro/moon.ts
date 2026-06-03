import { degToRad, normalizeAngleDeg, solveKepler, type Vector3AU } from './orbit';

const AU_KM = 149_597_870.7;
const J2000_JD = 2_451_545.0;
const MOON_SEMI_MAJOR_AXIS_AU = 384_400 / AU_KM;
const MOON_ECCENTRICITY = 0.0549;
const MOON_INCLINATION_DEG = 5.145;

function rotateLunarPlaneToEcliptic(xPrime: number, yPrime: number, jd: number): Vector3AU {
  const daysSinceJ2000 = jd - J2000_JD;
  const ascendingNode = degToRad(normalizeAngleDeg(125.08 - 0.0529538083 * daysSinceJ2000));
  const argumentOfPerigee = degToRad(normalizeAngleDeg(318.15 + 0.1643573223 * daysSinceJ2000));
  const inclination = degToRad(MOON_INCLINATION_DEG);

  const cosO = Math.cos(ascendingNode);
  const sinO = Math.sin(ascendingNode);
  const cosI = Math.cos(inclination);
  const sinI = Math.sin(inclination);
  const cosW = Math.cos(argumentOfPerigee);
  const sinW = Math.sin(argumentOfPerigee);

  return {
    x: (cosO * cosW - sinO * sinW * cosI) * xPrime +
      (-cosO * sinW - sinO * cosW * cosI) * yPrime,
    y: (sinO * cosW + cosO * sinW * cosI) * xPrime +
      (-sinO * sinW + cosO * cosW * cosI) * yPrime,
    z: sinW * sinI * xPrime + cosW * sinI * yPrime,
  };
}

export function getMoonGeocentricPositionAU(jd: number): Vector3AU {
  const daysSinceJ2000 = jd - J2000_JD;
  const meanAnomaly = degToRad(normalizeAngleDeg(135.27 + 13.0649929509 * daysSinceJ2000));
  const eccentricAnomaly = solveKepler(meanAnomaly, MOON_ECCENTRICITY);

  const xPrime = MOON_SEMI_MAJOR_AXIS_AU * (Math.cos(eccentricAnomaly) - MOON_ECCENTRICITY);
  const yPrime =
    MOON_SEMI_MAJOR_AXIS_AU *
    Math.sqrt(1 - MOON_ECCENTRICITY ** 2) *
    Math.sin(eccentricAnomaly);

  return rotateLunarPlaneToEcliptic(xPrime, yPrime, jd);
}

export function getMoonOrbitPointsAU(jd: number, segments = 160): Vector3AU[] {
  const points: Vector3AU[] = [];

  for (let index = 0; index <= segments; index += 1) {
    const eccentricAnomaly = (index / segments) * Math.PI * 2;
    const xPrime = MOON_SEMI_MAJOR_AXIS_AU * (Math.cos(eccentricAnomaly) - MOON_ECCENTRICITY);
    const yPrime =
      MOON_SEMI_MAJOR_AXIS_AU *
      Math.sqrt(1 - MOON_ECCENTRICITY ** 2) *
      Math.sin(eccentricAnomaly);
    points.push(rotateLunarPlaneToEcliptic(xPrime, yPrime, jd));
  }

  return points;
}
