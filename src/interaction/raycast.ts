import * as THREE from 'three';
import type { RnaPart } from '../types/rna';

export interface PartRaycastController {
  pickPart(pointerNdc: THREE.Vector2, camera: THREE.Camera): string | null;
}

export function createPartRaycastController(parts: RnaPart[]): PartRaycastController {
  const raycaster = new THREE.Raycaster();
  const meshToPartId = new Map<THREE.Object3D, string>();
  const allMeshes: THREE.Object3D[] = [];

  for (const part of parts) {
    for (const mesh of part.meshes) {
      meshToPartId.set(mesh, part.id);
      allMeshes.push(mesh);
    }
  }

  return {
    pickPart(pointerNdc, camera) {
      if (!allMeshes.length) return null;
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(allMeshes, false);
      for (const hit of hits) {
        const partId = meshToPartId.get(hit.object);
        if (partId) return partId;
      }
      return null;
    },
  };
}

