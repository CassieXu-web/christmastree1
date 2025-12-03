export enum AppState {
  CHAOS = 'CHAOS',
  FORMED = 'FORMED'
}

export interface TreeConfig {
  foliageCount: number;
  ornamentCount: number;
  photoCount: number;
}

export interface HandData {
  isOpen: boolean;
  position: { x: number; y: number }; // Normalized -1 to 1
  isDetected: boolean;
}