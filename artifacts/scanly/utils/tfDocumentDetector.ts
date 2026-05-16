/**
 * Phase 3 – TensorFlow.js GPU-accelerated document detection
 *
 * Uses TF.js conv2d with Sobel kernels — runs on the GPU via expo-gl backend.
 * Faster and more accurate than the CPU Phase 1 detector for devices that
 * support WebGL / OpenGL ES.
 *
 * Falls back to null (Phase 1 takes over) if TF.js is not ready.
 */

import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

import type { DocumentCorners } from './documentDetector';

const PROCESS_W   = 400;
const EDGE_THRESH = 0.08;
const MIN_EDGES   = 150;
const BORDER_SKIP = 5;

let tfReady = false;

// -----------------------------------------------------------------------
// Lazy-load TF.js (pays cost only on first detection call)
// -----------------------------------------------------------------------
async function getTF() {
  // Dynamic import avoids bundling TF.js until needed
  const tf = await import('@tensorflow/tfjs');
  if (!tfReady) {
    await import('@tensorflow/tfjs-react-native');
    await tf.ready();
    tfReady = true;
  }
  return tf;
}

export async function initTF(): Promise<void> {
  try {
    await getTF();
    console.log('[tfDetector] TF.js ready');
  } catch (e) {
    console.warn('[tfDetector] TF.js init failed:', e);
  }
}

// -----------------------------------------------------------------------
// Main detection function
// -----------------------------------------------------------------------
export async function detectDocumentCornersWithTF(
  uri: string,
): Promise<DocumentCorners | null> {
  try {
    const tf = await getTF();

    // Downsample
    const small = await manipulateAsync(
      uri,
      [{ resize: { width: PROCESS_W } }],
      { format: SaveFormat.JPEG, compress: 0.85 },
    );

    const b64  = await FileSystem.readAsStringAsync(small.uri, {
      encoding: 'base64',
    });
    const rgba = base64ToRGBA(b64);
    if (!rgba) return null;

    const { pixels, W, H } = rgba;

    // Run Sobel on GPU, then collect edge data on CPU
    const edgeTensor = tf.tidy(() => {
      // Build [1, H, W, 1] grayscale float tensor
      const gray = tf
        .tensor(pixels, [H, W, 4])
        .slice([0, 0, 0], [-1, -1, 3])           // drop alpha
        .mul(tf.tensor1d([0.299, 0.587, 0.114]))  // luminance weights
        .sum(-1)                                   // sum channels → [H, W]
        .div(255)                                  // normalise [0,1]
        .reshape([1, H, W, 1]);                   // → [1,H,W,1]

      // Sobel kernels [3,3,1,1]
      const kX = tf.tensor4d([-1, 0, 1, -2, 0, 2, -1, 0, 1], [3, 3, 1, 1]);
      const kY = tf.tensor4d([-1, -2, -1, 0, 0, 0, 1, 2, 1], [3, 3, 1, 1]);

      // conv2d expects [batch,H,W,inCh] input and [kH,kW,inCh,outCh] kernel
      const eX  = tf.conv2d(gray as unknown as Parameters<typeof tf.conv2d>[0], kX, 1, 'same');
      const eY  = tf.conv2d(gray as unknown as Parameters<typeof tf.conv2d>[0], kY, 1, 'same');

      const mag     = tf.sqrt(tf.add(tf.square(eX), tf.square(eY))).reshape([H, W]);
      const maxMag  = (mag.max().arraySync() as number) || 1;
      return mag.div(maxMag); // normalised [0,1], shape [H,W]
    });

    // Read back to JS (CPU) for corner finding
    const edgeData = (await edgeTensor.array()) as number[][];
    tf.dispose(edgeTensor);

    return findCornersFromMatrix(edgeData, W, H);
  } catch (err) {
    console.warn('[tfDetector] Detection failed:', err);
    return null;
  }
}

// -----------------------------------------------------------------------
// Find corners from 2-D edge magnitude matrix
// -----------------------------------------------------------------------
function findCornersFromMatrix(
  matrix: number[][],
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
      if (matrix[y][x] < EDGE_THRESH) continue;
      count++;

      const nx = x / W;
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

  const qW = Math.min(tr.x, br.x) - Math.max(tl.x, bl.x);
  const qH = Math.min(bl.y, br.y) - Math.max(tl.y, tr.y);
  if (qW < 0.15 || qH < 0.15) return null;

  return { topLeft: tl, topRight: tr, bottomLeft: bl, bottomRight: br };
}

// -----------------------------------------------------------------------
// base64 JPEG → flat pixel array + dimensions (uses jpeg-js under the hood)
// -----------------------------------------------------------------------
function base64ToRGBA(b64: string): { pixels: number[]; W: number; H: number } | null {
  try {
    const clean  = b64.replace(/\s/g, '');
    const binary = atob(clean);
    const bytes  = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    // jpeg-js is a peer dep installed for Phase 1 as well
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const jpeg = require('jpeg-js') as typeof import('jpeg-js');
    const img  = jpeg.decode(bytes, { useTArray: true });

    const pixels: number[] = Array.from(img.data);
    return { pixels, W: img.width, H: img.height };
  } catch {
    return null;
  }
}
