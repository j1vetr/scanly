import { Feather } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import colors from '@/constants/colors';
import { MOCK_FOLDERS } from '@/constants/mockData';
import { useDocuments } from '@/context/DocumentsContext';

const C = colors.light;

const OCR_API_BASE = process.env.EXPO_PUBLIC_OCR_API_URL
  ?? (process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
    : '');
const OCR_API_URL = `${OCR_API_BASE}/api/ocr`;

export default function DocumentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { getDocumentById, removeDocument, updateDocument } = useDocuments();
  const [menuVisible, setMenuVisible] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isOpeningPdf, setIsOpeningPdf] = useState(false);
  const [isRunningOcr, setIsRunningOcr] = useState(false);
  const [ocrExpanded, setOcrExpanded] = useState(true);

  const doc = getDocumentById(id ?? '');
  const isWeb = Platform.OS === 'web';
  const bottomPad = isWeb ? 34 : insets.bottom;

  if (!doc) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <Pressable style={styles.iconBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color={C.onSurface} />
          </Pressable>
          <Text style={styles.title}>Belge</Text>
          <View style={styles.iconBtn} />
        </View>
        <View style={styles.notFound}>
          <Feather name="file" size={40} color={C.mutedForeground} />
          <Text style={styles.notFoundText}>Belge bulunamadı</Text>
        </View>
      </View>
    );
  }

  const folder = MOCK_FOLDERS.find(f => f.id === doc.folderId);

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isWeb || (!doc.localPdfUri && !doc.localImageUri)) {
      Alert.alert('Paylaş', 'Bu belge için yerel dosya bulunamadı.');
      return;
    }
    setIsSharing(true);
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) return;
      const shareUri = doc.localPdfUri || doc.localImageUri!;
      const mimeType = doc.localPdfUri ? 'application/pdf' : 'image/jpeg';
      await Sharing.shareAsync(shareUri, { mimeType, dialogTitle: doc.title });
    } catch (err) {
      console.error('Paylaşma hatası:', err);
    } finally {
      setIsSharing(false);
    }
  };

  const handleOpenPdf = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!doc.localPdfUri) {
      Alert.alert('PDF Yok', 'Bu belge için PDF dosyası oluşturulmamış. Belgeyi yeniden tarayıp kaydedin.');
      return;
    }
    if (isWeb) return;
    setIsOpeningPdf(true);
    try {
      const info = await FileSystem.getInfoAsync(doc.localPdfUri);
      if (!info.exists) {
        Alert.alert('Dosya Bulunamadı', 'PDF dosyası silinmiş veya taşınmış olabilir.');
        return;
      }
      await WebBrowser.openBrowserAsync(doc.localPdfUri);
    } catch (err) {
      console.error('PDF açma hatası:', err);
      Alert.alert('Hata', 'PDF dosyası açılamadı.');
    } finally {
      setIsOpeningPdf(false);
    }
  };

  const handleDelete = () => {
    if (Platform.OS !== 'web') {
      Alert.alert(
        'Belgeyi Sil',
        `"${doc.title}" belgesini silmek istediğinize emin misiniz?`,
        [
          { text: 'Vazgeç', style: 'cancel' },
          {
            text: 'Sil',
            style: 'destructive',
            onPress: async () => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              if (doc.localPdfUri) {
                try { await FileSystem.deleteAsync(doc.localPdfUri, { idempotent: true }); } catch {}
              }
              removeDocument(doc.id);
              router.back();
            },
          },
        ]
      );
    } else {
      removeDocument(doc.id);
      router.back();
    }
  };

  const handleOcr = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!doc.localImageUri) {
      Alert.alert(
        'Görüntü Yok',
        'Metin tanıma için belgenin görüntü dosyası gereklidir. Belgeyi kamerayla tarayıp kaydedin.',
        [{ text: 'Tamam' }]
      );
      return;
    }

    if (doc.ocrText) {
      Alert.alert(
        'Metni Yenile',
        'Bu belge için daha önce metin çıkarılmış. Yeniden tanımak ister misiniz?',
        [
          { text: 'Vazgeç', style: 'cancel' },
          { text: 'Yeniden Tanı', onPress: () => runOcr() },
        ]
      );
      return;
    }

    runOcr();
  };

  const runOcr = async () => {
    if (!doc.localImageUri) return;
    setIsRunningOcr(true);
    try {
      const base64 = await FileSystem.readAsStringAsync(doc.localImageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const ext = doc.localImageUri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

      const response = await fetch(OCR_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? 'Sunucu hatası');
      }

      const data = await response.json() as { text: string };
      const extractedText = data.text?.trim();

      if (!extractedText) {
        Alert.alert('Metin Bulunamadı', 'Belgede okunabilir metin tespit edilemedi.', [{ text: 'Tamam' }]);
        return;
      }

      updateDocument(doc.id, { ocrText: extractedText });
      setOcrExpanded(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: unknown) {
      console.error('OCR hatası:', err);
      const message = err instanceof Error ? err.message : 'Bilinmeyen hata';
      Alert.alert('Metin Tanıma Hatası', `Metin çıkarılamadı: ${message}`, [{ text: 'Tamam' }]);
    } finally {
      setIsRunningOcr(false);
    }
  };

  const hasPdf = Boolean(doc.localPdfUri);
  const hasImage = Boolean(doc.localImageUri);
  const hasOcrText = Boolean(doc.ocrText);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable
          style={styles.iconBtn}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
        >
          <Feather name="arrow-left" size={20} color={C.onSurface} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>Belge Detayları</Text>
        <Pressable
          style={styles.iconBtn}
          onPress={() => { setMenuVisible(!menuVisible); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        >
          <Feather name="more-vertical" size={20} color={C.onSurface} />
        </Pressable>
      </View>

      {menuVisible && (
        <View style={styles.dropMenu}>
          <Pressable style={styles.dropMenuItem} onPress={() => { setMenuVisible(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
            <Feather name="edit-2" size={16} color={C.onSurface} />
            <Text style={styles.dropMenuText}>Yeniden Adlandır</Text>
          </Pressable>
          <View style={styles.dropMenuDivider} />
          <Pressable style={styles.dropMenuItem} onPress={() => { setMenuVisible(false); handleDelete(); }}>
            <Feather name="trash-2" size={16} color={C.error} />
            <Text style={[styles.dropMenuText, { color: C.error }]}>Sil</Text>
          </Pressable>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 32 }]}
        onScrollBeginDrag={() => setMenuVisible(false)}
      >
        <View style={styles.docPreviewCard}>
          <View style={styles.docThumbnail}>
            {hasImage ? (
              <View style={styles.docImageWrap}>
                <Image
                  source={{ uri: doc.localImageUri }}
                  style={styles.docImage}
                  contentFit="cover"
                />
                {(doc.filterName === 'Gri Tonlama' || doc.filterName === 'Siyah & Beyaz') && Platform.OS !== 'web' && (
                  <View style={[StyleSheet.absoluteFill, styles.grayscaleLayer]} />
                )}
                {doc.filterName && doc.filterName !== 'Orijinal' && (
                  <View style={styles.filterChip}>
                    <Feather name="zap" size={10} color={C.primary} />
                    <Text style={styles.filterChipText}>{doc.filterName}</Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.docMockContent}>
                <View style={styles.docTypeIcon}>
                  <Feather name="file-text" size={32} color={C.primary} />
                </View>
                {Array.from({ length: 5 }).map((_, i) => (
                  <View key={i} style={[styles.mockLine, { width: i % 3 === 0 ? '90%' : i % 3 === 1 ? '75%' : '60%', marginTop: i === 0 ? 12 : 8 }]} />
                ))}
              </View>
            )}
          </View>

          {hasPdf && (
            <Pressable
              style={({ pressed }) => [styles.openPdfBtn, { opacity: (pressed || isOpeningPdf) ? 0.85 : 1 }]}
              onPress={handleOpenPdf}
              disabled={isOpeningPdf}
            >
              {isOpeningPdf
                ? <ActivityIndicator color="#ffffff" size="small" />
                : <Feather name="external-link" size={16} color="#ffffff" />
              }
              <Text style={styles.openPdfBtnText}>
                {isOpeningPdf ? 'Açılıyor...' : 'PDF\'yi Görüntüle'}
              </Text>
            </Pressable>
          )}

          <View style={styles.actionRow}>
            <Pressable
              style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.75 : 1 }]}
              onPress={handleShare}
              disabled={isSharing}
            >
              <View style={styles.actionBtnIcon}>
                {isSharing
                  ? <ActivityIndicator color={C.primary} size="small" />
                  : <Feather name="share-2" size={20} color={C.primary} />
                }
              </View>
              <Text style={styles.actionBtnLabel}>Paylaş</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.75 : 1 }]}
              onPress={handleOpenPdf}
              disabled={isOpeningPdf || !hasPdf}
            >
              <View style={[styles.actionBtnIcon, !hasPdf && styles.actionBtnDisabled]}>
                <Feather name="download" size={20} color={hasPdf ? C.primary : C.outline} />
              </View>
              <Text style={[styles.actionBtnLabel, !hasPdf && styles.actionBtnLabelDisabled]}>İndir</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.75 : 1 }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            >
              <View style={styles.actionBtnIcon}>
                <Feather name="crop" size={20} color={C.primary} />
              </View>
              <Text style={styles.actionBtnLabel}>Kırp</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.actionBtn, { opacity: (pressed || isRunningOcr) ? 0.75 : 1 }]}
              onPress={handleOcr}
              disabled={isRunningOcr}
            >
              <View style={[styles.actionBtnIcon, hasOcrText && styles.actionBtnActive]}>
                {isRunningOcr
                  ? <ActivityIndicator color={C.primary} size="small" />
                  : <Feather name="type" size={20} color={C.primary} />
                }
              </View>
              <Text style={styles.actionBtnLabel}>
                {isRunningOcr ? 'Tanınıyor...' : hasOcrText ? 'Metin Var' : 'Metni Tanı'}
              </Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.sectionLabel}>BİLGİLER</Text>
        <View style={styles.infoCard}>
          {[
            { icon: 'tag', key: 'Başlık', value: doc.title },
            { icon: 'calendar', key: 'Tarih', value: doc.dateLabel },
            { icon: 'layers', key: 'Sayfalar', value: `${doc.pages} Sayfa` },
            { icon: 'hard-drive', key: 'Boyut', value: doc.size },
            { icon: 'folder', key: 'Klasör', value: folder?.name ?? 'Genel' },
            { icon: 'file-text', key: 'Tür', value: doc.type.toUpperCase() },
            ...(doc.filterName ? [{ icon: 'zap', key: 'Filtre', value: doc.filterName }] : []),
          ].map((row, idx, arr) => (
            <React.Fragment key={row.key}>
              <View style={styles.infoRow}>
                <Feather name={row.icon as any} size={16} color={C.outline} />
                <Text style={styles.infoKey}>{row.key}</Text>
                <Text style={styles.infoValue}>{row.value}</Text>
              </View>
              {idx < arr.length - 1 && <View style={styles.infoDivider} />}
            </React.Fragment>
          ))}
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Feather name="hash" size={16} color={C.outline} />
            <Text style={styles.infoKey}>Etiket</Text>
            <View style={styles.infoTag}>
              <Text style={styles.infoTagText}>{doc.tag}</Text>
            </View>
          </View>
        </View>

        {hasOcrText && (
          <>
            <Pressable
              style={styles.ocrSectionHeader}
              onPress={() => { setOcrExpanded(v => !v); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            >
              <View style={styles.ocrSectionHeaderLeft}>
                <View style={styles.ocrBadge}>
                  <Feather name="type" size={12} color={C.primary} />
                </View>
                <Text style={styles.sectionLabel} >ÇIKARILAN METİN</Text>
              </View>
              <Feather name={ocrExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={C.outline} />
            </Pressable>
            {ocrExpanded && (
              <View style={styles.ocrCard}>
                <Text style={styles.ocrText} selectable>{doc.ocrText}</Text>
                <View style={styles.ocrFooter}>
                  <Feather name="check-circle" size={13} color={C.primary} />
                  <Text style={styles.ocrFooterText}>Yapay zeka ile tanındı</Text>
                </View>
              </View>
            )}
          </>
        )}

        {hasPdf && (
          <>
            <Text style={styles.sectionLabel}>PDF DOSYASI</Text>
            <View style={styles.pdfCard}>
              <View style={styles.pdfCardIcon}>
                <Feather name="file-text" size={24} color={C.primary} />
              </View>
              <View style={styles.pdfCardInfo}>
                <Text style={styles.pdfCardName} numberOfLines={1}>{doc.title}.pdf</Text>
                <Text style={styles.pdfCardSize}>{doc.size} · Yerel depolama</Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.pdfOpenBtn, { opacity: (pressed || isOpeningPdf) ? 0.8 : 1 }]}
                onPress={handleOpenPdf}
                disabled={isOpeningPdf}
              >
                {isOpeningPdf
                  ? <ActivityIndicator color={C.primary} size="small" />
                  : <Feather name="external-link" size={18} color={C.primary} />
                }
              </Pressable>
            </View>
          </>
        )}

        <Pressable
          style={({ pressed }) => [styles.deleteBtn, { opacity: pressed ? 0.85 : 1 }]}
          onPress={handleDelete}
        >
          <Feather name="trash-2" size={18} color={C.error} />
          <Text style={styles.deleteBtnText}>Belgeyi Sil</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, zIndex: 10 },
  iconBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.surfaceContainerLowest, alignItems: 'center', justifyContent: 'center', shadowColor: C.secondary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2, borderWidth: 1, borderColor: `${C.outlineVariant}50` },
  title: { fontSize: 17, fontWeight: '600', color: C.onSurface, fontFamily: 'Inter_600SemiBold', flex: 1, textAlign: 'center' },
  dropMenu: { position: 'absolute', top: 70, right: 20, backgroundColor: C.surfaceContainerLowest, borderRadius: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8, zIndex: 100, minWidth: 160, borderWidth: 1, borderColor: `${C.outlineVariant}50`, overflow: 'hidden' },
  dropMenuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
  dropMenuText: { fontSize: 15, color: C.onSurface, fontFamily: 'Inter_400Regular' },
  dropMenuDivider: { height: 1, backgroundColor: `${C.outlineVariant}50`, marginHorizontal: 12 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8, gap: 0 },
  docPreviewCard: { backgroundColor: C.surfaceContainerLowest, borderRadius: 20, padding: 16, marginBottom: 24, shadowColor: C.secondary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3, borderWidth: 1, borderColor: `${C.outlineVariant}50`, gap: 12 },
  docThumbnail: { width: '100%', aspectRatio: 4 / 3, backgroundColor: '#f5f5f5', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: `${C.outlineVariant}30` },
  docImageWrap: { width: '100%', height: '100%', position: 'relative' },
  docImage: { width: '100%', height: '100%' },
  grayscaleLayer: { backgroundColor: 'rgba(80,80,80,0.45)' },
  filterChip: { position: 'absolute', bottom: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  filterChipText: { fontSize: 10, color: C.primary, fontFamily: 'Inter_600SemiBold' },
  docMockContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  docTypeIcon: { width: 60, height: 60, borderRadius: 16, backgroundColor: `${C.primary}12`, alignItems: 'center', justifyContent: 'center' },
  mockLine: { height: 7, borderRadius: 3.5, backgroundColor: C.surfaceContainerHigh },
  openPdfBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.primary, borderRadius: 12, paddingVertical: 10, shadowColor: C.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 3 },
  openPdfBtnText: { fontSize: 14, fontWeight: '600', color: '#ffffff', fontFamily: 'Inter_600SemiBold' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-around' },
  actionBtn: { alignItems: 'center', gap: 8, flex: 1 },
  actionBtnIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: `${C.primary}12`, alignItems: 'center', justifyContent: 'center' },
  actionBtnActive: { backgroundColor: `${C.primary}25`, borderWidth: 1.5, borderColor: `${C.primary}40` },
  actionBtnDisabled: { backgroundColor: C.surfaceContainerLow },
  actionBtnLabel: { fontSize: 12, color: C.secondary, fontFamily: 'Inter_400Regular' },
  actionBtnLabelDisabled: { color: C.outline },
  sectionLabel: { fontSize: 11, fontWeight: '600', color: C.outline, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8, marginBottom: 8, paddingLeft: 4 },
  infoCard: { backgroundColor: C.surfaceContainerLowest, borderRadius: 18, marginBottom: 24, overflow: 'hidden', borderWidth: 1, borderColor: `${C.outlineVariant}50`, shadowColor: C.secondary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  infoKey: { flex: 1, fontSize: 14, color: C.secondary, fontFamily: 'Inter_400Regular' },
  infoValue: { fontSize: 14, fontWeight: '500', color: C.onSurface, fontFamily: 'Inter_500Medium', textAlign: 'right', maxWidth: '55%' },
  infoDivider: { height: 1, marginLeft: 44, backgroundColor: `${C.outlineVariant}40` },
  infoTag: { backgroundColor: `${C.primary}15`, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  infoTagText: { fontSize: 13, fontWeight: '500', color: C.primary, fontFamily: 'Inter_500Medium' },
  ocrSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingLeft: 4, paddingRight: 4 },
  ocrSectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ocrBadge: { width: 20, height: 20, borderRadius: 6, backgroundColor: `${C.primary}18`, alignItems: 'center', justifyContent: 'center' },
  ocrCard: { backgroundColor: C.surfaceContainerLowest, borderRadius: 18, marginBottom: 24, overflow: 'hidden', borderWidth: 1, borderColor: `${C.primary}30`, shadowColor: C.secondary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1 },
  ocrText: { fontSize: 14, color: C.onSurface, fontFamily: 'Inter_400Regular', lineHeight: 22, padding: 16 },
  ocrFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, borderTopWidth: 1, borderTopColor: `${C.primary}20`, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: `${C.primary}08` },
  ocrFooterText: { fontSize: 12, color: C.primary, fontFamily: 'Inter_400Regular' },
  pdfCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.surfaceContainerLowest, borderRadius: 16, padding: 14, marginBottom: 24, borderWidth: 1, borderColor: `${C.outlineVariant}50` },
  pdfCardIcon: { width: 44, height: 44, borderRadius: 11, backgroundColor: `${C.primary}12`, alignItems: 'center', justifyContent: 'center' },
  pdfCardInfo: { flex: 1, gap: 3 },
  pdfCardName: { fontSize: 14, fontWeight: '600', color: C.onSurface, fontFamily: 'Inter_600SemiBold' },
  pdfCardSize: { fontSize: 12, color: C.secondary, fontFamily: 'Inter_400Regular' },
  pdfOpenBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: `${C.primary}12`, alignItems: 'center', justifyContent: 'center' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 16, paddingVertical: 16, borderWidth: 1.5, borderColor: `${C.error}50`, backgroundColor: '#ffdad620' },
  deleteBtnText: { fontSize: 15, fontWeight: '600', color: C.error, fontFamily: 'Inter_600SemiBold' },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  notFoundText: { fontSize: 16, color: C.secondary, fontFamily: 'Inter_400Regular' },
});
