# Scanly

Premium belge tarama uygulaması — Türkçe arayüzlü, tasarımı Google Stitch ile oluşturulmuş React Native Expo mobil uygulaması.

## Run & Operate

- `pnpm --filter @workspace/scanly run dev` — Expo geliştirme sunucusunu başlatır (port 25567)
- `pnpm run typecheck` — tüm paketlerde tip denetimi

## Stack

- Expo SDK 54 (Router 6, React Native, TypeScript)
- Expo Router — file-based navigation
- AsyncStorage — belge listesi ve onboarding durumu kalıcılığı
- Feather Icons (`@expo/vector-icons`) + SF Symbols (iOS)
- Inter font (`@expo-google-fonts/inter`)
- Mock data only — kamera/OCR/PDF yok, backend yok, giriş yok

## Where things live

```
artifacts/scanly/
  app/
    _layout.tsx          — root layout (providers + stack screens)
    index.tsx            — onboarding yönlendirmesi
    onboarding.tsx       — 3 slaytlı karşılama ekranı
    (tabs)/
      _layout.tsx        — 5 sekme (NativeTabs veya ClassicTabLayout)
      index.tsx          — Ana Sayfa
      scan.tsx           — Tara (tam ekran kamera mock)
      dosyalar.tsx       — Dosyalar (klasör filtreli liste)
      ara.tsx            — Arama ekranı
      ayarlar.tsx        — Ayarlar
    scanner/
      camera.tsx         — Stack kamera ekranı (Ana Sayfa'dan açılır)
      crop.tsx           — Kırpma + döndürme ekranı
      enhance.tsx        — Filtreler ekranı
      preview.tsx        — PDF önizleme + kaydetme
      export.tsx         — Paylaşma bottom sheet (modal)
    document/[id].tsx    — Belge detayları
  components/
    DocumentCard.tsx     — Grid belgesi kartı
    FolderCard.tsx       — Klasör kartı
  constants/
    colors.ts            — Scanly marka renkleri (emerald yeşil #006948)
    mockData.ts          — Türkçe mock belgeler ve klasörler
  context/
    DocumentsContext.tsx — Belge/klasör state + AsyncStorage
    ScanContext.tsx      — Tarama akışı state
```

## Architecture decisions

- Onboarding durumu AsyncStorage'da `@scanly_onboarding` anahtarıyla saklanır
- `app/(tabs)/scan.tsx` — sekme içi kamera ekranı, sekme çubuğunu gizler (`tabBarStyle: { display: 'none' }`)
- `app/scanner/camera.tsx` — stack navigasyon kamera ekranı (Ana Sayfa'dan erişilir)
- NativeTabs (iOS 26 liquid glass) + ClassicTabLayout (diğer platformlar) otomatik seçim
- 5 sekme: Ana Sayfa / Tara / Dosyalar / Ara / Ayarlar — tüm etiketler Türkçe

## Product

Scanly, kullanıcıların belgelerini kamera ile taramasını, kenar algılaması ile kırpmasını, filtreler uygulamasını, PDF önizlemesi yapmasını ve paylaşmasını sağlar. Klasörler, arama, belge detayları ve ayarlar dahildir. Tüm veriler mock veridir.

## User preferences

- Tüm UI metinleri Türkçe
- Tasarım sistemi: Google Stitch çıktısı (emerald yeşil #006948 birincil renk)
- Backend yok, giriş yok, gerçek kamera/OCR/PDF yok

## Gotchas

- `pnpm --filter @workspace/scanly run dev` çalıştırılırken `PORT` ve `BASE_PATH` env var'ları workflow tarafından sağlanır
- Feather icon isimleri doğrulanmalı — "receipt" ve "graduation-cap" geçersiz, alternatifler: "dollar-sign", "book-open"
- AsyncStorage web'de çalışır ancak tarayıcıyı yenilediğinizde silinir (dev modunda)
- **SymbolView (expo-symbols) ve NativeTabs Icon Expo Go'da Çince/garip karakter görünür — kullanma**
- Tab ikonları: MaterialCommunityIcons (home, line-scan, folder, folder-outline) + Ionicons (search, settings) — Feather KULLANMA tab bar'da
- expo-glass-effect ve expo-symbols paketleri kurulu ama import edilmemeli

## Pointers

- Tasarım referansları: `attached_assets/stitch_extracted/stitch_scanly_mobil_uygulama_tasar_m/`
- Renk paleti source of truth: `artifacts/scanly/constants/colors.ts`
- Pnpm workspace yapısı için `.local/skills/pnpm-workspace` skill'ine bakın
