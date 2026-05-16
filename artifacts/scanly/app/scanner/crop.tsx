import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image as RNImage,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import colors from '@/constants/colors';
import { useScan } from '@/context/ScanContext';

const C = colors.light;
const MIN_FRAC  = 0.05;
const CORNER_TAP = 52;
const EDGE_TAP   = 48;

type CropBox  = { left: number; top: number; right: number; bottom: number };
type Handle   = 'TL' | 'TR' | 'BL' | 'BR' | 'T' | 'B' | 'L' | 'R';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// ----- Display rect --------------------------------------------------------
// contentFit="contain" scales the image to fit within the wrapper.
// This computes where the image actually appears (excluding the letterbox bars).
function displayRect(imgW: number, imgH: number, wrapW: number, wrapH: number) {
  if (!wrapW || !wrapH || !imgW || !imgH) return { x: 0, y: 0, w: wrapW, h: wrapH };
  const imgA  = imgW / imgH;
  const wrapA = wrapW / wrapH;
  if (imgA > wrapA) {
    // Image wider than wrapper → letterbox top/bottom
    const h = wrapW / imgA;
    return { x: 0, y: (wrapH - h) / 2, w: wrapW, h };
  } else {
    // Image taller than wrapper → pillarbox left/right
    const w = wrapH * imgA;
    return { x: (wrapW - w) / 2, y: 0, w, h: wrapH };
  }
}

// Map a wrapper-space fraction to image-space fraction.
// px = frac * wrapDim  →  imgFrac = (px - dispOffset) / dispDim
function wrapToImg(frac: number, wrapDim: number, dispOffset: number, dispDim: number) {
  return clamp((frac * wrapDim - dispOffset) / dispDim, 0, 1);
}

// ----- PanResponder factory ------------------------------------------------
function makePR(
  type: Handle,
  startRef: React.MutableRefObject<CropBox>,
  boxRef:   React.MutableRefObject<CropBox>,
  wrapRef:  React.MutableRefObject<{ width: number; height: number }>,
  update:   (b: CropBox) => void,
) {
  return PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder:  () => true,
    onPanResponderGrant: () => {
      // Snapshot the box at gesture START — crucial so gs.dx/gs.dy
      // (cumulative totals) are always applied to the same baseline.
      startRef.current = { ...boxRef.current };
      Haptics.selectionAsync();
    },
    onPanResponderMove: (_e, gs) => {
      const { width: W, height: H } = wrapRef.current;
      if (!W || !H) return;
      const dx = gs.dx / W;
      const dy = gs.dy / H;
      const s  = startRef.current;
      const n: CropBox = { ...s };
      switch (type) {
        case 'TL': n.left = clamp(s.left+dx,0,s.right-MIN_FRAC);  n.top    = clamp(s.top+dy,0,s.bottom-MIN_FRAC); break;
        case 'TR': n.right= clamp(s.right+dx,s.left+MIN_FRAC,1);  n.top    = clamp(s.top+dy,0,s.bottom-MIN_FRAC); break;
        case 'BL': n.left = clamp(s.left+dx,0,s.right-MIN_FRAC);  n.bottom = clamp(s.bottom+dy,s.top+MIN_FRAC,1); break;
        case 'BR': n.right= clamp(s.right+dx,s.left+MIN_FRAC,1);  n.bottom = clamp(s.bottom+dy,s.top+MIN_FRAC,1); break;
        case 'T':  n.top    = clamp(s.top+dy,   0, s.bottom-MIN_FRAC); break;
        case 'B':  n.bottom = clamp(s.bottom+dy, s.top+MIN_FRAC, 1);   break;
        case 'L':  n.left   = clamp(s.left+dx,   0, s.right-MIN_FRAC); break;
        case 'R':  n.right  = clamp(s.right+dx,  s.left+MIN_FRAC, 1);  break;
      }
      update(n);
    },
    onPanResponderRelease: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  });
}

// ===========================================================================
const FINE_ROT_RANGE = 15; // ±15°

