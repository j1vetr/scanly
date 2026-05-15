import * as LegacyFS from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import { Platform } from 'react-native';

import { FilterType } from '@/context/ScanContext';

const DEFAULT_TITLE_REGEX = /^Belge Tarama \d{2}\.\d{2}\.\d{4}$/;

export function isDefaultTitle(title: string): boolean {
  return !title || title === 'Yeni Belge' || DEFAULT_TITLE_REGEX.test(title);
}

export function generateFileName(title?: string): string {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  const dateStr = `${y}-${m}-${d}`;
  if (title && !isDefaultTitle(title)) {
    const safeName = title.replace(/[^\w\u00C0-\u024F\s]/g, '_').replace(/\s+/g, '_');
    return `${safeName}_${dateStr}.pdf`;
  }
  return `Belge_Tarama_${dateStr}.pdf`;
}

export function generateDefaultTitle(): string {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  return `Belge Tarama ${day}.${month}.${year}`;
}

export function getFilterCss(filter: FilterType): string {
  switch (filter) {
    case 'Temiz': return 'contrast(1.2) brightness(1.05)';
    case 'Parlak': return 'brightness(1.2) contrast(1.05)';
    case 'Gri Tonlama': return 'grayscale(1)';
    case 'Siyah & Beyaz': return 'grayscale(1) contrast(1.7) brightness(1.1)';
    default: return 'none';
  }
}

function formatDateTurkish(): string {
  return new Date().toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function buildMultiPageHtml(
  pages: Array<{ base64: string; filterCss: string }>,
  title: string
): string {
  const pageHtml = pages
    .map(
      (p, idx) => `
<div class="page" ${idx > 0 ? 'style="page-break-before: always;"' : ''}>
  <div class="header">
    <div class="header-dot"></div>
    <span class="header-title">${title}</span>
    <span class="header-badge">Scanly</span>
  </div>
  <img class="doc-img" src="data:image/jpeg;base64,${p.base64}" alt="sayfa ${idx + 1}" style="filter: ${p.filterCss}; -webkit-filter: ${p.filterCss};" />
  <div class="footer">
    <span>Scanly ile tarandı · ${formatDateTurkish()}</span>
    <span>${idx + 1} / ${pages.length}</span>
  </div>
</div>`
    )
    .join('\n');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; background: #ffffff; font-family: -apple-system, Arial, sans-serif; }
  .page {
    width: 100%;
    min-height: 100vh;
    background: white;
    display: flex;
    flex-direction: column;
  }
  .doc-img { width: 100%; display: block; }
  .header {
    padding: 12px 16px 8px;
    display: flex;
    align-items: center;
    gap: 8px;
    border-bottom: 1px solid #f0f0f0;
  }
  .header-dot { width: 10px; height: 10px; border-radius: 50%; background: #006948; }
  .header-title { font-size: 13px; font-weight: 600; color: #1a1a1a; flex: 1; }
  .header-badge { font-size: 10px; color: #006948; background: #e6f4ef; padding: 2px 8px; border-radius: 20px; font-weight: 500; }
  .footer {
    padding: 8px 16px;
    font-size: 10px;
    color: #aaa;
    border-top: 1px solid #eee;
    margin-top: auto;
    display: flex;
    justify-content: space-between;
  }
</style>
</head>
<body>
${pageHtml}
</body>
</html>`;
}

export async function imageToBase64(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    const resp = await fetch(uri);
    const blob = await resp.blob();
    return new Promise<string>((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res((reader.result as string).split(',')[1]);
      reader.onerror = rej;
      reader.readAsDataURL(blob);
    });
  }
  return LegacyFS.readAsStringAsync(uri, {
    encoding: LegacyFS.EncodingType.Base64,
  });
}

export async function generatePdfFromImages(
  imageUris: string[],
  filterCss: string,
  title: string
): Promise<string | null> {
  if (Platform.OS === 'web' || imageUris.length === 0) return null;
  const pages = await Promise.all(
    imageUris.map(async (uri) => ({
      base64: await imageToBase64(uri),
      filterCss,
    }))
  );
  const html = buildMultiPageHtml(pages, title);
  const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 });
  return uri;
}

export async function ensureScanlyDir(): Promise<string> {
  const dir = (LegacyFS.documentDirectory ?? '') + 'scanly/';
  const info = await LegacyFS.getInfoAsync(dir);
  if (!info.exists) {
    await LegacyFS.makeDirectoryAsync(dir, { intermediates: true });
  }
  return dir;
}

export async function savePdfToDocuments(
  tempPdfUri: string,
  fileName: string
): Promise<string> {
  const dir = await ensureScanlyDir();
  const base = fileName.replace(/\.pdf$/i, '');
  let candidate = `${base}.pdf`;
  let destUri = dir + candidate;
  const existing = await LegacyFS.getInfoAsync(destUri);
  if (existing.exists) {
    const ts = Date.now();
    candidate = `${base}_${ts}.pdf`;
    destUri = dir + candidate;
  }
  await LegacyFS.copyAsync({ from: tempPdfUri, to: destUri });
  return destUri;
}
