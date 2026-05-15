import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import colors from '@/constants/colors';

const C = colors.light;

interface SettingRowProps {
  icon: string;
  iconBg: string;
  iconColor: string;
  label: string;
  value?: string;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (val: boolean) => void;
  onPress?: () => void;
  destructive?: boolean;
}

function SettingRow({ icon, iconBg, iconColor, label, value, toggle, toggleValue, onToggle, onPress, destructive }: SettingRowProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.settingRow, { backgroundColor: pressed && !toggle ? C.surfaceContainerLow : 'transparent' }]}
      onPress={onPress}
      disabled={toggle}
    >
      <View style={[styles.settingIcon, { backgroundColor: iconBg }]}>
        <Feather name={icon as any} size={18} color={iconColor} />
      </View>
      <Text style={[styles.settingLabel, destructive && { color: C.error }]}>{label}</Text>
      {value && <Text style={styles.settingValue}>{value}</Text>}
      {toggle && <Switch value={toggleValue} onValueChange={onToggle} trackColor={{ true: C.primary }} />}
      {!toggle && !value && <Feather name="chevron-right" size={16} color={C.outline} />}
    </Pressable>
  );
}

export default function AyarlarScreen() {
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState(true);
  const [autoEnhance, setAutoEnhance] = useState(true);
  const [cloudSync, setCloudSync] = useState(false);

  const isWeb = Platform.OS === 'web';
  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : insets.bottom;

  const handlePress = (label: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (Platform.OS !== 'web') {
      Alert.alert(label, `${label} yakında kullanılabilir olacak.`, [{ text: 'Tamam' }]);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ayarlar</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 100 }]}
      >
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Feather name="user" size={30} color={C.primary} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>Ahmet Yılmaz</Text>
            <Text style={styles.profileMeta}>Kişisel Hesap</Text>
          </View>
          <Pressable style={styles.editBtn} onPress={() => handlePress('Profil Düzenle')}>
            <Feather name="edit-2" size={16} color={C.primary} />
          </Pressable>
        </View>

        <Text style={styles.groupLabel}>TARAMA</Text>
        <View style={styles.group}>
          <SettingRow
            icon="zap"
            iconBg={`${C.primary}18`}
            iconColor={C.primary}
            label="Otomatik İyileştirme"
            toggle
            toggleValue={autoEnhance}
            onToggle={val => { setAutoEnhance(val); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="maximize-2"
            iconBg={`${C.primary}18`}
            iconColor={C.primary}
            label="Varsayılan Kalite"
            value="Yüksek"
            onPress={() => handlePress('Kalite')}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="file-text"
            iconBg={`${C.primary}18`}
            iconColor={C.primary}
            label="Varsayılan Format"
            value="PDF"
            onPress={() => handlePress('Format')}
          />
        </View>

        <Text style={styles.groupLabel}>DEPOLAMA</Text>
        <View style={styles.group}>
          <SettingRow
            icon="cloud"
            iconBg="#d9dff5"
            iconColor="#575e70"
            label="Bulut Senkronizasyonu"
            toggle
            toggleValue={cloudSync}
            onToggle={val => { setCloudSync(val); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="hard-drive"
            iconBg="#d9dff5"
            iconColor="#575e70"
            label="Kullanılan Depolama"
            value="12.4 MB"
            onPress={() => handlePress('Depolama')}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="trash-2"
            iconBg="#ffdad6"
            iconColor={C.error}
            label="Önbelleği Temizle"
            destructive
            onPress={() => handlePress('Önbellek')}
          />
        </View>

        <Text style={styles.groupLabel}>BİLDİRİMLER</Text>
        <View style={styles.group}>
          <SettingRow
            icon="bell"
            iconBg="#dce2f3"
            iconColor="#555c6a"
            label="Bildirimler"
            toggle
            toggleValue={notifications}
            onToggle={val => { setNotifications(val); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          />
        </View>

        <Text style={styles.groupLabel}>HAKKINDA</Text>
        <View style={styles.group}>
          <SettingRow
            icon="info"
            iconBg={C.surfaceContainerLow}
            iconColor={C.secondary}
            label="Uygulama Sürümü"
            value="1.0.0"
            onPress={() => {}}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="shield"
            iconBg={C.surfaceContainerLow}
            iconColor={C.secondary}
            label="Gizlilik Politikası"
            onPress={() => handlePress('Gizlilik')}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="file"
            iconBg={C.surfaceContainerLow}
            iconColor={C.secondary}
            label="Kullanım Koşulları"
            onPress={() => handlePress('Koşullar')}
          />
        </View>
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
  scrollContent: {
    paddingHorizontal: 20,
    gap: 0,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 20,
    padding: 16,
    gap: 14,
    marginBottom: 28,
    shadowColor: C.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: `${C.outlineVariant}50`,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${C.primary}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
    gap: 3,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '600',
    color: C.onSurface,
    fontFamily: 'Inter_600SemiBold',
  },
  profileMeta: {
    fontSize: 13,
    color: C.secondary,
    fontFamily: 'Inter_400Regular',
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: C.outline,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 4,
    paddingLeft: 4,
  },
  group: {
    backgroundColor: C.surfaceContainerLowest,
    borderRadius: 18,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: `${C.outlineVariant}50`,
    shadowColor: C.secondary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
    borderRadius: 4,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: C.onSurface,
    fontFamily: 'Inter_500Medium',
  },
  settingValue: {
    fontSize: 14,
    color: C.secondary,
    fontFamily: 'Inter_400Regular',
    marginRight: 4,
  },
  divider: {
    height: 1,
    marginLeft: 66,
    backgroundColor: `${C.outlineVariant}40`,
  },
});