export default function CropScreen() {
  const insets = useSafeAreaInsets();
  const { capturedImageUri, setCapturedImageUri } = useScan();
  const [isProcessing, setIsProcessing] = useState(false);

  // Fine rotation (±15°) — applied before crop on save
  const [fineRotation, setFineRotation] = useState(0);
  const fineRotRef   = useRef(0);
  const rotBaseRef   = useRef(0);
  const sliderWRef   = useRef(220);
  const [sliderWidth, setSliderWidth] = useState(220);

  // Wrapper layout (imageWrapper, not the outer canvasArea)
  const [wrapLayout, setWrapLayout] = useState({ width: 0, height: 0 });
  const wrapRef = useRef({ width: 0, height: 0 });

  // Actual image pixel dimensions (needed for letterbox correction)
  const [imgDims, setImgDims] = useState<{ w: number; h: number } | null>(null);
  const [cropReady, setCropReady] = useState(false);

  // Crop box fractions — always in WRAPPER space
  const DEFAULT_BOX: CropBox = { left: 0.04, top: 0.04, right: 0.96, bottom: 0.96 };
  const boxRef = useRef<CropBox>({ ...DEFAULT_BOX });
  const [cropBox, setCropBox] = useState<CropBox>({ ...DEFAULT_BOX });

  const updateBox = useCallback((b: CropBox) => {
    boxRef.current = b;
    setCropBox({ ...b });
  }, []);

  // Load image dimensions
  useEffect(() => {
    if (!capturedImageUri) return;
    RNImage.getSize(capturedImageUri, (w, h) => setImgDims({ w, h }), () => {});
  }, [capturedImageUri]);

  // Initialize crop box to the displayed image area (accounts for letterboxing)
  useEffect(() => {
    if (!imgDims || !wrapLayout.width || !wrapLayout.height || cropReady) return;
    const { x, y, w: dw, h: dh } = displayRect(
      imgDims.w, imgDims.h, wrapLayout.width, wrapLayout.height
    );
    const W = wrapLayout.width, H = wrapLayout.height;
    const INSET = 0.025;
    updateBox({
      left:   (x / W)       + INSET,
      top:    (y / H)       + INSET,
      right:  ((x + dw) / W) - INSET,
      bottom: ((y + dh) / H) - INSET,
    });
    setCropReady(true);
  }, [imgDims, wrapLayout, cropReady, updateBox]);

  // --- 8 start-position refs (one per handle) ----------------------------
  const tlS = useRef<CropBox>({ ...DEFAULT_BOX });
  const trS = useRef<CropBox>({ ...DEFAULT_BOX });
  const blS = useRef<CropBox>({ ...DEFAULT_BOX });
  const brS = useRef<CropBox>({ ...DEFAULT_BOX });
  const tS  = useRef<CropBox>({ ...DEFAULT_BOX });
  const bS  = useRef<CropBox>({ ...DEFAULT_BOX });
  const lS  = useRef<CropBox>({ ...DEFAULT_BOX });
  const rS  = useRef<CropBox>({ ...DEFAULT_BOX });

  const tlPan = useRef(makePR('TL', tlS, boxRef, wrapRef, updateBox)).current;
  const trPan = useRef(makePR('TR', trS, boxRef, wrapRef, updateBox)).current;
  const blPan = useRef(makePR('BL', blS, boxRef, wrapRef, updateBox)).current;
  const brPan = useRef(makePR('BR', brS, boxRef, wrapRef, updateBox)).current;
  const tPan  = useRef(makePR('T',  tS,  boxRef, wrapRef, updateBox)).current;
  const bPan  = useRef(makePR('B',  bS,  boxRef, wrapRef, updateBox)).current;
  const lPan  = useRef(makePR('L',  lS,  boxRef, wrapRef, updateBox)).current;
  const rPan  = useRef(makePR('R',  rS,  boxRef, wrapRef, updateBox)).current;

  // Fine rotation PanResponder
  const rotPan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder:  () => true,
    onPanResponderGrant: () => {
      rotBaseRef.current = fineRotRef.current;
      Haptics.selectionAsync();
    },
    onPanResponderMove: (_e, gs) => {
      const scale  = (2 * FINE_ROT_RANGE) / sliderWRef.current;
      const newRot = Math.max(-FINE_ROT_RANGE, Math.min(FINE_ROT_RANGE,
        rotBaseRef.current + gs.dx * scale,
      ));
      const snapped = Math.round(newRot * 2) / 2; // 0.5° steps
      fineRotRef.current = snapped;
      setFineRotation(snapped);
    },
    onPanResponderRelease: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  })).current;

  // -----------------------------------------------------------------------
  const rotateImage = async (deg: number) => {
    if (!capturedImageUri) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsProcessing(true);
    try {
      const r = await manipulateAsync(capturedImageUri, [{ rotate: deg }], {
        compress: 0.9, format: SaveFormat.JPEG,
      });
      setCapturedImageUri(r.uri);
      setCropReady(false); // re-init crop box after rotate (new dimensions)
      setImgDims(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleContinue = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!capturedImageUri) { router.push('/scanner/enhance'); return; }
    setIsProcessing(true);
    try {
      // Use cached imgDims or fetch fresh
      let imgW: number, imgH: number;
      if (imgDims) {
        imgW = imgDims.w; imgH = imgDims.h;
      } else {
        await new Promise<void>((res, rej) =>
          RNImage.getSize(capturedImageUri, (w, h) => { imgW = w; imgH = h; res(); }, rej)
        );
      }

      const W = wrapRef.current.width  || 1;
      const H = wrapRef.current.height || 1;
      const { x: dx, y: dy, w: dw, h: dh } = displayRect(imgW!, imgH!, W, H);

      const { left, top, right, bottom } = boxRef.current;

      // Map wrapper-space fractions → image-space fractions (letterbox-corrected)
      const il = wrapToImg(left,   W, dx, dw);
      const it = wrapToImg(top,    H, dy, dh);
      const ir = wrapToImg(right,  W, dx, dw);
      const ib = wrapToImg(bottom, H, dy, dh);

      if (ir - il < 0.02 || ib - it < 0.02) {
        router.push('/scanner/enhance'); return;
      }

      const originX = Math.round(il * imgW!);
      const originY = Math.round(it * imgH!);
      const cropW   = Math.max(10, Math.round((ir - il) * imgW!));
      const cropH   = Math.max(10, Math.round((ib - it) * imgH!));

      // Apply fine rotation first (if non-zero)
      let processUri = capturedImageUri;
      if (Math.abs(fineRotRef.current) >= 0.5) {
        const rotResult = await manipulateAsync(
          capturedImageUri,
          [{ rotate: fineRotRef.current }],
          { compress: 0.95, format: SaveFormat.JPEG },
        );
        processUri = rotResult.uri;
      }

      const result = await manipulateAsync(
        processUri,
        [{ crop: { originX, originY, width: cropW, height: cropH } }],
        { compress: 0.92, format: SaveFormat.JPEG }
      );
      setCapturedImageUri(result.uri);
      router.push('/scanner/enhance');
    } catch {
      router.push('/scanner/enhance');
    } finally {
      setIsProcessing(false);
    }
  };

  // -----------------------------------------------------------------------
  // Pixel geometry for rendering
  // -----------------------------------------------------------------------
  const W  = wrapLayout.width;
  const H  = wrapLayout.height;
  const { left, top, right, bottom } = cropBox;
  const bxL  = left   * W;
  const bxT  = top    * H;
  const bxW  = (right  - left)   * W;
  const bxH  = (bottom - top) * H;
  const midX = bxL + bxW / 2;
  const midY = bxT + bxH / 2;

  // -----------------------------------------------------------------------
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable
          style={styles.iconBtn}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
        >
          <Feather name="arrow-left" size={20} color={C.onSurface} />
        </Pressable>
        <Text style={styles.title}>Kırp &amp; Düzenle</Text>
        <Pressable style={styles.nextBtn} onPress={handleContinue} disabled={isProcessing}>
          <Text style={styles.nextText}>İleri</Text>
          <Feather name="arrow-right" size={15} color={C.primary} />
        </Pressable>
      </View>

      {/* Canvas */}
      <View style={styles.canvasArea}>
        {capturedImageUri ? (
          <View
            style={styles.imageWrapper}
            onLayout={e => {
              const { width, height } = e.nativeEvent.layout;
              wrapRef.current = { width, height };
              setWrapLayout({ width, height });
            }}
          >
            <Image source={{ uri: capturedImageUri }} style={styles.img} contentFit="contain" />

            {W > 0 && (
              <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                {/* Dim areas (pixel-based, no percentage strings) */}
                <View style={{ position:'absolute', top:0, left:0, right:0, height:bxT, backgroundColor:'rgba(0,0,0,0.54)' }} pointerEvents="none" />
                <View style={{ position:'absolute', top:bxT+bxH, left:0, right:0, bottom:0, backgroundColor:'rgba(0,0,0,0.54)' }} pointerEvents="none" />
                <View style={{ position:'absolute', top:bxT, left:0, width:bxL, height:bxH, backgroundColor:'rgba(0,0,0,0.54)' }} pointerEvents="none" />
                <View style={{ position:'absolute', top:bxT, left:bxL+bxW, width:Math.max(0,W-bxL-bxW), height:bxH, backgroundColor:'rgba(0,0,0,0.54)' }} pointerEvents="none" />

                {/* Crop box border + rule-of-thirds grid */}
                <View style={{ position:'absolute', left:bxL, top:bxT, width:bxW, height:bxH, borderWidth:1.5, borderColor:'rgba(255,255,255,0.9)' }} pointerEvents="none">
                  <View style={[styles.gridH, { top: bxH/3  }]} />
                  <View style={[styles.gridH, { top: bxH*2/3 }]} />
                  <View style={[styles.gridV, { left: bxW/3  }]} />
                  <View style={[styles.gridV, { left: bxW*2/3 }]} />
                </View>

                {/* Corner decorations */}
                <View style={[styles.cc, styles.ccTL, { left:bxL-1, top:bxT-1 }]} pointerEvents="none" />
                <View style={[styles.cc, styles.ccTR, { left:bxL+bxW-19, top:bxT-1 }]} pointerEvents="none" />
                <View style={[styles.cc, styles.ccBL, { left:bxL-1, top:bxT+bxH-19 }]} pointerEvents="none" />
                <View style={[styles.cc, styles.ccBR, { left:bxL+bxW-19, top:bxT+bxH-19 }]} pointerEvents="none" />

                {/* Edge handles */}
                <View style={[styles.eH, { left:midX-EDGE_TAP/2, top:bxT-EDGE_TAP/2  }]} {...tPan.panHandlers}><View style={styles.eDot}/></View>
                <View style={[styles.eH, { left:midX-EDGE_TAP/2, top:bxT+bxH-EDGE_TAP/2 }]} {...bPan.panHandlers}><View style={styles.eDot}/></View>
                <View style={[styles.eH, { left:bxL-EDGE_TAP/2, top:midY-EDGE_TAP/2  }]} {...lPan.panHandlers}><View style={styles.eDot}/></View>
                <View style={[styles.eH, { left:bxL+bxW-EDGE_TAP/2, top:midY-EDGE_TAP/2 }]} {...rPan.panHandlers}><View style={styles.eDot}/></View>

                {/* Corner handles (on top, larger tap area) */}
                <View style={[styles.cH, { left:bxL-CORNER_TAP/2, top:bxT-CORNER_TAP/2 }]} {...tlPan.panHandlers}><View style={[styles.cDot, styles.cDotTL]}/></View>
                <View style={[styles.cH, { left:bxL+bxW-CORNER_TAP/2, top:bxT-CORNER_TAP/2 }]} {...trPan.panHandlers}><View style={[styles.cDot, styles.cDotTR]}/></View>
                <View style={[styles.cH, { left:bxL-CORNER_TAP/2, top:bxT+bxH-CORNER_TAP/2 }]} {...blPan.panHandlers}><View style={[styles.cDot, styles.cDotBL]}/></View>
                <View style={[styles.cH, { left:bxL+bxW-CORNER_TAP/2, top:bxT+bxH-CORNER_TAP/2 }]} {...brPan.panHandlers}><View style={[styles.cDot, styles.cDotBR]}/></View>
              </View>
            )}

            {isProcessing && (
              <View style={styles.processingOverlay}>
                <ActivityIndicator color="#fff" size="large" />
                <Text style={styles.processingText}>İşleniyor...</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.noImg}>
            <Feather name="camera" size={40} color={C.outline} />
            <Text style={styles.noImgText}>Fotoğraf bulunamadı</Text>
          </View>
        )}
      </View>

      {/* Bottom panel */}
      <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.tools}>
          <Pressable
            style={({ pressed }) => [styles.toolBtn, pressed && styles.toolBtnP]}
            onPress={() => rotateImage(-90)} disabled={isProcessing}
          >
            <Feather name="rotate-ccw" size={20} color={isProcessing ? C.outline : C.onSurface} />
            <Text style={styles.toolLabel}>Sola</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.toolBtn, pressed && styles.toolBtnP]}
            onPress={() => rotateImage(90)} disabled={isProcessing}
          >
            <Feather name="rotate-cw" size={20} color={isProcessing ? C.outline : C.onSurface} />
            <Text style={styles.toolLabel}>Sağa</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.toolBtn, pressed && styles.toolBtnP]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (!imgDims || !wrapLayout.width) {
                updateBox({ left:0.02, top:0.02, right:0.98, bottom:0.98 }); return;
              }
              const { x, y, w: dw, h: dh } = displayRect(imgDims.w, imgDims.h, wrapLayout.width, wrapLayout.height);
              updateBox({
                left:   x / wrapLayout.width  + 0.01,
                top:    y / wrapLayout.height  + 0.01,
                right:  (x + dw) / wrapLayout.width  - 0.01,
                bottom: (y + dh) / wrapLayout.height - 0.01,
              });
            }}
          >
            <Feather name="maximize-2" size={20} color={C.primary} />
            <Text style={[styles.toolLabel, { color: C.primary }]}>Tümünü Seç</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.toolBtn, pressed && styles.toolBtnP]}
            onPress={() => { setCropReady(false); }}
          >
            <Feather name="refresh-cw" size={20} color={C.secondary} />
            <Text style={styles.toolLabel}>Sıfırla</Text>
          </Pressable>
        </View>

        {/* Fine rotation slider */}
        <View style={styles.rotSection}>
          <View style={styles.rotHeaderRow}>
            <Feather name="rotate-ccw" size={14} color={C.secondary} />
            <Text style={[styles.rotLabel, fineRotation !== 0 && styles.rotLabelActive]}>
              {fineRotation === 0 ? 'Eğim düzeltme' : `${fineRotation > 0 ? '+' : ''}${fineRotation.toFixed(1)}°`}
            </Text>
            {fineRotation !== 0 && (
              <Pressable
                onPress={() => { fineRotRef.current = 0; setFineRotation(0); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                hitSlop={12}
              >
                <Feather name="x-circle" size={14} color={C.primary} />
              </Pressable>
            )}
            <Feather name="rotate-cw" size={14} color={C.secondary} />
          </View>
          <View
            style={styles.rotTrack}
            onLayout={e => { sliderWRef.current = e.nativeEvent.layout.width; setSliderWidth(e.nativeEvent.layout.width); }}
            {...rotPan.panHandlers}
          >
            {/* Track line */}
            <View style={styles.rotTrackLine} />
            {/* Center notch */}
            <View style={styles.rotCenterNotch} />
            {/* Tick marks every 5° */}
            {([-15, -10, -5, 0, 5, 10, 15] as const).map(deg => (
              <View
                key={deg}
                style={[
                  styles.rotTick,
                  { left: ((deg + FINE_ROT_RANGE) / (2 * FINE_ROT_RANGE)) * sliderWidth - 0.5 },
                  deg === 0 && styles.rotTickCenter,
                ]}
              />
            ))}
            {/* Thumb */}
            <View style={[
              styles.rotThumb,
              { left: ((fineRotation + FINE_ROT_RANGE) / (2 * FINE_ROT_RANGE)) * sliderWidth - 14 },
              fineRotation !== 0 && styles.rotThumbActive,
            ]} />
          </View>
          <View style={styles.rotRangeRow}>
            <Text style={styles.rotRangeText}>−15°</Text>
            <Text style={styles.rotRangeText}>0°</Text>
            <Text style={styles.rotRangeText}>+15°</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <Pressable
            style={({ pressed }) => [styles.retakeBtn, { opacity: pressed ? 0.75 : 1 }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }}
          >
            <Feather name="camera" size={18} color={C.secondary} />
            <Text style={styles.retakeText}>Yeniden Çek</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.continueBtn,
              { opacity: (pressed || isProcessing) ? 0.88 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
            ]}
            onPress={handleContinue} disabled={isProcessing}
          >
            {isProcessing
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Text style={styles.continueBtnText}>Devam Et</Text>
                  <Feather name="arrow-right" size={18} color="#fff" />
                </>
            }
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const CVIZ = 20;
const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#101010' },
  topBar:     { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingVertical:10, backgroundColor:'#101010' },
  iconBtn:    { width:42, height:42, borderRadius:21, backgroundColor:'rgba(255,255,255,0.08)', alignItems:'center', justifyContent:'center' },
  title:      { fontSize:17, fontWeight:'600', color:'#fff', fontFamily:'Inter_600SemiBold' },
  nextBtn:    { flexDirection:'row', alignItems:'center', gap:4, paddingHorizontal:12, paddingVertical:8, borderRadius:12, backgroundColor:`${C.primary}18` },
  nextText:   { fontSize:15, fontWeight:'600', color:C.primary, fontFamily:'Inter_600SemiBold' },

  canvasArea:    { flex:1, alignItems:'center', justifyContent:'center', backgroundColor:'#101010' },
  imageWrapper:  { width:'96%', height:'96%', position:'relative' },
  img:           { width:'100%', height:'100%' },

  gridH: { position:'absolute', left:0, right:0, height:1, backgroundColor:'rgba(255,255,255,0.2)' },
  gridV: { position:'absolute', top:0, bottom:0, width:1,  backgroundColor:'rgba(255,255,255,0.2)' },

  // Corner crop decorations
  cc:    { position:'absolute', width:CVIZ, height:CVIZ, borderColor:C.primary, borderWidth:3 },
  ccTL:  { borderRightWidth:0, borderBottomWidth:0, borderTopLeftRadius:3 },
  ccTR:  { borderLeftWidth:0,  borderBottomWidth:0, borderTopRightRadius:3 },
  ccBL:  { borderRightWidth:0, borderTopWidth:0,    borderBottomLeftRadius:3 },
  ccBR:  { borderLeftWidth:0,  borderTopWidth:0,    borderBottomRightRadius:3 },

  // Corner handles (large touch target)
  cH:    { position:'absolute', width:CORNER_TAP, height:CORNER_TAP, alignItems:'center', justifyContent:'center', zIndex:10 },
  cDot:  { width:16, height:16, backgroundColor:C.primary, shadowColor:C.primary, shadowOffset:{width:0,height:0}, shadowOpacity:0.8, shadowRadius:6, elevation:6 },
  cDotTL: { borderTopLeftRadius:3,  borderTopRightRadius:1,  borderBottomLeftRadius:1,  borderBottomRightRadius:10 },
  cDotTR: { borderTopLeftRadius:1,  borderTopRightRadius:3,  borderBottomLeftRadius:10, borderBottomRightRadius:1  },
  cDotBL: { borderTopLeftRadius:1,  borderTopRightRadius:10, borderBottomLeftRadius:3,  borderBottomRightRadius:1  },
  cDotBR: { borderTopLeftRadius:10, borderTopRightRadius:1,  borderBottomLeftRadius:1,  borderBottomRightRadius:3  },

  // Edge handles
  eH:   { position:'absolute', width:EDGE_TAP, height:EDGE_TAP, alignItems:'center', justifyContent:'center', zIndex:9 },
  eDot: { width:10, height:10, borderRadius:5, backgroundColor:'#fff', borderWidth:1.5, borderColor:C.primary, shadowColor:'#000', shadowOffset:{width:0,height:1}, shadowOpacity:0.35, shadowRadius:3, elevation:3 },

  processingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor:'rgba(0,0,0,0.6)', alignItems:'center', justifyContent:'center', gap:14 },
  processingText:    { color:'#fff', fontSize:14, fontFamily:'Inter_500Medium' },
  noImg:             { alignItems:'center', gap:12, opacity:0.4 },
  noImgText:         { fontSize:14, color:'#fff', fontFamily:'Inter_400Regular' },

  bottomPanel: { backgroundColor:C.surfaceContainerLowest, borderTopLeftRadius:24, borderTopRightRadius:24, paddingHorizontal:20, paddingTop:16, gap:14, shadowColor:'#000', shadowOffset:{width:0,height:-4}, shadowOpacity:0.08, shadowRadius:12, elevation:8, borderTopWidth:1, borderColor:`${C.outlineVariant}30` },
  tools:       { flexDirection:'row', justifyContent:'space-around' },
  toolBtn:     { alignItems:'center', gap:5, paddingHorizontal:8, paddingVertical:8, borderRadius:12, minWidth:60 },
  toolBtnP:    { backgroundColor:`${C.primary}12` },
  toolLabel:   { fontSize:10, color:C.secondary, fontFamily:'Inter_400Regular', textAlign:'center' },

  rotSection:     { gap: 6 },
  rotHeaderRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  rotLabel:       { fontSize: 12, color: C.secondary, fontFamily: 'Inter_500Medium', flex: 1, textAlign: 'center' },
  rotLabelActive: { color: C.primary, fontFamily: 'Inter_600SemiBold' },

  rotTrack:       { height: 36, position: 'relative', justifyContent: 'center' },
  rotTrackLine:   { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: `${C.outlineVariant}60`, borderRadius: 1 },
  rotCenterNotch: { position: 'absolute', left: '50%', width: 2, height: 10, backgroundColor: C.secondary, borderRadius: 1, marginLeft: -1 },
  rotTick:        { position: 'absolute', width: 1, height: 6, backgroundColor: `${C.secondary}60`, top: 15 },
  rotTickCenter:  { height: 10, backgroundColor: C.secondary, top: 13 },
  rotThumb:       { position: 'absolute', width: 28, height: 28, borderRadius: 14, backgroundColor: C.surfaceContainerLow, borderWidth: 2, borderColor: C.outlineVariant, top: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
  rotThumbActive: { borderColor: C.primary, backgroundColor: `${C.primary}18` },

  rotRangeRow:  { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 },
  rotRangeText: { fontSize: 9, color: `${C.secondary}80`, fontFamily: 'Inter_400Regular' },

  actionRow:    { flexDirection:'row', gap:12 },
  retakeBtn:    { flexDirection:'row', alignItems:'center', gap:8, paddingHorizontal:16, paddingVertical:14, borderRadius:14, borderWidth:1.5, borderColor:C.outlineVariant },
  retakeText:   { fontSize:14, color:C.secondary, fontFamily:'Inter_500Medium' },
  continueBtn:  { flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, borderRadius:14, paddingVertical:15, backgroundColor:C.primary, shadowColor:C.primary, shadowOffset:{width:0,height:4}, shadowOpacity:0.28, shadowRadius:10, elevation:4 },
  continueBtnText: { fontSize:16, fontWeight:'600', color:'#fff', fontFamily:'Inter_600SemiBold' },
});
