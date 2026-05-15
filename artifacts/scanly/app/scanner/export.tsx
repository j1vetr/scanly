import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useState } from 'react';
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

const FORMATS = [
  { icon: 'file-text', label: 'PDF olarak Paylaş', sub: 'Orijinal kalite, tüm cihazlar', type: 'pdf' },
  { icon: 'image', label: 'Görüntü olarak Paylaş', sub: 'JPG formatında dışa aktar', type: 'image' },
  { icon: 'type', label: 'Metin (OCR) olarak Paylaş', sub: 'Sadece metin içeriği', type: 'text' },
];

export default function ExportScreen() {
  const insets = useSafeAreaInsets();
  const { documentTitle, pdfUri, processedImageUri, capturedImageUri } = useScan();
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;
  const [sharing, setSharing] = useState<string | null>(null);

  const handleExport = async (type: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSharing(type);
    try {
      if (Platform.OS === 'web') {
        const imageUri = processedImageUri || capturedImageUri;
        if (imageUri) {
          const a = document.createElement('a');
          a.href = imageUri;
          a.download = `${documentTitle || 'belge'}.jpg`;
          a.click();
        }
        setTimeout(() => { setSharing(null); router.back(); }, 500);
        return;
      }

      const available = await Sharing.isAvailableAsync();
      if (!available) {
        setSharing(null);
        return;
      }

      if (type === 'pdf' && pdfUri) {
        await Sharing.shareAsync(pdfUri, {
          mimeType: 'application/pdf',
          dialogTitle: documentTitle || 'Belgeyi Paylaş',
        });
      } else if (type === 'image') {
        const imageUri = processedImageUri || capturedImageUri;
        if (imageUri) {
          await Sharing.shareAsync(imageUri, {
            mimeType: 'image/jpeg',
            dialogTitle: documentTitle || 'Görüntüyü Paylaş',
          });
        }
      } else if (type === 'text') {
        if (pdfUri) {
          await Sharing.shareAsync(pdfUri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Metni Paylaş',
          });
        }
      }
    } catch (err) {
      console.error('Paylaşma hatası:', err);
    } finally {
      setSharing(null);
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
          <View style={[styles.docPreviewIcon, pdfUri && styles.docPreviewIconReady]}>
            <Feather name="file-text" size={22} color={pdfUri ? '#ffffff' : C.primary} />
          </View>
          <View style={styles.docPreviewInfo}>
            <Text style={styles.docPreviewTitle} numberOfLines={1}>{documentTitle || 'Yeni Belge'}</Text>
            <Text style={styles.docPreviewMeta}>
              1 Sayfa · {pdfUri ? 'PDF Hazır' : 'Belge Tarama'}
            </Text>
          </View>
          {pdfUri && (
            <View style={styles.readyChip}>
              <Feather name="check" size={12} color={C.primary} />
              <Text style={styles.readyChipText}>Hazır</Text>
            </View>
          )}
        </View>

        <Text style={styles.groupLabel}>FORMAT</Text>
        <View style={styles.formatList}>
          {FORMATS.map((f, i) => (
            <React.Fragment key={f.type}>
              <Pressable
                style={({ pressed }) => [styles.formatRow, { backgroundColor: pressed ? C.surfaceContainerLow : 'transparent' }]}
                onPress={() => handleExport(f.type)}
                disabled={sharing !== null}
              >
                <View style={styles.formatIcon}>
                  {sharing === f.type
                    ? <ActivityIndicator color={C.secondary} size="small" />
                    : <Feather name={f.icon as any} size={20} color={C.secondary} />
                  }
                </View>
                <View style={styles.formatInfo}>
                  <Text style={styles.formatLabel}>{f.label}</Text>
                  <Text style={styles.formatSub}>{f.sub}</Text>
                </View>
                {f.type === 'pdf' && pdfUri && (
                  <View style={styles.formatBadge}>
                    <Text style={styles.formatBadgeText}>PDF</Text>
                  </View>
                )}
                <Feather name="chevron-right" size={16} color={C.outline} />
              </Pressable>
              {i < FORMATS.length - 1 && <View style={styles.formatDivider} />}
            </React.Fragment>
          ))}
        </View>

        {!pdfUri && (
          <View style={styles.noPdfNote}>
            <Feather name="info" size={13} color={C.outline} />
            <Text style={styles.noPdfNoteText}>PDF oluşturmak için önce önizleme ekranından kaydedin.</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  dimArea: { flex: 1 },
  sheet: { backgroundColor: C.surfaceContainerLowest, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 20, paddingTop: 12, shadowColor: C.secondary, shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 10 },
  dragHandle: { width: 44, height: 4, borderRadius: 2, backgroundColor: C.surfaceContainerHigh, alignSelf: 'center', marginBottom: 16 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sheetTitle: { fontSize: 20, fontWeight: '600', color: C.onSurface, fontFamily: 'Inter_600SemiBold' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.surfaceContainerLow, alignItems: 'center', justifyContent: 'center' },
  docPreviewRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.surfaceContainerLow, borderRadius: 14, padding: 12, marginBottom: 20, borderWidth: 1, borderColor: `${C.outlineVariant}50` },
  docPreviewIcon: { width: 42, height: 42, borderRadius: 10, backgroundColor: `${C.primary}18`, alignItems: 'center', justifyContent: 'center' },
  docPreviewIconReady: { backgroundColor: C.primary },
  docPreviewInfo: { flex: 1, gap: 3 },
  docPreviewTitle: { fontSize: 15, fontWeight: '600', color: C.onSurface, fontFamily: 'Inter_600SemiBold' },
  docPreviewMeta: { fontSize: 12, color: C.secondary, fontFamily: 'Inter_400Regular' },
  readyChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${C.primary}15`, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  readyChipText: { fontSize: 11, color: C.primary, fontFamily: 'Inter_500Medium' },
  groupLabel: { fontSize: 11, fontWeight: '600', color: C.outline, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8, marginBottom: 8, paddingLeft: 2 },
  formatList: { backgroundColor: C.surfaceContainerLowest, borderRadius: 16, borderWidth: 1, borderColor: `${C.outlineVariant}50`, overflow: 'hidden' },
  formatRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  formatIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: C.surfaceContainerLow, alignItems: 'center', justifyContent: 'center' },
  formatInfo: { flex: 1, gap: 2 },
  formatLabel: { fontSize: 14, fontWeight: '600', color: C.onSurface, fontFamily: 'Inter_600SemiBold' },
  formatSub: { fontSize: 12, color: C.secondary, fontFamily: 'Inter_400Regular' },
  formatBadge: { backgroundColor: `${C.primary}15`, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  formatBadgeText: { fontSize: 10, color: C.primary, fontFamily: 'Inter_600SemiBold' },
  formatDivider: { height: 1, marginLeft: 66, backgroundColor: `${C.outlineVariant}40` },
  noPdfNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 14, paddingHorizontal: 4 },
  noPdfNoteText: { flex: 1, fontSize: 12, color: C.outline, fontFamily: 'Inter_400Regular', lineHeight: 18 },
});
