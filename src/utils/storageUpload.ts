import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

export const dataURLtoBlob = (dataurl: string): Blob => {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

export const uploadImageToCloud = async (
  fileOrBase64: File | string,
  folder: string = 'partners'
): Promise<string> => {
  if (typeof fileOrBase64 === 'string' && fileOrBase64.startsWith('http')) {
    return fileOrBase64;
  }

  const blob = typeof fileOrBase64 === 'string' ? dataURLtoBlob(fileOrBase64) : fileOrBase64;
  const filePath = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`;
  const storageRef = ref(storage, filePath);

  const snapshot = await uploadBytesResumable(storageRef, blob, {
    contentType: 'image/jpeg',
  });

  return await getDownloadURL(snapshot.ref);
};