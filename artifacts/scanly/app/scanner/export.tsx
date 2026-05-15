import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React from 'react';
import {
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

const SHARE_TARGETS = [
  { label: 'WhatsApp', icon: 'message-circle', bg: '#e8faf0', color: '#25D366' },
  { label: 'E-posta', icon: 'mail', bg: C.surfaceContainerHigh, color: C.secondary },
  { label: 'Dosyalar', icon: 'folder', bg: C.surfaceContainerHigh, color: C.secondary },
  { label: 'AirDrop', icon: 'wifi', bg: '#e8f0ff', color: '#007AFF' },
];

const FORMATS = [
  { icon: 'file-text', label: 'PDF olarak Paylaş', sub: 'Orijinal kalite, tüm cihazlar' },
  { icon: 'image', label: 'Görüntü olarak Paylaş', sub: 'JPG formatında dışa aktar' },
  { icon: 'type', label: 'Metin (OCR) olarak Paylaş', sub: 'Sadece metin içeriği kopyala' },
];

export default function ExportScreen() {
  const insets = useSafeAreaInsets();
  const { documentTitle } = useScan();
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const handleExport = (label: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (Platform.OS !== 'web') {
      setTimeout(() => router.replace('/(tabs)'), 300);
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <View style={styles.backdrop}>
      <Pressable style={styles.dimArea} onPress={() => router.back()} />
      <View style={[styles.sheet, { paddingBottom: bottomPad + 16 }]}>
        <View style={styles.dragHandle} />

        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Belgeyi Paylaş</Text>
          <Pressable
            style={styles.closeBtn}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
          >
            <Feather name="x" size={18} color={C.onSurface} />
          </Pressable>
        </View>

        <View style={styles.docPreviewRow}>
          <View style={styles.docPreviewIcon}>
            <Feather name="file-text" size={22} color={C.primary} />
          </View>
          <View style={styles.docPreviewInfo}>
            <Text style={styles.docPreviewTitle} numberOfLines={1}>{documentTitle || 'Yeni Belge'}</Text>
            <Text style={styles.docPreviewMeta}>1 Sayfa · 0.9 MB</Text>
          </View>
        </View>

        <Text style={styles.groupLabel}>FORMAT</Text>
        <View style={styles.formatList}>
          {FORMATS.map((f, i) => (
            <React.Fragment key={f.label}>
              <Pressable
                style={({ pressed }) => [styles.formatRow, { backgroundColor: pressed ? C.surfaceContainerLow : 'transparent' }]}
                onPress={() => handleExport(f.label)}
              >
                <View style={styles.formatIcon}>
                  <Feather name={f.icon as any} size={20} color={C.secondary} />
                </View>
                <View style={styles.formatInfo}>
                  <Text style={styles.formatLabel}>{f.label}</Text>
                  <Text style={styles.formatSub}>{f.sub}</Text>
                </View>
                <Feather name="chevron-right" size={16} color={C.outline} />
              </Pressable>
              {i < FORMATS.length - 1 && <View style={styles.formatDivider} />}
            </React.Fragment>
          ))}
        </View>

        <Text style={[styles.groupLabel, { marginTop: 16 }]}>HIZLI PAYLAŞ</Text>
        <View style={styles.targetsRow}>
          {SHARE_TARGETS.map(t => (
            <Pressable
              key={t.label}
              style={({ pressed }) => [styles.targetBtn, { opacity: pressed ? 0.8 : 1 }]}
              onPress={() => handleExport(t.label)}
            >
              <View style={[styles.targetIcon, { backgroundColor: t.bg }]}>
                <Feather name={t.icon as any} size={22} color={t.color} />
              </View>
              <Text style={styles.targetLabel}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  dimArea: {
    flex: 1,
  },
  sheet: {
    backgroundColor: C.surfaceContainerLowest,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 12,
    shadowColor: C.secondary,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
  },
  dragHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.surfaceContainerHigh,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: C.onSurface,
    fontFamily: 'Inter_600SemiBold',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 14,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: `${C.outlineVariant}50`,
  },
  docPreviewIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: `${C.primary}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docPreviewInfo: {
    flex: 1,
    gap: 3,
  },
  docPreviewTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: C.onSurface,
    fontFamily: 'Inter_600SemiBold',
  },
  docPreviewMeta: {
    fontSize: 12,
    color: C.secondary,
    fontFamily: 'Inter_400Regular',
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: C.outline,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingLeft: 2,
  },
  formatList: {
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${C.outlineVariant}50`,
    overflow: 'hidden',
  },
  formatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  formatIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: C.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formatInfo: {
    flex: 1,
    gap: 2,
  },
  formatLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: C.onSurface,
    fontFamily: 'Inter_600SemiBold',
  },
  formatSub: {
    fontSize: 12,
    color: C.secondary,
    fontFamily: 'Inter_400Regular',
  },
  formatDivider: {
    height: 1,
    marginLeft: 66,
    backgroundColor: `${C.outlineVariant}40`,
  },
  targetsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  targetBtn: {
    alignItems: 'center',
    gap: 8,
  },
  targetIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetLabel: {
    fontSize: 11,
    color: C.secondary,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
});
