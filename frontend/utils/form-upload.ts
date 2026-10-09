import { Platform } from 'react-native';

/**
 * Append a local image URI to a FormData so upload works on BOTH web and
 * native.
 *
 * On web, React Native's fetch needs a real Blob, so we fetch the URI and
 * read it into one. On native (iOS/Android), the networking layer streams a
 * file directly when the FormData part is shaped `{ uri, name, type }` —
 * and crucially, `fetch(file://…).blob()` on a device throws the infamous
 * "Network request failed", which is why phone uploads were broken.
 */
export async function appendImage(
  fd: FormData,
  uri: string,
  name = 'photo.jpg',
): Promise<void> {
  if (Platform.OS === 'web') {
    const res = await fetch(uri);
    const blob = await res.blob();
    fd.append('image', blob, name);
  } else {
    fd.append('image', { uri, name, type: mimeFromUri(uri, name) } as any);
  }
}

/** Best-effort MIME type from the file extension; defaults to JPEG. */
function mimeFromUri(uri: string, name: string): string {
  const source = uri.split('?')[0];
  const ext = (source.split('.').pop() || name.split('.').pop() || '').toLowerCase();
  switch (ext) {
    case 'png':
      return 'image/png';
    case 'heic':
      return 'image/heic';
    case 'heif':
      return 'image/heif';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    default:
      return 'image/jpeg';
  }
}
