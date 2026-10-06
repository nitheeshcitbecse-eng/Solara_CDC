import * as ImagePicker from 'expo-image-picker';
import { useCallback, type ReactElement } from 'react';

import type { LocalFile } from '../types/common';
import { prepareImageForUpload } from '../../utils/files';
import { usePermission } from './usePermission';

type PickedImages = { files: LocalFile[] };

/**
 * Camera + gallery picking that always returns upload-ready files: resized to
 * 1600px, re-encoded as JPEG (which strips EXIF/GPS), stored in the cache dir.
 */
export function useImagePicker(): {
  takePhoto: () => Promise<PickedImages>;
  pickFromLibrary: (limit: number) => Promise<PickedImages>;
  permissionSheet: ReactElement;
} {
  const camera = usePermission('camera');
  const ensureCamera = camera.ensure;

  const prepare = useCallback(async (result: ImagePicker.ImagePickerResult): Promise<PickedImages> => {
    if (result.canceled) return { files: [] };
    const files = await Promise.all(
      result.assets.map((asset) =>
        prepareImageForUpload({ uri: asset.uri, width: asset.width, height: asset.height, fileName: asset.fileName }),
      ),
    );
    return { files };
  }, []);

  const takePhoto = useCallback(async () => {
    if (!(await ensureCamera())) return { files: [] };
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1, exif: false });
    return prepare(result);
  }, [ensureCamera, prepare]);

  const pickFromLibrary = useCallback(
    async (limit: number) => {
      // The system photo picker needs no permission: it only shares what the user selects.
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
        exif: false,
        allowsMultipleSelection: limit > 1,
        selectionLimit: limit,
      });
      return prepare(result);
    },
    [prepare],
  );

  return { takePhoto, pickFromLibrary, permissionSheet: camera.sheet };
}
