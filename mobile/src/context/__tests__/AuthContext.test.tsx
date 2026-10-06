import { act, render, screen, waitFor } from '@testing-library/react-native';
import { useEffect } from 'react';
import { Text } from 'react-native';

import { setSessionExpiredHandler } from '../../api/client';
import { queryClient } from '../../lib/queryClient';
import * as secureStore from '../../lib/storage/secureStore';
import type { AuthResponse, SessionUser } from '../../lib/types/auth';
import { AuthProvider, useAuth, useAuthActions } from '../AuthContext';

jest.mock('../../lib/storage/secureStore', () => ({
  getRefreshToken: jest.fn(async () => null),
  getStoredUser: jest.fn(async () => null),
  setRefreshToken: jest.fn(async () => undefined),
  setStoredUser: jest.fn(async () => undefined),
  clearSecureSession: jest.fn(async () => undefined),
}));

jest.mock('../../api/client', () => ({
  refreshAccessToken: jest.fn(async () => 'access'),
  setAccessToken: jest.fn(),
  setSessionExpiredHandler: jest.fn(),
}));

jest.mock('../../api/auth', () => ({ logout: jest.fn(async () => undefined) }));

const mocked = jest.mocked(secureStore);

const prasina: SessionUser = {
  id: 'usr_prasina',
  role: 'user',
  phone: '+919876543210',
  email: null,
  name: 'Prasina Selvam',
  firstName: 'Prasina',
  profileComplete: true,
  verificationStatus: 'verified',
};

let actions: ReturnType<typeof useAuthActions> | null = null;

function Probe({ onActions }: { onActions: (value: ReturnType<typeof useAuthActions>) => void }) {
  const { status, user, sessionExpired } = useAuth();
  const authActions = useAuthActions();
  useEffect(() => onActions(authActions), [authActions, onActions]);
  return <Text>{`${status}|${user?.firstName ?? '-'}|${sessionExpired ? 'expired' : 'ok'}`}</Text>;
}

async function renderAuth() {
  await render(
    <AuthProvider>
      <Probe
        onActions={(value) => {
          actions = value;
        }}
      />
    </AuthProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  actions = null;
});

describe('AuthContext', () => {
  it('starts signed out when nothing is stored', async () => {
    await renderAuth();
    await waitFor(() => expect(screen.getByText('signedOut|-|ok')).toBeTruthy());
  });

  it('restores a stored session without waiting for the network', async () => {
    mocked.getRefreshToken.mockResolvedValueOnce('refresh');
    mocked.getStoredUser.mockResolvedValueOnce(prasina);
    await renderAuth();
    await waitFor(() => expect(screen.getByText('signedIn|Prasina|ok')).toBeTruthy());
  });

  it('signs in, then signs out and wipes secure storage and cached data', async () => {
    await renderAuth();
    await waitFor(() => expect(screen.getByText('signedOut|-|ok')).toBeTruthy());
    const auth: AuthResponse = { accessToken: 'a1', refreshToken: 'r1', user: prasina };
    const clearCache = jest.spyOn(queryClient, 'clear');

    await act(async () => {
      await actions?.completeSignIn(auth);
    });
    expect(screen.getByText('signedIn|Prasina|ok')).toBeTruthy();
    expect(mocked.setRefreshToken).toHaveBeenCalledWith('r1');

    await act(async () => {
      await actions?.signOut();
    });
    expect(screen.getByText('signedOut|-|ok')).toBeTruthy();
    expect(mocked.clearSecureSession).toHaveBeenCalled();
    expect(clearCache).toHaveBeenCalled();
  });

  it('forces sign-out when the API reports an expired session', async () => {
    mocked.getRefreshToken.mockResolvedValueOnce('refresh');
    mocked.getStoredUser.mockResolvedValueOnce(prasina);
    await renderAuth();
    await waitFor(() => expect(screen.getByText('signedIn|Prasina|ok')).toBeTruthy());

    const handler = jest.mocked(setSessionExpiredHandler).mock.calls.at(-1)?.[0];
    await act(async () => {
      handler?.();
    });
    await waitFor(() => expect(screen.getByText('signedOut|-|expired')).toBeTruthy());
    expect(mocked.clearSecureSession).toHaveBeenCalled();
  });

  it('ignores session updates that change nothing', async () => {
    mocked.getRefreshToken.mockResolvedValueOnce('refresh');
    mocked.getStoredUser.mockResolvedValueOnce(prasina);
    await renderAuth();
    await waitFor(() => expect(screen.getByText('signedIn|Prasina|ok')).toBeTruthy());
    const writes = mocked.setStoredUser.mock.calls.length;
    await act(async () => {
      actions?.updateSessionUser({ ...prasina });
    });
    expect(mocked.setStoredUser.mock.calls.length).toBe(writes);
    await act(async () => {
      actions?.updateSessionUser({ ...prasina, verificationStatus: 'pending' });
    });
    expect(mocked.setStoredUser.mock.calls.length).toBe(writes + 1);
  });
});
