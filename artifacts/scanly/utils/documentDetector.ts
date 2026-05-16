/**
 * Phase 1 – CPU-based document corner detection
 *
 * Pipeline:
 *   capture → downsample (320px) → JPEG decode (jpeg-js) → grayscale
 *   → Gaussian blur → Sobel edges → threshold → find 4 extreme corners
 *
 * Works in managed Expo workflow with no native rebuild needed.
 */

import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import jpeg from 'jpeg-js';

export interface DocumentCorners {
  topLeft:     { x: number; y: number };
  topRight:    { x: number; y: number };
  bottomLeft:  { x: number; y: number };
  bottomRight: { x: number; y: number };
}

// Normalised coords (0–1) that correspond to a full-frame safe default
export const FULL_FRAME_CORNERS: DocumentCorners = {
  topLeft:     { x: 0.04, y: 0.04 },
  topRight:    { x: 0.96, y: 0.04 },
  bottomLeft:  { x: 0.04, y: 0.96 },
  bottomRight: { x: 0.96, y: 0.96 },
};

const PROCESS_W   = 320;   // downsample to this width before analysis
const EDGE_THRESH = 0.11;  // edge magnitude threshold (0–1)
const MIN_EDGES   = 120;   // minimum edge pixels needed for a valid detection
const BORDER_SKIP = 4;     // pixels to skip at image border (avoid frame artifacts)

// -----------------------------------------------------------------------
// Public entry point
// -----------------------------------------------------------------------
export async function detectDocumentCorners(uri: string): Promise<DocumentCorners | null> {
  try {
    const small = await manipulateAsync(
      uri,
      [{ resize: { width: PROCESS_W } }],
      { format: SaveFormat.JPEG, compress: 0.8 },
    );

    const b64 = await FileSystem.readAsStringAsync(small.uri, {
      encoding: 'base64',
    });

    const bytes = base64ToUint8Array(b64);
    const img   = jpeg.decode(bytes, { useTArray: true });
    const { width: W, height: H, data: rgba } = img;

    const gray    = toGrayscale(rgba, W, H);
    const blurred = gaussianBlur(gray, W, H);
    const edges   = sobel(blurred, W, H);

    return findCorners(edges, W, H);
  } catch (err) {
    console.warn('[documentDetector] Detection failed:', err);
    return null;
  }
}

// -----------------------------------------------------------------------
// base64 → Uint8Array (no Buffer/Node.js polyfill needed)
// -----------------------------------------------------------------------
function base64ToUint8Array(b64: string): Uint8Array {
  const clean  = b64.replace(/\s/g, '');
  const binary = atob(clean);
  const bytes  = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// -----------------------------------------------------------------------
// RGBA → float grayscale [0, 1]
// -----------------------------------------------------------------------
function toGrayscale(rgba: Uint8Array, W: number, H: number): Float32Array {
  const gray = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const j = i * 4;
    gray[i] = (0.299 * rgba[j] + 0.587 * rgba[j + 1] + 0.114 * rgba[j + 2]) / 255;
  }
  return gray;
}

// -----------------------------------------------------------------------
// 3×3 Gaussian blur (σ≈0.85)
// -----------------------------------------------------------------------
function gaussianBlur(src: Float32Array, W: number, H: number): Float32Array {
  const K   = [1, 2, 1, 2, 4, 2, 1, 2, 1] as const;
  const out = new Float32Array(W * H);
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      let s = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          s += src[(y + ky) * W + (x + kx)] * K[(ky + 1) * 3 + (kx + 1)];
        }
      }
      out[y * W + x] = s / 16;
    }
  }
  return out;
}

