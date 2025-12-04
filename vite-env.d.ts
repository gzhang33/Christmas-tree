/// <reference types="vite/client" />

// React Three Fiber JSX namespace extension
import { ThreeElements } from '@react-three/fiber';

declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements { }
  }
}

// GLSL shader file imports (using Vite ?raw suffix)
declare module '*.vert?raw' {
  const content: string;
  export default content;
}

declare module '*.frag?raw' {
  const content: string;
  export default content;
}

declare module '*.glsl?raw' {
  const content: string;
  export default content;
}