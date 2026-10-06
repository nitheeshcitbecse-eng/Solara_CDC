import { fireEvent, render, screen } from '@testing-library/react-native';

import { App } from '../../App';
import { goBack, pressText, setupJourney, signInWithOtp, waitText } from './helpers';

/** Walks the job seeker's main screens against the mock API to catch runtime errors. */
setupJourney();

it('job seeker can browse, open a job, apply screen, applications, messages and profile', async () => {
  await render(<App />);
  await signInWithOtp('9876543210', 'user');
  await waitText('Hello, Prasina');

  // Job details from the "Jobs near you" list (a job she has not applied to yet).
  await pressText('Housekeeping staff – apartment complex');
  await waitText('About the work');
  expect(screen.getAllByText('Verified hirer').length).toBeGreaterThan(0);
  await pressText('Apply');
  await waitText('Message to the hirer');
  await waitText('Voice introduction');
  await goBack(); // Apply → job details
  await goBack(); // job details → Home

  // Tabs.
  await pressText('Explore');
  await waitText('Browse work by sector. New sectors are added as hirers post new kinds of work.');
  await pressText('Cooking');
  await waitText('Cook for elderly couple');
  await goBack();

  await pressText('Applied');
  await waitText('Shortlisted');
  await pressText('Home cook for family of four');
  await waitText('What you sent');
  await waitText('Status history');
  await goBack();

  await pressText('Profile');
  await waitText('XXXX XXXX 4821');
  await waitText('Work & preferences');
  await pressText('My jobs');
  await waitText('Patient care attendant');
  await goBack();
  await pressText('Job history');
  await waitText('Kitchen helper – wedding season');
  await goBack();
  await pressText('Settings');
  await waitText('Show my profile to verified hirers');
  await goBack();
  await pressText('Help & support');
  await waitText('Do I have to pay to use Solara?');
  await goBack();

  // Messages and notifications from the Home top bar.
  await pressText('Home');
  await fireEvent.press(screen.getByLabelText('Messages'));
  await pressText('Arun Home Services');
  await waitText('Nothing needed. The address is 12, 2nd Cross Street, Adyar. See you then.');
  await goBack();
  await goBack();
  await fireEvent.press(screen.getByLabelText(/^Notifications/));
  await waitText('Application update');
}, 120_000);
