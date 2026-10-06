import { File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import type { LocalFile } from '../lib/types/common';
import { AppError } from './errors';

const MB = 1024 * 1024;

/** Client-side mirror of the server limits in docs/API.md §1.3. */
export const UPLOAD_RULES = {
  image: { mimeTypes: ['image/jpeg', 'image/png', 'image/webp'], maxBytes: 8 * MB },
  document: { mimeTypes: ['application/pdf', 'image/jpeg', 'image/png'], maxBytes: 10 * MB },
  audio: { mimeTypes: ['audio/m4a', 'audio/x-m4a', 'audio/mp4', 'audio/aac', 'audio/mpeg', 'audio/wav'], maxBytes: 5 * MB },
} as const;
export type UploadKind = keyof typeof UPLOAD_RULES;

const MAX_IMAGE_EDGE = 1600;
const IMAGE_QUALITY = 0.75;

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  pdf: 'application/pdf',
  m4a: 'audio/m4a',
  mp4: 'audio/mp4',
  aac: 'audio/aac',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
};

function extensionOf(nameOrUri: string): string {
  const clean = nameOrUri.split('?')[0] ?? nameOrUri;
  const match = /\.([a-z0-9]+)$/i.exec(clean);
  return match?.[1]?.toLowerCase() ?? '';
}

export function mimeTypeFromName(nameOrUri: string): string {
  return MIME_BY_EXTENSION[extensionOf(nameOrUri)] ?? 'application/octet-stream';
}

function fileNameFromUri(uri: string): string {
  const last = uri.split('/').pop() ?? 'file';
  return decodeURIComponent(last.split('?')[0] ?? last);
}

/** Size in bytes of a local file, or 0 when it cannot be read. */
export function getFileSize(uri: string): number {
  try {
    const file = new File(uri);
    return file.exists ? file.size : 0;
  } catch {
    return 0;
  }
}

/** Returns an AppError describing why a file can't be uploaded, or null when it is acceptable. */
export function validateUpload(file: Pick<LocalFile, 'mimeType' | 'size'>, kind: UploadKind): AppError | null {
  const rule = UPLOAD_RULES[kind];
  if (!(rule.mimeTypes as readonly string[]).includes(file.mimeType)) {
    return new AppError('UNSUPPORTED_MEDIA', { details: { kind } });
  }
  if (file.size > rule.maxBytes) {
    return new AppError('PAYLOAD_TOO_LARGE', { details: { kind, maxBytes: rule.maxBytes } });
  }
  return null;
}

/**
 * Downscales a picked photo to at most 1600px on its long edge and re-encodes it as
 * JPEG at quality 0.75. Re-encoding writes a brand-new file containing only pixels, so
 * EXIF metadata — including GPS coordinates of where the photo was taken — is dropped.
 */
export async function prepareImageForUpload(
  source: { uri: string; width: number; height: number; fileName?: string | null },
): Promise<LocalFile> {
  const context = ImageManipulator.manipulate(source.uri);
  const longEdge = Math.max(source.width, source.height);
  if (longEdge > MAX_IMAGE_EDGE) {
    context.resize(source.width >= source.height ? { width: MAX_IMAGE_EDGE } : { height: MAX_IMAGE_EDGE });
  }
  const image = await context.renderAsync();
  const result = await image.saveAsync({ compress: IMAGE_QUALITY, format: SaveFormat.JPEG });
  // Native image buffers are not garbage-collected promptly; release them explicitly.
  image.release();
  context.release();

  const baseName = (source.fileName ?? fileNameFromUri(source.uri)).replace(/\.[^.]+$/, '');
  return {
    uri: result.uri,
    name: `${baseName || 'photo'}.jpg`,
    mimeType: 'image/jpeg',
    size: getFileSize(result.uri),
  };
}

/** True when the URI lives in the app cache, i.e. it is a temp copy we created and may delete. */
function isCacheFile(uri: string): boolean {
  return uri.startsWith(Paths.cache.uri);
}

/** Deletes temp copies (resized photos, recordings, picked documents) after upload. */
export function deleteTempFiles(uris: readonly string[]): void {
  for (const uri of uris) {
    if (!isCacheFile(uri)) continue;
    try {
      const file = new File(uri);
      if (file.exists) file.delete();
    } catch {
      // Best effort: the OS clears the cache directory eventually anyway.
    }
  }
}
