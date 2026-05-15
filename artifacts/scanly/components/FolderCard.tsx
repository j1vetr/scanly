import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import colors from '@/constants/colors';
import { Folder } from '@/constants/mockData';

const C = colors.light;

interface FolderCardProps {
  folder: Folder;
  onPress: () => void;
}

export default function FolderCard({ folder, onPress }: FolderCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }
      ]}
      onPress={onPress}
    >
      <View style={[styles.iconContainer, { backgroundColor: folder.bgColor }]}>
        <Feather name={folder.icon as any} size={18} color={folder.iconColor} />
      </View>
      <Text style={styles.name} numberOfLines={1}>{folder.name}</Text>
      <Text style={styles.count}>{folder.count} Belge</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 130,
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 20,
    padding: 16,
    shadowColor: C.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: `${C.outlineVariant}50`,
    gap: 10,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: C.onSurface,
    fontFamily: 'Inter_600SemiBold',
  },
  count: {
    fontSize: 12,
    color: C.secondary,
    fontFamily: 'Inter_400Regular',
  },
});
