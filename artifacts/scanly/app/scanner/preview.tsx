import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import colors from '@/constants/colors';
import { Document, MOCK_FOLDERS } from '@/constants/mockData';
import { useDocuments } from '@/context/DocumentsContext';
import { useScan } from '@/context/ScanContext';

const C = colors.light;

export default function PreviewScreen() {
  const insets = useSafeAreaInsets();
  const { documentTitle, setDocumentTitle, selectedFilter, resetScan } = useScan();
  const { addDocument } = useDocuments();
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 1;

  const handleSave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const newDoc: Document = {
      id: `d_${Date.now()}${Math.random().toString(36).substr(2, 6)}`,
      title: documentTitle || 'Yeni Belge',
      dateLabel: 'Az önce',
      dateISO: new Date().toISOString(),
      pages: totalPages,
      size: '0.9 MB',
      folderId: 'f4',
      type: 'pdf',
      tag: 'Tarama',
      color: C.primary,
    };
    addDocument(newDoc);
    resetScan();
    if (Platform.OS !== 'web') {
      Alert.alert('Kaydedildi', `"${newDoc.title}" başarıyla kaydedildi.`, [
        { text: 'Tamam', onPress: () => router.replace('/(tabs)') },
      ]);
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable style={styles.iconBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}>
          <Feather name="arrow-left" size={20} color={C.onSurface} />
        </Pressable>
        <Text style={styles.title}>PDF Önizleme</Text>
        <Pressable style={styles.iconBtn} onPress={() => router.push('/scanner/export')}>
          <Feather name="share" size={20} color={C.primary} />
        </Pressable>
      </View>

      <View style={styles.previewArea}>
        <View style={styles.pdfDoc}>
          <View style={styles.pdfHeader}>
            <View style={styles.pdfLogoPh} />
            <View style={styles.pdfHeaderLines}>
              <View style={[styles.pdfLine, { width: '60%', backgroundColor: '#d0d0d0' }]} />
              <View style={[styles.pdfLine, { width: '40%', backgroundColor: '#e0e0e0' }]} />
            </View>
          </View>
          <View style={styles.pdfDivider} />
          <View style={styles.pdfBody}>
            {Array.from({ length: 10 }).map((_, i) => (
              <View
                key={i}
                style={[styles.pdfLine, {
                  width: i % 4 === 0 ? '95%' : i % 4 === 1 ? '82%' : i % 4 === 2 ? '70%' : '55%',
                  marginTop: i === 0 ? 0 : i % 3 === 0 ? 14 : 8,
                }]}
              />
            ))}
          </View>
          <View style={styles.pdfFooter}>
            <View style={[styles.pdfLine, { width: '30%', backgroundColor: '#e8e8e8' }]} />
            <Text style={styles.pdfPageNum}>{currentPage}/{totalPages}</Text>
          </View>
        </View>

        <View style={styles.pageNav}>
          <Pressable
            style={[styles.pageNavBtn, currentPage <= 1 && styles.pageNavBtnDisabled]}
            onPress={() => { if (currentPage > 1) setCurrentPage(p => p - 1); }}
          >
            <Feather name="chevron-left" size={18} color={currentPage > 1 ? C.primary : C.outline} />
          </Pressable>
          <Text style={styles.pageNavText}>{currentPage} / {totalPages} Sayfa</Text>
          <Pressable
            style={[styles.pageNavBtn, currentPage >= totalPages && styles.pageNavBtnDisabled]}
            onPress={() => { if (currentPage < totalPages) setCurrentPage(p => p + 1); }}
          >
            <Feather name="chevron-right" size={18} color={currentPage < totalPages ? C.primary : C.outline} />
          </Pressable>
        </View>
      </View>

      <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.titleRow}>
          <Feather name="file-text" size={18} color={C.primary} />
          <TextInput
            style={styles.titleInput}
            value={documentTitle}
            onChangeText={setDocumentTitle}
            placeholder="Belge adı..."
            placeholderTextColor={C.outline}
            returnKeyType="done"
          />
        </View>
        <View style={styles.infoRow}>
          <View style={styles.infoBadge}>
            <Feather name="layers" size={13} color={C.secondary} />
            <Text style={styles.infoBadgeText}>{totalPages} Sayfa</Text>
          </View>
          <View style={styles.infoBadge}>
            <Feather name="zap" size={13} color={C.secondary} />
            <Text style={styles.infoBadgeText}>{selectedFilter}</Text>
          </View>
          <View style={styles.infoBadge}>
            <Feather name="hard-drive" size={13} color={C.secondary} />
            <Text style={styles.infoBadgeText}>0.9 MB</Text>
          </View>
        </View>
        <View style={styles.actionRow}>
          <Pressable
            style={({ pressed }) => [styles.shareBtn, { opacity: pressed ? 0.85 : 1 }]}
            onPress={() => router.push('/scanner/export')}
          >
            <Feather name="share-2" size={20} color={C.primary} />
            <Text style={styles.shareBtnText}>Paylaş</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.saveBtn, { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
            onPress={handleSave}
          >
            <Feather name="download" size={20} color="#ffffff" />
            <Text style={styles.saveBtnText}>Kaydet</Text>
          </Pressable>
        </View>
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
  previewArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 16,
  },
  pdfDoc: {
    width: '78%',
    aspectRatio: 3 / 4,
    backgroundColor: '#ffffff',
    borderRadius: 4,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: `${C.outlineVariant}30`,
  },
  pdfHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  pdfLogoPh: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: `${C.primary}20`,
    borderWidth: 1,
    borderColor: `${C.primary}30`,
  },
  pdfHeaderLines: {
    flex: 1,
    gap: 5,
  },
  pdfDivider: {
    height: 1,
    backgroundColor: C.surfaceContainerHigh,
    marginBottom: 12,
  },
  pdfBody: {
    flex: 1,
    gap: 0,
  },
  pdfLine: {
    height: 6,
    borderRadius: 3,
    backgroundColor: C.surfaceContainerHigh,
  },
  pdfFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: C.surfaceContainerHigh,
  },
  pdfPageNum: {
    fontSize: 10,
    color: C.outline,
    fontFamily: 'Inter_400Regular',
  },
  pageNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  pageNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${C.outlineVariant}50`,
  },
  pageNavBtnDisabled: {
    opacity: 0.4,
  },
  pageNavText: {
    fontSize: 13,
    color: C.secondary,
    fontFamily: 'Inter_400Regular',
  },
  bottomPanel: {
    backgroundColor: C.surfaceContainerLowest,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 14,
    shadowColor: C.secondary,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 6,
    borderTopWidth: 1,
    borderColor: `${C.outlineVariant}30`,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: `${C.outlineVariant}50`,
  },
  titleInput: {
    flex: 1,
    fontSize: 16,
    color: C.onSurface,
    fontFamily: 'Inter_500Medium',
    paddingVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 8,
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  infoBadgeText: {
    fontSize: 12,
    color: C.secondary,
    fontFamily: 'Inter_400Regular',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  shareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: C.primary,
    backgroundColor: 'transparent',
  },
  shareBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: C.primary,
    fontFamily: 'Inter_600SemiBold',
  },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    backgroundColor: C.primary,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'Inter_600SemiBold',
  },
});
