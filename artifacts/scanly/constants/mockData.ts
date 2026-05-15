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
  { id: 'f1', name: 'Faturalar', count: 12, icon: 'dollar-sign', iconColor: '#575e70', bgColor: '#d9dff5' },
  { id: 'f2', name: 'Okul', count: 45, icon: 'book-open', iconColor: '#555c6a', bgColor: '#dce2f3' },
  { id: 'f3', name: 'İş', count: 8, icon: 'briefcase', iconColor: '#006948', bgColor: '#ccf0e1' },
  { id: 'f4', name: 'Kişisel', count: 23, icon: 'user', iconColor: '#575e70', bgColor: '#d9dff5' },
  { id: 'f5', name: 'Hukuki', count: 6, icon: 'file-text', iconColor: '#555c6a', bgColor: '#dce2f3' },
];

export const MOCK_DOCUMENTS: Document[] = [
  {
    id: 'd1',
    title: 'Sözleşme Taslağı',
    dateLabel: 'Bugün, 14:30',
    dateISO: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    pages: 3,
    size: '1.2 MB',
    folderId: 'f5',
    type: 'pdf',
    tag: 'Sözleşme',
    color: '#006948',
  },
  {
    id: 'd2',
    title: 'Vergi Faturası',
    dateLabel: 'Dün, 09:15',
    dateISO: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    pages: 1,
    size: '0.4 MB',
    folderId: 'f1',
    type: 'pdf',
    tag: 'Fatura',
    color: '#575e70',
  },
  {
    id: 'd3',
    title: 'Kira Sözleşmesi',
    dateLabel: '12 May, 11:00',
    dateISO: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    pages: 5,
    size: '2.1 MB',
    folderId: 'f5',
    type: 'pdf',
    tag: 'Sözleşme',
    color: '#006948',
  },
  {
    id: 'd4',
    title: 'Diploma Belgesi',
    dateLabel: '10 May, 15:45',
    dateISO: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    pages: 1,
    size: '0.8 MB',
    folderId: 'f2',
    type: 'image',
    tag: 'Sertifika',
    color: '#555c6a',
  },
  {
    id: 'd5',
    title: 'Pasaport Fotokopisi',
    dateLabel: '8 May, 10:20',
    dateISO: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    pages: 2,
    size: '1.5 MB',
    folderId: 'f4',
    type: 'image',
    tag: 'Kimlik',
    color: '#575e70',
  },
  {
    id: 'd6',
    title: 'İş Başvuru Formu',
    dateLabel: '5 May, 09:00',
    dateISO: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    pages: 2,
    size: '0.6 MB',
    folderId: 'f3',
    type: 'pdf',
    tag: 'Form',
    color: '#006948',
  },
  {
    id: 'd7',
    title: 'Sigorta Poliçesi',
    dateLabel: '3 May, 16:30',
    dateISO: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    pages: 8,
    size: '3.2 MB',
    folderId: 'f1',
    type: 'pdf',
    tag: 'Sigorta',
    color: '#575e70',
  },
  {
    id: 'd8',
    title: 'Banka Hesap Özeti',
    dateLabel: '1 May, 08:45',
    dateISO: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    pages: 2,
    size: '0.7 MB',
    folderId: 'f1',
    type: 'pdf',
    tag: 'Banka',
    color: '#575e70',
  },
];
