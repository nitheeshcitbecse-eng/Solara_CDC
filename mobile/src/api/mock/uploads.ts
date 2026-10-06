import { Directory, File, Paths } from 'expo-file-system';

import { UPLOAD_RULES, type UploadKind } from '../../utils/files';
import { newId } from './db';
import { fail, type MockFile } from './http';

/**
 * Simulates the server's file storage. The client deletes its temp copies after a
 * successful upload, so the mock copies each file into the app's document directory
 * (as a real server would keep its own copy) and returns that URI.
 */
const STORAGE_DIR = 'solara-mock-uploads';

function storageDirectory(): Directory {
  const directory = new Directory(Paths.document, STORAGE_DIR);
  if (!directory.exists) directory.create({ intermediates: true });
  return directory;
}

/** Server-side validation, mirroring docs/API.md §1.3 (the client validates too). */
export function assertUploadAllowed(file: MockFile, kind: UploadKind): void {
  const rule = UPLOAD_RULES[kind];
  if (!(rule.mimeTypes as readonly string[]).includes(file.type)) throw fail.unsupportedMedia();
  if (fileSize(file) > rule.maxBytes) throw fail.tooLarge();
}

function fileSize(file: MockFile): number {
  try {
    return new File(file.uri).size;
  } catch {
    return 0; // Unreadable size: the type check already passed, so accept it.
  }
}

export async function storeUpload(file: MockFile): Promise<string> {
  const extension = /\.([a-z0-9]+)$/i.exec(file.name)?.[1] ?? 'bin';
  const destination = new File(storageDirectory(), `${newId('upl')}.${extension.toLowerCase()}`);
  try {
    await new File(file.uri).copy(destination);
    return destination.uri;
  } catch {
    // If the source can't be copied (e.g. a content:// URI), keep referencing it directly.
    return file.uri;
  }
}

export function totalUploadBytes(files: readonly MockFile[]): number {
  return files.reduce((sum, file) => sum + fileSize(file), 0);
}
