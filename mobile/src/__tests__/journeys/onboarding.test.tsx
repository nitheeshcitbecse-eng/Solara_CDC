import { fireEvent, render, screen } from '@testing-library/react-native';

import { App } from '../../App';
import { pressText, setupJourney, signInWithOtp, waitText } from './helpers';

/** A brand-new number completes the three onboarding steps and lands on Home. */
setupJourney();

it('new job seeker completes onboarding and is greeted by first name', async () => {
  await render(<App />);
  await signInWithOtp('9123400000', 'user');

  // Step 1 — validation first, then valid details.
  await waitText('Tell us about yourself');
  await pressText('Continue');
  await waitText('This field is required.');
  await fireEvent.changeText(screen.getByLabelText('Full name'), 'Meera Krishnan');
  await fireEvent.press(screen.getByLabelText('Date of birth'));
  await pressText('Done');
  await pressText('தமிழ்');
  await pressText('Continue');

  // Step 2 — location.
  await waitText('We show you jobs near where you live.');
  await fireEvent.press(screen.getByLabelText('State'));
  await fireEvent.changeText(screen.getByLabelText('Search'), 'tamil'); // long lists are searchable
  await pressText('Tamil Nadu');
  await fireEvent.changeText(screen.getByLabelText('District'), 'Madurai');
  await fireEvent.changeText(screen.getByLabelText('City or town'), 'Madurai');
  await fireEvent.changeText(screen.getByLabelText('Pincode'), '625001');
  await pressText('Continue');

  // Step 3 — skills and preferred sector, then finish (Aadhaar is optional for job seekers).
  await waitText('Work & identity');
  await fireEvent.changeText(screen.getByLabelText('Skills'), 'Cooking for families');
  await fireEvent.press(screen.getByLabelText('Add'));
  await pressText('Cooking');
  await pressText('Finish');

  await waitText('Hello, Meera');
}, 120_000);
