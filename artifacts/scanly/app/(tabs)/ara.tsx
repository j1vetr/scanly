import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import colors from '@/constants/colors';
import { Document } from '@/constants/mockData';
import { useDocuments } from '@/context/DocumentsContext';

const C = colors.light;

function getOcrSnippet(ocrText: string, query: string): string {
  const lower = ocrText.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) return ocrText.slice(0, 60);
  const start = Math.max(0, idx - 20);
  const end = Math.min(ocrText.length, idx + query.length + 40);
  return ocrText.slice(start, end);
}

const CATEGORIES = [
  { id: 'pdf', label: 'PDF', icon: 'file-text', bg: '#ffdad6', color: '#ba1a1a' },
  { id: 'image', label: 'Görüntü', bg: '#d9dff5', color: '#575e70', icon: 'image' },
  { id: 'text', label: 'Metin', bg: '#dce2f3', color: '#555c6a', icon: 'align-left' },
];

const RECENT_SEARCHES = ['Vergi Levhası 2023', 'Kira Sözleşmesi Taslağı'];

export default function AraScreen() {
  const insets = useSafeAreaInsets();
  const { searchDocuments } = useDocuments();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Document[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const isWeb = Platform.OS === 'web';
  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : insets.bottom;

  const doSearch = useCallback((text: string) => {
    setQuery(text);
    if (text.trim()) {
      setResults(searchDocuments(text));
      setHasSearched(true);
    } else {
      setResults([]);
      setHasSearched(false);
    }
  }, [searchDocuments]);

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.logo}>Scanly</Text>
        <Pressable style={styles.notifBtn} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
          <Feather name="bell" size={22} color={C.primary} />
        </Pressable>
      </View>

      <View style={styles.searchBarContainer}>
        <View style={styles.searchBar}>
          <Feather name="search" size={18} color={query ? C.primary : C.outline} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Belgelerde Ara..."
            placeholderTextColor={C.outline}
            value={query}
            onChangeText={doSearch}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable onPress={() => doSearch('')} style={styles.clearBtn}>
              <Feather name="x-circle" size={16} color={C.outline} />
            </Pressable>
          )}
        </View>
      </View>

      {hasSearched ? (
        <FlatList
          data={results}
          keyExtractor={d => d.id}
          contentContainerStyle={[styles.resultsList, { paddingBottom: bottomPad + 90 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.noResults}>
              <Feather name="search" size={36} color={C.mutedForeground} />
              <Text style={styles.noResultsTitle}>Sonuç bulunamadı</Text>
              <Text style={styles.noResultsSubtitle}>"{query}" için belge bulunamadı.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.resultRow, { opacity: pressed ? 0.85 : 1 }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(`/document/${item.id}`);
              }}
            >
              <View style={[styles.resultIcon, { backgroundColor: `${C.primary}18` }]}>
                <Feather name="file-text" size={20} color={C.primary} />
              </View>
              <View style={styles.resultInfo}>
                <Text style={styles.resultTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.resultMeta}>{item.dateLabel} · {item.tag}</Text>
                {item.ocrText && item.ocrText.toLowerCase().includes(query.toLowerCase()) && (
                  <Text style={styles.resultOcr} numberOfLines={1}>
                    "...{getOcrSnippet(item.ocrText, query)}..."
                  </Text>
                )}
              </View>
              <Feather name="chevron-right" size={16} color={C.outline} />
            </Pressable>
          )}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
        />
      ) : (
        <FlatList
          keyExtractor={i => String(i)}
          data={[0]}
          renderItem={() => null}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.mainContent, { paddingBottom: bottomPad + 90 }]}
          ListHeaderComponent={
            <>
              <Text style={styles.sectionTitle}>Kategoriler</Text>
              <View style={styles.catGrid}>
                {CATEGORIES.map(cat => (
                  <Pressable
                    key={cat.id}
                    style={({ pressed }) => [styles.catCard, { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] }]}
                    onPress={() => { doSearch(cat.label); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  >
                    <View style={[styles.catIcon, { backgroundColor: cat.bg }]}>
                      <Feather name={cat.icon as any} size={22} color={cat.color} />
                    </View>
                    <Text style={styles.catLabel}>{cat.label}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.recentHeader}>
                <Text style={styles.sectionTitle}>Son Aramalar</Text>
              </View>
              {RECENT_SEARCHES.map((s, i) => (
                <Pressable
                  key={i}
                  style={({ pressed }) => [styles.recentRow, { backgroundColor: pressed ? C.surfaceContainerLow : 'transparent' }]}
                  onPress={() => { doSearch(s); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                >
                  <Feather name="clock" size={16} color={C.outline} style={{ opacity: 0.7 }} />
                  <Text style={styles.recentText}>{s}</Text>
                  <Feather name="arrow-up-left" size={16} color={C.outline} style={{ opacity: 0.5 }} />
                </Pressable>
              ))}

              <View style={styles.hintBox}>
                <Feather name="compass" size={26} color={C.secondary} />
                <Text style={styles.hintText}>Aradığınız belgeyi bulun</Text>
              </View>
            </>
          }
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
  logo: {
    fontSize: 28,
    fontWeight: '700',
    color: C.primary,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.5,
  },
  notifBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBarContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.outlineVariant,
    paddingHorizontal: 14,
    shadowColor: C.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: C.onSurface,
    fontFamily: 'Inter_400Regular',
    paddingVertical: 14,
  },
  clearBtn: {
    padding: 4,
  },
  mainContent: {
    paddingHorizontal: 20,
    gap: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: C.onSurface,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 14,
  },
  catGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  catCard: {
    flex: 1,
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: `${C.outlineVariant}60`,
    shadowColor: C.secondary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  catIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: C.onSurface,
    fontFamily: 'Inter_500Medium',
  },
  recentHeader: {
    marginBottom: 8,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 2,
  },
  recentText: {
    flex: 1,
    fontSize: 14,
    color: C.onSurface,
    fontFamily: 'Inter_400Regular',
  },
  hintBox: {
    alignItems: 'center',
    paddingTop: 32,
    gap: 8,
    opacity: 0.55,
  },
  hintText: {
    fontSize: 14,
    color: C.secondary,
    fontFamily: 'Inter_400Regular',
  },
  resultsList: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    borderRadius: 14,
    backgroundColor: C.surfaceContainerLowest,
  },
  resultIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultInfo: {
    flex: 1,
    gap: 3,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: C.onSurface,
    fontFamily: 'Inter_600SemiBold',
  },
  resultMeta: {
    fontSize: 12,
    color: C.secondary,
    fontFamily: 'Inter_400Regular',
  },
  sep: {
    height: 1,
    marginHorizontal: 14,
    backgroundColor: `${C.outlineVariant}40`,
  },
  noResults: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 10,
  },
  noResultsTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: C.onSurface,
    fontFamily: 'Inter_600SemiBold',
  },
  noResultsSubtitle: {
    fontSize: 14,
    color: C.secondary,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  resultOcr: {
    fontSize: 11,
    color: C.primary,
    fontFamily: 'Inter_400Regular',
    fontStyle: 'italic',
    marginTop: 2,
  },
});
