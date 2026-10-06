import { useCallback, useEffect, useState } from 'react';

/**
 * Counts down once per second from `initialSeconds` to 0.
 * Based on a target timestamp (not tick counting) so it stays accurate even if
 * the JS thread was busy or the app was briefly in the background.
 */
export function useCountdown(initialSeconds: number): { remaining: number; restart: (seconds?: number) => void } {
  const [endsAt, setEndsAt] = useState(() => Date.now() + initialSeconds * 1000);
  const [remaining, setRemaining] = useState(initialSeconds);

  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [endsAt]);

  const restart = useCallback(
    (seconds: number = initialSeconds) => setEndsAt(Date.now() + seconds * 1000),
    [initialSeconds],
  );

  return { remaining, restart };
}
