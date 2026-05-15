import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import {
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

const ACTION_BUTTONS = [
  { icon: 'share-2', label: 'Paylaş' },
  { icon: 'download', label: 'İndir' },
  { icon: 'crop', label: 'Kırp' },
  { icon: 'zap', label: 'İyileştir' },
];

export default function DocumentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { getDocumentById, removeDocument } = useDocuments();
  const [menuVisible, setMenuVisible] = useState(false);

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
          <Feather name="file-x" size={40} color={C.mutedForeground} />
          <Text style={styles.notFoundText}>Belge bulunamadı</Text>
        </View>
      </View>
    );
  }

  const folder = MOCK_FOLDERS.find(f => f.id === doc.folderId);

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
            onPress: () => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
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
            <View style={styles.docMockContent}>
              {Array.from({ length: 9 }).map((_, i) => (
                <View
                  key={i}
                  style={[styles.mockLine, {
                    width: i % 3 === 0 ? '90%' : i % 3 === 1 ? '75%' : '60%',
                    marginTop: i === 0 ? 0 : i % 3 === 0 ? 14 : 8,
                  }]}
                />
              ))}
            </View>
          </View>

          <View style={styles.actionRow}>
            {ACTION_BUTTONS.map(btn => (
              <Pressable
                key={btn.label}
                style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.75 : 1 }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (btn.label === 'Paylaş') router.push('/scanner/export');
                }}
              >
                <View style={styles.actionBtnIcon}>
                  <Feather name={btn.icon as any} size={20} color={C.primary} />
                </View>
                <Text style={styles.actionBtnLabel}>{btn.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Text style={styles.sectionLabel}>BİLGİLER</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Feather name="tag" size={16} color={C.outline} />
            <Text style={styles.infoKey}>Başlık</Text>
            <Text style={styles.infoValue}>{doc.title}</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Feather name="calendar" size={16} color={C.outline} />
            <Text style={styles.infoKey}>Tarih</Text>
            <Text style={styles.infoValue}>{doc.dateLabel}</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Feather name="layers" size={16} color={C.outline} />
            <Text style={styles.infoKey}>Sayfalar</Text>
            <Text style={styles.infoValue}>{doc.pages} Sayfa</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Feather name="hard-drive" size={16} color={C.outline} />
            <Text style={styles.infoKey}>Boyut</Text>
            <Text style={styles.infoValue}>{doc.size}</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Feather name="folder" size={16} color={C.outline} />
            <Text style={styles.infoKey}>Klasör</Text>
            <Text style={styles.infoValue}>{folder?.name ?? 'Genel'}</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Feather name="file-text" size={16} color={C.outline} />
            <Text style={styles.infoKey}>Tür</Text>
            <Text style={styles.infoValue}>{doc.type.toUpperCase()}</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Feather name="hash" size={16} color={C.outline} />
            <Text style={styles.infoKey}>Etiket</Text>
            <View style={styles.infoTag}>
              <Text style={styles.infoTagText}>{doc.tag}</Text>
            </View>
          </View>
        </View>

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
    zIndex: 10,
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
    fontSize: 17,
    fontWeight: '600',
    color: C.onSurface,
    fontFamily: 'Inter_600SemiBold',
    flex: 1,
    textAlign: 'center',
  },
  dropMenu: {
    position: 'absolute',
    top: 70,
    right: 20,
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 100,
    minWidth: 160,
    borderWidth: 1,
    borderColor: `${C.outlineVariant}50`,
    overflow: 'hidden',
  },
  dropMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dropMenuText: {
    fontSize: 15,
    color: C.onSurface,
    fontFamily: 'Inter_400Regular',
  },
  dropMenuDivider: {
    height: 1,
    backgroundColor: `${C.outlineVariant}50`,
    marginHorizontal: 12,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 0,
  },
  docPreviewCard: {
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
    shadowColor: C.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: `${C.outlineVariant}50`,
    gap: 16,
  },
  docThumbnail: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderWidth: 1,
    borderColor: `${C.outlineVariant}30`,
  },
  docMockContent: {
    width: '70%',
    justifyContent: 'center',
  },
  mockLine: {
    height: 8,
    borderRadius: 4,
    backgroundColor: C.surfaceContainerHigh,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionBtn: {
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  actionBtnIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: `${C.primary}12`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnLabel: {
    fontSize: 12,
    color: C.secondary,
    fontFamily: 'Inter_400Regular',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: C.outline,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingLeft: 4,
  },
  infoCard: {
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 18,
    marginBottom: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: `${C.outlineVariant}50`,
    shadowColor: C.secondary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  infoKey: {
    flex: 1,
    fontSize: 14,
    color: C.secondary,
    fontFamily: 'Inter_400Regular',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: C.onSurface,
    fontFamily: 'Inter_500Medium',
    textAlign: 'right',
    maxWidth: '55%',
  },
  infoDivider: {
    height: 1,
    marginLeft: 44,
    backgroundColor: `${C.outlineVariant}40`,
  },
  infoTag: {
    backgroundColor: `${C.primary}15`,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  infoTagText: {
    fontSize: 13,
    fontWeight: '500',
    color: C.primary,
    fontFamily: 'Inter_500Medium',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: `${C.error}50`,
    backgroundColor: '#ffdad620',
  },
  deleteBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: C.error,
    fontFamily: 'Inter_600SemiBold',
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  notFoundText: {
    fontSize: 16,
    color: C.secondary,
    fontFamily: 'Inter_400Regular',
  },
});
