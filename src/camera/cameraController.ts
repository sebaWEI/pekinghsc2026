import * as THREE from 'three';
import type { RnaPart } from '../types/rna';

export interface FocusCameraTarget {
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
  fov: number;
}

/**
 * Frame a part with the subject biased toward the **right** side of the screen while the
 * left third stays clear for the data panel. Achieved by strafing the camera and shifting
 * the look-at point slightly “screen-left” of the part centre (in the camera’s right axis).
 */
export function computeFocusCameraTarget(
  part: RnaPart,
  modelRoot: THREE.Object3D,
  /** From part centre toward camera (world space). Should stay fixed for the focus session so framing does not chase `smoothedCamPos` every frame (avoids drift that looks like rotation). */
  viewDirectionFromCenter: THREE.Vector3,
): FocusCameraTarget {
  const centerWorld = modelRoot.localToWorld(part.center.clone());
  const size = part.size.length();
  const direction = viewDirectionFromCenter.clone();
  if (direction.lengthSq() < 1e-6) direction.set(1, 0.35, 1);
  direction.normalize();

  const distance = THREE.MathUtils.clamp(size * 1.58, 3.15, 7.6);
  const position = centerWorld.clone().add(direction.multiplyScalar(distance));
  position.y += THREE.MathUtils.clamp(part.size.y * 0.12, 0.08, 0.45);

  const viewFwd = centerWorld.clone().sub(position).normalize();
  const viewRight = new THREE.Vector3().crossVectors(viewFwd, new THREE.Vector3(0, 1, 0));
  if (viewRight.lengthSq() < 1e-8) viewRight.set(1, 0, 0);
  viewRight.normalize();

  /** Milder strafe / frame shift: keeps left gutter for the panel without shoving the mesh off the right edge. */
  const strafe = THREE.MathUtils.clamp(size * 0.55, 0.65, 2.35);
  position.addScaledVector(viewRight, -strafe);

  const lookAt = centerWorld.clone();
  const frameShift = THREE.MathUtils.clamp(size * 0.68, 0.35, 2.0);
  lookAt.addScaledVector(viewRight, -frameShift);

  return {
    position,
    lookAt,
    fov: 41,
  };
}
