import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import colors from '@/constants/colors';
import { Document } from '@/constants/mockData';

const C = colors.light;

interface DocumentCardProps {
  document: Document;
  onPress: () => void;
  style?: object;
}

const TYPE_ICONS: Record<Document['type'], string> = {
  pdf: 'file-text',
  image: 'image',
  text: 'align-left',
};

export default function DocumentCard({ document: doc, onPress, style }: DocumentCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }, style]}
      onPress={onPress}
    >
      <View style={styles.thumbnailContainer}>
        <View style={[styles.thumbnail, { backgroundColor: C.surfaceContainerLow }]}>
          <View style={styles.docLines}>
            <View style={[styles.line, { width: '80%', backgroundColor: C.surfaceContainerHigh }]} />
            <View style={[styles.line, { width: '65%', backgroundColor: C.surfaceContainerHigh }]} />
            <View style={[styles.line, { width: '75%', backgroundColor: C.surfaceContainerHigh }]} />
            <View style={[styles.line, { width: '50%', backgroundColor: C.surfaceContainerHigh }]} />
            <View style={[styles.line, { width: '70%', backgroundColor: C.surfaceContainerHigh }]} />
            <View style={[styles.line, { width: '60%', backgroundColor: C.surfaceContainerHigh }]} />
          </View>
          <View style={styles.typeBadge}>
            <Feather name={TYPE_ICONS[doc.type] as any} size={11} color="#ffffff" />
          </View>
        </View>
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{doc.title}</Text>
        <Text style={styles.date}>{doc.dateLabel}</Text>
        <View style={styles.tagRow}>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{doc.tag}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 20,
    padding: 12,
    shadowColor: C.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: `${C.outlineVariant}50`,
  },
  thumbnailContainer: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: `${C.outlineVariant}30`,
  },
  thumbnail: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  docLines: {
    width: '100%',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  line: {
    height: 6,
    borderRadius: 3,
  },
  typeBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  info: {
    gap: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: C.onSurface,
    fontFamily: 'Inter_600SemiBold',
  },
  date: {
    fontSize: 11,
    color: C.secondary,
    fontFamily: 'Inter_400Regular',
    marginTop: 1,
  },
  tagRow: {
    flexDirection: 'row',
    marginTop: 5,
  },
  tag: {
    backgroundColor: C.surfaceContainerLow,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: 10,
    color: C.secondary,
    fontFamily: 'Inter_500Medium',
  },
});
