import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import colors from '@/constants/colors';
import { FilterType, useScan } from '@/context/ScanContext';

const C = colors.light;

type FilterDef = {
  name: FilterType;
  label: string;
  overlayColor?: string;
  overlayOpacity?: number;
  brightness?: string;
};

const FILTERS: FilterDef[] = [
  { name: 'Orijinal', label: 'Orijinal' },
  { name: 'Temiz', label: 'Temiz', overlayColor: '#ffffff', overlayOpacity: 0.08 },
  { name: 'Parlak', label: 'Parlak', overlayColor: '#ffffff', overlayOpacity: 0.18 },
  { name: 'Gri Tonlama', label: 'Gri Tonlama' },
  { name: 'Siyah & Beyaz', label: 'Siyah & Beyaz' },
];

function getWebFilterStyle(name: FilterType): string {
  switch (name) {
    case 'Temiz': return 'contrast(1.2) brightness(1.05)';
    case 'Parlak': return 'brightness(1.2) contrast(1.05)';
    case 'Gri Tonlama': return 'grayscale(1)';
    case 'Siyah & Beyaz': return 'grayscale(1) contrast(1.6) brightness(1.1)';
    default: return 'none';
  }
}

export default function EnhanceScreen() {
  const insets = useSafeAreaInsets();
  const { capturedImageUri, selectedFilter, setSelectedFilter, setProcessedImageUri } = useScan();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSave = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!capturedImageUri) {
      router.push('/scanner/preview');
      return;
    }
    setIsProcessing(true);
    try {
      let finalUri = capturedImageUri;
      if (selectedFilter === 'Gri Tonlama' || selectedFilter === 'Siyah & Beyaz') {
        const result = await manipulateAsync(
          capturedImageUri,
          [],
          {
            compress: selectedFilter === 'Siyah & Beyaz' ? 0.85 : 0.88,
            format: SaveFormat.JPEG,
          }
        );
        finalUri = result.uri;
      }
      setProcessedImageUri(finalUri);
      router.push('/scanner/preview');
    } catch {
      setProcessedImageUri(capturedImageUri);
      router.push('/scanner/preview');
    } finally {
      setIsProcessing(false);
    }
  };

  const isGrayscaleFilter = selectedFilter === 'Gri Tonlama' || selectedFilter === 'Siyah & Beyaz';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable style={styles.iconBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}>
          <Feather name="arrow-left" size={20} color={C.onSurface} />
        </Pressable>
        <Text style={styles.title}>Filtreler</Text>
        <Pressable style={styles.iconBtn} onPress={handleSave} disabled={isProcessing}>
          <Text style={styles.nextText}>İleri</Text>
        </Pressable>
      </View>

      <View style={styles.previewArea}>
        {capturedImageUri ? (
          <View style={styles.docPreview}>
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: capturedImageUri }}
                style={[
                  styles.previewImage,
                  Platform.OS === 'web' && { filter: getWebFilterStyle(selectedFilter) } as any,
                  isGrayscaleFilter && Platform.OS !== 'web' && styles.grayscaleOverlayContainer,
                ]}
                contentFit="contain"
              />
              {isGrayscaleFilter && Platform.OS !== 'web' && (
                <View
                  style={[
                    StyleSheet.absoluteFill,
                    styles.grayscaleOverlay,
                    selectedFilter === 'Siyah & Beyaz' && styles.bwOverlay,
                  ]}
                />
              )}
              {selectedFilter === 'Temiz' && (
                <View style={[StyleSheet.absoluteFill, styles.cleanOverlay]} />
              )}
              {selectedFilter === 'Parlak' && (
                <View style={[StyleSheet.absoluteFill, styles.brightOverlay]} />
              )}
            </View>
          </View>
        ) : (
          <View style={styles.noImagePreview}>
            <Feather name="image" size={40} color={C.outline} />
            <Text style={styles.noImageText}>Görüntü yok</Text>
          </View>
        )}

        {capturedImageUri ? (
          <Pressable
            style={({ pressed }) => [styles.cropBtn, { opacity: pressed ? 0.75 : 1 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/scanner/crop');
            }}
          >
            <Feather name="crop" size={14} color={C.primary} />
            <Text style={styles.cropBtnText}>Kırpı Düzenle</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + 16 }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
          {FILTERS.map(f => (
            <Pressable
              key={f.name}
              style={({ pressed }) => [styles.filterItem, { transform: [{ scale: pressed ? 0.95 : 1 }] }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedFilter(f.name);
              }}
            >
              <View style={[
                styles.filterThumb,
                selectedFilter === f.name && styles.filterThumbActive,
                { backgroundColor: f.name === 'Gri Tonlama' || f.name === 'Siyah & Beyaz' ? '#e8e8e8' : C.surfaceContainerLow },
              ]}>
                {capturedImageUri ? (
                  <View style={styles.filterThumbImageWrap}>
                    <Image
                      source={{ uri: capturedImageUri }}
                      style={[
                        styles.filterThumbImage,
                        Platform.OS === 'web' && { filter: getWebFilterStyle(f.name) } as any,
                      ]}
                      contentFit="cover"
                    />
                    {(f.name === 'Gri Tonlama' || f.name === 'Siyah & Beyaz') && Platform.OS !== 'web' && (
                      <View style={[StyleSheet.absoluteFill, f.name === 'Siyah & Beyaz' ? styles.bwOverlay : styles.grayscaleOverlay]} />
                    )}
                    {f.name === 'Temiz' && <View style={[StyleSheet.absoluteFill, styles.cleanOverlay]} />}
                    {f.name === 'Parlak' && <View style={[StyleSheet.absoluteFill, styles.brightOverlay]} />}
                  </View>
                ) : (
                  <View style={styles.filterThumbDoc}>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.filterThumbLine,
                          {
                            backgroundColor:
                              f.name === 'Siyah & Beyaz' ? '#222' :
                              f.name === 'Gri Tonlama' ? '#888' :
                              f.name === 'Temiz' ? '#b8c8c0' : '#d0d0d0',
                            width: i % 2 === 0 ? '80%' : '60%',
                          },
                        ]}
                      />
                    ))}
                  </View>
                )}
              </View>
              <Text style={[styles.filterName, selectedFilter === f.name && styles.filterNameActive]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Pressable
          style={({ pressed }) => [styles.saveBtn, { opacity: (pressed || isProcessing) ? 0.88 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
          onPress={handleSave}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Feather name="file-text" size={20} color="#ffffff" />
              <Text style={styles.saveBtnText}>PDF Olarak Kaydet</Text>
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
  previewArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  docPreview: { width: '78%', aspectRatio: 3 / 4, borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 8, borderWidth: 1, borderColor: `${C.outlineVariant}30` },
  imageContainer: { width: '100%', height: '100%', position: 'relative' },
  previewImage: { width: '100%', height: '100%' },
  grayscaleOverlayContainer: {},
  grayscaleOverlay: { backgroundColor: 'rgba(128,128,128,0.55)', mixBlendMode: 'saturation' as any },
  bwOverlay: { backgroundColor: 'rgba(0,0,0,0.12)' },
  cleanOverlay: { backgroundColor: 'rgba(255,255,255,0.07)' },
  brightOverlay: { backgroundColor: 'rgba(255,255,255,0.18)' },
  noImagePreview: { alignItems: 'center', gap: 12, opacity: 0.4 },
  noImageText: { fontSize: 14, color: C.secondary, fontFamily: 'Inter_400Regular' },
  cropBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: `${C.primary}60`, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: `${C.primary}0d` },
  cropBtnText: { fontSize: 13, color: C.primary, fontFamily: 'Inter_500Medium' },
  bottomPanel: { backgroundColor: C.surfaceContainerLowest, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 20, gap: 16, shadowColor: C.secondary, shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 6, borderTopWidth: 1, borderColor: `${C.outlineVariant}30` },
  filtersRow: { paddingHorizontal: 20, gap: 14, paddingBottom: 4 },
  filterItem: { alignItems: 'center', gap: 8 },
  filterThumb: { width: 72, height: 90, borderRadius: 14, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  filterThumbActive: { borderColor: C.primary, shadowColor: C.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 3 },
  filterThumbImageWrap: { width: '100%', height: '100%', position: 'relative' },
  filterThumbImage: { width: '100%', height: '100%' },
  filterThumbDoc: { width: '100%', height: '100%', backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', gap: 7, padding: 8 },
  filterThumbLine: { height: 5, borderRadius: 2.5 },
  filterName: { fontSize: 11, color: C.secondary, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  filterNameActive: { color: C.primary, fontFamily: 'Inter_600SemiBold' },
  saveBtn: { backgroundColor: C.primary, marginHorizontal: 20, marginBottom: 4, borderRadius: 16, paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 4 },
  saveBtnText: { fontSize: 16, fontWeight: '600', color: '#ffffff', fontFamily: 'Inter_600SemiBold' },
});
