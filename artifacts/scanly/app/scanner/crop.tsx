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

const C = colors.light;

const HANDLE_SIZE = 20;

export default function CropScreen() {
  const insets = useSafeAreaInsets();
  const [rotation, setRotation] = useState(0);

  const rotateLeft = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRotation(r => r - 90);
  };

  const rotateRight = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRotation(r => r + 90);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable style={styles.iconBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}>
          <Feather name="arrow-left" size={20} color={C.onSurface} />
        </Pressable>
        <Text style={styles.title}>Kırp</Text>
        <Pressable style={styles.iconBtn} onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push('/scanner/enhance');
        }}>
          <Text style={styles.nextText}>İleri</Text>
        </Pressable>
      </View>

      <View style={styles.canvasArea}>
        <View style={[styles.docPreview, { transform: [{ rotate: `${rotation % 360}deg` }] }]}>
          <View style={styles.docContent}>
            {Array.from({ length: 8 }).map((_, i) => (
              <View
                key={i}
                style={[styles.docLine, { width: i % 3 === 0 ? '85%' : i % 3 === 1 ? '70%' : '60%', marginTop: i === 0 ? 0 : 12 }]}
              />
            ))}
          </View>

          <View style={[styles.handle, styles.handleTL]}>
            <View style={styles.handleDot} />
          </View>
          <View style={[styles.handle, styles.handleTR]}>
            <View style={styles.handleDot} />
          </View>
          <View style={[styles.handle, styles.handleBL]}>
            <View style={styles.handleDot} />
          </View>
          <View style={[styles.handle, styles.handleBR]}>
            <View style={styles.handleDot} />
          </View>
          <View style={[styles.cropCorner, styles.cornerTL]} />
          <View style={[styles.cropCorner, styles.cornerTR]} />
          <View style={[styles.cropCorner, styles.cornerBL]} />
          <View style={[styles.cropCorner, styles.cornerBR]} />
          <View style={styles.cropOverlay} />
        </View>
      </View>

      <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.tools}>
          <Pressable style={styles.toolBtn} onPress={rotateLeft}>
            <Feather name="rotate-ccw" size={22} color={C.onSurface} />
            <Text style={styles.toolLabel}>Sola</Text>
          </Pressable>
          <Pressable style={styles.toolBtn} onPress={rotateRight}>
            <Feather name="rotate-cw" size={22} color={C.onSurface} />
            <Text style={styles.toolLabel}>Sağa</Text>
          </Pressable>
          <Pressable style={styles.toolBtn} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
            <Feather name="maximize" size={22} color={C.onSurface} />
            <Text style={styles.toolLabel}>Tam</Text>
          </Pressable>
          <Pressable style={styles.toolBtn} onPress={() => router.back()}>
            <Feather name="camera" size={22} color={C.secondary} />
            <Text style={styles.toolLabel}>Yeniden Çek</Text>
          </Pressable>
        </View>
        <Pressable
          style={({ pressed }) => [styles.continueBtn, { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/scanner/enhance');
          }}
        >
          <Text style={styles.continueBtnText}>Devam Et</Text>
          <Feather name="arrow-right" size={18} color="#ffffff" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: `${C.outlineVariant}50`,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: C.onSurface,
    fontFamily: 'Inter_600SemiBold',
  },
  nextText: {
    fontSize: 16,
    fontWeight: '600',
    color: C.primary,
    fontFamily: 'Inter_600SemiBold',
    paddingHorizontal: 4,
  },
  canvasArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  docPreview: {
    width: '78%',
    aspectRatio: 3 / 4,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
    position: 'relative',
  },
  docContent: {
    flex: 1,
    justifyContent: 'center',
  },
  docLine: {
    height: 8,
    backgroundColor: C.surfaceContainerHigh,
    borderRadius: 4,
    marginTop: 12,
  },
  handle: {
    position: 'absolute',
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleTL: { top: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2 },
  handleTR: { top: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2 },
  handleBL: { bottom: -HANDLE_SIZE / 2, left: -HANDLE_SIZE / 2 },
  handleBR: { bottom: -HANDLE_SIZE / 2, right: -HANDLE_SIZE / 2 },
  handleDot: {
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    backgroundColor: C.primary,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  cropCorner: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderColor: C.primary,
    borderWidth: 2.5,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  cropOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: `${C.primary}08`,
    borderWidth: 1,
    borderColor: `${C.primary}30`,
  },
  bottomPanel: {
    backgroundColor: C.surfaceContainerLowest,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    gap: 16,
    shadowColor: C.secondary,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 6,
    borderTopWidth: 1,
    borderColor: `${C.outlineVariant}30`,
  },
  tools: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  toolBtn: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  toolLabel: {
    fontSize: 11,
    color: C.secondary,
    fontFamily: 'Inter_400Regular',
  },
  continueBtn: {
    backgroundColor: C.primary,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  continueBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'Inter_600SemiBold',
  },
});
