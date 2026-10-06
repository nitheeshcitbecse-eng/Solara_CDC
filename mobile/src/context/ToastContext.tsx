import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

import { durations } from '../lib/theme/tokens';

export type ToastTone = 'success' | 'error' | 'info';
type Toast = { id: number; message: string; tone: ToastTone };

type ToastActions = {
  showToast: (message: string, tone?: ToastTone) => void;
  dismissToast: () => void;
};

const ToastStateContext = createContext<Toast | null>(null);
const ToastActionsContext = createContext<ToastActions | null>(null);

/** One toast at a time; a new toast replaces the current one. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextId = useRef(0);

  const dismissToast = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setToast(null);
  }, []);

  const showToast = useCallback((message: string, tone: ToastTone = 'info') => {
    if (timer.current) clearTimeout(timer.current);
    nextId.current += 1;
    setToast({ id: nextId.current, message, tone });
    timer.current = setTimeout(() => {
      timer.current = null;
      setToast(null);
    }, durations.toast);
  }, []);

  const actions = useMemo(() => ({ showToast, dismissToast }), [showToast, dismissToast]);

  return (
    <ToastActionsContext.Provider value={actions}>
      <ToastStateContext.Provider value={toast}>{children}</ToastStateContext.Provider>
    </ToastActionsContext.Provider>
  );
}

export function useCurrentToast(): Toast | null {
  return useContext(ToastStateContext);
}

export function useToast(): ToastActions {
  const value = useContext(ToastActionsContext);
  if (!value) throw new Error('useToast must be used inside ToastProvider');
  return value;
}
