import React, { createContext, useCallback, useContext, useState } from 'react';

export type FilterType = 'Orijinal' | 'Temiz' | 'Parlak' | 'Gri Tonlama' | 'Siyah & Beyaz';

interface ScanContextValue {
  capturedImageUri: string | null;
  processedImageUri: string | null;
  pdfUri: string | null;
  selectedFilter: FilterType;
  documentTitle: string;
  setCapturedImageUri: (uri: string | null) => void;
  setProcessedImageUri: (uri: string | null) => void;
  setPdfUri: (uri: string | null) => void;
  setSelectedFilter: (filter: FilterType) => void;
  setDocumentTitle: (title: string) => void;
  resetScan: () => void;
}

const ScanContext = createContext<ScanContextValue | null>(null);

export function ScanProvider({ children }: { children: React.ReactNode }) {
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);
  const [processedImageUri, setProcessedImageUri] = useState<string | null>(null);
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('Temiz');
  const [documentTitle, setDocumentTitle] = useState<string>('Yeni Belge');

  const resetScan = useCallback(() => {
    setCapturedImageUri(null);
    setProcessedImageUri(null);
    setPdfUri(null);
    setSelectedFilter('Temiz');
    setDocumentTitle('Yeni Belge');
  }, []);

  return (
    <ScanContext.Provider value={{
      capturedImageUri,
      processedImageUri,
      pdfUri,
      selectedFilter,
      documentTitle,
      setCapturedImageUri,
      setProcessedImageUri,
      setPdfUri,
      setSelectedFilter,
      setDocumentTitle,
      resetScan,
    }}>
      {children}
    </ScanContext.Provider>
  );
}

export function useScan() {
  const ctx = useContext(ScanContext);
  if (!ctx) throw new Error('useScan must be used within ScanProvider');
  return ctx;
}
