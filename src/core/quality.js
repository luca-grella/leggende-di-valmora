// Picks render settings once at startup: phones get a lighter profile so the
// game stays smooth, desktops get longer view distance and sharper shadows.

const touch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const small = Math.min(screen.width, screen.height) < 820;

export const IS_MOBILE = touch && small;

export const QUALITY = IS_MOBILE
  ? { name: 'mobile', pixelRatio: Math.min(devicePixelRatio, 1.6), shadowSize: 1024, chunkRadius: 4, viewDistance: 300, grassDensity: 0.55 }
  : { name: 'desktop', pixelRatio: Math.min(devicePixelRatio, 2), shadowSize: 2048, chunkRadius: 6, viewDistance: 430, grassDensity: 1 };
