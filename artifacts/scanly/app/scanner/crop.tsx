import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image as RNImage,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import colors from '@/constants/colors';
import { useScan } from '@/context/ScanContext';

const C = colors.light;
const MIN_FRAC = 0.08;
const CORNER_TAP = 52;
const EDGE_TAP = 44;
const DEFAULT_BOX = { left: 0.05, top: 0.05, right: 0.95, bottom: 0.95 };

type CropBox = { left: number; top: number; right: number; bottom: number };
type HandleType = 'TL' | 'TR' | 'BL' | 'BR' | 'T' | 'B' | 'L' | 'R';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    RNImage.getSize(uri, (w, h) => resolve({ width: w, height: h }), reject);
  });
}

export default function CropScreen() {
  const insets = useSafeAreaInsets();
  const { capturedImageUri, setCapturedImageUri } = useScan();
  const [isProcessing, setIsProcessing] = useState(false);
  const [wrapLayout, setWrapLayout] = useState({ width: 0, height: 0 });
  const wrapLayoutRef = useRef({ width: 0, height: 0 });

  const cropBoxRef = useRef<CropBox>({ ...DEFAULT_BOX });
  const [cropBox, setCropBox] = useState<CropBox>({ ...DEFAULT_BOX });

  const updateBox = useCallback((next: CropBox) => {
    cropBoxRef.current = next;
    setCropBox({ ...next });
  }, []);

  const tlRef = useRef<CropBox>({ ...DEFAULT_BOX });
  const trRef = useRef<CropBox>({ ...DEFAULT_BOX });
  const blRef = useRef<CropBox>({ ...DEFAULT_BOX });
  const brRef = useRef<CropBox>({ ...DEFAULT_BOX });
  const tRef  = useRef<CropBox>({ ...DEFAULT_BOX });
  const bRef  = useRef<CropBox>({ ...DEFAULT_BOX });
  const lRef  = useRef<CropBox>({ ...DEFAULT_BOX });
  const rRef  = useRef<CropBox>({ ...DEFAULT_BOX });

  const tlPan = useRef(makePanResponder('TL', tlRef, cropBoxRef, wrapLayoutRef, updateBox)).current;
  const trPan = useRef(makePanResponder('TR', trRef, cropBoxRef, wrapLayoutRef, updateBox)).current;
  const blPan = useRef(makePanResponder('BL', blRef, cropBoxRef, wrapLayoutRef, updateBox)).current;
  const brPan = useRef(makePanResponder('BR', brRef, cropBoxRef, wrapLayoutRef, updateBox)).current;
  const tPan  = useRef(makePanResponder('T',  tRef,  cropBoxRef, wrapLayoutRef, updateBox)).current;
  const bPan  = useRef(makePanResponder('B',  bRef,  cropBoxRef, wrapLayoutRef, updateBox)).current;
  const lPan  = useRef(makePanResponder('L',  lRef,  cropBoxRef, wrapLayoutRef, updateBox)).current;
  const rPan  = useRef(makePanResponder('R',  rRef,  cropBoxRef, wrapLayoutRef, updateBox)).current;

  const rotateImage = async (degrees: number) => {
    if (!capturedImageUri) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsProcessing(true);
    try {
      const result = await manipulateAsync(capturedImageUri, [{ rotate: degrees }], {
        compress: 0.9,
        format: SaveFormat.JPEG,
      });
      setCapturedImageUri(result.uri);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleContinue = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!capturedImageUri) { router.push('/scanner/enhance'); return; }
    setIsProcessing(true);
    try {
      const { width: imgW, height: imgH } = await getImageSize(capturedImageUri);
      const { left, top, right, bottom } = cropBoxRef.current;
      const originX = Math.round(left * imgW);
      const originY = Math.round(top * imgH);
      const cropWidth = Math.max(1, Math.round((right - left) * imgW));
      const cropHeight = Math.max(1, Math.round((bottom - top) * imgH));
      const result = await manipulateAsync(
        capturedImageUri,
        [{ crop: { originX, originY, width: cropWidth, height: cropHeight } }],
        { compress: 0.92, format: SaveFormat.JPEG }
      );
      setCapturedImageUri(result.uri);
      router.push('/scanner/enhance');
    } catch {
      router.push('/scanner/enhance');
    } finally {
      setIsProcessing(false);
    }
  };

  const { left, top, right, bottom } = cropBox;
  const W = wrapLayout.width;
  const H = wrapLayout.height;
  const bxL = left * W;
  const bxT = top * H;
  const bxW = (right - left) * W;
  const bxH = (bottom - top) * H;
  const midX = bxL + bxW / 2;
  const midY = bxT + bxH / 2;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable
          style={styles.iconBtn}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
        >
          <Feather name="arrow-left" size={20} color={C.onSurface} />
        </Pressable>
        <Text style={styles.title}>Kırp & Düzenle</Text>
        <Pressable style={styles.nextBtn} onPress={handleContinue} disabled={isProcessing}>
          <Text style={styles.nextText}>İleri</Text>
          <Feather name="arrow-right" size={16} color={C.primary} />
        </Pressable>
      </View>

      <View style={styles.canvasArea}>
        {capturedImageUri ? (
          <View
            style={styles.imageWrapper}
            onLayout={e => {
              const { width, height } = e.nativeEvent.layout;
              wrapLayoutRef.current = { width, height };
              setWrapLayout({ width, height });
            }}
          >
            <Image source={{ uri: capturedImageUri }} style={styles.capturedImage} contentFit="contain" />

            {W > 0 && (
              <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                {/* Dim areas */}
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: bxT, backgroundColor: 'rgba(0,0,0,0.52)' }} pointerEvents="none" />
                <View style={{ position: 'absolute', top: bxT + bxH, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.52)' }} pointerEvents="none" />
                <View style={{ position: 'absolute', top: bxT, left: 0, width: bxL, height: bxH, backgroundColor: 'rgba(0,0,0,0.52)' }} pointerEvents="none" />
                <View style={{ position: 'absolute', top: bxT, left: bxL + bxW, width: W - bxL - bxW, height: bxH, backgroundColor: 'rgba(0,0,0,0.52)' }} pointerEvents="none" />

                {/* Crop box */}
                <View
                  style={{
                    position: 'absolute',
                    left: bxL, top: bxT,
                    width: bxW, height: bxH,
                    borderWidth: 1.5,
                    borderColor: 'rgba(255,255,255,0.9)',
                  }}
                  pointerEvents="none"
                >
                  {/* Rule-of-thirds grid */}
                  <View style={[styles.gridLineH, { top: bxH / 3 }]} />
                  <View style={[styles.gridLineH, { top: (bxH * 2) / 3 }]} />
                  <View style={[styles.gridLineV, { left: bxW / 3 }]} />
                  <View style={[styles.gridLineV, { left: (bxW * 2) / 3 }]} />
                </View>

                {/* Corner decorations */}
                <View style={[styles.cropCorner, styles.cropCornerTL, { left: bxL - 2, top: bxT - 2 }]} pointerEvents="none" />
                <View style={[styles.cropCorner, styles.cropCornerTR, { left: bxL + bxW - 18, top: bxT - 2 }]} pointerEvents="none" />
                <View style={[styles.cropCorner, styles.cropCornerBL, { left: bxL - 2, top: bxT + bxH - 18 }]} pointerEvents="none" />
                <View style={[styles.cropCorner, styles.cropCornerBR, { left: bxL + bxW - 18, top: bxT + bxH - 18 }]} pointerEvents="none" />

                {/* Edge mid handles */}
                <View
                  style={[styles.edgeHandle, { left: midX - EDGE_TAP / 2, top: bxT - EDGE_TAP / 2 }]}
                  {...tPan.panHandlers}
                >
                  <View style={styles.edgeDot} />
                </View>
                <View
                  style={[styles.edgeHandle, { left: midX - EDGE_TAP / 2, top: bxT + bxH - EDGE_TAP / 2 }]}
                  {...bPan.panHandlers}
                >
                  <View style={styles.edgeDot} />
                </View>
                <View
                  style={[styles.edgeHandle, { left: bxL - EDGE_TAP / 2, top: midY - EDGE_TAP / 2 }]}
                  {...lPan.panHandlers}
                >
                  <View style={styles.edgeDot} />
                </View>
                <View
                  style={[styles.edgeHandle, { left: bxL + bxW - EDGE_TAP / 2, top: midY - EDGE_TAP / 2 }]}
                  {...rPan.panHandlers}
                >
                  <View style={styles.edgeDot} />
                </View>

                {/* Corner handles */}
                <View
                  style={[styles.cornerHandle, { left: bxL - CORNER_TAP / 2, top: bxT - CORNER_TAP / 2 }]}
                  {...tlPan.panHandlers}
                >
                  <View style={[styles.cornerDot, styles.cornerDotTL]} />
                </View>
                <View
                  style={[styles.cornerHandle, { left: bxL + bxW - CORNER_TAP / 2, top: bxT - CORNER_TAP / 2 }]}
                  {...trPan.panHandlers}
                >
                  <View style={[styles.cornerDot, styles.cornerDotTR]} />
                </View>
                <View
                  style={[styles.cornerHandle, { left: bxL - CORNER_TAP / 2, top: bxT + bxH - CORNER_TAP / 2 }]}
                  {...blPan.panHandlers}
                >
                  <View style={[styles.cornerDot, styles.cornerDotBL]} />
                </View>
                <View
                  style={[styles.cornerHandle, { left: bxL + bxW - CORNER_TAP / 2, top: bxT + bxH - CORNER_TAP / 2 }]}
                  {...brPan.panHandlers}
                >
                  <View style={[styles.cornerDot, styles.cornerDotBR]} />
                </View>
              </View>
            )}

            {isProcessing && (
              <View style={styles.processingOverlay}>
                <ActivityIndicator color="#ffffff" size="large" />
                <Text style={styles.processingText}>İşleniyor...</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.noImagePlaceholder}>
            <Feather name="camera" size={40} color={C.outline} />
            <Text style={styles.noImageText}>Fotoğraf bulunamadı</Text>
          </View>
        )}
      </View>

      <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.tools}>
          <Pressable
            style={({ pressed }) => [styles.toolBtn, pressed && styles.toolBtnPressed]}
            onPress={() => rotateImage(-90)}
            disabled={isProcessing}
          >
            <Feather name="rotate-ccw" size={20} color={isProcessing ? C.outline : C.onSurface} />
            <Text style={styles.toolLabel}>Sola Döndür</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.toolBtn, pressed && styles.toolBtnPressed]}
            onPress={() => rotateImage(90)}
            disabled={isProcessing}
          >
            <Feather name="rotate-cw" size={20} color={isProcessing ? C.outline : C.onSurface} />
            <Text style={styles.toolLabel}>Sağa Döndür</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.toolBtn, pressed && styles.toolBtnPressed]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              updateBox({ left: 0.02, top: 0.02, right: 0.98, bottom: 0.98 });
            }}
          >
            <Feather name="maximize-2" size={20} color={C.onSurface} />
            <Text style={styles.toolLabel}>Tümünü Seç</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.toolBtn, pressed && styles.toolBtnPressed]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              updateBox({ ...DEFAULT_BOX });
            }}
          >
            <Feather name="crop" size={20} color={C.primary} />
            <Text style={[styles.toolLabel, { color: C.primary }]}>Sıfırla</Text>
          </Pressable>
        </View>
        <View style={styles.actionRow}>
          <Pressable
            style={({ pressed }) => [styles.retakeBtn, { opacity: pressed ? 0.75 : 1 }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
          >
            <Feather name="camera" size={18} color={C.secondary} />
            <Text style={styles.retakeBtnText}>Yeniden Çek</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.continueBtn,
              { opacity: (pressed || isProcessing) ? 0.88 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
            ]}
            onPress={handleContinue}
            disabled={isProcessing}
          >
            {isProcessing
              ? <ActivityIndicator color="#ffffff" />
              : <>
                  <Text style={styles.continueBtnText}>Devam Et</Text>
                  <Feather name="arrow-right" size={18} color="#ffffff" />
                </>
            }
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function makePanResponder(
  type: HandleType,
  startBoxRef: React.MutableRefObject<CropBox>,
  cropBoxRef: React.MutableRefObject<CropBox>,
  wrapLayoutRef: React.MutableRefObject<{ width: number; height: number }>,
  updateBox: (b: CropBox) => void,
) {
  return PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      startBoxRef.current = { ...cropBoxRef.current };
      Haptics.selectionAsync();
    },
    onPanResponderMove: (_e, gs) => {
      const { width, height } = wrapLayoutRef.current;
      if (!width || !height) return;
      const dx = gs.dx / width;
      const dy = gs.dy / height;
      const s = startBoxRef.current;
      const next: CropBox = { ...s };
      switch (type) {
        case 'TL':
          next.left = clamp(s.left + dx, 0, s.right - MIN_FRAC);
          next.top  = clamp(s.top  + dy, 0, s.bottom - MIN_FRAC);
          break;
        case 'TR':
          next.right = clamp(s.right + dx, s.left + MIN_FRAC, 1);
          next.top   = clamp(s.top  + dy, 0, s.bottom - MIN_FRAC);
          break;
        case 'BL':
          next.left   = clamp(s.left + dx, 0, s.right - MIN_FRAC);
          next.bottom = clamp(s.bottom + dy, s.top + MIN_FRAC, 1);
          break;
        case 'BR':
          next.right  = clamp(s.right + dx, s.left + MIN_FRAC, 1);
          next.bottom = clamp(s.bottom + dy, s.top + MIN_FRAC, 1);
          break;
        case 'T': next.top    = clamp(s.top  + dy, 0, s.bottom - MIN_FRAC); break;
        case 'B': next.bottom = clamp(s.bottom + dy, s.top + MIN_FRAC, 1);  break;
        case 'L': next.left   = clamp(s.left + dx, 0, s.right - MIN_FRAC);  break;
        case 'R': next.right  = clamp(s.right + dx, s.left + MIN_FRAC, 1);  break;
      }
      updateBox(next);
    },
    onPanResponderRelease: () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
  });
}

