import { Quaternion, Vector3 } from 'three';
import { FRONT_VECTOR, LOCAL_SUN_DIRECTION, SCREEN_UP } from './constants';

export const latLonToVector3 = (lat: number, lon: number) => {
  const phi = (lat * Math.PI) / 180;
  const theta = (lon * Math.PI) / 180;
  const cosPhi = Math.cos(phi);

  return new Vector3(
    cosPhi * Math.cos(theta),
    Math.sin(phi),
    -cosPhi * Math.sin(theta),
  );
};

export const vector3ToLatLon = (vector: Vector3) => ({
  lat: (Math.asin(vector.y) * 180) / Math.PI,
  lon: (-Math.atan2(vector.z, vector.x) * 180) / Math.PI,
});

export const quaternionFromCenteredLatLon = (lat: number, lon: number) =>
  new Quaternion()
    .setFromUnitVectors(latLonToVector3(lat, lon), FRONT_VECTOR)
    .normalize();

export const getViewCenterLocal = (rotation: Quaternion) =>
  FRONT_VECTOR.clone().applyQuaternion(rotation.clone().invert()).normalize();

export const getRollDegrees = (rotation: Quaternion) => {
  const northOnScreen = SCREEN_UP.clone()
    .applyQuaternion(rotation)
    .projectOnPlane(FRONT_VECTOR);

  if (northOnScreen.lengthSq() < 1e-6) {
    return 0;
  }

  northOnScreen.normalize();
  return (Math.atan2(northOnScreen.x, northOnScreen.y) * 180) / Math.PI;
};

export const isCenterSunlit = (rotation: Quaternion) =>
  getViewCenterLocal(rotation).dot(LOCAL_SUN_DIRECTION) >= 0;
