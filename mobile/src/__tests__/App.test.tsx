import { fireEvent, render, screen } from '@testing-library/react-native';

import { App } from '../App';
import { setupJourney } from './journeys/helpers';

/**
 * End-to-end smoke test: renders the real app (navigation, providers, screens) against
 * the in-app mock API and walks the job seeker's first sign-in.
 */
setupJourney();

const LONG = { timeout: 10_000 };

it('takes a new install from language choice to a first-name greeting on Home', async () => {
  await render(<App />);

  // First launch: language picker, then Welcome.
  expect(await screen.findByText('Choose your language', {}, LONG)).toBeTruthy();
  await fireEvent.press(screen.getByText('Continue'));
  await fireEvent.press(await screen.findByText('Find work', {}, LONG));

  // Sign in with the seeded job seeker's number.
  expect(await screen.findByText('Find work near you', {}, LONG)).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText('Mobile number'), '9876543210');
  await fireEvent.press(screen.getByText('Get OTP by SMS'));

  // Enter the demo OTP; the six-digit code submits automatically.
  expect(await screen.findByText('Enter the code', {}, LONG)).toBeTruthy();
  await fireEvent.changeText(screen.getByTestId('otp-input'), '123456');

  // The navigator swaps to the job seeker app on its own. Greeting uses the first name only.
  expect(await screen.findByText('Hello, Prasina', {}, LONG)).toBeTruthy();
  expect(await screen.findByText('Jobs near you', {}, LONG)).toBeTruthy();
}, 30_000);
