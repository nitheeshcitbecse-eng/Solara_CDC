import { fireEvent, render, screen } from '@testing-library/react-native';

import { App } from '../../App';
import { pressText, setupJourney, signInWithOtp, waitText } from './helpers';

/**
 * The core hirer feature end to end: AI sector match → job details → workplace photos →
 * photo analysis → result. The device pickers are replaced with three "picked" photos.
 */
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(async () => ({
    canceled: false,
    assets: [1, 2, 3].map((index) => ({ uri: `file:///picked/photo-${index}.jpg`, width: 3000, height: 2000, fileName: `photo-${index}.jpg` })),
  })),
  launchCameraAsync: jest.fn(async () => ({ canceled: true, assets: null })),
  getCameraPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
}));

jest.mock('expo-image-manipulator', () => {
  let counter = 0;
  return {
    SaveFormat: { JPEG: 'jpeg' },
    ImageManipulator: {
      manipulate: () => ({
        resize: jest.fn(),
        release: jest.fn(),
        renderAsync: async () => ({
          release: jest.fn(),
          saveAsync: async () => {
            counter += 1;
            return { uri: `file:///cache/resized-${counter}.jpg`, width: 1600, height: 1067 };
          },
        }),
      }),
    },
  };
});

setupJourney();

const ANALYSIS = { timeout: 15_000 };

async function fillDetails(title: string) {
  await waitText('Describe the work');
  await fireEvent.changeText(screen.getByLabelText('Job title'), title);
  await fireEvent.changeText(
    screen.getByLabelText('Describe the work'),
    'Daily sweeping and mopping of the office floor and washrooms before staff arrive.',
  );
  await fireEvent.changeText(screen.getByLabelText('Amount'), '15000');
  await pressText('English');
  await pressText('Continue');
}

async function addPhotos(note: string) {
  await waitText('Workplace photos');
  await pressText('Choose photos');
  await waitText(/3 of 6 photos/);
  if (note) await fireEvent.changeText(screen.getByLabelText('Note for the reviewer'), note);
  await pressText('Upload and check');
}

it('runs the add-work wizard through the unsafe and the approved photo branches', async () => {
  await render(<App />);
  await signInWithOtp('9876500001', 'admin');
  await waitText('Hello, Arun');

  // 1) "sweeper" is matched to Cleaning; photos flagged unsafe → blocked for review.
  await pressText('Add work');
  await pressText('Other — add new');
  await fireEvent.changeText(screen.getByLabelText('Kind of work'), 'sweeper');
  await pressText('Check');
  await waitText('Added under Cleaning');
  await pressText('Continue');
  await fillDetails('Office sweeper');
  await addPhotos('unsafe ladder near wiring');
  await waitText('Checking your photos…');
  await screen.findByText('This workplace may be unsafe', {}, ANALYSIS);
  await pressText('Done');

  // 2) A normal job with three ordinary photos passes and goes live.
  await waitText('Hello, Arun');
  await pressText('Add work');
  await pressText('Cleaning');
  await pressText('Continue');
  await fillDetails('Office cleaner');
  await addPhotos('');
  await screen.findByText('Photos approved', {}, ANALYSIS);
  await waitText('Easy');
  await pressText('Submit job');
  await waitText('Your job is live');
}, 120_000);
