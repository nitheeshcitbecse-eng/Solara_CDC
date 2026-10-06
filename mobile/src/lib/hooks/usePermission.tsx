import { getRecordingPermissionsAsync, requestRecordingPermissionsAsync } from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useCallback, useRef, useState, type ReactElement } from 'react';
import { Linking } from 'react-native';

import { PermissionSheet, type PermissionKind } from '../../Components/feedback/PermissionSheet';

type PermissionResult = { granted: boolean; canAskAgain: boolean };

const getters: Record<PermissionKind, () => Promise<PermissionResult>> = {
  microphone: getRecordingPermissionsAsync,
  camera: ImagePicker.getCameraPermissionsAsync,
  location: Location.getForegroundPermissionsAsync,
};

const requesters: Record<PermissionKind, () => Promise<PermissionResult>> = {
  microphone: requestRecordingPermissionsAsync,
  camera: ImagePicker.requestCameraPermissionsAsync,
  location: Location.requestForegroundPermissionsAsync,
};

/**
 * Just-in-time permissions. `ensure()` resolves true once access is granted:
 *  1. already granted → true immediately
 *  2. can still ask → show our explanation sheet first, then the OS prompt
 *  3. permanently denied → show a sheet that links to the phone's Settings
 * Render `sheet` somewhere in the calling screen.
 *
 * Gallery access needs no permission: the system photo picker on Android 13+ and
 * iOS 14+ only shares the photos the user picks.
 */
export function usePermission(kind: PermissionKind): { ensure: () => Promise<boolean>; sheet: ReactElement } {
  const [mode, setMode] = useState<'explain' | 'denied' | null>(null);
  const resolver = useRef<((granted: boolean) => void) | null>(null);

  const finish = useCallback((granted: boolean) => {
    setMode(null);
    resolver.current?.(granted);
    resolver.current = null;
  }, []);

  const ensure = useCallback(async () => {
    const current = await getters[kind]();
    if (current.granted) return true;
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setMode(current.canAskAgain ? 'explain' : 'denied');
    });
  }, [kind]);

  const handleAllow = useCallback(async () => {
    setMode(null);
    const result = await requesters[kind]();
    if (result.granted) finish(true);
    else if (!result.canAskAgain) setMode('denied');
    else finish(false);
  }, [kind, finish]);

  const handleOpenSettings = useCallback(() => {
    void Linking.openSettings();
    finish(false);
  }, [finish]);

  const sheet = (
    <PermissionSheet
      kind={kind}
      mode={mode}
      onAllow={() => void handleAllow()}
      onOpenSettings={handleOpenSettings}
      onDismiss={() => finish(false)}
    />
  );

  return { ensure, sheet };
}
