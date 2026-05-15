import { Feather } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as Print from 'expo-print';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import colors from '@/constants/colors';
import { Document } from '@/constants/mockData';
import { useDocuments } from '@/context/DocumentsContext';
import { FilterType, useScan } from '@/context/ScanContext';

const C = colors.light;

function getFilterCss(filter: FilterType): string {
  switch (filter) {
    case 'Temiz': return 'contrast(1.2) brightness(1.05)';
    case 'Parlak': return 'brightness(1.2) contrast(1.05)';
    case 'Gri Tonlama': return 'grayscale(1)';
    case 'Siyah & Beyaz': return 'grayscale(1) contrast(1.7) brightness(1.1)';
    default: return 'none';
  }
}

function buildPdfHtml(base64: string, filterCss: string, title: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; background: #ffffff; font-family: -apple-system, Arial, sans-serif; }
  .page {
    width: 100%;
    min-height: 100vh;
    background: white;
    display: flex;
    flex-direction: column;
    position: relative;
  }
  .doc-img {
    width: 100%;
    display: block;
    filter: ${filterCss};
    -webkit-filter: ${filterCss};
  }
  .footer {
    padding: 12px 16px;
    font-size: 10px;
    color: #aaa;
    text-align: right;
    border-top: 1px solid #eee;
    margin-top: auto;
  }
  .header {
    padding: 12px 16px 8px;
    display: flex;
    align-items: center;
    gap: 8px;
    border-bottom: 1px solid #f0f0f0;
  }
  .header-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #006948;
  }
  .header-title {
    font-size: 13px;
    font-weight: 600;
    color: #1a1a1a;
    flex: 1;
  }
  .header-badge {
    font-size: 10px;
    color: #006948;
    background: #e6f4ef;
    padding: 2px 8px;
    border-radius: 20px;
    font-weight: 500;
  }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="header-dot"></div>
    <span class="header-title">${title}</span>
    <span class="header-badge">Scanly</span>
  </div>
  <img class="doc-img" src="data:image/jpeg;base64,${base64}" alt="document" />
  <div class="footer">Scanly ile tarandı · ${new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
</div>
</body>
</html>`;
}

async function ensureDir(dir: string) {
  if (!FileSystem.documentDirectory) return;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
}

export default function PreviewScreen() {
  const insets = useSafeAreaInsets();
  const { processedImageUri, capturedImageUri, selectedFilter, documentTitle, setDocumentTitle, setPdfUri, pdfUri, resetScan } = useScan();
  const { addDocument } = useDocuments();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [generatedPdfUri, setGeneratedPdfUri] = useState<string | null>(pdfUri);
  const [fileSizeKb, setFileSizeKb] = useState<number | null>(null);

  const imageUri = processedImageUri || capturedImageUri;

  const generatePdf = useCallback(async (): Promise<string | null> => {
    if (!imageUri) return null;
    if (generatedPdfUri) return generatedPdfUri;
    setIsGenerating(true);
    try {
      let base64 = '';
      if (Platform.OS !== 'web') {
        base64 = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      } else {
        const resp = await fetch(imageUri);
        const blob = await resp.blob();
        base64 = await new Promise<string>((res, rej) => {
          const r = new FileReader();
          r.onload = () => res((r.result as string).split(',')[1]);
          r.onerror = rej;
          r.readAsDataURL(blob);
        });
      }
      const filterCss = getFilterCss(selectedFilter);
      const html = buildPdfHtml(base64, filterCss, documentTitle || 'Yeni Belge');

      if (Platform.OS === 'web') {
        setIsGenerating(false);
        return null;
      }

      const { uri: tempUri } = await Print.printToFileAsync({ html, width: 595, height: 842 });
      const info = await FileSystem.getInfoAsync(tempUri);
      if (info.exists && 'size' in info) {
        setFileSizeKb(Math.round((info as any).size / 1024));
      }
      setGeneratedPdfUri(tempUri);
      setPdfUri(tempUri);
      setIsGenerating(false);
      return tempUri;
    } catch (err) {
      console.error('PDF oluşturma hatası:', err);
      setIsGenerating(false);
      return null;
    }
  }, [imageUri, selectedFilter, documentTitle, generatedPdfUri, setPdfUri]);

  useEffect(() => {
    if (imageUri && Platform.OS !== 'web') {
      generatePdf();
    }
  }, []);

  const handleSave = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsSaving(true);
    try {
      let savedPdfUri = generatedPdfUri;

      if (!savedPdfUri && Platform.OS !== 'web') {
        savedPdfUri = await generatePdf();
      }

      if (savedPdfUri && Platform.OS !== 'web' && FileSystem.documentDirectory) {
        const dir = FileSystem.documentDirectory + 'scanly/';
        await ensureDir(dir);
        const safeName = (documentTitle || 'Yeni_Belge').replace(/[^\w\u00C0-\u024F\s]/g, '_');
        const fileName = `${safeName}_${Date.now()}.pdf`;
        const destUri = dir + fileName;
        await FileSystem.copyAsync({ from: savedPdfUri, to: destUri });
        savedPdfUri = destUri;
        setPdfUri(destUri);
      }

      const info = savedPdfUri && Platform.OS !== 'web'
        ? await FileSystem.getInfoAsync(savedPdfUri)
        : null;
      const sizeStr = (info?.exists && 'size' in info)
        ? `${((info as any).size / (1024 * 1024)).toFixed(1)} MB`
        : fileSizeKb ? `${(fileSizeKb / 1024).toFixed(1)} MB` : '0.9 MB';

      const newDoc: Document = {
        id: `d_${Date.now()}${Math.random().toString(36).substr(2, 6)}`,
        title: documentTitle || 'Yeni Belge',
        dateLabel: 'Az önce',
        dateISO: new Date().toISOString(),
        pages: 1,
        size: sizeStr,
        folderId: 'f4',
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
      if (!shareUri && Platform.OS !== 'web') {
        shareUri = await generatePdf();
      }
      if (shareUri && Platform.OS !== 'web') {
        const available = await Sharing.isAvailableAsync();
        if (available) {
          await Sharing.shareAsync(shareUri, {
            mimeType: 'application/pdf',
            dialogTitle: documentTitle || 'Belgeyi Paylaş',
          });
        }
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
          {isSharing
            ? <ActivityIndicator color={C.primary} size="small" />
            : <Feather name="share" size={20} color={C.primary} />
          }
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
            {imageUri ? (
              <View style={styles.pdfImageWrap}>
                <Image
                  source={{ uri: imageUri }}
                  style={[
                    styles.pdfImage,
                    Platform.OS === 'web' && { filter: getFilterCss(selectedFilter) } as any,
                  ]}
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
              <Text style={styles.pdfPageNum}>1/1</Text>
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
          <Pressable style={[styles.pageNavBtn, styles.pageNavBtnDisabled]}>
            <Feather name="chevron-left" size={18} color={C.outline} />
          </Pressable>
          <Text style={styles.pageNavText}>1 / 1 Sayfa</Text>
          <Pressable style={[styles.pageNavBtn, styles.pageNavBtnDisabled]}>
            <Feather name="chevron-right" size={18} color={C.outline} />
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
            <Text style={styles.infoBadgeText}>1 Sayfa</Text>
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
            style={({ pressed }) => [styles.shareBtn, { opacity: (pressed || isSharing) ? 0.85 : 1 }]}
            onPress={handleShare}
            disabled={isSharing || isSaving}
          >
            {isSharing
              ? <ActivityIndicator color={C.primary} size="small" />
              : <Feather name="share-2" size={20} color={C.primary} />
            }
            <Text style={styles.shareBtnText}>Paylaş</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.saveBtn, { opacity: (pressed || isSaving || isGenerating) ? 0.88 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
            onPress={handleSave}
            disabled={isSaving || isGenerating}
          >
            {isSaving
              ? <ActivityIndicator color="#ffffff" size="small" />
              : <Feather name="download" size={20} color="#ffffff" />
            }
            <Text style={styles.saveBtnText}>{isSaving ? 'Kaydediliyor...' : 'Kaydet'}</Text>
          </Pressable>
        </View>
      </View>
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
  bottomPanel: { backgroundColor: C.surfaceContainerLowest, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 20, gap: 14, shadowColor: C.secondary, shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 6, borderTopWidth: 1, borderColor: `${C.outlineVariant}30` },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surfaceContainerLow, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 2, borderWidth: 1, borderColor: `${C.outlineVariant}50` },
  titleInput: { flex: 1, fontSize: 16, color: C.onSurface, fontFamily: 'Inter_500Medium', paddingVertical: 12 },
  infoRow: { flexDirection: 'row', gap: 8 },
  infoBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.surfaceContainerLow, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  infoBadgeText: { fontSize: 12, color: C.secondary, fontFamily: 'Inter_400Regular' },
  actionRow: { flexDirection: 'row', gap: 12 },
  shareBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 14, borderWidth: 1.5, borderColor: C.primary, backgroundColor: 'transparent' },
  shareBtnText: { fontSize: 15, fontWeight: '600', color: C.primary, fontFamily: 'Inter_600SemiBold' },
  saveBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 14, backgroundColor: C.primary, shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 4 },
  saveBtnText: { fontSize: 15, fontWeight: '600', color: '#ffffff', fontFamily: 'Inter_600SemiBold' },
});
