import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useCallback } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import DocumentCard from '@/components/DocumentCard';
import FolderCard from '@/components/FolderCard';
import colors from '@/constants/colors';
import { Document } from '@/constants/mockData';
import { useDocuments } from '@/context/DocumentsContext';

const C = colors.light;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { documents, folders } = useDocuments();

  const isWeb = Platform.OS === 'web';
  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : insets.bottom;

  const recentDocs = documents.slice(0, 6);
  const isEmpty = documents.length === 0;

  const handleScan = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/scanner/camera');
  }, []);

  const handleDocumentPress = useCallback((doc: Document) => {
    router.push(`/document/${doc.id}`);
  }, []);

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Merhaba,</Text>
          <Text style={styles.userName}>Ahmet</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.notifBtn, { opacity: pressed ? 0.7 : 1 }]}
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
        >
          <Feather name="bell" size={22} color={C.primary} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          style={({ pressed }) => [styles.ctaBanner, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
          onPress={handleScan}
        >
          <View style={styles.ctaBannerDecor} />
          <View style={styles.ctaTop}>
            <View style={styles.ctaTextBlock}>
              <Text style={styles.ctaTitle}>Yeni Belge</Text>
              <Text style={styles.ctaSubtitle}>Yüksek kalitede tarama yapmak için kamerayı kullanın.</Text>
            </View>
            <View style={styles.ctaIconContainer}>
              <Feather name="camera" size={28} color="#ffffff" />
            </View>
          </View>
          <View style={styles.ctaBtn}>
            <Feather name="plus-circle" size={18} color={C.primary} />
            <Text style={styles.ctaBtnText}>Belge Tara</Text>
          </View>
        </Pressable>

        {isEmpty ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Feather name="folder" size={40} color={C.mutedForeground} />
            </View>
            <Text style={styles.emptyTitle}>Henüz belge yok</Text>
            <Text style={styles.emptySubtitle}>İlk belgenizi taramak için yukarıdaki butona dokunun.</Text>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Son Taramalar</Text>
                <Pressable onPress={() => router.push('/(tabs)/dosyalar')}>
                  <Text style={styles.seeAll}>Tümü</Text>
                </Pressable>
              </View>
              <View style={styles.docGrid}>
                {recentDocs.slice(0, 4).map(doc => (
                  <DocumentCard
                    key={doc.id}
                    document={doc}
                    onPress={() => handleDocumentPress(doc)}
                    style={styles.docGridItem}
                  />
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Klasörler</Text>
              </View>
              <FlatList
                data={folders}
                keyExtractor={f => f.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.foldersRow}
                renderItem={({ item }) => (
                  <FolderCard
                    folder={item}
                    onPress={() => router.push('/(tabs)/dosyalar')}
                  />
                )}
              />
            </View>
          </>
        )}
      </ScrollView>
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
  greeting: {
    fontSize: 14,
    color: C.secondary,
    fontFamily: 'Inter_400Regular',
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: C.onSurface,
    fontFamily: 'Inter_600SemiBold',
  },
  notifBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 28,
  },
  ctaBanner: {
    backgroundColor: C.primary,
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  ctaBannerDecor: {
    position: 'absolute',
    right: -30,
    top: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  ctaTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  ctaTextBlock: {
    flex: 1,
    marginRight: 16,
  },
  ctaTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  ctaSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.82)',
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  },
  ctaIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: C.primary,
    fontFamily: 'Inter_600SemiBold',
  },
  section: {
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: C.onSurface,
    fontFamily: 'Inter_600SemiBold',
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '500',
    color: C.primary,
    fontFamily: 'Inter_500Medium',
  },
  docGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  docGridItem: {
    width: '47%',
  },
  foldersRow: {
    gap: 14,
    paddingRight: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
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
    lineHeight: 20,
    paddingHorizontal: 20,
  },
});
