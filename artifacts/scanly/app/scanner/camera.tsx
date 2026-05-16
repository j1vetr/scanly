import { Feather } from '@expo/vector-icons';
import { CameraView, CameraType, useCameraPermissions, FlashMode } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
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
const SEARCH_MS  = 3000;
const DETECTED_MS = 4500;
const AUTO_CROP_MARGIN = 0.07;

export default function CameraScreen() {
  const insets = useSafeAreaInsets();
  const { setCapturedImageUri, addCapturedImage, capturedImages, resetScan } = useScan();
  const [permission, requestPermission] = useCameraPermissions();
  const [flashMode, setFlashMode] = useState<FlashMode>('off');
  const [facing] = useState<CameraType>('back');
  const [mode, setMode] = useState<'OTOMATİK' | 'MANUEL'>('OTOMATİK');
  const [isCapturing, setIsCapturing] = useState(false);
  const [detected, setDetected] = useState(false);
  const [frameHeight, setFrameHeight] = useState(280);
  const cameraRef = useRef<CameraView>(null);

  const scanY         = useRef(new Animated.Value(0)).current;
  const glowOpacity   = useRef(new Animated.Value(0)).current;
  const cornerOpacity = useRef(new Animated.Value(1)).current;
  const cornerScale   = useRef(new Animated.Value(1)).current;

  const isMultiPage = capturedImages.length > 0;
  const isAutoNative = mode === 'OTOMATİK' && Platform.OS !== 'web';

  // Continuous detection loop: SEARCH → DETECTED → SEARCH → …
  useEffect(() => {
    if (!isAutoNative) {
      setDetected(false);
      return;
    }

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const clearTimers = () => timers.forEach(clearTimeout);

    const runCycle = () => {
      if (cancelled) return;
      setDetected(false);
      scanY.setValue(0);
      glowOpacity.setValue(0);
      cornerOpacity.setValue(1);
      cornerScale.setValue(1);

      const scanLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(scanY, { toValue: 1, duration: 1600, useNativeDriver: true }),
          Animated.timing(scanY, { toValue: 0, duration: 200,  useNativeDriver: true }),
        ])
      );
      const cornerPulse = Animated.loop(
        Animated.sequence([
          Animated.timing(cornerOpacity, { toValue: 0.25, duration: 500, useNativeDriver: true }),
          Animated.timing(cornerOpacity, { toValue: 1,    duration: 500, useNativeDriver: true }),
        ])
      );
      scanLoop.start();
      cornerPulse.start();

      const t1 = setTimeout(() => {
        if (cancelled) return;
        scanLoop.stop();
        cornerPulse.stop();
        cornerOpacity.setValue(1);
        setDetected(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        Animated.parallel([
          Animated.spring(cornerScale, {
            toValue: 1.22, friction: 3, tension: 140, useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(glowOpacity, { toValue: 1,    duration: 160, useNativeDriver: true }),
            Animated.timing(glowOpacity, { toValue: 0.22, duration: 260, useNativeDriver: true }),
            Animated.timing(glowOpacity, { toValue: 0.9,  duration: 160, useNativeDriver: true }),
            Animated.timing(glowOpacity, { toValue: 0.28, duration: 260, useNativeDriver: true }),
            Animated.timing(glowOpacity, { toValue: 0.5,  duration: 500, useNativeDriver: true }),
          ]),
        ]).start(() => {
          if (!cancelled) {
            Animated.spring(cornerScale, {
              toValue: 1, friction: 5, tension: 60, useNativeDriver: true,
            }).start();
          }
        });

        // After DETECTED_MS: loop back to searching
        const t2 = setTimeout(runCycle, DETECTED_MS);
        timers.push(t2);
      }, SEARCH_MS);
      timers.push(t1);
    };

    runCycle();

    return () => {
      cancelled = true;
      clearTimers();
      scanY.stopAnimation();
      cornerOpacity.stopAnimation();
      cornerScale.stopAnimation();
      glowOpacity.stopAnimation();
    };
  }, [isAutoNative]);

  // Navigate after capture
  const afterCapture = async (uri: string, imgWidth: number, imgHeight: number) => {
    if (isMultiPage) {
      addCapturedImage(uri);
      router.replace('/scanner/preview');
      return;
    }
    // AUTO + detected → auto-crop then skip to enhance
    if (isAutoNative && detected) {
      try {
        const m = AUTO_CROP_MARGIN;
        const cropped = await manipulateAsync(
          uri,
          [{
            crop: {
              originX: Math.round(m * imgWidth),
              originY: Math.round(m * imgHeight),
              width:   Math.max(1, Math.round((1 - 2 * m) * imgWidth)),
              height:  Math.max(1, Math.round((1 - 2 * m) * imgHeight)),
            },
          }],
          { compress: 0.92, format: SaveFormat.JPEG }
        );
        setCapturedImageUri(cropped.uri);
      } catch {
        setCapturedImageUri(uri);
      }
      router.push('/scanner/enhance');
    } else {
      setCapturedImageUri(uri);
      router.push('/scanner/crop');
    }
  };

  const handleCapture = async () => {
    if (isCapturing) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsCapturing(true);
    try {
      if (Platform.OS === 'web' || !cameraRef.current) {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: 'images', quality: 0.9, allowsEditing: false,
        });
        if (!result.canceled && result.assets[0]) {
          const a = result.assets[0];
          await afterCapture(a.uri, a.width ?? 1920, a.height ?? 2560);
        }
      } else {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.9, base64: false, skipProcessing: false,
        });
        if (photo?.uri) {
          await afterCapture(photo.uri, photo.width ?? 1920, photo.height ?? 2560);
        }
      }
    } catch (err) {
      console.error('Fotoğraf çekme hatası:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleGallery = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images', quality: 0.9, allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      if (isMultiPage) {
        addCapturedImage(a.uri);
        router.replace('/scanner/preview');
      } else {
        setCapturedImageUri(a.uri);
        router.push('/scanner/crop');
      }
    }
  };

  const toggleFlash = () => {
    setFlashMode(f => (f === 'off' ? 'on' : 'off'));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const scanTranslateY = scanY.interpolate({
    inputRange: [0, 1],
    outputRange: [0, frameHeight - 2],
  });

  const renderTopBar = () => (
    <View style={styles.topControls}>
      <Pressable
        style={styles.iconBtn}
        onPress={() => { isMultiPage ? router.back() : (resetScan(), router.back()); }}
      >
        <Feather name={isMultiPage ? 'arrow-left' : 'x'} size={22} color="#fff" />
      </Pressable>

      <View style={styles.modeToggle}>
        {(['OTOMATİK', 'MANUEL'] as const).map(m => (
          <Pressable
            key={m}
            style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
            onPress={() => { setMode(m); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          >
            <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>{m}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.iconBtn} onPress={toggleFlash}>
        <Feather
          name={flashMode === 'on' ? 'zap' : 'zap-off'}
          size={22}
          color={flashMode === 'on' ? '#34d399' : '#fff'}
        />
      </Pressable>
    </View>
  );

  const renderCenter = (webMode: boolean) => (
    <View style={styles.centerArea}>
      {isMultiPage && (
        <View style={styles.pageCountBadge}>
          <Feather name="layers" size={13} color="#fff" />
          <Text style={styles.pageCountText}>{capturedImages.length} sayfa</Text>
        </View>
      )}

      {/* Status pill */}
      <View style={[styles.statusPill, isAutoNative && detected && styles.statusPillDetected]}>
        {isAutoNative ? (
          detected ? (
            <>
              <Feather name="check-circle" size={14} color="#34d399" />
              <Text style={[styles.statusText, { color: '#34d399', fontFamily: 'Inter_600SemiBold' }]}>
                Belge Algılandı — Çekin
              </Text>
            </>
          ) : (
            <>
              <Animated.View style={{ opacity: cornerOpacity }}>
                <Feather name="search" size={14} color="#68dba9" />
              </Animated.View>
              <Text style={styles.statusText}>Belge Taranıyor...</Text>
            </>
          )
        ) : (
          <>
            <Feather name="file-text" size={14} color="#68dba9" />
            <Text style={styles.statusText}>
              {webMode
                ? (isMultiPage ? `Sayfa ${capturedImages.length + 1} — Galeriden Seçin` : 'Galeriden Belge Seçin')
                : `Manuel — Belgeyi Çerçeveye Yerleştirin`
              }
            </Text>
          </>
        )}
      </View>

      {/* Detection frame */}
      <View
        style={[styles.docFrame, isAutoNative && detected && styles.docFrameDetected]}
        onLayout={e => setFrameHeight(e.nativeEvent.layout.height)}
      >
        {/* Animated corners */}
        {(['TL','TR','BL','BR'] as const).map(c => (
          <Animated.View
            key={c}
            style={[
              styles.corner,
              c === 'TL' && styles.cornerTL,
              c === 'TR' && styles.cornerTR,
              c === 'BL' && styles.cornerBL,
              c === 'BR' && styles.cornerBR,
              isAutoNative && detected && styles.cornerDetected,
              {
                opacity: isAutoNative && !detected ? cornerOpacity : 1,
                transform: [{ scale: isAutoNative && detected ? cornerScale : 1 }],
              },
            ]}
          />
        ))}

        {/* Scan line */}
        {isAutoNative && !detected && (
          <Animated.View
            style={[styles.scanLine, { transform: [{ translateY: scanTranslateY }] }]}
          />
        )}

        {/* Detected glow */}
        {isAutoNative && detected && (
          <Animated.View style={[styles.detectedGlow, { opacity: glowOpacity }]} />
        )}

        <View style={styles.frameOverlay} />
      </View>

      {/* Detected hint */}
      {isAutoNative && detected && (
        <View style={styles.detectedHint}>
          <Feather name="zap" size={12} color="#34d399" />
          <Text style={styles.detectedHintText}>
            Otomatik kırpılacak — kırpma ekranı atlanıyor
          </Text>
        </View>
      )}
    </View>
  );

  const renderBottom = (webMode: boolean) => (
    <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 16 }]}>
      <Pressable style={styles.sideBtn} onPress={handleGallery}>
        <Feather name="image" size={22} color="#fff" />
        <Text style={styles.sideBtnLabel}>Galeri</Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.captureBtn,
          isAutoNative && detected && styles.captureBtnReady,
          { transform: [{ scale: isCapturing ? 0.9 : pressed ? 0.93 : 1 }] },
        ]}
        onPress={handleCapture}
        disabled={isCapturing}
      >
        {isCapturing
          ? <ActivityIndicator color="#fff" size="large" />
          : <View style={[styles.captureInner, isAutoNative && detected && styles.captureInnerReady]} />
        }
      </Pressable>

      {(webMode && !isMultiPage) ? (
        <View style={styles.sideBtn} />
      ) : (
        <Pressable
          style={[styles.sideBtn, isMultiPage && styles.sideBtnGreen]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            if (isMultiPage) {
              router.replace('/scanner/preview');
            } else {
              router.push('/scanner/crop');
            }
          }}
        >
          <Feather
            name={isMultiPage ? 'check' : 'sliders'}
            size={22}
            color={isMultiPage ? '#34d399' : 'rgba(255,255,255,0.7)'}
          />
          <Text style={[styles.sideBtnLabel, isMultiPage && { color: '#34d399' }]}>
            {isMultiPage ? 'Bitti' : 'Kırp'}
          </Text>
        </Pressable>
      )}
    </View>
  );

  if (Platform.OS !== 'web' && !permission) {
    return <View style={styles.permContainer}><ActivityIndicator color={C.primary} /></View>;
  }

  if (Platform.OS !== 'web' && !permission?.granted) {
    return (
      <View style={[styles.permContainer, { paddingTop: insets.top + 20 }]}>
        <View style={styles.permCard}>
          <View style={styles.permIconWrap}>
            <Feather name="camera" size={40} color={C.primary} />
          </View>
          <Text style={styles.permTitle}>Kamera İzni Gerekli</Text>
          <Text style={styles.permDesc}>Belge taramak için kameraya erişim izni gereklidir.</Text>
          <Pressable
            style={({ pressed }) => [styles.permBtn, { opacity: pressed ? 0.88 : 1 }]}
            onPress={requestPermission}
          >
            <Text style={styles.permBtnText}>İzin Ver</Text>
          </Pressable>
          <Pressable style={styles.permGalleryBtn} onPress={handleGallery}>
            <Feather name="image" size={16} color={C.primary} />
            <Text style={styles.permGalleryText}>Galeriden Seç</Text>
          </Pressable>
        </View>
        <Pressable
          style={[styles.permClose, { top: insets.top + 8 }]}
          onPress={() => { resetScan(); router.back(); }}
        >
          <Feather name="x" size={22} color={C.onSurface} />
        </Pressable>
      </View>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <View style={styles.webBg}>
          {Array.from({ length: 9 }).map((_, i) => (
            <View key={i} style={styles.cameraGridCell} />
          ))}
        </View>
        <View style={[styles.overlay, { paddingTop: insets.top + 8 }]}>
          {renderTopBar()}
          {renderCenter(true)}
          {renderBottom(true)}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        flash={flashMode}
        autofocus="on"
      />
      <View style={[styles.overlay, { paddingTop: insets.top + 8 }]}>
        {renderTopBar()}
        {renderCenter(false)}
        {renderBottom(false)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  permContainer: { flex: 1, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center', padding: 24 },
  permCard: { backgroundColor: '#fff', borderRadius: 24, padding: 32, alignItems: 'center', gap: 16, width: '100%', maxWidth: 360, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 8 },
  permIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: `${C.primary}15`, alignItems: 'center', justifyContent: 'center' },
  permTitle: { fontSize: 20, fontWeight: '700', color: C.onSurface, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  permDesc: { fontSize: 14, color: C.secondary, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 20 },
  permBtn: { backgroundColor: C.primary, borderRadius: 14, paddingVertical: 14, width: '100%', alignItems: 'center' },
  permBtnText: { fontSize: 16, fontWeight: '600', color: '#fff', fontFamily: 'Inter_600SemiBold' },
  permGalleryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  permGalleryText: { fontSize: 14, color: C.primary, fontFamily: 'Inter_500Medium' },
  permClose: { position: 'absolute', right: 20, width: 42, height: 42, borderRadius: 21, backgroundColor: C.surfaceContainerLowest, alignItems: 'center', justifyContent: 'center' },

  webBg: { ...StyleSheet.absoluteFillObject, backgroundColor: '#1a1a1a', flexDirection: 'row', flexWrap: 'wrap' },
  cameraGridCell: { width: '33.33%', aspectRatio: 1, borderWidth: 0.3, borderColor: 'rgba(255,255,255,0.05)' },

  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },

  topControls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modeToggle: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 24, padding: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  modeBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20 },
  modeBtnActive: { backgroundColor: '#fff' },
  modeBtnText: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.65)', fontFamily: 'Inter_600SemiBold' },
  modeBtnTextActive: { color: '#000' },

  centerArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 16 },
  pageCountBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,105,72,0.75)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  pageCountText: { fontSize: 12, color: '#fff', fontWeight: '600', fontFamily: 'Inter_600SemiBold' },

  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 9, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  statusPillDetected: { backgroundColor: 'rgba(0,40,25,0.88)', borderColor: 'rgba(52,211,153,0.5)' },
  statusText: { fontSize: 13, color: '#fff', fontFamily: 'Inter_500Medium' },

  docFrame: { width: '84%', aspectRatio: 3 / 4, position: 'relative' },
  docFrameDetected: {},

  corner: { position: 'absolute', width: 26, height: 26, borderColor: '#68dba9', borderWidth: 3 },
  cornerDetected: { borderColor: '#34d399', borderWidth: 3.5 },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 5 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 5 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 5 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 5 },

  scanLine: { position: 'absolute', left: 6, right: 6, height: 2, backgroundColor: 'rgba(52,211,153,0.85)', shadowColor: '#34d399', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 8, elevation: 3 },
  detectedGlow: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(52,211,153,0.1)', borderRadius: 4, borderWidth: 2, borderColor: '#34d399' },
  frameOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(104,219,169,0.03)' },

  detectedHint: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  detectedHintText: { fontSize: 11, color: '#34d399', fontFamily: 'Inter_500Medium' },

  bottomControls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 44, paddingTop: 20, backgroundColor: 'rgba(0,0,0,0.65)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  sideBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', gap: 3 },
  sideBtnGreen: { backgroundColor: 'rgba(52,211,153,0.15)', borderWidth: 1, borderColor: 'rgba(52,211,153,0.4)' },
  sideBtnLabel: { fontSize: 9, color: 'rgba(255,255,255,0.6)', fontFamily: 'Inter_500Medium' },

  captureBtn: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  captureBtnReady: { borderColor: '#34d399' },
  captureInner: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#fff' },
  captureInnerReady: { backgroundColor: '#34d399' },
});
