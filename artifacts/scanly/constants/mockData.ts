export interface Document {
  id: string;
  title: string;
  dateLabel: string;
  dateISO: string;
  pages: number;
  size: string;
  folderId: string;
  type: 'pdf' | 'image' | 'text';
  tag: string;
  color: string;
  localImageUri?: string;
  localPdfUri?: string;
  filterName?: string;
}

export interface Folder {
  id: string;
  name: string;
  count: number;
  icon: string;
  iconColor: string;
  bgColor: string;
}

export const MOCK_FOLDERS: Folder[] = [
  { id: 'f1', name: 'Faturalar', count: 3, icon: 'dollar-sign', iconColor: '#575e70', bgColor: '#d9dff5' },
  { id: 'f2', name: 'İş', count: 2, icon: 'briefcase', iconColor: '#006948', bgColor: '#ccf0e1' },
  { id: 'f3', name: 'Eğitim', count: 2, icon: 'book-open', iconColor: '#555c6a', bgColor: '#dce2f3' },
  { id: 'f4', name: 'Kimlik & Evrak', count: 1, icon: 'shield', iconColor: '#575e70', bgColor: '#d9dff5' },
  { id: 'f5', name: 'Genel', count: 0, icon: 'folder', iconColor: '#555c6a', bgColor: '#dce2f3' },
];

export const MOCK_DOCUMENTS: Document[] = [
  {
    id: 'd1',
    title: 'İş Sözleşmesi',
    dateLabel: 'Bugün, 14:30',
    dateISO: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    pages: 3,
    size: '1.2 MB',
    folderId: 'f2',
    type: 'pdf',
    tag: 'Sözleşme',
    color: '#006948',
  },
  {
    id: 'd2',
    title: 'Kira Sözleşmesi',
    dateLabel: 'Dün, 09:15',
    dateISO: new Date(Date.now() - 27 * 60 * 60 * 1000).toISOString(),
    pages: 5,
    size: '2.4 MB',
    folderId: 'f4',
    type: 'pdf',
    tag: 'Evrak',
    color: '#006948',
  },
  {
    id: 'd3',
    title: 'Fatura Mart 2024',
    dateLabel: '12 May',
    dateISO: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    pages: 1,
    size: '0.4 MB',
    folderId: 'f1',
    type: 'pdf',
    tag: 'Fatura',
    color: '#006948',
  },
  {
    id: 'd4',
    title: 'Üniversite Transkripti',
    dateLabel: '10 May',
    dateISO: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    pages: 2,
    size: '0.8 MB',
    folderId: 'f3',
    type: 'pdf',
    tag: 'Akademik',
    color: '#006948',
  },
  {
    id: 'd5',
    title: 'Vergi Levhası 2023',
    dateLabel: '5 May',
    dateISO: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    pages: 1,
    size: '0.3 MB',
    folderId: 'f1',
    type: 'pdf',
    tag: 'Vergi',
    color: '#006948',
  },
  {
    id: 'd6',
    title: 'İş Raporu Q1',
    dateLabel: '1 May',
    dateISO: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    pages: 8,
    size: '3.1 MB',
    folderId: 'f2',
    type: 'pdf',
    tag: 'Rapor',
    color: '#006948',
  },
  {
    id: 'd7',
    title: 'Pasaport Kopyası',
    dateLabel: '28 Nis',
    dateISO: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000).toISOString(),
    pages: 1,
    size: '1.5 MB',
    folderId: 'f4',
    type: 'image',
    tag: 'Kimlik',
    color: '#006948',
  },
  {
    id: 'd8',
    title: 'Ders Notları - Matematik',
    dateLabel: '25 Nis',
    dateISO: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    pages: 4,
    size: '1.8 MB',
    folderId: 'f3',
    type: 'pdf',
    tag: 'Ders',
    color: '#006948',
  },
];
