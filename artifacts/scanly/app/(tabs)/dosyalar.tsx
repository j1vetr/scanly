import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import colors from '@/constants/colors';
import { Document } from '@/constants/mockData';
import { useDocuments } from '@/context/DocumentsContext';

const C = colors.light;

type ViewMode = 'grid' | 'list';

export default function DosyalarScreen() {
  const insets = useSafeAreaInsets();
  const { documents, folders } = useDocuments();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const isWeb = Platform.OS === 'web';
  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : insets.bottom;

  const filteredDocs = selectedFolder
    ? documents.filter(d => d.folderId === selectedFolder)
    : documents;

  const TYPE_ICONS: Record<Document['type'], string> = {
    pdf: 'file-text',
    image: 'image',
    text: 'align-left',
  };

  const renderDocRow = ({ item }: { item: Document }) => (
    <Pressable
      style={({ pressed }) => [styles.docRow, { opacity: pressed ? 0.85 : 1, backgroundColor: pressed ? C.surfaceContainerLow : C.surfaceContainerLowest }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/document/${item.id}`);
      }}
    >
      <View style={[styles.docIcon, { backgroundColor: `${C.primary}18` }]}>
        <Feather name={TYPE_ICONS[item.type] as any} size={20} color={C.primary} />
      </View>
      <View style={styles.docRowInfo}>
        <Text style={styles.docRowTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.docRowMeta}>{item.dateLabel} · {item.pages} Sayfa · {item.size}</Text>
      </View>
      <View style={styles.docRowTag}>
        <Text style={styles.docRowTagText}>{item.tag}</Text>
      </View>
      <Feather name="chevron-right" size={16} color={C.outline} />
    </Pressable>
  );

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dosyalar</Text>
        <View style={styles.headerActions}>
          <Pressable
            style={styles.iconBtn}
            onPress={() => { setViewMode(viewMode === 'grid' ? 'list' : 'grid'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          >
            <Feather name={viewMode === 'grid' ? 'list' : 'grid'} size={20} color={C.primary} />
          </Pressable>
          <Pressable
            style={styles.iconBtn}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/scanner/camera'); }}
          >
            <Feather name="plus" size={20} color={C.primary} />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={folders}
        keyExtractor={f => f.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.folderTabsRow}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.folderTab, selectedFolder === item.id && styles.folderTabActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedFolder(selectedFolder === item.id ? null : item.id);
            }}
          >
            <Text style={[styles.folderTabText, selectedFolder === item.id && styles.folderTabTextActive]}>
              {item.name}
            </Text>
            <Text style={[styles.folderTabCount, selectedFolder === item.id && styles.folderTabTextActive]}>
              {item.count}
            </Text>
          </Pressable>
        )}
        ListHeaderComponent={
          <Pressable
            style={[styles.folderTab, selectedFolder === null && styles.folderTabActive]}
            onPress={() => { setSelectedFolder(null); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          >
            <Text style={[styles.folderTabText, selectedFolder === null && styles.folderTabTextActive]}>
              Tümü
            </Text>
            <Text style={[styles.folderTabCount, selectedFolder === null && styles.folderTabTextActive]}>
              {documents.length}
            </Text>
          </Pressable>
        }
      />

      {filteredDocs.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="inbox" size={40} color={C.mutedForeground} />
          <Text style={styles.emptyTitle}>Bu klasör boş</Text>
          <Text style={styles.emptySubtitle}>Belge taramak için + butonuna dokunun.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredDocs}
          keyExtractor={d => d.id}
          renderItem={renderDocRow}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomPad + 90 }]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: C.onSurface,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderTabsRow: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 8,
    alignItems: 'center',
  },
  folderTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
    backgroundColor: C.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  folderTabActive: {
    backgroundColor: `${C.primary}18`,
    borderColor: `${C.primary}40`,
  },
  folderTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: C.secondary,
    fontFamily: 'Inter_500Medium',
  },
  folderTabTextActive: {
    color: C.primary,
  },
  folderTabCount: {
    fontSize: 11,
    fontWeight: '600',
    color: C.secondary,
    fontFamily: 'Inter_600SemiBold',
    backgroundColor: C.surfaceContainerHigh,
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    gap: 12,
  },
  docIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docRowInfo: {
    flex: 1,
    gap: 3,
  },
  docRowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: C.onSurface,
    fontFamily: 'Inter_600SemiBold',
  },
  docRowMeta: {
    fontSize: 12,
    color: C.secondary,
    fontFamily: 'Inter_400Regular',
  },
  docRowTag: {
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  docRowTagText: {
    fontSize: 11,
    color: C.secondary,
    fontFamily: 'Inter_500Medium',
  },
  separator: {
    height: 1,
    marginHorizontal: 14,
    backgroundColor: `${C.outlineVariant}40`,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: C.onSurface,
    fontFamily: 'Inter_600SemiBold',
  },
  emptySubtitle: {
    fontSize: 14,
    color: C.secondary,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
