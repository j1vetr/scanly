import { Feather } from '@expo/vector-icons';
import { CameraView, CameraType, useCameraPermissions, FlashMode } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import colors from '@/constants/colors';
import { useScan } from '@/context/ScanContext';

const C = colors.light;
const DETECT_DELAY_MS = 3000;

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
  const [pageAddedFlash, setPageAddedFlash] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scanY = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const cornerOpacity = useRef(new Animated.Value(1)).current;
  const cornerScale = useRef(new Animated.Value(1)).current;

  const isMultiPage = capturedImages.length > 0;

  useEffect(() => {
    if (mode !== 'OTOMATİK' || Platform.OS === 'web') return;
    setDetected(false);
    scanY.setValue(0);
    glowOpacity.setValue(0);
    cornerOpacity.setValue(1);
    cornerScale.setValue(1);

    const scanLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanY, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(scanY, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.delay(100),
      ])
    );
    const cornerPulse = Animated.loop(
      Animated.sequence([
        Animated.timing(cornerOpacity, { toValue: 0.35, duration: 600, useNativeDriver: true }),
        Animated.timing(cornerOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    scanLoop.start();
    cornerPulse.start();

    const detectTimer = setTimeout(() => {
      scanLoop.stop();
      cornerPulse.stop();
      setDetected(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Animated.parallel([
        Animated.spring(cornerScale, {
          toValue: 1.25,
          friction: 3,
          tension: 120,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(glowOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.25, duration: 280, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.9, duration: 180, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.25, duration: 280, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.45, duration: 500, useNativeDriver: true }),
        ]),
      ]).start(() => {
        Animated.spring(cornerScale, {
          toValue: 1,
          friction: 4,
          tension: 80,
          useNativeDriver: true,
        }).start();
        cornerOpacity.setValue(1);
      });
    }, DETECT_DELAY_MS);

    return () => {
      scanLoop.stop();
      cornerPulse.stop();
      clearTimeout(detectTimer);
    };
  }, [mode]);

  useEffect(() => {
    if (mode === 'MANUEL') {
      setDetected(false);
      cornerOpacity.setValue(1);
      cornerScale.setValue(1);
      glowOpacity.setValue(0);
    }
  }, [mode]);

  const triggerPageAddedFeedback = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPageAddedFlash(true);
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    flashTimeoutRef.current = setTimeout(() => setPageAddedFlash(false), 600);
  }, []);

  useEffect(() => {
    return () => {
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    };
  }, []);

  const handleCapture = async () => {
    if (isCapturing) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsCapturing(true);
    try {
      if (Platform.OS === 'web' || !cameraRef.current) {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: 'images',
          quality: 0.9,
          allowsEditing: false,
        });
        if (!result.canceled && result.assets[0]) {
          if (isMultiPage) {
            addCapturedImage(result.assets[0].uri);
            triggerPageAddedFeedback();
          } else {
            setCapturedImageUri(result.assets[0].uri);
            router.push('/scanner/crop');
          }
        }
      } else {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.9,
          base64: false,
          skipProcessing: false,
        });
        if (photo?.uri) {
          if (isMultiPage) {
            addCapturedImage(photo.uri);
            triggerPageAddedFeedback();
          } else {
            setCapturedImageUri(photo.uri);
            router.push('/scanner/crop');
          }
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
      mediaTypes: 'images',
      quality: 0.9,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      if (isMultiPage) {
        addCapturedImage(result.assets[0].uri);
        triggerPageAddedFeedback();
      } else {
        setCapturedImageUri(result.assets[0].uri);
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

  const isAutoNative = mode === 'OTOMATİK' && Platform.OS !== 'web';

  const renderTopBar = () => (
    <View style={styles.topControls}>
      <Pressable
        style={styles.iconBtn}
        onPress={() => {
          if (isMultiPage) { router.back(); } else { resetScan(); router.back(); }
        }}
      >
        <Feather name={isMultiPage ? 'arrow-left' : 'x'} size={22} color="#ffffff" />
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
          color={flashMode === 'on' ? '#34d399' : '#ffffff'}
        />
      </Pressable>
    </View>
  );

  const renderCenter = (webMode: boolean) => (
    <View style={styles.centerFrame}>
      {isMultiPage && (
        <View style={styles.pageCountBadge}>
          <Feather name="layers" size={13} color="#ffffff" />
          <Text style={styles.pageCountText}>{capturedImages.length} sayfa</Text>
        </View>
      )}

      <View style={styles.statusPillRow}>
        <View style={[styles.statusPill, isAutoNative && detected && styles.statusPillDetected]}>
          {isAutoNative ? (
            detected ? (
              <>
                <Feather name="check-circle" size={14} color="#34d399" />
                <Text style={[styles.statusText, styles.statusTextDetected]}>Belge Algılandı</Text>
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
                  : (isMultiPage ? `Sayfa ${capturedImages.length + 1} — Çerçeveye Yerleştirin` : 'Manuel — Çerçeveye Yerleştirin')
                }
              </Text>
            </>
          )}
        </View>
      </View>

      <View
        style={[
          styles.docFrame,
          isAutoNative && detected && styles.docFrameDetected,
        ]}
        onLayout={e => setFrameHeight(e.nativeEvent.layout.height)}
      >
        <Animated.View
          style={[
            styles.corner, styles.cornerTL,
            isAutoNative && detected && styles.cornerDetected,
            { opacity: isAutoNative && !detected ? cornerOpacity : 1, transform: [{ scale: isAutoNative && detected ? cornerScale : 1 }] },
          ]}
        />
        <Animated.View
          style={[
            styles.corner, styles.cornerTR,
            isAutoNative && detected && styles.cornerDetected,
            { opacity: isAutoNative && !detected ? cornerOpacity : 1, transform: [{ scale: isAutoNative && detected ? cornerScale : 1 }] },
          ]}
        />
        <Animated.View
          style={[
            styles.corner, styles.cornerBL,
            isAutoNative && detected && styles.cornerDetected,
            { opacity: isAutoNative && !detected ? cornerOpacity : 1, transform: [{ scale: isAutoNative && detected ? cornerScale : 1 }] },
          ]}
        />
        <Animated.View
          style={[
            styles.corner, styles.cornerBR,
            isAutoNative && detected && styles.cornerDetected,
            { opacity: isAutoNative && !detected ? cornerOpacity : 1, transform: [{ scale: isAutoNative && detected ? cornerScale : 1 }] },
          ]}
        />

        {isAutoNative && !detected && (
          <Animated.View
            style={[styles.scanLine, { transform: [{ translateY: scanTranslateY }] }]}
          />
        )}

        {isAutoNative && detected && (
          <Animated.View style={[styles.detectedGlow, { opacity: glowOpacity }]} />
        )}

        <View style={styles.frameOverlay} />
      </View>

      {isAutoNative && detected && (
        <View style={styles.detectedHint}>
          <Feather name="chevron-down" size={13} color="#34d399" />
          <Text style={styles.detectedHintText}>Çekmek için düğmeye basın</Text>
        </View>
      )}
    </View>
  );

  const renderThumbnails = () => {
    if (!isMultiPage) return null;
    return (
      <View style={styles.thumbnailStrip}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbnailScrollContent}
        >
          {capturedImages.map((uri, index) => (
            <View key={`thumb-${index}`} style={styles.thumbnailWrapper}>
              <Image
                source={{ uri }}
                style={styles.thumbnailImage}
                contentFit="cover"
              />
              <View style={styles.thumbnailBadge}>
                <Text style={styles.thumbnailBadgeText}>{index + 1}</Text>
              </View>
            </View>
          ))}
          <View style={styles.thumbnailNextSlot}>
            <Feather name="plus" size={20} color="rgba(255,255,255,0.6)" />
            <Text style={styles.thumbnailNextText}>{capturedImages.length + 1}. Sayfa</Text>
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderBottom = (webMode: boolean) => (
    <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 16 }]}>
      <Pressable style={styles.galleryBtn} onPress={handleGallery}>
        <Feather name="image" size={22} color="#ffffff" />
        {!webMode && <Text style={styles.galleryLabel}>Galeri</Text>}
      </Pressable>

      <View style={styles.captureGroup}>
        <Pressable
          style={({ pressed }) => [
            styles.captureBtn,
            isMultiPage && styles.captureBtnMulti,
            isAutoNative && detected && !isMultiPage && styles.captureBtnReady,
            { transform: [{ scale: isCapturing ? 0.9 : pressed ? 0.93 : 1 }] },
          ]}
          onPress={handleCapture}
          disabled={isCapturing}
        >
          {isCapturing
            ? <ActivityIndicator color="#ffffff" size="large" />
            : isMultiPage
              ? (
                <View style={styles.captureInnerMulti}>
                  <Feather name="plus" size={28} color="#ffffff" />
                </View>
              )
              : (
                <View style={[styles.captureInner, isAutoNative && detected && styles.captureInnerReady]} />
              )
          }
        </Pressable>
        {isMultiPage && (
          <Text style={styles.captureMultiLabel}>Sayfa Ekle</Text>
        )}
      </View>

      {webMode && isMultiPage ? (
        <Pressable
          style={[styles.galleryBtn, styles.doneBtnActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.replace('/scanner/preview');
          }}
        >
          <Feather name="check" size={22} color="#34d399" />
          <Text style={[styles.galleryLabel, { color: '#34d399' }]}>Bitti</Text>
        </Pressable>
      ) : webMode ? (
        <View style={styles.galleryBtn} />
      ) : (
        <Pressable
          style={[styles.galleryBtn, isMultiPage && styles.doneBtnActive]}
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
          <Text style={[styles.galleryLabel, isMultiPage && { color: '#34d399' }]}>
            {isMultiPage ? 'Bitti' : 'Kırp'}
          </Text>
        </Pressable>
      )}
    </View>
  );

  if (Platform.OS !== 'web' && !permission) {
    return (
      <View style={styles.permContainer}>
        <ActivityIndicator color={C.primary} />
      </View>
    );
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
          <View style={styles.cameraGrid}>
            {Array.from({ length: 9 }).map((_, i) => (
              <View key={i} style={styles.cameraGridCell} />
            ))}
          </View>
        </View>
        <View style={[styles.overlay, { paddingTop: insets.top + 8 }]}>
          {renderTopBar()}
          {renderCenter(true)}
          {renderThumbnails()}
          {renderBottom(true)}
        </View>
        {pageAddedFlash && <View style={styles.pageAddedFlash} pointerEvents="none" />}
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
        {renderThumbnails()}
        {renderBottom(false)}
      </View>
      {pageAddedFlash && <View style={styles.pageAddedFlash} pointerEvents="none" />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },

  permContainer: { flex: 1, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center', padding: 24 },
  permCard: { backgroundColor: '#ffffff', borderRadius: 24, padding: 32, alignItems: 'center', gap: 16, width: '100%', maxWidth: 360, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 8 },
  permIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: `${C.primary}15`, alignItems: 'center', justifyContent: 'center' },
  permTitle: { fontSize: 20, fontWeight: '700', color: C.onSurface, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  permDesc: { fontSize: 14, color: C.secondary, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 20 },
  permBtn: { backgroundColor: C.primary, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, width: '100%', alignItems: 'center' },
  permBtnText: { fontSize: 16, fontWeight: '600', color: '#ffffff', fontFamily: 'Inter_600SemiBold' },
  permGalleryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  permGalleryText: { fontSize: 14, color: C.primary, fontFamily: 'Inter_500Medium' },
  permClose: { position: 'absolute', right: 20, width: 42, height: 42, borderRadius: 21, backgroundColor: C.surfaceContainerLowest, alignItems: 'center', justifyContent: 'center' },

  webBg: { ...StyleSheet.absoluteFillObject, backgroundColor: '#1e1e1e' },
  cameraGrid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap' },
  cameraGridCell: { width: '33.33%', aspectRatio: 1, borderWidth: 0.3, borderColor: 'rgba(255,255,255,0.05)' },

  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  topControls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modeToggle: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 24, padding: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  modeBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20 },
  modeBtnActive: { backgroundColor: '#ffffff' },
  modeBtnText: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.65)', fontFamily: 'Inter_600SemiBold' },
  modeBtnTextActive: { color: '#000000' },

  centerFrame: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 14 },
  pageCountBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,105,72,0.75)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  pageCountText: { fontSize: 12, color: '#ffffff', fontWeight: '600', fontFamily: 'Inter_600SemiBold' },

  statusPillRow: { alignItems: 'center' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 9, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  statusPillDetected: { backgroundColor: 'rgba(0,40,25,0.85)', borderColor: 'rgba(52,211,153,0.5)' },
  statusText: { fontSize: 13, color: '#ffffff', fontFamily: 'Inter_500Medium' },
  statusTextDetected: { color: '#34d399', fontFamily: 'Inter_600SemiBold' },

  docFrame: { width: '84%', aspectRatio: 3 / 4, position: 'relative', borderRadius: 4 },
  docFrameDetected: { },

  corner: { position: 'absolute', width: 26, height: 26, borderColor: '#68dba9', borderWidth: 3 },
  cornerDetected: { borderColor: '#34d399', borderWidth: 3.5 },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 5 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 5 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 5 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 5 },

  scanLine: { position: 'absolute', left: 4, right: 4, height: 2, backgroundColor: 'rgba(52,211,153,0.8)', shadowColor: '#34d399', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2 },
  detectedGlow: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(52,211,153,0.12)', borderRadius: 4, borderWidth: 2, borderColor: '#34d399' },
  frameOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(104,219,169,0.04)', borderRadius: 4 },

  detectedHint: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  detectedHintText: { fontSize: 12, color: '#34d399', fontFamily: 'Inter_500Medium' },

  thumbnailStrip: { paddingVertical: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  thumbnailScrollContent: { paddingHorizontal: 16, gap: 10, flexDirection: 'row', alignItems: 'center' },
  thumbnailWrapper: { position: 'relative', width: 52, height: 68, borderRadius: 6, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(52,211,153,0.6)' },
  thumbnailImage: { width: '100%', height: '100%' },
  thumbnailBadge: { position: 'absolute', bottom: 3, right: 3, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  thumbnailBadgeText: { fontSize: 9, color: '#ffffff', fontWeight: '700', fontFamily: 'Inter_700Bold' },
  thumbnailNextSlot: { width: 52, height: 68, borderRadius: 6, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 3 },
  thumbnailNextText: { fontSize: 8, color: 'rgba(255,255,255,0.5)', fontFamily: 'Inter_500Medium', textAlign: 'center' },

  pageAddedFlash: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(52,211,153,0.22)', zIndex: 99 },

  bottomControls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 44, paddingTop: 20, backgroundColor: 'rgba(0,0,0,0.65)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  galleryBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', gap: 3 },
  doneBtnActive: { backgroundColor: 'rgba(52,211,153,0.15)', borderWidth: 1, borderColor: 'rgba(52,211,153,0.4)' },
  galleryLabel: { fontSize: 9, color: 'rgba(255,255,255,0.6)', fontFamily: 'Inter_500Medium' },
  captureGroup: { alignItems: 'center', gap: 6 },
  captureBtn: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  captureBtnReady: { borderColor: '#34d399' },
  captureBtnMulti: { borderColor: '#34d399', backgroundColor: 'rgba(0,105,72,0.25)' },
  captureInner: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#ffffff' },
  captureInnerReady: { backgroundColor: '#34d399' },
  captureInnerMulti: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#006948', alignItems: 'center', justifyContent: 'center' },
  captureMultiLabel: { fontSize: 11, color: '#34d399', fontFamily: 'Inter_600SemiBold', fontWeight: '600', letterSpacing: 0.3 },
});
