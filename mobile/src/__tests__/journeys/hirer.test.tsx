import { render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { App } from '../../App';
import { goBack, pressText, setupJourney, signInWithOtp, waitText } from './helpers';

/** Walks the hirer's main screens: dashboard, Add work, my jobs, applicants and profile. */
setupJourney();

it('hirer can use the dashboard, add-work wizard, job management and applicants', async () => {
  await render(<App />);
  await signInWithOtp('9876500001', 'admin');
  await waitText('Hello, Arun');
  await waitText('Active jobs');
  await waitText('Recent applicants');

  // Add work: pick a shared sector, see the details step, then the back guard on leaving.
  await pressText('Add work');
  await waitText('What kind of work is it?');
  await pressText('Cleaning');
  await pressText('Continue');
  await waitText('Describe the work');
  await goBack(); // back from details returns to the sector step (wizard-internal)
  await waitText('What kind of work is it?');
  const alert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
    // Choose "Discard" to leave the wizard.
    buttons?.find((button) => button.style === 'destructive')?.onPress?.();
  });
  await goBack();
  expect(alert).toHaveBeenCalledWith('Discard changes?', expect.any(String), expect.any(Array));
  alert.mockRestore();

  // My jobs → a draft → continue setup lands on the photo step.
  await pressText('My jobs');
  await pressText('Pending review');
  await pressText('Weekend cleaner for villa');
  await waitText('Continue setup');
  await pressText('Continue setup');
  await waitText('Workplace photos');
  const leave = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
    buttons?.find((button) => button.style === 'destructive')?.onPress?.();
  });
  await goBack();
  leave.mockRestore();
  await goBack();

  // Applicants for a live job → one applicant → shortlist.
  await pressText('Applicants');
  await pressText('Housekeeping staff – apartment complex');
  await pressText('Lakshmi Narayanan');
  await waitText('Their message');
  await pressText('Shortlist');
  await waitText('Applicant shortlisted');
  await goBack();
  await goBack();

  await pressText('Profile');
  await waitText('Arun Home Services');
  expect(screen.getAllByText('Verified').length).toBeGreaterThan(0);
}, 120_000);
