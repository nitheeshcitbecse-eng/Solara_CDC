import { fireEvent, render, screen } from '@testing-library/react-native';

import { App } from '../../App';
import { goBack, pressText, setupJourney, waitText } from './helpers';

/** Walks every superadmin screen after the email + password + TOTP sign-in. */
setupJourney();

it('owner can sign in with TOTP and use every console screen', async () => {
  await render(<App />);
  await waitText('Choose your language');
  await pressText('Continue');
  await pressText('Owner login');
  await fireEvent.changeText(await screen.findByLabelText('Email'), 'owner@solara.app');
  await fireEvent.changeText(screen.getByLabelText('Password'), 'Solara@123');
  await pressText('Continue');
  await waitText('Two-step verification');
  await fireEvent.changeText(screen.getByTestId('otp-input'), '123456');

  await waitText('Solara at a glance');
  await waitText('Pending verifications');
  await waitText('Applications');

  await pressText('Users');
  await pressText('Prasina Selvam');
  await waitText('Identity verification');
  await pressText('Aadhaar – front');
  await waitText(/Link expires in/);
  await goBack();
  await goBack();

  await pressText('Moderation');
  await pressText('Pantry assistant – IT office');
  await waitText('Proposed sector');
  await waitText('Decision note');
  await goBack();

  await pressText('More');
  await pressText('All jobs');
  await waitText('Cook for elderly couple');
  await goBack();
  await pressText('Reports');
  await pressText('Tandoor cook – restaurant client');
  await waitText(/Reported by/);
  await goBack();
  await goBack();
  await pressText('Audit log');
  await waitText('Suspended user');
  await goBack();
  await pressText('Platform settings');
  await waitText('AI confidence thresholds');
}, 120_000);
