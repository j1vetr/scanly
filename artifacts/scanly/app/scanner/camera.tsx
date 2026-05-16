/**
 * camera.tsx — Scanly kamera ekranı
 *
 * Phase 1: Çekim sonrası CPU kenar tespiti (jpeg-js + Sobel, ~1-2 s)
 * Phase 2: VisionCamera snapshot tabanlı gerçek zamanlı belge tespiti (600 ms)
 * Phase 3: TF.js GPU tespiti — Phase 1'i iyileştirir (tfDocumentDetector)
 */

import { Feather } from '@expo/vector-icons';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  usePhotoOutput,
  type CameraRef,
} from 'react-native-vision-camera';
import * as Haptics from 'expo-haptics';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Accelerometer } from 'expo-sensors';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import colors from '@/constants/colors';
import { useScan } from '@/context/ScanContext';
import { detectDocumentCorners, type DocumentCorners } from '@/utils/documentDetector';
import { detectDocumentCornersWithTF, useTFStatus } from '@/utils/tfDocumentDetector';

const C = colors.light;

const MOTION_DELTA        = 1.4;   // m/s² — hareketi sıfırla
const TILT_THRESH         = 2.8;   // ~17°
const DETECTED_HOLD_MS    = 12_000;
const SNAPSHOT_INTERVAL   = 600;   // ms — gerçek zamanlı örnekleme

