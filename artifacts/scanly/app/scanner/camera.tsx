import { Feather } from '@expo/vector-icons';
import { CameraView, CameraType, useCameraPermissions, FlashMode } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
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

export default function CameraScreen() {
  const insets = useSafeAreaInsets();
  const { setCapturedImageUri, resetScan } = useScan();
  const [permission, requestPermission] = useCameraPermissions();
  const [flashMode, setFlashMode] = useState<FlashMode>('off');
  const [facing] = useState<CameraType>('back');
  const [mode, setMode] = useState<'OTOMATİK' | 'MANUEL'>('OTOMATİK');
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

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
          setCapturedImageUri(result.assets[0].uri);
          router.push('/scanner/crop');
        }
      } else {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.9,
          base64: false,
          skipProcessing: false,
        });
        if (photo?.uri) {
          setCapturedImageUri(photo.uri);
          router.push('/scanner/crop');
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
      setCapturedImageUri(result.assets[0].uri);
      router.push('/scanner/crop');
    }
  };

  const toggleFlash = () => {
    setFlashMode(f => (f === 'off' ? 'on' : 'off'));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

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
          <Text style={styles.permDesc}>
            Belge taramak için kameraya erişim izni gereklidir.
          </Text>
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
        <View style={styles.webSimulation}>
          <View style={styles.cameraGrid}>
            {Array.from({ length: 9 }).map((_, i) => (
              <View key={i} style={styles.cameraGridCell} />
            ))}
          </View>
        </View>
        <View style={[styles.overlay, { paddingTop: insets.top + 8 }]}>
          <View style={styles.topControls}>
            <Pressable style={styles.iconBtn} onPress={() => { resetScan(); router.back(); }}>
              <Feather name="x" size={22} color="#ffffff" />
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
              <Feather name={flashMode === 'on' ? 'zap' : 'zap-off'} size={22} color={flashMode === 'on' ? '#68dba9' : '#ffffff'} />
            </Pressable>
          </View>
          <View style={styles.centerFrame}>
            <View style={styles.instructionPill}>
              <Feather name="file-text" size={14} color="#68dba9" />
              <Text style={styles.instructionText}>Galeriden Belge Seçin</Text>
            </View>
            <View style={styles.docFrame}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
              <View style={styles.frameOverlay} />
            </View>
          </View>
          <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 16 }]}>
            <Pressable style={styles.galleryBtn} onPress={handleGallery}>
              <Feather name="image" size={24} color="#ffffff" />
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.captureBtn, { transform: [{ scale: pressed ? 0.93 : 1 }] }]}
              onPress={handleCapture}
              disabled={isCapturing}
            >
              <View style={styles.captureOuter}>
                {isCapturing
                  ? <ActivityIndicator color="#ffffff" />
                  : <View style={styles.captureInner} />
                }
              </View>
            </Pressable>
            <View style={styles.doneBtn} />
          </View>
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
        <View style={styles.topControls}>
          <Pressable style={styles.iconBtn} onPress={() => { resetScan(); router.back(); }}>
            <Feather name="x" size={22} color="#ffffff" />
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
            <Feather name={flashMode === 'on' ? 'zap' : 'zap-off'} size={22} color={flashMode === 'on' ? '#68dba9' : '#ffffff'} />
          </Pressable>
        </View>

        <View style={styles.centerFrame}>
          <View style={styles.instructionPill}>
            <Feather name="file-text" size={14} color="#68dba9" />
            <Text style={styles.instructionText}>Belgeyi Çerçeveye Yerleştirin</Text>
          </View>
          <View style={styles.docFrame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
            <View style={styles.frameOverlay} />
          </View>
        </View>

        <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable style={styles.galleryBtn} onPress={handleGallery}>
            <Feather name="image" size={24} color="#ffffff" />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.captureBtn, { transform: [{ scale: isCapturing ? 0.9 : pressed ? 0.93 : 1 }] }]}
            onPress={handleCapture}
            disabled={isCapturing}
          >
            <View style={styles.captureOuter}>
              {isCapturing
                ? <ActivityIndicator color="#ffffff" size="large" />
                : <View style={styles.captureInner} />
              }
            </View>
          </Pressable>
          <Pressable
            style={styles.doneBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/scanner/crop');
            }}
          >
            <Feather name="check" size={24} color="#68dba9" />
          </Pressable>
        </View>
      </View>
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
  permClose: { position: 'absolute', right: 20, width: 42, height: 42, borderRadius: 21, backgroundColor: C.surfaceContainerLowest, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
  webSimulation: { ...StyleSheet.absoluteFillObject, backgroundColor: '#2a2a2a' },
  cameraGrid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap' },
  cameraGridCell: { width: '33.33%', aspectRatio: 1, borderWidth: 0.3, borderColor: 'rgba(255,255,255,0.06)' },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  topControls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16 },
  iconBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  modeToggle: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 24, padding: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modeBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  modeBtnActive: { backgroundColor: '#ffffff' },
  modeBtnText: { fontSize: 11, fontWeight: '500', color: 'rgba(255,255,255,0.7)', fontFamily: 'Inter_500Medium' },
  modeBtnTextActive: { color: '#000000' },
  centerFrame: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 },
  instructionPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, marginBottom: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  instructionText: { fontSize: 13, color: '#ffffff', fontFamily: 'Inter_500Medium' },
  docFrame: { width: '82%', aspectRatio: 3 / 4, position: 'relative' },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: '#68dba9', borderWidth: 3 },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 6 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 6 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 6 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 6 },
  frameOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(104,219,169,0.06)', borderRadius: 4 },
  bottomControls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 48, paddingTop: 24, backgroundColor: 'rgba(0,0,0,0.6)' },
  galleryBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  captureBtn: { alignItems: 'center', justifyContent: 'center' },
  captureOuter: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center' },
  captureInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#ffffff' },
  doneBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(0,105,72,0.25)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(104,219,169,0.4)' },
});