const CORNER_VIS = 20;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111111' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#111111',
  },
  iconBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 17, fontWeight: '600', color: '#ffffff', fontFamily: 'Inter_600SemiBold' },
  nextBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: `${C.primary}18` },
  nextText: { fontSize: 15, fontWeight: '600', color: C.primary, fontFamily: 'Inter_600SemiBold' },

  canvasArea: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111111' },
  imageWrapper: { width: '94%', height: '94%', position: 'relative' },
  capturedImage: { width: '100%', height: '100%' },

  gridLineH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.18)' },
  gridLineV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.18)' },

  cropCorner: { position: 'absolute', width: CORNER_VIS, height: CORNER_VIS, borderColor: C.primary, borderWidth: 3 },
  cropCornerTL: { borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 3 },
  cropCornerTR: { borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 3 },
  cropCornerBL: { borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 3 },
  cropCornerBR: { borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 3 },

  cornerHandle: {
    position: 'absolute',
    width: CORNER_TAP, height: CORNER_TAP,
    alignItems: 'center', justifyContent: 'center',
    zIndex: 10,
  },
  cornerDot: {
    width: 16, height: 16,
    backgroundColor: C.primary,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 6, elevation: 6,
  },
  cornerDotTL: { borderTopLeftRadius: 4, borderTopRightRadius: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 10 },
  cornerDotTR: { borderTopLeftRadius: 0, borderTopRightRadius: 4, borderBottomLeftRadius: 10, borderBottomRightRadius: 0 },
  cornerDotBL: { borderTopLeftRadius: 0, borderTopRightRadius: 10, borderBottomLeftRadius: 4, borderBottomRightRadius: 0 },
  cornerDotBR: { borderTopLeftRadius: 10, borderTopRightRadius: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 4 },

  edgeHandle: {
    position: 'absolute',
    width: EDGE_TAP, height: EDGE_TAP,
    alignItems: 'center', justifyContent: 'center',
    zIndex: 9,
  },
  edgeDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#ffffff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.4, shadowRadius: 3, elevation: 3,
    borderWidth: 1.5, borderColor: C.primary,
  },

  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center', gap: 14,
  },
  processingText: { color: '#ffffff', fontSize: 14, fontFamily: 'Inter_500Medium' },
  noImagePlaceholder: { alignItems: 'center', gap: 12, opacity: 0.4 },
  noImageText: { fontSize: 14, color: '#ffffff', fontFamily: 'Inter_400Regular' },

  bottomPanel: {
    backgroundColor: C.surfaceContainerLowest,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 16, gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 8,
    borderTopWidth: 1, borderColor: `${C.outlineVariant}30`,
  },
  tools: { flexDirection: 'row', justifyContent: 'space-around' },
  toolBtn: { alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, minWidth: 64 },
  toolBtnPressed: { backgroundColor: `${C.primary}12` },
  toolLabel: { fontSize: 10, color: C.secondary, fontFamily: 'Inter_400Regular', textAlign: 'center' },

  actionRow: { flexDirection: 'row', gap: 12 },
  retakeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: C.outlineVariant, backgroundColor: 'transparent',
  },
  retakeBtnText: { fontSize: 14, color: C.secondary, fontFamily: 'Inter_500Medium' },
  continueBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 14, paddingVertical: 15,
    backgroundColor: C.primary,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 10, elevation: 4,
  },
  continueBtnText: { fontSize: 16, fontWeight: '600', color: '#ffffff', fontFamily: 'Inter_600SemiBold' },
});
