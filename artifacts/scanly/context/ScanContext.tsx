import React, { createContext, useCallback, useContext, useState } from 'react';

import { generateDefaultTitle } from '@/services/pdfService';

export type FilterType = 'Orijinal' | 'Temiz' | 'Parlak' | 'Gri Tonlama' | 'Siyah & Beyaz';

interface ScanContextValue {
  capturedImageUri: string | null;
  processedImageUri: string | null;
  capturedImages: string[];
  pdfUri: string | null;
  selectedFilter: FilterType;
  documentTitle: string;
  selectedFolderId: string;
  setCapturedImageUri: (uri: string | null) => void;
  setProcessedImageUri: (uri: string | null) => void;
  setPdfUri: (uri: string | null) => void;
  setSelectedFilter: (filter: FilterType) => void;
  setDocumentTitle: (title: string) => void;
  setSelectedFolderId: (id: string) => void;
  addCapturedImage: (uri: string) => void;
  removeCapturedImage: (index: number) => void;
  resetScan: () => void;
}

const ScanContext = createContext<ScanContextValue | null>(null);

export function ScanProvider({ children }: { children: React.ReactNode }) {
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);
  const [processedImageUri, setProcessedImageUri] = useState<string | null>(null);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('Temiz');
  const [documentTitle, setDocumentTitle] = useState<string>(generateDefaultTitle());
  const [selectedFolderId, setSelectedFolderId] = useState<string>('f4');

  const handleSetCapturedImageUri = useCallback((uri: string | null) => {
    setCapturedImageUri(uri);
    if (uri) {
      setCapturedImages((prev) => (prev.length === 0 ? [uri] : prev));
    }
  }, []);

  const addCapturedImage = useCallback((uri: string) => {
    setCapturedImages((prev) => [...prev, uri]);
    setCapturedImageUri(uri);
    setProcessedImageUri(null);
    setPdfUri(null);
  }, []);

  const removeCapturedImage = useCallback((index: number) => {
    setCapturedImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const resetScan = useCallback(() => {
    setCapturedImageUri(null);
    setProcessedImageUri(null);
    setCapturedImages([]);
    setPdfUri(null);
    setSelectedFilter('Temiz');
    setDocumentTitle(generateDefaultTitle());
    setSelectedFolderId('f4');
  }, []);

  return (
    <ScanContext.Provider
      value={{
        capturedImageUri,
        processedImageUri,
        capturedImages,
        pdfUri,
        selectedFilter,
        documentTitle,
        selectedFolderId,
        setCapturedImageUri: handleSetCapturedImageUri,
        setProcessedImageUri,
        setPdfUri,
        setSelectedFilter,
        setDocumentTitle,
        setSelectedFolderId,
        addCapturedImage,
        removeCapturedImage,
        resetScan,
      }}
    >
      {children}
    </ScanContext.Provider>
  );
}

export function useScan() {
  const ctx = useContext(ScanContext);
  if (!ctx) throw new Error('useScan must be used within ScanProvider');
  return ctx;
}
