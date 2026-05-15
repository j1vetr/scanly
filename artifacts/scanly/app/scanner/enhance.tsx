import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React from 'react';
import {
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

type FilterName = 'Orijinal' | 'Temiz' | 'Parlak' | 'Gri Tonlama' | 'Siyah & Beyaz';

const FILTERS: { name: FilterName; bg: string; docBg: string; lineColor: string }[] = [
  { name: 'Orijinal', bg: C.surfaceContainerLow, docBg: '#f0f0f0', lineColor: '#d0d0d0' },
  { name: 'Temiz', bg: '#e8f5f0', docBg: '#ffffff', lineColor: '#b0c0b8' },
  { name: 'Parlak', bg: '#f5f5f5', docBg: '#ffffff', lineColor: '#c8c8c8' },
  { name: 'Gri Tonlama', bg: '#e8e8e8', docBg: '#f0f0f0', lineColor: '#a0a0a0' },
  { name: 'Siyah & Beyaz', bg: '#e0e0e0', docBg: '#ffffff', lineColor: '#333333' },
];

export default function EnhanceScreen() {
  const insets = useSafeAreaInsets();
  const { selectedFilter, setSelectedFilter } = useScan();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable style={styles.iconBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}>
          <Feather name="arrow-left" size={20} color={C.onSurface} />
        </Pressable>
        <Text style={styles.title}>Filtreler</Text>
        <Pressable style={styles.iconBtn} onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push('/scanner/preview');
        }}>
          <Text style={styles.nextText}>İleri</Text>
        </Pressable>
      </View>

      <View style={styles.previewArea}>
        <View style={[styles.docPreview, getFilterStyle(selectedFilter)]}>
          <View style={styles.docContent}>
            {Array.from({ length: 7 }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.docLine,
                  { width: i % 3 === 0 ? '88%' : i % 3 === 1 ? '72%' : '58%' },
                  getLineStyle(selectedFilter),
                ]}
              />
            ))}
          </View>
          <View style={styles.previewBorderOverlay} />
        </View>
      </View>

      <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + 16 }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
        >
          {FILTERS.map(f => (
            <Pressable
              key={f.name}
              style={({ pressed }) => [styles.filterItem, { transform: [{ scale: pressed ? 0.95 : 1 }] }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedFilter(f.name as any);
              }}
            >
              <View style={[
                styles.filterThumb,
                { backgroundColor: f.bg },
                selectedFilter === f.name && styles.filterThumbActive,
              ]}>
                <View style={styles.filterThumbDoc}>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <View key={i} style={[styles.filterThumbLine, { backgroundColor: f.lineColor, width: i % 2 === 0 ? '80%' : '60%' }]} />
                  ))}
                </View>
              </View>
              <Text style={[styles.filterName, selectedFilter === f.name && styles.filterNameActive]}>
                {f.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Pressable
          style={({ pressed }) => [styles.saveBtn, { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/scanner/preview');
          }}
        >
          <Feather name="file-text" size={20} color="#ffffff" />
          <Text style={styles.saveBtnText}>PDF Olarak Kaydet</Text>
        </Pressable>
      </View>
    </View>
  );
}

function getFilterStyle(filter: string) {
  switch (filter) {
    case 'Temiz': return { backgroundColor: '#ffffff', shadowOpacity: 0.1 };
    case 'Parlak': return { backgroundColor: '#ffffff', shadowOpacity: 0.08 };
    case 'Gri Tonlama': return { backgroundColor: '#f8f8f8' };
    case 'Siyah & Beyaz': return { backgroundColor: '#ffffff' };
    default: return { backgroundColor: '#f8f8f8' };
  }
}

function getLineStyle(filter: string) {
  switch (filter) {
    case 'Temiz': return { backgroundColor: '#c0ccc6', height: 7 };
    case 'Parlak': return { backgroundColor: '#d0d0d0', height: 7 };
    case 'Gri Tonlama': return { backgroundColor: '#a8a8a8', height: 7 };
    case 'Siyah & Beyaz': return { backgroundColor: '#2a2a2a', height: 8 };
    default: return { backgroundColor: '#d8d8d8', height: 7 };
  }
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
  previewArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  docPreview: {
    width: '78%',
    aspectRatio: 3 / 4,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: `${C.outlineVariant}30`,
  },
  docContent: {
    flex: 1,
    justifyContent: 'center',
    gap: 12,
  },
  docLine: {
    height: 7,
    borderRadius: 3.5,
  },
  previewBorderOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${C.primary}15`,
  },
  bottomPanel: {
    backgroundColor: C.surfaceContainerLowest,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 20,
    gap: 16,
    shadowColor: C.secondary,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 6,
    borderTopWidth: 1,
    borderColor: `${C.outlineVariant}30`,
  },
  filtersRow: {
    paddingHorizontal: 20,
    gap: 14,
    paddingBottom: 4,
  },
  filterItem: {
    alignItems: 'center',
    gap: 8,
  },
  filterThumb: {
    width: 72,
    height: 90,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  filterThumbActive: {
    borderColor: C.primary,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  filterThumbDoc: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    padding: 8,
  },
  filterThumbLine: {
    height: 5,
    borderRadius: 2.5,
  },
  filterName: {
    fontSize: 11,
    color: C.secondary,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  filterNameActive: {
    color: C.primary,
    fontFamily: 'Inter_600SemiBold',
  },
  saveBtn: {
    backgroundColor: C.primary,
    marginHorizontal: 20,
    marginBottom: 4,
    borderRadius: 16,
    paddingVertical: 18,
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
  saveBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'Inter_600SemiBold',
  },
});
