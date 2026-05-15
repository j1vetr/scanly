import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';

export async function sharePdf(pdfUri: string, title?: string): Promise<void> {
  if (Platform.OS === 'web') {
    Alert.alert('Paylaş', 'PDF paylaşımı mobil cihazda desteklenmektedir.');
    return;
  }
  try {
    const available = await Sharing.isAvailableAsync();
    if (!available) {
      Alert.alert('Hata', 'Bu cihazda paylaşım kullanılamıyor.');
      return;
    }
    await Sharing.shareAsync(pdfUri, {
      mimeType: 'application/pdf',
      dialogTitle: title ?? 'Belgeyi Paylaş',
      UTI: 'com.adobe.pdf',
    });
  } catch (err) {
    console.error('PDF paylaşma hatası:', err);
    Alert.alert('Hata', 'Belge paylaşılamadı. Tekrar deneyin.');
  }
}

export async function shareImage(imageUri: string, title?: string): Promise<void> {
  if (Platform.OS === 'web') {
    const a = document.createElement('a');
    a.href = imageUri;
    a.download = `${title ?? 'belge'}.jpg`;
    a.click();
    return;
  }
  try {
    const available = await Sharing.isAvailableAsync();
    if (!available) return;
    await Sharing.shareAsync(imageUri, {
      mimeType: 'image/jpeg',
      dialogTitle: title ?? 'Görüntüyü Paylaş',
    });
  } catch (err) {
    console.error('Görüntü paylaşma hatası:', err);
    Alert.alert('Hata', 'Görüntü paylaşılamadı.');
  }
}

export async function shareFile(
  fileUri: string,
  mimeType: string,
  title?: string
): Promise<void> {
  if (Platform.OS === 'web') {
    Alert.alert('Paylaş', 'Dosya paylaşımı mobil cihazda desteklenmektedir.');
    return;
  }
  try {
    const available = await Sharing.isAvailableAsync();
    if (!available) return;
    await Sharing.shareAsync(fileUri, { mimeType, dialogTitle: title });
  } catch (err) {
    console.error('Dosya paylaşma hatası:', err);
    Alert.alert('Hata', 'Dosya paylaşılamadı.');
  }
}
