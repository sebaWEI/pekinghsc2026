import * as THREE from 'three';

/** 聚焦左栏：实验数据小标题 + 正文（各一条） */
export interface PartDataBlock {
  label: string;
  body: string;
}

export interface PartMeta {
  id: string;
  title: string;
  description: string;
  /** 大标题第一行：蓝色数字或编号 */
  headlineNumber: string;
  /** 大标题第二行：同色阶、非主蓝 */
  headlineSub: string;
  /** 恰好三段实验/测定说明 */
  dataBlocks: [PartDataBlock, PartDataBlock, PartDataBlock];
}

export interface MeshMaterialState {
  material: THREE.MeshStandardMaterial;
  baseOpacity: number;
  baseTransparent: boolean;
  baseDepthWrite: boolean;
  baseEmissive: THREE.Color;
  baseEmissiveIntensity: number;
}

export interface RnaPart {
  id: string;
  meshes: THREE.Mesh[];
  center: THREE.Vector3;
  size: THREE.Vector3;
  materials: MeshMaterialState[];
}

export type InteractionState =
  | { mode: 'idle'; hoveredPartId: string | null }
  | { mode: 'focus'; partId: string; hoveredPartId: string | null };

