import { Feather } from '@expo/vector-icons';
import * as LegacyFS from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import colors from '@/constants/colors';
import { Document, MOCK_FOLDERS } from '@/constants/mockData';
import { useDocuments } from '@/context/DocumentsContext';
import { useScan } from '@/context/ScanContext';
import {
  generateFileName,
  generatePdfFromImages,
  getFilterCss,
  savePdfToDocuments,
} from '@/services/pdfService';

const C = colors.light;

export default function PreviewScreen() {
  const insets = useSafeAreaInsets();
  const {
    processedImageUri,
    capturedImageUri,
    capturedImages,
    selectedFilter,
    documentTitle,
    selectedFolderId,
    setDocumentTitle,
    setSelectedFolderId,
    setPdfUri,
    pdfUri,
    resetScan,
  } = useScan();
  const { addDocument } = useDocuments();

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [generatedPdfUri, setGeneratedPdfUri] = useState<string | null>(pdfUri);
  const [fileSizeKb, setFileSizeKb] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [folderModalVisible, setFolderModalVisible] = useState(false);

  const imageUri = processedImageUri || capturedImageUri;
  const allImages = capturedImages.length > 0 ? capturedImages : imageUri ? [imageUri] : [];
  const totalPages = allImages.length;
  const previewUri = allImages[currentPage] ?? imageUri;
  const filterCss = useMemo(() => getFilterCss(selectedFilter), [selectedFilter]);
  const selectedFolder = useMemo(() => MOCK_FOLDERS.find((f) => f.id === selectedFolderId), [selectedFolderId]);

  const generatePdf = useCallback(async (): Promise<string | null> => {
    if (allImages.length === 0) return null;
    if (generatedPdfUri) return generatedPdfUri;
    setIsGenerating(true);
    try {
      const tempUri = await generatePdfFromImages(allImages, filterCss, documentTitle || 'Yeni Belge');
      if (!tempUri) { setIsGenerating(false); return null; }
      const info = await LegacyFS.getInfoAsync(tempUri);
      if (info.exists && 'size' in info) setFileSizeKb(Math.round((info as any).size / 1024));
      setGeneratedPdfUri(tempUri);
      setPdfUri(tempUri);
      setIsGenerating(false);
      return tempUri;
    } catch (err) {
      console.error('PDF oluşturma hatası:', err);
      setIsGenerating(false);
      return null;
    }
  }, [allImages, filterCss, documentTitle, generatedPdfUri, setPdfUri]);

  useEffect(() => {
    if (allImages.length > 0 && Platform.OS !== 'web') { generatePdf(); }
  }, []);

  const handleSave = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsSaving(true);
    try {
      let savedPdfUri = generatedPdfUri;
      if (!savedPdfUri && Platform.OS !== 'web') savedPdfUri = await generatePdf();

      if (savedPdfUri && Platform.OS !== 'web') {
        const fileName = generateFileName(documentTitle);
        savedPdfUri = await savePdfToDocuments(savedPdfUri, fileName);
        setPdfUri(savedPdfUri);
      }

      const info = savedPdfUri && Platform.OS !== 'web' ? await LegacyFS.getInfoAsync(savedPdfUri) : null;
      const sizeStr = info?.exists && 'size' in info
        ? `${((info as any).size / (1024 * 1024)).toFixed(1)} MB`
        : fileSizeKb ? `${(fileSizeKb / 1024).toFixed(1)} MB` : '0.9 MB';

      const newDoc: Document = {
        id: `d_${Date.now()}${Math.random().toString(36).substr(2, 6)}`,
        title: documentTitle || 'Yeni Belge',
        dateLabel: 'Az önce',
        dateISO: new Date().toISOString(),
        pages: totalPages || 1,
        size: sizeStr,
        folderId: selectedFolderId,
        type: 'pdf',
        tag: 'Tarama',
        color: C.primary,
        localImageUri: imageUri ?? undefined,
        localPdfUri: savedPdfUri ?? undefined,
        filterName: selectedFilter,
      };
      addDocument(newDoc);
      resetScan();

      if (Platform.OS !== 'web') {
        Alert.alert('Kaydedildi ✓', `"${newDoc.title}" başarıyla kaydedildi.`, [
          { text: 'Tamam', onPress: () => router.replace('/(tabs)') },
        ]);
      } else {
        router.replace('/(tabs)');
      }
    } catch (err) {
      Alert.alert('Hata', 'Belge kaydedilemedi. Tekrar deneyin.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsSharing(true);
    try {
      let shareUri = generatedPdfUri;
      if (!shareUri && Platform.OS !== 'web') shareUri = await generatePdf();
      if (shareUri && Platform.OS !== 'web') {
        const { sharePdf } = await import('@/services/shareService');
        await sharePdf(shareUri, documentTitle);
      } else if (Platform.OS === 'web' && imageUri) {
        const a = document.createElement('a');
        a.href = imageUri;
        a.download = `${documentTitle || 'belge'}.jpg`;
        a.click();
      }
    } catch (err) {
      console.error('Paylaşma hatası:', err);
    } finally {
      setIsSharing(false);
    }
  };

  const fileSizeDisplay = fileSizeKb
    ? fileSizeKb > 1024 ? `${(fileSizeKb / 1024).toFixed(1)} MB` : `${fileSizeKb} KB`
    : '—';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable style={styles.iconBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}>
          <Feather name="arrow-left" size={20} color={C.onSurface} />
        </Pressable>
        <Text style={styles.title}>PDF Önizleme</Text>
        <Pressable style={styles.iconBtn} onPress={handleShare} disabled={isSharing}>
          {isSharing ? <ActivityIndicator color={C.primary} size="small" /> : <Feather name="share" size={20} color={C.primary} />}
        </Pressable>
      </View>

      <View style={styles.previewArea}>
        <View style={styles.pdfPageShadow}>
          <View style={styles.pdfPage}>
            <View style={styles.pdfHeader}>
              <View style={styles.pdfHeaderDot} />
              <Text style={styles.pdfHeaderTitle} numberOfLines={1}>{documentTitle || 'Yeni Belge'}</Text>
              <View style={styles.pdfBadge}><Text style={styles.pdfBadgeText}>Scanly</Text></View>
            </View>
            {previewUri ? (
              <View style={styles.pdfImageWrap}>
                <Image
                  source={{ uri: previewUri }}
                  style={[styles.pdfImage, Platform.OS === 'web' && { filter: filterCss } as any]}
                  contentFit="cover"
                />
                {(selectedFilter === 'Gri Tonlama' || selectedFilter === 'Siyah & Beyaz') && Platform.OS !== 'web' && (
                  <View style={[StyleSheet.absoluteFill, styles.grayscaleLayer]} />
                )}
              </View>
            ) : (
              <View style={styles.pdfBodyPlaceholder}>
                {Array.from({ length: 10 }).map((_, i) => (
                  <View key={i} style={[styles.pdfLine, { width: i % 4 === 0 ? '95%' : i % 4 === 1 ? '82%' : i % 4 === 2 ? '70%' : '55%', marginTop: i === 0 ? 0 : i % 3 === 0 ? 14 : 8 }]} />
                ))}
              </View>
            )}
            <View style={styles.pdfFooter}>
              <Text style={styles.pdfFooterText}>
                Scanly ile tarandı · {new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </Text>
              <Text style={styles.pdfPageNum}>{totalPages > 0 ? `${currentPage + 1}/${totalPages}` : '1/1'}</Text>
            </View>
          </View>
        </View>

        {isGenerating && (
          <View style={styles.generatingBadge}>
            <ActivityIndicator color={C.primary} size="small" />
            <Text style={styles.generatingText}>PDF oluşturuluyor...</Text>
          </View>
        )}
        {generatedPdfUri && !isGenerating && (
          <View style={styles.readyBadge}>
            <Feather name="check-circle" size={14} color={C.primary} />
            <Text style={styles.readyText}>PDF hazır</Text>
          </View>
        )}

        <View style={styles.pageNav}>
          <Pressable
            style={[styles.pageNavBtn, currentPage === 0 && styles.pageNavBtnDisabled]}
            onPress={() => { if (currentPage > 0) { setCurrentPage(currentPage - 1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } }}
            disabled={currentPage === 0}
          >
            <Feather name="chevron-left" size={18} color={currentPage === 0 ? C.outline : C.primary} />
          </Pressable>
          <Text style={styles.pageNavText}>{totalPages > 0 ? `${currentPage + 1} / ${totalPages} Sayfa` : '1 / 1 Sayfa'}</Text>
          <Pressable
            style={[styles.pageNavBtn, currentPage >= totalPages - 1 && styles.pageNavBtnDisabled]}
            onPress={() => { if (currentPage < totalPages - 1) { setCurrentPage(currentPage + 1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } }}
            disabled={currentPage >= totalPages - 1}
          >
            <Feather name="chevron-right" size={18} color={currentPage >= totalPages - 1 ? C.outline : C.primary} />
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

        <Pressable
          style={styles.folderRow}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFolderModalVisible(true); }}
        >
          <Feather name="folder" size={16} color={C.secondary} />
          <Text style={styles.folderRowText}>{selectedFolder?.name ?? 'Kişisel'}</Text>
          <Feather name="chevron-down" size={14} color={C.outline} />
        </Pressable>

        <View style={styles.infoRow}>
          <View style={styles.infoBadge}>
            <Feather name="layers" size={13} color={C.secondary} />
            <Text style={styles.infoBadgeText}>{totalPages || 1} Sayfa</Text>
          </View>
          <View style={styles.infoBadge}>
            <Feather name="zap" size={13} color={C.secondary} />
            <Text style={styles.infoBadgeText}>{selectedFilter}</Text>
          </View>
          <View style={styles.infoBadge}>
            <Feather name="hard-drive" size={13} color={C.secondary} />
            <Text style={styles.infoBadgeText}>{fileSizeDisplay}</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <Pressable
            style={({ pressed }) => [styles.addPageBtn, { opacity: pressed ? 0.85 : 1 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setGeneratedPdfUri(null);
              router.push('/scanner/camera');
            }}
            disabled={isSaving}
          >
            <Feather name="plus" size={18} color={C.primary} />
            <Text style={styles.addPageBtnText}>Sayfa Ekle</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.shareBtn, { opacity: (pressed || isSharing) ? 0.85 : 1 }]}
            onPress={handleShare}
            disabled={isSharing || isSaving}
          >
            {isSharing ? <ActivityIndicator color={C.primary} size="small" /> : <Feather name="share-2" size={18} color={C.primary} />}
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.saveBtn, { opacity: (pressed || isSaving || isGenerating) ? 0.88 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
            onPress={handleSave}
            disabled={isSaving || isGenerating}
          >
            {isSaving ? <ActivityIndicator color="#ffffff" size="small" /> : <Feather name="download" size={20} color="#ffffff" />}
            <Text style={styles.saveBtnText}>{isSaving ? 'Kaydediliyor...' : 'Kaydet'}</Text>
          </Pressable>
        </View>
      </View>

      <Modal
        visible={folderModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFolderModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setFolderModalVisible(false)}>
          <View style={styles.modalOverlay} />
        </TouchableWithoutFeedback>
        <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Klasör Seç</Text>
          <FlatList
            data={MOCK_FOLDERS}
            keyExtractor={(f) => f.id}
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [styles.folderOption, { opacity: pressed ? 0.8 : 1 }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedFolderId(item.id);
                  setFolderModalVisible(false);
                }}
              >
                <View style={[styles.folderOptionIcon, { backgroundColor: item.bgColor }]}>
                  <Feather name={item.icon as any} size={18} color={item.iconColor} />
                </View>
                <Text style={[styles.folderOptionText, item.id === selectedFolderId && styles.folderOptionTextActive]}>
                  {item.name}
                </Text>
                {item.id === selectedFolderId && <Feather name="check" size={18} color={C.primary} />}
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={styles.folderOptionDivider} />}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  iconBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.surfaceContainerLowest, alignItems: 'center', justifyContent: 'center', shadowColor: C.secondary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2, borderWidth: 1, borderColor: `${C.outlineVariant}50` },
  title: { fontSize: 18, fontWeight: '600', color: C.onSurface, fontFamily: 'Inter_600SemiBold' },
  previewArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 12 },
  pdfPageShadow: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 10, width: '80%', aspectRatio: 3 / 4 },
  pdfPage: { width: '100%', height: '100%', backgroundColor: '#ffffff', borderRadius: 4, overflow: 'hidden', borderWidth: 1, borderColor: `${C.outlineVariant}30` },
  pdfHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  pdfHeaderDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary },
  pdfHeaderTitle: { flex: 1, fontSize: 11, fontWeight: '600', color: '#1a1a1a', fontFamily: 'Inter_600SemiBold' },
  pdfBadge: { backgroundColor: '#e6f4ef', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  pdfBadgeText: { fontSize: 9, color: C.primary, fontWeight: '600', fontFamily: 'Inter_600SemiBold' },
  pdfImageWrap: { flex: 1, position: 'relative' },
  pdfImage: { width: '100%', height: '100%' },
  grayscaleLayer: { backgroundColor: 'rgba(80,80,80,0.45)' },
  pdfBodyPlaceholder: { flex: 1, padding: 12, gap: 0 },
  pdfLine: { height: 6, borderRadius: 3, backgroundColor: C.surfaceContainerHigh },
  pdfFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderTopWidth: 1, borderColor: '#f0f0f0' },
  pdfFooterText: { fontSize: 8, color: '#aaa', fontFamily: 'Inter_400Regular' },
  pdfPageNum: { fontSize: 9, color: C.outline, fontFamily: 'Inter_400Regular' },
  generatingBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: `${C.primary}15`, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  generatingText: { fontSize: 12, color: C.primary, fontFamily: 'Inter_500Medium' },
  readyBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: `${C.primary}12`, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  readyText: { fontSize: 12, color: C.primary, fontFamily: 'Inter_500Medium' },
  pageNav: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  pageNavBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.surfaceContainerLow, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: `${C.outlineVariant}50` },
  pageNavBtnDisabled: { opacity: 0.4 },
  pageNavText: { fontSize: 13, color: C.secondary, fontFamily: 'Inter_400Regular' },
  bottomPanel: { backgroundColor: C.surfaceContainerLowest, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 16, gap: 10, shadowColor: C.secondary, shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 6, borderTopWidth: 1, borderColor: `${C.outlineVariant}30` },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surfaceContainerLow, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 2, borderWidth: 1, borderColor: `${C.outlineVariant}50` },
  titleInput: { flex: 1, fontSize: 16, color: C.onSurface, fontFamily: 'Inter_500Medium', paddingVertical: 12 },
  folderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.surfaceContainerLow, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: `${C.outlineVariant}50` },
  folderRowText: { flex: 1, fontSize: 14, color: C.secondary, fontFamily: 'Inter_500Medium' },
  infoRow: { flexDirection: 'row', gap: 8 },
  infoBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.surfaceContainerLow, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  infoBadgeText: { fontSize: 12, color: C.secondary, fontFamily: 'Inter_400Regular' },
  actionRow: { flexDirection: 'row', gap: 10 },
  addPageBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 14, paddingVertical: 14, borderWidth: 1.5, borderColor: C.primary, backgroundColor: 'transparent' },
  addPageBtnText: { fontSize: 13, fontWeight: '600', color: C.primary, fontFamily: 'Inter_600SemiBold' },
  shareBtn: { width: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingVertical: 14, borderWidth: 1.5, borderColor: C.outlineVariant, backgroundColor: 'transparent' },
  shareBtnText: { fontSize: 15, fontWeight: '600', color: C.primary, fontFamily: 'Inter_600SemiBold' },
  saveBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 14, backgroundColor: C.primary, shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 4 },
  saveBtnText: { fontSize: 15, fontWeight: '600', color: '#ffffff', fontFamily: 'Inter_600SemiBold' },
  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: C.surfaceContainerLowest, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 12 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: C.outlineVariant, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: C.onSurface, fontFamily: 'Inter_700Bold', marginBottom: 12 },
  folderOption: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 4 },
  folderOptionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  folderOptionText: { flex: 1, fontSize: 15, color: C.onSurface, fontFamily: 'Inter_500Medium' },
  folderOptionTextActive: { color: C.primary, fontFamily: 'Inter_600SemiBold' },
  folderOptionDivider: { height: 1, backgroundColor: `${C.outlineVariant}40`, marginLeft: 52 },
});
