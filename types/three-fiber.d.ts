import '@react-three/fiber';
import { Object3DNode, MaterialNode, BufferGeometryNode } from '@react-three/fiber';
import * as THREE from 'three';

declare module '@react-three/fiber' {
  interface ThreeElements {
    group: Object3DNode<THREE.Group, typeof THREE.Group>;
    mesh: Object3DNode<THREE.Mesh, typeof THREE.Mesh>;
    points: Object3DNode<THREE.Points, typeof THREE.Points>;
    pointLight: Object3DNode<THREE.PointLight, typeof THREE.PointLight>;
    spotLight: Object3DNode<THREE.SpotLight, typeof THREE.SpotLight>;
    ambientLight: Object3DNode<THREE.AmbientLight, typeof THREE.AmbientLight>;
    bufferGeometry: BufferGeometryNode<THREE.BufferGeometry, typeof THREE.BufferGeometry>;
    bufferAttribute: Object3DNode<THREE.BufferAttribute, typeof THREE.BufferAttribute>;
    pointsMaterial: MaterialNode<THREE.PointsMaterial, typeof THREE.PointsMaterial>;
    meshStandardMaterial: MaterialNode<THREE.MeshStandardMaterial, typeof THREE.MeshStandardMaterial>;
    meshBasicMaterial: MaterialNode<THREE.MeshBasicMaterial, typeof THREE.MeshBasicMaterial>;
    circleGeometry: BufferGeometryNode<THREE.CircleGeometry, typeof THREE.CircleGeometry>;
  }
}

export {};

