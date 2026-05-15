import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { Document, Folder, MOCK_DOCUMENTS, MOCK_FOLDERS } from '@/constants/mockData';

interface DocumentsContextValue {
  documents: Document[];
  folders: Folder[];
  addDocument: (doc: Document) => void;
  removeDocument: (id: string) => void;
  getDocumentById: (id: string) => Document | undefined;
  getDocumentsByFolder: (folderId: string) => Document[];
  searchDocuments: (query: string) => Document[];
}

const DocumentsContext = createContext<DocumentsContextValue | null>(null);

const STORAGE_KEY = '@scanly_documents';

export function DocumentsProvider({ children }: { children: React.ReactNode }) {
  const [documents, setDocuments] = useState<Document[]>(MOCK_DOCUMENTS);
  const [folders] = useState<Folder[]>(MOCK_FOLDERS);

  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed: Document[] = JSON.parse(stored);
          if (parsed.length > 0) setDocuments(parsed);
        }
      } catch {}
    };
    load();
  }, []);

  const persist = useCallback(async (docs: Document[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
    } catch {}
  }, []);

  const addDocument = useCallback((doc: Document) => {
    setDocuments(prev => {
      const next = [doc, ...prev];
      persist(next);
      return next;
    });
  }, [persist]);

  const removeDocument = useCallback((id: string) => {
    setDocuments(prev => {
      const next = prev.filter(d => d.id !== id);
      persist(next);
      return next;
    });
  }, [persist]);

  const getDocumentById = useCallback((id: string) => {
    return documents.find(d => d.id === id);
  }, [documents]);

  const getDocumentsByFolder = useCallback((folderId: string) => {
    return documents.filter(d => d.folderId === folderId);
  }, [documents]);

  const searchDocuments = useCallback((query: string) => {
    if (!query.trim()) return documents;
    const lower = query.toLowerCase();
    return documents.filter(d =>
      d.title.toLowerCase().includes(lower) ||
      d.tag.toLowerCase().includes(lower)
    );
  }, [documents]);

  return (
    <DocumentsContext.Provider value={{
      documents,
      folders,
      addDocument,
      removeDocument,
      getDocumentById,
      getDocumentsByFolder,
      searchDocuments,
    }}>
      {children}
    </DocumentsContext.Provider>
  );
}

export function useDocuments() {
  const ctx = useContext(DocumentsContext);
  if (!ctx) throw new Error('useDocuments must be used within DocumentsProvider');
  return ctx;
}
