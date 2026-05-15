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
const HANDLE = 22;
const MIN_FRAC = 0.12;

type CropBox = { left: number; top: number; right: number; bottom: number };

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    RNImage.getSize(uri, (w, h) => resolve({ width: w, height: h }), reject);
  });
}

export default function CropScreen() {
  const insets = useSafeAreaInsets();
  const { capturedImageUri, setCapturedImageUri } = useScan();
  const [isProcessing, setIsProcessing] = useState(false);

  const containerRef = useRef({ width: 0, height: 0 });
  const cropBoxRef = useRef<CropBox>({ left: 0.04, top: 0.04, right: 0.96, bottom: 0.96 });
  const [cropBox, setCropBox] = useState<CropBox>({ left: 0.04, top: 0.04, right: 0.96, bottom: 0.96 });

  const updateBox = useCallback((next: CropBox) => {
    cropBoxRef.current = next;
    setCropBox({ ...next });
  }, []);

  const makePan = useCallback((corner: 'TL' | 'TR' | 'BL' | 'BR') => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        Haptics.selectionAsync();
      },
      onPanResponderMove: (_e, gs) => {
        const { width, height } = containerRef.current;
        if (!width || !height) return;
        const dx = gs.dx / width;
        const dy = gs.dy / height;
        const p = cropBoxRef.current;
        let next = { ...p };
        switch (corner) {
          case 'TL':
            next.left = Math.max(0, Math.min(p.right - MIN_FRAC, p.left + dx));
            next.top = Math.max(0, Math.min(p.bottom - MIN_FRAC, p.top + dy));
            break;
          case 'TR':
            next.right = Math.max(p.left + MIN_FRAC, Math.min(1, p.right + dx));
            next.top = Math.max(0, Math.min(p.bottom - MIN_FRAC, p.top + dy));
            break;
          case 'BL':
            next.left = Math.max(0, Math.min(p.right - MIN_FRAC, p.left + dx));
            next.bottom = Math.max(p.top + MIN_FRAC, Math.min(1, p.bottom + dy));
            break;
          case 'BR':
            next.right = Math.max(p.left + MIN_FRAC, Math.min(1, p.right + dx));
            next.bottom = Math.max(p.top + MIN_FRAC, Math.min(1, p.bottom + dy));
            break;
        }
        cropBoxRef.current = next;
        setCropBox({ ...next });
      },
    });
  }, []);

  const tlPan = useRef(makePan('TL')).current;
  const trPan = useRef(makePan('TR')).current;
  const blPan = useRef(makePan('BL')).current;
  const brPan = useRef(makePan('BR')).current;

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
    if (!capturedImageUri) {
      router.push('/scanner/enhance');
      return;
    }
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
        { compress: 0.9, format: SaveFormat.JPEG }
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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable style={styles.iconBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}>
          <Feather name="arrow-left" size={20} color={C.onSurface} />
        </Pressable>
        <Text style={styles.title}>Kırp</Text>
        <Pressable style={styles.iconBtn} onPress={handleContinue} disabled={isProcessing}>
          <Text style={styles.nextText}>İleri</Text>
        </Pressable>
      </View>

      <View
        style={styles.canvasArea}
        onLayout={e => {
          containerRef.current = {
            width: e.nativeEvent.layout.width,
            height: e.nativeEvent.layout.height,
          };
        }}
      >
        {capturedImageUri ? (
          <View style={styles.imageWrapper}>
            <Image
              source={{ uri: capturedImageUri }}
              style={styles.capturedImage}
              contentFit="contain"
            />

            <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
              <View
                style={[
                  styles.cropOverlay,
                  {
                    left: `${left * 100}%`,
                    top: `${top * 100}%`,
                    right: `${(1 - right) * 100}%`,
                    bottom: `${(1 - bottom) * 100}%`,
                  } as any,
                ]}
              >
                <View style={[styles.cropCorner, styles.cornerTL]} />
                <View style={[styles.cropCorner, styles.cornerTR]} />
                <View style={[styles.cropCorner, styles.cornerBL]} />
                <View style={[styles.cropCorner, styles.cornerBR]} />

                <View
                  style={[styles.handle, styles.handleTL]}
                  {...tlPan.panHandlers}
                >
                  <View style={styles.handleDot} />
                </View>
                <View
                  style={[styles.handle, styles.handleTR]}
                  {...trPan.panHandlers}
                >
                  <View style={styles.handleDot} />
                </View>
                <View
                  style={[styles.handle, styles.handleBL]}
                  {...blPan.panHandlers}
                >
                  <View style={styles.handleDot} />
                </View>
                <View
                  style={[styles.handle, styles.handleBR]}
                  {...brPan.panHandlers}
                >
                  <View style={styles.handleDot} />
                </View>
              </View>

              <View style={[styles.dimTop, { height: `${top * 100}%` }]} />
              <View style={[styles.dimBottom, { height: `${(1 - bottom) * 100}%` }]} />
              <View
                style={[
                  styles.dimLeft,
                  {
                    top: `${top * 100}%`,
                    bottom: `${(1 - bottom) * 100}%`,
                    width: `${left * 100}%`,
                  } as any,
                ]}
              />
              <View
                style={[
                  styles.dimRight,
                  {
                    top: `${top * 100}%`,
                    bottom: `${(1 - bottom) * 100}%`,
                    width: `${(1 - right) * 100}%`,
                  } as any,
                ]}
              />
            </View>

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

      <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.tools}>
          <Pressable style={styles.toolBtn} onPress={() => rotateImage(-90)} disabled={isProcessing}>
            <Feather name="rotate-ccw" size={22} color={isProcessing ? C.outline : C.onSurface} />
            <Text style={styles.toolLabel}>Sola</Text>
          </Pressable>
          <Pressable style={styles.toolBtn} onPress={() => rotateImage(90)} disabled={isProcessing}>
            <Feather name="rotate-cw" size={22} color={isProcessing ? C.outline : C.onSurface} />
            <Text style={styles.toolLabel}>Sağa</Text>
          </Pressable>
          <Pressable
            style={styles.toolBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              updateBox({ left: 0.01, top: 0.01, right: 0.99, bottom: 0.99 });
            }}
          >
            <Feather name="maximize" size={22} color={C.onSurface} />
            <Text style={styles.toolLabel}>Tam</Text>
          </Pressable>
          <Pressable style={styles.toolBtn} onPress={() => router.back()}>
            <Feather name="camera" size={22} color={C.secondary} />
            <Text style={styles.toolLabel}>Yeniden Çek</Text>
          </Pressable>
        </View>
        <Pressable
          style={({ pressed }) => [styles.continueBtn, { opacity: (pressed || isProcessing) ? 0.88 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
          onPress={handleContinue}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Text style={styles.continueBtnText}>Devam Et</Text>
              <Feather name="arrow-right" size={18} color="#ffffff" />
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  iconBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.surfaceContainerLowest, alignItems: 'center', justifyContent: 'center', shadowColor: C.secondary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2, borderWidth: 1, borderColor: `${C.outlineVariant}50` },
  title: { fontSize: 18, fontWeight: '600', color: C.onSurface, fontFamily: 'Inter_600SemiBold' },
  nextText: { fontSize: 16, fontWeight: '600', color: C.primary, fontFamily: 'Inter_600SemiBold', paddingHorizontal: 4 },
  canvasArea: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  imageWrapper: { width: '90%', height: '90%', position: 'relative' },
  capturedImage: { width: '100%', height: '100%' },
  cropOverlay: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: C.primary,
    borderStyle: 'solid',
  },
  cropCorner: { position: 'absolute', width: 20, height: 20, borderColor: C.primary, borderWidth: 3 },
  cornerTL: { top: -2, left: -2, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 3 },
  cornerTR: { top: -2, right: -2, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 3 },
  cornerBL: { bottom: -2, left: -2, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 3 },
  cornerBR: { bottom: -2, right: -2, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 3 },
  handle: { position: 'absolute', width: HANDLE + 12, height: HANDLE + 12, alignItems: 'center', justifyContent: 'center' },
  handleTL: { top: -(HANDLE / 2 + 6), left: -(HANDLE / 2 + 6) },
  handleTR: { top: -(HANDLE / 2 + 6), right: -(HANDLE / 2 + 6) },
  handleBL: { bottom: -(HANDLE / 2 + 6), left: -(HANDLE / 2 + 6) },
  handleBR: { bottom: -(HANDLE / 2 + 6), right: -(HANDLE / 2 + 6) },
  handleDot: { width: HANDLE, height: HANDLE, borderRadius: HANDLE / 2, backgroundColor: C.primary, shadowColor: C.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 4, elevation: 4 },
  dimTop: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  dimBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  dimLeft: { position: 'absolute', left: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  dimRight: { position: 'absolute', right: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  processingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', gap: 12 },
  processingText: { color: '#ffffff', fontSize: 14, fontFamily: 'Inter_500Medium' },
  noImagePlaceholder: { alignItems: 'center', gap: 12, opacity: 0.4 },
  noImageText: { fontSize: 14, color: C.secondary, fontFamily: 'Inter_400Regular' },
  bottomPanel: { backgroundColor: C.surfaceContainerLowest, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 20, gap: 16, shadowColor: C.secondary, shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 6, borderTopWidth: 1, borderColor: `${C.outlineVariant}30` },
  tools: { flexDirection: 'row', justifyContent: 'space-around' },
  toolBtn: { alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  toolLabel: { fontSize: 11, color: C.secondary, fontFamily: 'Inter_400Regular' },
  continueBtn: { backgroundColor: C.primary, borderRadius: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 4 },
  continueBtnText: { fontSize: 16, fontWeight: '600', color: '#ffffff', fontFamily: 'Inter_600SemiBold' },
});