// -----------------------------------------------------------------------
// Sobel edge magnitude, normalised to [0, 1]
// -----------------------------------------------------------------------
function sobel(src: Float32Array, W: number, H: number): Float32Array {
  const out = new Float32Array(W * H);
  let maxMag = 0;

  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const gx =
        -src[(y - 1) * W + (x - 1)] - 2 * src[y * W + (x - 1)] - src[(y + 1) * W + (x - 1)] +
         src[(y - 1) * W + (x + 1)] + 2 * src[y * W + (x + 1)] + src[(y + 1) * W + (x + 1)];
      const gy =
        -src[(y - 1) * W + (x - 1)] - 2 * src[(y - 1) * W + x] - src[(y - 1) * W + (x + 1)] +
         src[(y + 1) * W + (x - 1)] + 2 * src[(y + 1) * W + x] + src[(y + 1) * W + (x + 1)];
      const mag = Math.sqrt(gx * gx + gy * gy);
      out[y * W + x] = mag;
      if (mag > maxMag) maxMag = mag;
    }
  }

  // Normalise
  if (maxMag > 0) {
    for (let i = 0; i < W * H; i++) out[i] /= maxMag;
  }
  return out;
}

// -----------------------------------------------------------------------
// Find 4 document corners using extremal-point method:
//   TL → minimise (x + y)
//   TR → minimise (y − x)   (small y, large x)
//   BL → maximise (y − x)   (large y, small x)
//   BR → maximise (x + y)
// -----------------------------------------------------------------------
function findCorners(
  edges: Float32Array,
  W: number,
  H: number,
): DocumentCorners | null {
  let tlScore =  Infinity, trScore =  Infinity;
  let blScore = -Infinity, brScore = -Infinity;
  let tl = { x: 0, y: 0 }, tr = { x: 0, y: 0 };
  let bl = { x: 0, y: 0 }, br = { x: 0, y: 0 };
  let count = 0;

  for (let y = BORDER_SKIP; y < H - BORDER_SKIP; y++) {
    for (let x = BORDER_SKIP; x < W - BORDER_SKIP; x++) {
      if (edges[y * W + x] < EDGE_THRESH) continue;
      count++;

      const nx = x / W;   // normalised [0, 1]
      const ny = y / H;

      const s1 = nx + ny;   // TL min, BR max
      const s2 = ny - nx;   // TR min, BL max

      if (s1 < tlScore) { tlScore = s1; tl = { x: nx, y: ny }; }
      if (s2 < trScore) { trScore = s2; tr = { x: nx, y: ny }; }
      if (s2 > blScore) { blScore = s2; bl = { x: nx, y: ny }; }
      if (s1 > brScore) { brScore = s1; br = { x: nx, y: ny }; }
    }
  }

  if (count < MIN_EDGES) return null;

  // Sanity check: corners must form a reasonable quadrilateral
  const qW = Math.min(tr.x, br.x) - Math.max(tl.x, bl.x);
  const qH = Math.min(bl.y, br.y) - Math.max(tl.y, tr.y);
  if (qW < 0.15 || qH < 0.15) return null;

  return {
    topLeft:     tl,
    topRight:    tr,
    bottomLeft:  bl,
    bottomRight: br,
  };
}

// -----------------------------------------------------------------------
// Utility: convert normalised [0,1] corners → bounding box as crop fractions
// (used by crop.tsx to pre-populate the crop box)
// -----------------------------------------------------------------------
export function cornersToCropBox(
  corners: DocumentCorners,
  dispX: number,
  dispY: number,
  dispW: number,
  dispH: number,
  wrapW: number,
  wrapH: number,
): { left: number; top: number; right: number; bottom: number } {
  const INSET = 0.005; // tiny inset so edge stays just inside

  const mapX = (nx: number) => (nx * dispW + dispX) / wrapW;
  const mapY = (ny: number) => (ny * dispH + dispY) / wrapH;

  const minX = Math.min(corners.topLeft.x, corners.bottomLeft.x);
  const maxX = Math.max(corners.topRight.x, corners.bottomRight.x);
  const minY = Math.min(corners.topLeft.y, corners.topRight.y);
  const maxY = Math.max(corners.bottomLeft.y, corners.bottomRight.y);

  return {
    left:   Math.max(0, mapX(minX) - INSET),
    top:    Math.max(0, mapY(minY) - INSET),
    right:  Math.min(1, mapX(maxX) + INSET),
    bottom: Math.min(1, mapY(maxY) + INSET),
  };
}
