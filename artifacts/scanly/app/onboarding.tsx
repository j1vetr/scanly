import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import colors from '@/constants/colors';

const C = colors.light;
const { width } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    title: 'Belgelerinizi\nAnında Tarayın',
    subtitle: 'Yüksek kaliteli kamera teknolojisi ile belgelerinizi saniyeler içinde dijitalleştirin.',
    icon: 'camera' as const,
    illustrationBg: `${C.primary}15`,
    accentColor: C.primary,
  },
  {
    id: '2',
    title: 'Akıllı Kenar\nAlgılama',
    subtitle: 'Yapay zeka destekli kenar algılama ile belgelerinizi otomatik olarak kırpın ve düzeltin.',
    icon: 'crop' as const,
    illustrationBg: '#d9dff5',
    accentColor: '#575e70',
  },
  {
    id: '3',
    title: 'PDF Oluşturun\nve Paylaşın',
    subtitle: 'Taradığınız belgeleri PDF formatında kaydedin ve hızlıca paylaşın.',
    icon: 'share-2' as const,
    illustrationBg: `${C.primary}15`,
    accentColor: C.primary,
  },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const isWeb = Platform.OS === 'web';
  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 34 : insets.bottom;

  const goNext = async () => {
    if (currentIndex < SLIDES.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const next = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: next, animated: true });
      setCurrentIndex(next);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await AsyncStorage.setItem('@scanly_onboarding', 'done');
      router.replace('/(tabs)');
    }
  };

  const skip = async () => {
    await AsyncStorage.setItem('@scanly_onboarding', 'done');
    router.replace('/(tabs)');
  };

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={[styles.header, { paddingTop: 8 }]}>
        <Text style={styles.logo}>Scanly</Text>
        {currentIndex < SLIDES.length - 1 && (
          <Pressable onPress={skip} style={styles.skipBtn}>
            <Text style={styles.skipText}>Atla</Text>
          </Pressable>
        )}
      </View>

      <Animated.FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        style={{ flex: 1 }}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={[styles.illustration, { backgroundColor: item.illustrationBg }]}>
              <View style={[styles.illustrationInner, { backgroundColor: item.accentColor }]}>
                <Feather name={item.icon} size={52} color="#ffffff" />
              </View>
              <View style={styles.scanFrame}>
                <View style={[styles.corner, styles.cornerTL, { borderColor: item.accentColor }]} />
                <View style={[styles.corner, styles.cornerTR, { borderColor: item.accentColor }]} />
                <View style={[styles.corner, styles.cornerBL, { borderColor: item.accentColor }]} />
                <View style={[styles.corner, styles.cornerBR, { borderColor: item.accentColor }]} />
                <View style={[styles.scanLine, { backgroundColor: item.accentColor }]} />
              </View>
            </View>

            <View style={styles.textBlock}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.subtitle}>{item.subtitle}</Text>
            </View>
          </View>
        )}
      />

      <View style={[styles.footer, { paddingBottom: bottomPad + 16 }]}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const dotWidth = scrollX.interpolate({ inputRange, outputRange: [8, 28, 8], extrapolate: 'clamp' });
            const opacity = scrollX.interpolate({ inputRange, outputRange: [0.3, 1, 0.3], extrapolate: 'clamp' });
            return (
              <Animated.View key={i} style={[styles.dot, { width: dotWidth, opacity }]} />
            );
          })}
        </View>

        <Pressable
          style={({ pressed }) => [styles.btn, { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
          onPress={goNext}
        >
          <Text style={styles.btnText}>
            {currentIndex === SLIDES.length - 1 ? 'Başla' : 'Devam Et'}
          </Text>
          <Feather name="arrow-right" size={20} color="#ffffff" />
        </Pressable>
      </View>
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
    paddingBottom: 12,
  },
  logo: {
    fontSize: 28,
    fontWeight: '700',
    color: C.primary,
    fontFamily: 'Inter_700Bold',
    letterSpacing: -0.5,
  },
  skipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600',
    color: C.secondary,
    fontFamily: 'Inter_600SemiBold',
  },
  slide: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
  },
  illustration: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    maxHeight: 320,
    position: 'relative',
  },
  illustrationInner: {
    width: 100,
    height: 100,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  scanFrame: {
    position: 'absolute',
    top: '20%',
    left: '15%',
    right: '15%',
    bottom: '20%',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderWidth: 3,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 6 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 6 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 6 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 6 },
  scanLine: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 2,
    opacity: 0.6,
  },
  textBlock: {
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: C.onSurface,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 16,
    color: C.secondary,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 12,
  },
  footer: {
    paddingHorizontal: 20,
    gap: 24,
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: C.primary,
  },
  btn: {
    backgroundColor: C.primary,
    borderRadius: 16,
    paddingVertical: 18,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'Inter_600SemiBold',
  },
});
