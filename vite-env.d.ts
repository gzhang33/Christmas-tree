/// <reference types="vite/client" />

// React Three Fiber JSX namespace extension
import { ThreeElements } from '@react-three/fiber';

declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}