import { fireEvent, screen } from '@testing-library/react-native';

import { setMockLatency } from '../../api/mock/adapter';
import { queryClient } from '../../lib/queryClient';

const WAIT = { timeout: 10_000 };

/** Waits until `text` is rendered (any number of matches). */
export async function waitText(text: string | RegExp): Promise<void> {
  await screen.findAllByText(text, {}, WAIT);
}

/** Presses the last rendered element with `text` (the most recently pushed screen wins). */
export async function pressText(text: string | RegExp): Promise<void> {
  const matches = await screen.findAllByText(text, {}, WAIT);
  const target = matches[matches.length - 1];
  if (!target) throw new Error(`No element with text ${String(text)}`);
  await fireEvent.press(target);
}

/** First launch → English → Welcome → phone OTP sign-in with the demo code. */
export async function signInWithOtp(phone: string, role: 'user' | 'admin'): Promise<void> {
  await waitText('Choose your language');
  await pressText('Continue');
  await pressText(role === 'user' ? 'Find work' : 'I want to hire');
  await fireEvent.changeText(await screen.findByLabelText('Mobile number', {}, WAIT), phone);
  await pressText('Get OTP by SMS');
  await waitText('Enter the code');
  await fireEvent.changeText(screen.getByTestId('otp-input'), '123456');
}

/** Presses the back button of the top-most screen (stacked screens stay mounted below it). */
export async function goBack(): Promise<void> {
  const buttons = await screen.findAllByLabelText('Go back', {}, WAIT);
  const top = buttons[buttons.length - 1];
  if (!top) throw new Error('No back button');
  await fireEvent.press(top);
}

/**
 * Shared setup for journey tests: an instant mock API, and no cache garbage-collection
 * timers (gcTime: Infinity creates none), so Jest can exit as soon as the tests finish.
 */
export function setupJourney(): void {
  beforeAll(() => {
    setMockLatency(0, 0);
    queryClient.setDefaultOptions({
      queries: { ...queryClient.getDefaultOptions().queries, gcTime: Infinity },
      mutations: { ...queryClient.getDefaultOptions().mutations, gcTime: Infinity },
    });
  });
  afterAll(() => queryClient.clear());
}
