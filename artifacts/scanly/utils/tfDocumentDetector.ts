/**
 * Phase 3 — TensorFlow.js GPU-accelerated document detection
 *
 * • Kullanır: decodeJpeg (@tensorflow/tfjs-react-native) — jpeg-js'ye gerek yok
 * • Backend: rn-webgl (expo-gl) → GPU conv2d Sobel filtreleri
 * • Geri dönüş: TF.js hazır değilse null döner, Phase 1 devreye girer
 *
 * Kullanım:
 *   initTF()                     — app başlangıcında (_layout.tsx)
 *   useTFStatus()                — React hook (GPU rozeti için kamera ekranında)
 *   detectDocumentCornersWithTF  — Phase 1'den sonra çağrılır, sonucu iyileştirir
 */

import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useEffect, useState } from 'react';

import type { DocumentCorners } from './documentDetector';

// ==========================================================================
// TF.js durumu izleme
// ==========================================================================

export type TFStatus = 'uninitialized' | 'initializing' | 'ready' | 'error';

let _status: TFStatus = 'uninitialized';
const _listeners = new Set<(s: TFStatus) => void>();

function setStatus(s: TFStatus): void {
  _status = s;
  _listeners.forEach(fn => fn(s));
}

/** Mevcut TF.js durumunu döndürür (senkron). */
export const getTFStatus = (): TFStatus => _status;

/** TF.js durum değişikliğine abone olur; unsubscribe fonksiyonu döndürür. */
export function subscribeTFStatus(cb: (s: TFStatus) => void): () => void {
  _listeners.add(cb);
  return () => { _listeners.delete(cb); };
}

/** Kamera ekranında GPU rozetini reaktif güncellemek için React hook. */
export function useTFStatus(): TFStatus {
  const [s, set] = useState<TFStatus>(getTFStatus);
  useEffect(() => subscribeTFStatus(set), []);
  return s;
}

// ==========================================================================
// Başlatma
// ==========================================================================

let _initPromise: Promise<void> | null = null;

/**
 * TF.js'yi arka planda başlatır (non-blocking).
 * _layout.tsx'ten çağrılmalı: `initTF().catch(() => {})`.
 *
 * Backend sırası: rn-webgl (expo-gl GPU) → cpu (geri dönüş)
 */
export async function initTF(): Promise<void> {
  if (_status === 'ready') return;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    setStatus('initializing');
    try {
      // (1) Core TF.js
      const tf = await import('@tensorflow/tfjs');
      // (2) React Native backend — rn-webgl (expo-gl) + cpu geri dönüşü
      await import('@tensorflow/tfjs-react-native');
      // (3) Backend hazır olana kadar bekle
      await tf.ready();

      setStatus('ready');
      console.log('[Phase 3] TF.js hazır — backend:', tf.getBackend());
    } catch (e) {
      setStatus('error');
      console.warn('[Phase 3] TF.js başlatma hatası:', e);
    }
  })();

  return _initPromise;
}

// ==========================================================================
// Tespit sabitleri
// ==========================================================================

const PROCESS_W   = 400;   // küçük resim genişliği (Phase 1'den daha yüksek)
const EDGE_THRESH = 0.08;
const MIN_EDGES   = 150;
const BORDER_SKIP = 5;

// ==========================================================================
// Ana tespit fonksiyonu
// ==========================================================================

/**
 * GPU-accelerated document corner detection.
 *
 * Adımlar:
 *   1. Görseli 400 px'e küçült
 *   2. decodeJpeg → gri tonlamalı [H,W,1] tensor
 *   3. conv2d Sobel (GPU) → kenar büyüklüğü haritası
 *   4. CPU'da extremal-point köşe bulma
 */
export async function detectDocumentCornersWithTF(
  uri: string,
): Promise<DocumentCorners | null> {
  // TF.js hazır değilse çalıştırma
  if (_status !== 'ready') return null;

  try {
    const tf         = await import('@tensorflow/tfjs');
    const { decodeJpeg } = await import('@tensorflow/tfjs-react-native');

    // 1. Küçült
    const small = await manipulateAsync(
      uri,
      [{ resize: { width: PROCESS_W } }],
      { format: SaveFormat.JPEG, compress: 0.85 },
    );

    // 2. base64 → Uint8Array
    const b64   = await FileSystem.readAsStringAsync(small.uri, { encoding: 'base64' });
    const bytes = base64ToUint8Array(b64);

    // 3. JPEG decode — gri tonlamalı [H,W,1] int32 tensor
    const grayscale = decodeJpeg(bytes, 1);
    const H = grayscale.shape[0];
    const W = grayscale.shape[1];

    // 4. GPU Sobel
    const edgeTensor = tf.tidy(() => {
      // [1, H, W, 1]  float32  [0,1]
      const gray = grayscale.toFloat().div(255).reshape([1, H, W, 1]);

      // Sobel kernel'leri  [kH, kW, inCh, outCh]
      const kX = tf.tensor4d([-1,  0, 1,  -2, 0, 2,  -1, 0, 1], [3, 3, 1, 1]);
      const kY = tf.tensor4d([-1, -2, -1,   0, 0, 0,   1, 2, 1], [3, 3, 1, 1]);

      // GPU conv2d
      const g4 = gray as unknown as Parameters<typeof tf.conv2d>[0];
      const eX = tf.conv2d(g4, kX, 1, 'same');
      const eY = tf.conv2d(g4, kY, 1, 'same');

      // Büyüklük → normalise
      const mag    = tf.sqrt(tf.add(tf.square(eX), tf.square(eY))).reshape([H, W]);
      const maxMag = (mag.max().arraySync() as number) || 1;
      return mag.div(maxMag);
    });

    tf.dispose(grayscale);

    // 5. CPU'ya geri oku
    const edgeData = (await edgeTensor.array()) as number[][];
    tf.dispose(edgeTensor);

    return findCorners(edgeData, W, H);
  } catch (err) {
    console.warn('[Phase 3] Tespit hatası:', err);
    return null;
  }
}

// ==========================================================================
// Yardımcı fonksiyonlar
// ==========================================================================

function base64ToUint8Array(b64: string): Uint8Array {
  const binary = atob(b64.replace(/\s/g, ''));
  const bytes  = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/**
 * Extremal-point yöntemi:
 *   TL → min(x+y)    TR → min(y-x)
 *   BL → max(y-x)    BR → max(x+y)
 */
function findCorners(matrix: number[][], W: number, H: number): DocumentCorners | null {
  let tlScore =  Infinity, trScore =  Infinity;
  let blScore = -Infinity, brScore = -Infinity;
  let tl = { x: 0, y: 0 }, tr = { x: 0, y: 0 };
  let bl = { x: 0, y: 0 }, br = { x: 0, y: 0 };
  let count = 0;

  for (let y = BORDER_SKIP; y < H - BORDER_SKIP; y++) {
    for (let x = BORDER_SKIP; x < W - BORDER_SKIP; x++) {
      if (matrix[y][x] < EDGE_THRESH) continue;
      count++;

      const nx = x / W, ny = y / H;
      const s1 = nx + ny, s2 = ny - nx;

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
