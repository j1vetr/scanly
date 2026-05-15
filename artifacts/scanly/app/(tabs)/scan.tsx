import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import colors from '@/constants/colors';
import { useScan } from '@/context/ScanContext';

const C = colors.light;

export default function ScanTabScreen() {
  const insets = useSafeAreaInsets();
  const { resetScan } = useScan();
  const [flashOn, setFlashOn] = useState(false);
  const [mode, setMode] = useState<'OTOMATİK' | 'MANUEL'>('OTOMATİK');

  const handleCapture = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.push('/scanner/crop');
  };

  const toggleFlash = () => {
    setFlashOn(prev => !prev);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.cameraFeed]}>
        <View style={styles.cameraSimulation}>
          <View style={styles.cameraGrid}>
            {Array.from({ length: 9 }).map((_, i) => (
              <View key={i} style={styles.cameraGridCell} />
            ))}
          </View>
        </View>
        <View style={styles.vignette} />
      </View>

      <View style={[styles.overlay, { paddingTop: insets.top + 8 }]}>
        <View style={styles.topControls}>
          <Pressable
            style={styles.iconBtn}
            onPress={() => {
              resetScan();
              router.back();
            }}
          >
            <Feather name="x" size={22} color="#ffffff" />
          </Pressable>

          <View style={styles.modeToggle}>
            {(['OTOMATİK', 'MANUEL'] as const).map(m => (
              <Pressable
                key={m}
                style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
                onPress={() => { setMode(m); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              >
                <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
                  {m}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable style={styles.iconBtn} onPress={toggleFlash}>
            <Feather name={flashOn ? 'zap' : 'zap-off'} size={22} color={flashOn ? '#68dba9' : '#ffffff'} />
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
          <Pressable style={styles.galleryBtn}>
            <Feather name="image" size={24} color="#ffffff" />
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.captureBtn, { transform: [{ scale: pressed ? 0.93 : 1 }] }]}
            onPress={handleCapture}
          >
            <View style={styles.captureOuter}>
              <View style={styles.captureInner} />
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
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cameraFeed: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1a1a1a',
  },
  cameraSimulation: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    opacity: 0.8,
  },
  cameraGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cameraGridCell: {
    width: '33.33%',
    aspectRatio: 1,
    borderWidth: 0.3,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 24,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  modeBtnActive: {
    backgroundColor: '#ffffff',
  },
  modeBtnText: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'Inter_500Medium',
  },
  modeBtnTextActive: {
    color: '#000000',
  },
  centerFrame: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  instructionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  instructionText: {
    fontSize: 13,
    color: '#ffffff',
    fontFamily: 'Inter_500Medium',
  },
  docFrame: {
    width: '82%',
    aspectRatio: 3 / 4,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#68dba9',
    borderWidth: 3,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 6 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 6 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 6 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 6 },
  frameOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(104,219,169,0.06)',
    borderRadius: 4,
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 48,
    paddingTop: 24,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  galleryBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ffffff',
  },
  doneBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0,105,72,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(104,219,169,0.4)',
  },
});
