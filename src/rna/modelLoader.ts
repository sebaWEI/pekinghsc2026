import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { MeshMaterialState, RnaPart } from '../types/rna';

export interface LoadedRnaModel {
  model: THREE.Object3D;
  allMaterials: THREE.MeshStandardMaterial[];
  parts: RnaPart[];
}

function getPartIdFromObject(obj: THREE.Object3D): string | null {
  let cur: THREE.Object3D | null = obj;
  while (cur) {
    const m = /^part_(.+)$/i.exec(cur.name);
    if (m?.[1]) return m[1].toLowerCase();
    cur = cur.parent;
  }
  return null;
}

export async function loadRnaModel(
  url: string,
  targetHeight = 6.2,
): Promise<LoadedRnaModel> {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(url);
  const model = gltf.scene;

  const preBox = new THREE.Box3().setFromObject(model);
  const preSize = preBox.getSize(new THREE.Vector3());
  const modelHeight = Math.max(preSize.y, 1e-4);
  model.scale.setScalar(targetHeight / modelHeight);

  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.sub(center);
  model.position.y += 0.15;
  model.rotation.x = -Math.PI * 0.03;
  model.updateWorldMatrix(true, true);

  const allMaterials: THREE.MeshStandardMaterial[] = [];
  const partMeshMap = new Map<string, THREE.Mesh[]>();
  const partMaterialMap = new Map<string, MeshMaterialState[]>();

  model.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    obj.castShadow = false;
    obj.receiveShadow = false;

    const sourceMaterials = Array.isArray(obj.material) ? obj.material : [obj.material];
    const replaced = sourceMaterials.map((mat) => {
      if (!(mat instanceof THREE.MeshStandardMaterial)) return mat;
      const next = mat.clone();
      next.transparent = true;
      next.opacity = 0;
      next.depthWrite = false;
      allMaterials.push(next);
      return next;
    });
    obj.material = Array.isArray(obj.material) ? replaced : replaced[0];

    const partId = getPartIdFromObject(obj);
    if (!partId) return;
    if (!partMeshMap.has(partId)) {
      partMeshMap.set(partId, []);
      partMaterialMap.set(partId, []);
    }
    partMeshMap.get(partId)!.push(obj);
    const states = partMaterialMap.get(partId)!;
    for (let i = 0; i < sourceMaterials.length; i++) {
      const src = sourceMaterials[i];
      const runtime = replaced[i];
      if (!(src instanceof THREE.MeshStandardMaterial)) continue;
      if (!(runtime instanceof THREE.MeshStandardMaterial)) continue;
      states.push({
        material: runtime,
        baseOpacity: src.opacity,
        baseTransparent: src.transparent,
        baseDepthWrite: src.depthWrite,
        baseEmissive: src.emissive.clone(),
        baseEmissiveIntensity: src.emissiveIntensity,
      });
    }
  });

  const parts: RnaPart[] = [];
  for (const [id, meshes] of partMeshMap.entries()) {
    const bbox = new THREE.Box3();
    for (const mesh of meshes) bbox.expandByObject(mesh);
    const partCenterWorld = bbox.getCenter(new THREE.Vector3());
    const partSizeWorld = bbox.getSize(new THREE.Vector3());
    const partCenterLocal = model.worldToLocal(partCenterWorld.clone());
    parts.push({
      id,
      meshes,
      center: partCenterLocal,
      size: partSizeWorld,
      materials: partMaterialMap.get(id) ?? [],
    });
  }

  return { model, allMaterials, parts };
}