export default function CameraScreen() {
  const insets  = useSafeAreaInsets();
  const {
    setCapturedImageUri, addCapturedImage, capturedImages,
    resetScan, setDetectedCorners,
  } = useScan();

  // ---- react-native-vision-camera ----
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const cameraRef = useRef<CameraRef>(null);
  // Phase 2 (hızlı snapshot) + Phase 1/3 (tam çekim) için tek output
  const photoOutput = usePhotoOutput({ quality: 0.85, qualityPrioritization: 'speed' });

  // ---- UI state ----
  const [flashMode, setFlashMode]     = useState<'on' | 'off'>('off');
  const [mode, setMode]               = useState<'OTOMATİK' | 'MANUEL'>('OTOMATİK');
  const [isCapturing, setIsCapturing]   = useState(false);
  const [isAnalyzing, setIsAnalyzing]   = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>('');
  const [detected,  setDetected]        = useState(false);
  const tfStatus = useTFStatus();
  const [isTilted,  setIsTilted]      = useState(false);
  const [cycleKey,  setCycleKey]      = useState(0);
  const [liveCorners, setLiveCorners] = useState<DocumentCorners | null>(null);
  const liveDetectedRef = useRef(false);

  // ---- Layout ----
  const [overlaySize, setOverlaySize] = useState({ w: 0, h: 0 });
  const [centerAreaY, setCenterAreaY] = useState(0);
  const [fcLayout,    setFcLayout]    = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [frameH,      setFrameH]      = useState(280);

  // ---- Animasyonlar ----
  const scanY         = useRef(new Animated.Value(0)).current;
  const glowOpacity   = useRef(new Animated.Value(0)).current;
  const cornerOpacity = useRef(new Animated.Value(1)).current;
  const cornerScale   = useRef(new Animated.Value(1)).current;
  const frameScale    = useRef(new Animated.Value(1)).current;
  const tlAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const trAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const blAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const brAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const detectedRef = useRef(false);
  useEffect(() => { detectedRef.current = detected; }, [detected]);

  const isMultiPage  = capturedImages.length > 0;
  const isAutoNative = mode === 'OTOMATİK' && Platform.OS !== 'web' && !!device;

  // -----------------------------------------------------------------------
  // Akselerometre: hareket + eğim tespiti
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!isAutoNative || Platform.OS === 'web') return;
    let smoothX = 0, prevMag = 9.8;
    let motionTmr: ReturnType<typeof setTimeout> | null = null;
    Accelerometer.setUpdateInterval(120);
    const sub = Accelerometer.addListener(({ x, y, z }) => {
      smoothX = smoothX * 0.7 + x * 0.3;
      setIsTilted(Math.abs(smoothX) > TILT_THRESH);
      const mag   = Math.sqrt(x * x + y * y + z * z);
      const delta = Math.abs(mag - prevMag);
      prevMag = mag;
      if (delta > MOTION_DELTA && detectedRef.current) {
        if (motionTmr) clearTimeout(motionTmr);
        motionTmr = setTimeout(() => {
          setCycleKey(k => k + 1);
          setLiveCorners(null);
          liveDetectedRef.current = false;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }, 200);
      }
    });
    return () => {
      sub.remove();
      if (motionTmr) clearTimeout(motionTmr);
      setIsTilted(false);
    };
  }, [isAutoNative]);

  // -----------------------------------------------------------------------
  // Phase 2: VisionCamera snapshot tabanlı gerçek zamanlı tespit
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!isAutoNative || Platform.OS === 'web') return;
    if (!hasPermission) return;

    let active = true;
    let timer:  ReturnType<typeof setTimeout>;

    const sample = async () => {
      if (!active || isCapturing || isAnalyzing) {
        if (active) timer = setTimeout(sample, SNAPSHOT_INTERVAL);
        return;
      }
      try {
        // capturePhotoToFile — vision-camera v5 snapshot
        const snap = await photoOutput.capturePhotoToFile(
          { enableShutterSound: false },
          {},
        );
        if (!active) return;

        const uri = 'file://' + snap.filePath;
        const corners = await detectDocumentCorners(uri);
        if (!active) return;

        if (corners) {
          setLiveCorners(corners);
          liveDetectedRef.current = true;
          if (!detectedRef.current) {
            setDetected(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        } else {
          liveDetectedRef.current = false;
          if (detectedRef.current) {
            setDetected(false);
            setLiveCorners(null);
          }
        }
      } catch { /* snapshot hatalarını sessizce yoksay */ }

      if (active) timer = setTimeout(sample, SNAPSHOT_INTERVAL);
    };

    timer = setTimeout(sample, 1400);
    return () => { active = false; clearTimeout(timer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAutoNative, isCapturing, isAnalyzing, cycleKey, hasPermission]);

  // -----------------------------------------------------------------------
  // Simülasyon + animasyon döngüsü (snapshot başarısız olursa fallback)
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!isAutoNative) { setDetected(false); return; }
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const stopAnims = () => {
      [scanY, glowOpacity, cornerOpacity, cornerScale, frameScale].forEach(a => a.stopAnimation());
      [tlAnim, trAnim, blAnim, brAnim].forEach(a => a.stopAnimation());
    };
    const INSET = 12;

    const runCycle = () => {
      if (cancelled) return;
      if (liveDetectedRef.current) {
        const t = setTimeout(runCycle, 2000);
        timers.push(t);
        return;
      }
      setDetected(false);
      scanY.setValue(0); glowOpacity.setValue(0); cornerOpacity.setValue(1);
      cornerScale.setValue(1);
      [tlAnim, trAnim, blAnim, brAnim].forEach(a => a.setValue({ x: 0, y: 0 }));
      Animated.spring(frameScale, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }).start();

      const scanLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(scanY, { toValue: 1, duration: 1700, useNativeDriver: true }),
          Animated.timing(scanY, { toValue: 0, duration: 180,  useNativeDriver: true }),
        ]),
      );
      const pulsLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(cornerOpacity, { toValue: 0.18, duration: 500, useNativeDriver: true }),
          Animated.timing(cornerOpacity, { toValue: 1,    duration: 500, useNativeDriver: true }),
        ]),
      );
      scanLoop.start(); pulsLoop.start();

      const t1 = setTimeout(() => {
        if (cancelled || liveDetectedRef.current) return;
        scanLoop.stop(); pulsLoop.stop(); cornerOpacity.setValue(1);
        setDetected(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Animated.sequence([
          Animated.spring(frameScale, { toValue: 0.90, friction: 3, tension: 180, useNativeDriver: true }),
          Animated.spring(frameScale, { toValue: 0.99, friction: 7, tension: 60,  useNativeDriver: true }),
        ]).start();
        Animated.parallel([
          Animated.spring(tlAnim, { toValue: { x: +INSET, y: +INSET }, friction: 3.0, tension: 170, useNativeDriver: true }),
          Animated.spring(trAnim, { toValue: { x: -INSET, y: +INSET }, friction: 3.4, tension: 160, useNativeDriver: true }),
          Animated.spring(blAnim, { toValue: { x: +INSET, y: -INSET }, friction: 3.2, tension: 165, useNativeDriver: true }),
          Animated.spring(brAnim, { toValue: { x: -INSET, y: -INSET }, friction: 3.6, tension: 155, useNativeDriver: true }),
        ]).start();
        Animated.sequence([
          Animated.spring(cornerScale, { toValue: 1.3, friction: 3, tension: 160, useNativeDriver: true }),
          Animated.spring(cornerScale, { toValue: 1,   friction: 6, tension: 60,  useNativeDriver: true }),
        ]).start();
        Animated.sequence([
          Animated.timing(glowOpacity, { toValue: 1,   duration: 140, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.2, duration: 230, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.9, duration: 140, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.5, duration: 900, useNativeDriver: true }),
        ]).start();
        const t2 = setTimeout(runCycle, DETECTED_HOLD_MS);
        timers.push(t2);
      }, 800);
      timers.push(t1);
    };

    runCycle();
    return () => { cancelled = true; timers.forEach(clearTimeout); stopAnims(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAutoNative, cycleKey]);

  const scanTranslateY = scanY.interpolate({
    inputRange: [0, 1], outputRange: [0, frameH - 2],
  });

  // -----------------------------------------------------------------------
  // Fallback kırpma — tespit köşeleri yoksa çerçeve konumundan
  // -----------------------------------------------------------------------
  const computeAutoCrop = useCallback(async (
    uri: string, imgW: number, imgH: number,
  ): Promise<string> => {
    try {
      if (!overlaySize.w || !overlaySize.h || !fcLayout.w || !fcLayout.h) return uri;
      const SETTLE = 0.99;
      const fw  = fcLayout.w * SETTLE, fh = fcLayout.h * SETTLE;
      const fl  = fcLayout.x + (fcLayout.w - fw) / 2;
      const ft  = centerAreaY + fcLayout.y + (fcLayout.h - fh) / 2;
      const scrW = overlaySize.w, scrH = overlaySize.h;
      const imgA = imgW / imgH, scrA = scrW / scrH;
      let imgScale: number, xOff: number, yOff: number;
      if (imgA > scrA) { imgScale = scrH / imgH; xOff = (imgW * imgScale - scrW) / 2; yOff = 0; }
      else             { imgScale = scrW / imgW; xOff = 0; yOff = (imgH * imgScale - scrH) / 2; }
      const originX = Math.max(0, Math.round((fl + xOff) / imgScale));
      const originY = Math.max(0, Math.round((ft + yOff) / imgScale));
      const cropW   = Math.max(20, Math.min(imgW - originX, Math.round(fw / imgScale)));
      const cropH   = Math.max(20, Math.min(imgH - originY, Math.round(fh / imgScale)));
      if (cropW < 80 || cropH < 80) return uri;
      const r = await manipulateAsync(
        uri,
        [{ crop: { originX, originY, width: cropW, height: cropH } }],
        { compress: 0.93, format: SaveFormat.JPEG },
      );
      return r.uri;
    } catch { return uri; }
  }, [overlaySize, fcLayout, centerAreaY]);

  // -----------------------------------------------------------------------
  // Phase 1 + Phase 3: çekim sonrası belge analizi
  // -----------------------------------------------------------------------
  const runPostCaptureAnalysis = async (
    uri: string,
  ): Promise<{ corners: DocumentCorners | null; phase: 1 | 3 }> => {
    // Phase 1: hızlı CPU Sobel tespiti (~0.5-1 s)
    setAnalysisStep('Hızlı analiz...');
    const phase1 = await detectDocumentCorners(uri);
    if (phase1) setDetectedCorners(phase1);

    // Phase 3: TF.js GPU tespiti — Phase 1 sonucunu iyileştirir
    if (tfStatus === 'ready') {
      try {
        setAnalysisStep('GPU ile doğrulanıyor...');
        const phase3 = await detectDocumentCornersWithTF(uri);
        if (phase3) {
          setDetectedCorners(phase3);
          setAnalysisStep('');
          return { corners: phase3, phase: 3 };
        }
      } catch { /* TF.js hatası → Phase 1 sonucunu koru */ }
    }

    setAnalysisStep('');
    return { corners: phase1, phase: 1 };
  };

  // -----------------------------------------------------------------------
  // Çekim sonrası akış
  // -----------------------------------------------------------------------
  const afterCapture = async (uri: string, imgW: number, imgH: number) => {
    if (isMultiPage) {
      addCapturedImage(uri);
      router.replace('/scanner/preview');
      return;
    }

    // Canlı tespit varsa doğrudan kullan; yoksa analiz başlat
    let corners: DocumentCorners | null = liveCorners;
    if (!corners) {
      setIsAnalyzing(true);
      try {
        const result = await runPostCaptureAnalysis(uri);
        corners = result.corners;
      } catch (e) {
        console.warn('[camera] Post-capture analysis failed:', e);
      } finally {
        setIsAnalyzing(false);
        setAnalysisStep('');
      }
    } else {
      // Canlı köşeleri context'e kaydet
      setDetectedCorners(corners);
    }

    if (isAutoNative && detected && !isTilted) {
      let processUri = uri;
      if (corners) {
        // Tespit edilen köşelerin bounding-box'ına göre kırp
        const PAD     = 0.01;
        const minX    = Math.min(corners.topLeft.x, corners.bottomLeft.x);
        const maxX    = Math.max(corners.topRight.x, corners.bottomRight.x);
        const minY    = Math.min(corners.topLeft.y, corners.topRight.y);
        const maxY    = Math.max(corners.bottomLeft.y, corners.bottomRight.y);
        const originX = Math.max(0, Math.round((minX - PAD) * imgW));
        const originY = Math.max(0, Math.round((minY - PAD) * imgH));
        const cropW   = Math.min(imgW - originX, Math.round((maxX - minX + 2 * PAD) * imgW));
        const cropH   = Math.min(imgH - originY, Math.round((maxY - minY + 2 * PAD) * imgH));
        if (cropW > 80 && cropH > 80) {
          try {
            const r = await manipulateAsync(
              uri,
              [{ crop: { originX, originY, width: cropW, height: cropH } }],
              { compress: 0.93, format: SaveFormat.JPEG },
            );
            processUri = r.uri;
          } catch { /* orijinal koru */ }
        }
      } else {
        processUri = await computeAutoCrop(uri, imgW, imgH);
      }
      setCapturedImageUri(processUri);
      router.push('/scanner/enhance');
    } else {
      setCapturedImageUri(uri);
      router.push('/scanner/crop');
    }
  };

  // -----------------------------------------------------------------------
  // Çekim
  // -----------------------------------------------------------------------
  const handleCapture = async () => {
    if (isCapturing || isAnalyzing) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsCapturing(true);
    try {
      if (Platform.OS === 'web' || !cameraRef.current) {
        const res = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: 'images', quality: 0.9,
        });
        if (!res.canceled && res.assets[0]) {
          const a = res.assets[0];
          await afterCapture(a.uri, a.width ?? 1920, a.height ?? 2560);
        }
      } else {
        const photo = await photoOutput.capturePhotoToFile(
          { flashMode: flashMode, enableShutterSound: false },
          {},
        );
        await afterCapture('file://' + photo.filePath, 1920, 2560);
      }
    } catch (err) {
      console.error('[camera] Çekim hatası:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleGallery = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images', quality: 0.9,
    });
    if (!res.canceled && res.assets[0]) {
      const a = res.assets[0];
      if (isMultiPage) { addCapturedImage(a.uri); router.replace('/scanner/preview'); }
      else { setCapturedImageUri(a.uri); router.push('/scanner/crop'); }
    }
  };

  // -----------------------------------------------------------------------
  // Render helpers
  // -----------------------------------------------------------------------
  const cornerColor = isTilted ? '#f59e0b' : (detected || liveCorners) ? '#34d399' : '#68dba9';

  // İki nokta arasında döndürülmüş ince çizgi (canlı quad kenarları)
  const renderQuadLine = (
    ax: number, ay: number, bx: number, by: number, key: string,
  ) => {
    const dx = bx - ax, dy = by - ay;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 2) return null;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    return (
      <View
        key={key}
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: ax, top: ay, width: len, height: 2,
          backgroundColor: 'rgba(52,211,153,0.75)',
          transform: [{ rotate: `${angle}deg` }],
          borderRadius: 1,
        } as object}
      />
    );
  };

  const renderLiveQuad = () => {
    if (!liveCorners || !overlaySize.w) return null;
    const { w, h } = overlaySize;
    const tl = { x: liveCorners.topLeft.x     * w, y: liveCorners.topLeft.y     * h };
    const tr = { x: liveCorners.topRight.x    * w, y: liveCorners.topRight.y    * h };
    const bl = { x: liveCorners.bottomLeft.x  * w, y: liveCorners.bottomLeft.y  * h };
    const br = { x: liveCorners.bottomRight.x * w, y: liveCorners.bottomRight.y * h };
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {renderQuadLine(tl.x, tl.y, tr.x, tr.y, 'top')}
        {renderQuadLine(tr.x, tr.y, br.x, br.y, 'right')}
        {renderQuadLine(br.x, br.y, bl.x, bl.y, 'bottom')}
        {renderQuadLine(bl.x, bl.y, tl.x, tl.y, 'left')}
        {[tl, tr, bl, br].map((p, i) => (
          <View key={i} style={[styles.liveCornerDot, { left: p.x - 6, top: p.y - 6 }]} />
        ))}
      </View>
    );
  };

  const renderTopBar = () => (
    <View>
      <View style={styles.topControls}>
        <Pressable
          style={styles.iconBtn}
          onPress={() => { isMultiPage ? router.back() : (resetScan(), router.back()); }}
        >
          <Feather name={isMultiPage ? 'arrow-left' : 'x'} size={22} color="#fff" />
        </Pressable>
        <View style={styles.modeToggle}>
          {(['OTOMATİK', 'MANUEL'] as const).map(m => (
            <Pressable
              key={m}
              style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
              onPress={() => {
                setMode(m);
                setLiveCorners(null);
                liveDetectedRef.current = false;
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>{m}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          style={styles.iconBtn}
          onPress={() => {
            setFlashMode(f => f === 'off' ? 'on' : 'off');
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          <Feather
            name={flashMode === 'on' ? 'zap' : 'zap-off'}
            size={22}
            color={flashMode === 'on' ? '#34d399' : '#fff'}
          />
        </Pressable>
      </View>
    </View>
  );

  const renderFrame = () => (
    <Animated.View
      style={{ transform: [{ scale: liveCorners ? 1 : frameScale }] }}
      onLayout={e => {
        const { x, y, width, height } = e.nativeEvent.layout;
        setFcLayout({ x, y, w: width, h: height });
      }}
    >
      <View
        style={styles.docFrame}
        onLayout={e => setFrameH(e.nativeEvent.layout.height)}
      >
        {(['TL', 'TR', 'BL', 'BR'] as const).map(pos => {
          const anim = pos === 'TL' ? tlAnim : pos === 'TR' ? trAnim
            : pos === 'BL' ? blAnim : brAnim;
          const ps = pos === 'TL' ? styles.cornerTL : pos === 'TR' ? styles.cornerTR
            : pos === 'BL' ? styles.cornerBL : styles.cornerBR;
          return (
            <Animated.View
              key={pos}
              style={[
                styles.corner, ps,
                {
                  borderColor: cornerColor,
                  borderWidth: (detected || liveCorners) && !isTilted ? 3.5 : 3,
                  opacity: isAutoNative && !detected && !isTilted && !liveCorners ? cornerOpacity : 1,
                  transform: [
                    { scale: liveCorners ? 1 : cornerScale },
                    { translateX: liveCorners ? 0 : anim.x },
                    { translateY: liveCorners ? 0 : anim.y },
                  ],
                },
              ]}
            />
          );
        })}
        {isAutoNative && !detected && !liveCorners && (
          <Animated.View
            style={[styles.scanLine, { transform: [{ translateY: scanTranslateY }] }]}
          />
        )}
        {isAutoNative && detected && !isTilted && !liveCorners && (
          <Animated.View style={[styles.detectedGlow, { opacity: glowOpacity }]} />
        )}
        {liveCorners && !isTilted && (
          <View style={[styles.detectedGlow, {
            backgroundColor: 'rgba(52,211,153,0.08)',
            borderColor: '#34d399', opacity: 1,
          }]} />
        )}
      </View>
    </Animated.View>
  );

  const renderCenter = (webMode: boolean) => (
    <View
      style={styles.centerArea}
      onLayout={e => setCenterAreaY(e.nativeEvent.layout.y)}
    >
      {isMultiPage && (
        <View style={styles.pageCountBadge}>
          <Feather name="layers" size={13} color="#fff" />
          <Text style={styles.pageCountText}>{capturedImages.length} sayfa</Text>
        </View>
      )}

      {isAutoNative && isTilted ? (
        <View style={styles.tiltPill}>
          <Feather name="alert-triangle" size={14} color="#f59e0b" />
          <Text style={styles.tiltText}>Kamerayı düz tutun</Text>
        </View>
      ) : (
        <View style={[
          styles.statusPill,
          isAutoNative && (detected || liveCorners) && !isTilted && styles.statusPillDetected,
        ]}>
          {isAnalyzing ? (
            <>
              <ActivityIndicator size="small" color="#34d399" />
              <Text style={[styles.statusText, { color: '#34d399' }]}>
                {analysisStep || 'Belge analiz ediliyor...'}
              </Text>
            </>
          ) : isAutoNative ? (
            (detected || liveCorners) && !isTilted ? (
              <>
                <Feather name="check-circle" size={14} color="#34d399" />
                <Text style={[styles.statusText, { color: '#34d399', fontFamily: 'Inter_600SemiBold' }]}>
                  {liveCorners ? 'Kenarlar Tespit Edildi — Hazır' : 'Belge Algılandı — Çekin'}
                </Text>
              </>
            ) : (
              <>
                <Animated.View style={{ opacity: cornerOpacity }}>
                  <Feather name="search" size={14} color="#68dba9" />
                </Animated.View>
                <Text style={styles.statusText}>Belge Taranıyor...</Text>
              </>
            )
          ) : (
            <>
              <Feather name="file-text" size={14} color="#68dba9" />
              <Text style={styles.statusText}>
                {webMode ? 'Galeriden Belge Seçin' : 'Manuel — Belgeyi Çerçeveye Yerleştirin'}
              </Text>
            </>
          )}
        </View>
      )}

      {renderFrame()}

      {isAutoNative && (detected || liveCorners) && !isTilted && (
        <View style={styles.detectedHint}>
          <Feather name={liveCorners ? 'crop' : 'zap'} size={11} color="#34d399" />
          <Text style={styles.detectedHintText}>
            {liveCorners ? 'Gerçek kenarlar + otomatik kırp' : 'Otomatik kırpılacak'}
          </Text>
        </View>
      )}
    </View>
  );

  const renderBottom = (webMode: boolean) => (
    <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 16 }]}>
      <Pressable style={styles.sideBtn} onPress={handleGallery}>
        <Feather name="image" size={22} color="#fff" />
        <Text style={styles.sideBtnLabel}>Galeri</Text>
      </Pressable>
      <Pressable
        style={({ pressed }) => [
          styles.captureBtn,
          isAutoNative && (detected || liveCorners) && !isTilted && styles.captureBtnReady,
          { transform: [{ scale: (isCapturing || isAnalyzing) ? 0.9 : pressed ? 0.93 : 1 }] },
        ]}
        onPress={handleCapture}
        disabled={isCapturing || isAnalyzing}
      >
        {(isCapturing || isAnalyzing)
          ? <ActivityIndicator color="#fff" size="large" />
          : <View style={[
            styles.captureInner,
            isAutoNative && (detected || liveCorners) && !isTilted && styles.captureInnerReady,
          ]} />
        }
      </Pressable>
      {webMode && !isMultiPage ? (
        <View style={styles.sideBtn} />
      ) : (
        <Pressable
          style={[styles.sideBtn, isMultiPage && styles.sideBtnGreen]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            isMultiPage ? router.replace('/scanner/preview') : router.push('/scanner/crop');
          }}
        >
          <Feather
            name={isMultiPage ? 'check' : 'sliders'}
            size={22}
            color={isMultiPage ? '#34d399' : 'rgba(255,255,255,0.7)'}
          />
          <Text style={[styles.sideBtnLabel, isMultiPage && { color: '#34d399' }]}>
            {isMultiPage ? 'Bitti' : 'Kırp'}
          </Text>
        </Pressable>
      )}
    </View>
  );

  // -----------------------------------------------------------------------
  // Web — kamera yok, galeri kullan
  // -----------------------------------------------------------------------
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <View style={styles.webBg}>
          {Array.from({ length: 9 }).map((_, i) => (
            <View key={i} style={styles.cameraGridCell} />
          ))}
        </View>
        <View
          style={[styles.overlay, { paddingTop: insets.top + 8 }]}
          onLayout={e => {
            const { width, height } = e.nativeEvent.layout;
            setOverlaySize({ w: width, h: height });
          }}
        >
          {renderTopBar()}
          {renderCenter(true)}
          {renderBottom(true)}
        </View>
      </View>
    );
  }

  // -----------------------------------------------------------------------
  // İzin ekranı
  // -----------------------------------------------------------------------
  if (!hasPermission) {
    return (
      <View style={[styles.permContainer, { paddingTop: insets.top + 20 }]}>
        <View style={styles.permCard}>
          <View style={styles.permIconWrap}>
            <Feather name="camera" size={40} color={C.primary} />
          </View>
          <Text style={styles.permTitle}>Kamera İzni Gerekli</Text>
          <Text style={styles.permDesc}>
            Belge taramak için kameraya erişim izni gereklidir.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.permBtn, { opacity: pressed ? 0.88 : 1 }]}
            onPress={requestPermission}
          >
            <Text style={styles.permBtnText}>İzin Ver</Text>
          </Pressable>
          <Pressable style={styles.permGalleryBtn} onPress={handleGallery}>
            <Feather name="image" size={16} color={C.primary} />
            <Text style={styles.permGalleryText}>Galeriden Seç</Text>
          </Pressable>
        </View>
        <Pressable
          style={[styles.permClose, { top: insets.top + 8 }]}
          onPress={() => { resetScan(); router.back(); }}
        >
          <Feather name="x" size={22} color={C.onSurface} />
        </Pressable>
      </View>
    );
  }

  // -----------------------------------------------------------------------
  // Ana kamera görünümü
  // -----------------------------------------------------------------------
  return (
    <View style={styles.container}>
      {device && (
        <Camera
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={!isCapturing}
          outputs={[photoOutput]}
          torchMode={flashMode}
          enableNativeZoomGesture
        />
      )}
      {renderLiveQuad()}
      <View
        style={[styles.overlay, { paddingTop: insets.top + 8 }]}
        onLayout={e => {
          const { width, height } = e.nativeEvent.layout;
          setOverlaySize({ w: width, h: height });
        }}
      >
        {renderTopBar()}
        {renderCenter(false)}
        {renderBottom(false)}
      </View>
    </View>
  );
}

