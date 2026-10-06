import * as Location from 'expo-location';
import { useCallback, useState, type ReactElement } from 'react';

import { matchIndianState } from '../../utils/india';
import { usePermission } from './usePermission';

type DetectedAddress = {
  state: string | null;
  district: string | null;
  city: string | null;
  pincode: string | null;
  street: string | null;
};

type LocateResult = { status: 'ok'; address: DetectedAddress } | { status: 'denied' | 'failed' };

/**
 * One-shot "use my current location": asks just-in-time, reads a single position and
 * reverse-geocodes it into form fields. Nothing is tracked or sent to our server.
 */
export function useCurrentAddress(): { locate: () => Promise<LocateResult>; locating: boolean; permissionSheet: ReactElement } {
  const { ensure, sheet } = usePermission('location');
  const [locating, setLocating] = useState(false);

  const locate = useCallback(async (): Promise<LocateResult> => {
    if (!(await ensure())) return { status: 'denied' };
    setLocating(true);
    try {
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [place] = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      if (!place) return { status: 'failed' };
      return {
        status: 'ok',
        address: {
          state: matchIndianState(place.region),
          district: place.subregion ?? place.district,
          city: place.city ?? place.district ?? place.subregion,
          pincode: place.postalCode && /^[1-9]\d{5}$/.test(place.postalCode) ? place.postalCode : null,
          street: [place.streetNumber, place.street, place.district].filter(Boolean).join(', ') || place.name,
        },
      };
    } catch {
      return { status: 'failed' };
    } finally {
      setLocating(false);
    }
  }, [ensure]);

  return { locate, locating, permissionSheet: sheet };
}
