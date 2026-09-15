// Builds the { uri, name, type } part React Native's FormData needs from an
// expo-image-picker asset. The old inline version sent "image/jpg" (not a real
// MIME type) and lost the type entirely for content:// URIs on Android, so the
// server either rejected the file or never received it.
const EXT_MIME = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/heic',
  heif: 'image/heif',
};

export const toUploadFile = (asset, baseName = 'upload') => {
  const uri = asset?.uri;
  const sourceName = String(asset?.fileName || uri?.split('/').pop() || '').split('?')[0];
  const sourceExt = sourceName.includes('.') ? sourceName.split('.').pop().toLowerCase() : '';
  const type = asset?.mimeType || EXT_MIME[sourceExt] || 'image/jpeg';
  const ext = EXT_MIME[sourceExt] === type
    ? sourceExt
    : Object.keys(EXT_MIME).find((key) => EXT_MIME[key] === type) || 'jpg';
  return { uri, name: `${baseName}.${ext}`, type };
};