// ==========================================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  permContainer: {
    flex: 1, backgroundColor: C.background,
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  permCard: {
    backgroundColor: '#fff', borderRadius: 24, padding: 32,
    alignItems: 'center', gap: 16, width: '100%', maxWidth: 360,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1, shadowRadius: 20, elevation: 8,
  },
  permIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: `${C.primary}15`,
    alignItems: 'center', justifyContent: 'center',
  },
  permTitle: {
    fontSize: 20, fontWeight: '700', color: C.onSurface,
    fontFamily: 'Inter_700Bold', textAlign: 'center',
  },
  permDesc: {
    fontSize: 14, color: C.secondary,
    fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 20,
  },
  permBtn: {
    backgroundColor: C.primary, borderRadius: 14,
    paddingVertical: 14, width: '100%', alignItems: 'center',
  },
  permBtnText: { fontSize: 16, fontWeight: '600', color: '#fff', fontFamily: 'Inter_600SemiBold' },
  permGalleryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  permGalleryText: { fontSize: 14, color: C.primary, fontFamily: 'Inter_500Medium' },
  permClose: {
    position: 'absolute', right: 20, width: 42, height: 42,
    borderRadius: 21, backgroundColor: C.surfaceContainerLowest,
    alignItems: 'center', justifyContent: 'center',
  },

  webBg: {
    ...StyleSheet.absoluteFillObject, backgroundColor: '#1a1a1a',
    flexDirection: 'row', flexWrap: 'wrap',
  },
  cameraGridCell: {
    width: '33.33%', aspectRatio: 1,
    borderWidth: 0.3, borderColor: 'rgba(255,255,255,0.05)',
  },

  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },

  topControls: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12,
  },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  modeToggle: {
    flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 24, padding: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  modeBtn:          { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20 },
  modeBtnActive:    { backgroundColor: '#fff' },
  modeBtnText:      { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.65)', fontFamily: 'Inter_600SemiBold' },
  modeBtnTextActive:{ color: '#000' },

  centerArea: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 16, gap: 14,
  },
  pageCountBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,105,72,0.75)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4,
  },
  pageCountText: { fontSize: 12, color: '#fff', fontWeight: '600', fontFamily: 'Inter_600SemiBold' },

  tiltPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(60,30,0,0.85)', borderRadius: 24,
    paddingHorizontal: 16, paddingVertical: 9,
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.55)',
  },
  tiltText: { fontSize: 13, color: '#f59e0b', fontFamily: 'Inter_600SemiBold' },

  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 24,
    paddingHorizontal: 16, paddingVertical: 9,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  statusPillDetected: {
    backgroundColor: 'rgba(0,40,25,0.88)',
    borderColor: 'rgba(52,211,153,0.5)',
  },
  statusText: { fontSize: 13, color: '#fff', fontFamily: 'Inter_500Medium' },

  docFrame:  { width: '84%', aspectRatio: 3 / 4, position: 'relative' },
  corner:    { position: 'absolute', width: 28, height: 28 },
  cornerTL:  { top: 0,    left: 0,    borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 6 },
  cornerTR:  { top: 0,    right: 0,   borderLeftWidth:  0, borderBottomWidth: 0, borderTopRightRadius: 6 },
  cornerBL:  { bottom: 0, left: 0,    borderRightWidth: 0, borderTopWidth:    0, borderBottomLeftRadius: 6 },
  cornerBR:  { bottom: 0, right: 0,   borderLeftWidth:  0, borderTopWidth:    0, borderBottomRightRadius: 6 },

  scanLine: {
    position: 'absolute', left: 6, right: 6, height: 2,
    backgroundColor: 'rgba(52,211,153,0.85)',
    shadowColor: '#34d399', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1, shadowRadius: 8,
  },
  detectedGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(52,211,153,0.1)',
    borderRadius: 4, borderWidth: 2, borderColor: '#34d399',
  },
  detectedHint: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  detectedHintText: { fontSize: 11, color: '#34d399', fontFamily: 'Inter_500Medium' },

  liveCornerDot: {
    position: 'absolute', width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#34d399', borderWidth: 2, borderColor: '#fff',
    shadowColor: '#34d399', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 4,
  },

  bottomControls: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 44, paddingTop: 20,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
  },
  sideBtn: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center', gap: 3,
  },
  sideBtnGreen: {
    backgroundColor: 'rgba(52,211,153,0.15)',
    borderWidth: 1, borderColor: 'rgba(52,211,153,0.4)',
  },
  sideBtnLabel: { fontSize: 9, color: 'rgba(255,255,255,0.6)', fontFamily: 'Inter_500Medium' },

  captureBtn: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 4, borderColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center', justifyContent: 'center',
  },
  captureBtnReady:   { borderColor: '#34d399' },
  captureInner:      { width: 62, height: 62, borderRadius: 31, backgroundColor: '#fff' },
  captureInnerReady: { backgroundColor: '#34d399' },
});
